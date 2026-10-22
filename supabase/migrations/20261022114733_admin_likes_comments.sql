-- Admins (Supabase Auth accounts listed in public.admins), anonymous likes and comments.
-- Every write from the browser goes through a security definer function, like the edit-token
-- functions of the first migration.

-- ---------------------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- No grants: only the functions below (and the dashboard / service role) read this table.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Counters on situations (kept up to date by triggers on likes and comments)
-- ---------------------------------------------------------------------------------------

alter table public.situations
  add column like_count    int not null default 0 check (like_count >= 0),
  add column comment_count int not null default 0 check (comment_count >= 0);

grant select (like_count, comment_count) on public.situations to anon, authenticated;

-- A like or comment must not change updated_at: only touch it when the situation itself changes.
drop trigger situations_set_updated_at on public.situations;
create trigger situations_set_updated_at
  before update of title, description, author_name, data, is_public on public.situations
  for each row execute function public.set_updated_at();

create or replace view public.situations_public
  with (security_invoker = true)
as
  select id, slug, title, description, author_name, is_public, data, created_at, updated_at,
         like_count, comment_count
  from public.situations;

-- ---------------------------------------------------------------------------------------
-- Likes: one per device. The device id is a random uuid kept in the browser and is never
-- readable by others, so nobody can remove someone else's like.
-- ---------------------------------------------------------------------------------------

create table public.situation_likes (
  situation_id uuid not null references public.situations (id) on delete cascade,
  liker_id     uuid not null,
  created_at   timestamptz not null default now(),
  primary key (situation_id, liker_id)
);

alter table public.situation_likes enable row level security;
revoke all on public.situation_likes from anon, authenticated;

create or replace function public.toggle_like(p_slug text, p_liker uuid)
returns table (liked boolean, like_count int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
  n int;
begin
  select s.id into sid from public.situations s where s.slug = p_slug and s.is_public;
  if sid is null then
    raise exception 'situation not found' using errcode = 'P0002';
  end if;

  delete from public.situation_likes l where l.situation_id = sid and l.liker_id = p_liker;
  get diagnostics n = row_count;
  if n = 1 then
    update public.situations s set like_count = greatest(s.like_count - 1, 0) where s.id = sid;
    liked := false;
  else
    insert into public.situation_likes (situation_id, liker_id) values (sid, p_liker);
    update public.situations s set like_count = s.like_count + 1 where s.id = sid;
    liked := true;
  end if;

  select s.like_count into like_count from public.situations s where s.id = sid;
  return next;
end;
$$;

-- Which of these situations did this device like? (to show the heart filled in)
create or replace function public.liked_slugs(p_liker uuid, p_slugs text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select s.slug
    from public.situation_likes l
    join public.situations s on s.id = l.situation_id
   where l.liker_id = p_liker
     and s.slug = any (p_slugs);
$$;

revoke all on function public.toggle_like(text, uuid) from public;
revoke all on function public.liked_slugs(uuid, text[]) from public;
grant execute on function public.toggle_like(text, uuid) to anon, authenticated;
grant execute on function public.liked_slugs(uuid, text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Comments: name + feedback, visible immediately; admins can delete them.
-- ---------------------------------------------------------------------------------------

create table public.situation_comments (
  id           uuid primary key default gen_random_uuid(),
  situation_id uuid not null references public.situations (id) on delete cascade,
  author_name  text not null check (char_length(author_name) between 1 and 60),
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index situation_comments_situation_idx on public.situation_comments (situation_id, created_at);
create index situation_comments_created_at_idx on public.situation_comments (created_at desc);

alter table public.situation_comments enable row level security;
revoke all on public.situation_comments from anon, authenticated;
grant select on public.situation_comments to anon, authenticated;

create policy "comments on public situations are readable"
  on public.situation_comments for select
  to anon, authenticated
  using (exists (select 1 from public.situations s where s.id = situation_id and s.is_public));

create or replace function public.bump_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.situations set comment_count = comment_count + 1 where id = new.situation_id;
  else
    update public.situations set comment_count = greatest(comment_count - 1, 0) where id = old.situation_id;
  end if;
  return null;
end;
$$;

create trigger situation_comments_count
  after insert or delete on public.situation_comments
  for each row execute function public.bump_comment_count();

create or replace function public.add_comment(p_slug text, p_author_name text, p_body text)
returns public.situation_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
  recent int;
  result public.situation_comments;
begin
  select s.id into sid from public.situations s where s.slug = p_slug and s.is_public;
  if sid is null then
    raise exception 'situation not found' using errcode = 'P0002';
  end if;

  -- Simple flood protection: at most 10 comments per situation per minute.
  select count(*) into recent
    from public.situation_comments c
   where c.situation_id = sid and c.created_at > now() - interval '1 minute';
  if recent >= 10 then
    raise exception 'too many comments' using errcode = 'P0001';
  end if;

  insert into public.situation_comments (situation_id, author_name, body)
  values (sid, btrim(p_author_name), btrim(p_body))
  returning * into result;
  return result;
end;
$$;

revoke all on function public.add_comment(text, text, text) from public;
grant execute on function public.add_comment(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Admin actions (checked with is_admin(); raise when the caller is not an admin)
-- ---------------------------------------------------------------------------------------

create or replace function public.admin_update_situation(
  p_slug text,
  p_title text,
  p_description text,
  p_author_name text,
  p_data jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  update public.situations
     set title = p_title,
         description = p_description,
         author_name = p_author_name,
         data = p_data
   where slug = p_slug;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.admin_delete_situation(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  delete from public.situations where slug = p_slug;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.admin_delete_comment(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  delete from public.situation_comments where id = p_id;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.admin_update_situation(text, text, text, text, jsonb) from public;
revoke all on function public.admin_delete_situation(text) from public;
revoke all on function public.admin_delete_comment(uuid) from public;
grant execute on function public.admin_update_situation(text, text, text, text, jsonb) to authenticated;
grant execute on function public.admin_delete_situation(text) to authenticated;
grant execute on function public.admin_delete_comment(uuid) to authenticated;
