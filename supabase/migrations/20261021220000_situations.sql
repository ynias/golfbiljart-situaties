-- Situations: a drawn before-state + shot, shared by slug. Phase 1 has no login; the creator
-- keeps a secret edit token (stored in the browser) to update or delete their own situations.

-- ---------------------------------------------------------------------------------------
-- Validation of the JSON payload (mirrors src/domain/situation.ts)
-- ---------------------------------------------------------------------------------------

create or replace function public.is_valid_point(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
     and jsonb_typeof(p->'x') = 'number'
     and jsonb_typeof(p->'y') = 'number'
     and (p->>'x')::numeric between 0 and 900
     and (p->>'y')::numeric between 0 and 1800;
$$;

create or replace function public.is_valid_situation_data(d jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  ball jsonb;
  mv jsonb;
  pt jsonb;
  whites int := 0;
  reds int := 0;
begin
  if jsonb_typeof(d) <> 'object' then return false; end if;
  if (d->>'version') is distinct from '1' then return false; end if;
  if (d->>'table') is distinct from 'standard' then return false; end if;
  if d ? 'orientation' and d->>'orientation' not in ('portrait', 'landscape') then return false; end if;
  if jsonb_typeof(d->'before') <> 'array' then return false; end if;
  if jsonb_typeof(d->'shot') <> 'object' then return false; end if;
  if jsonb_typeof(d->'shot'->'movements') <> 'array' then return false; end if;
  if jsonb_typeof(d->'shot'->'playedBallId') <> 'string' then return false; end if;

  for ball in select * from jsonb_array_elements(d->'before') loop
    if jsonb_typeof(ball->'id') <> 'string' then return false; end if;
    if ball->>'color' = 'white' then whites := whites + 1;
    elsif ball->>'color' = 'red' then reds := reds + 1;
    else return false; end if;
    if jsonb_typeof(ball->'number') <> 'number' or (ball->>'number')::numeric not between 1 and 5 then return false; end if;
    if not public.is_valid_point(ball->'position') then return false; end if;
  end loop;
  if whites > 5 or reds > 5 then return false; end if;

  for mv in select * from jsonb_array_elements(d->'shot'->'movements') loop
    if jsonb_typeof(mv->'order') <> 'number' then return false; end if;
    if jsonb_typeof(mv->'ballId') <> 'string' then return false; end if;
    if mv->>'result' not in ('rest', 'scored') then return false; end if;
    if jsonb_typeof(mv->'path') <> 'array' or jsonb_array_length(mv->'path') < 1 then return false; end if;
    for pt in select * from jsonb_array_elements(mv->'path') loop
      if not public.is_valid_point(pt) then return false; end if;
    end loop;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------------------

create table public.situations (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9]{8}$'),
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 500),
  author_name text check (char_length(author_name) <= 60),
  is_public   boolean not null default true,
  data        jsonb not null check (public.is_valid_situation_data(data)),
  edit_token  text not null check (char_length(edit_token) between 16 and 128),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index situations_created_at_idx on public.situations (created_at desc);
create index situations_title_idx on public.situations (lower(title));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger situations_set_updated_at
  before update on public.situations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- Access: anon may insert public situations and read every column except edit_token.
-- ---------------------------------------------------------------------------------------

alter table public.situations enable row level security;

revoke all on public.situations from anon, authenticated;

grant insert on public.situations to anon, authenticated;
grant select (id, slug, title, description, author_name, is_public, data, created_at, updated_at)
  on public.situations to anon, authenticated;

create policy "public situations are readable"
  on public.situations for select
  to anon, authenticated
  using (is_public);

create policy "anyone may create a public situation"
  on public.situations for insert
  to anon, authenticated
  with check (is_public and public.is_valid_situation_data(data));

-- View without the secret column; runs as the caller, so RLS and column grants apply.
create view public.situations_public
  with (security_invoker = true)
as
  select id, slug, title, description, author_name, is_public, data, created_at, updated_at
  from public.situations;

grant select on public.situations_public to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Update and delete with the edit token (security definer: the token never leaves the server)
-- ---------------------------------------------------------------------------------------

create or replace function public.update_situation(
  p_slug text,
  p_token text,
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
  update public.situations
     set title = p_title,
         description = p_description,
         author_name = p_author_name,
         data = p_data
   where slug = p_slug
     and edit_token = p_token;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.delete_situation(p_slug text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  delete from public.situations
   where slug = p_slug
     and edit_token = p_token;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.update_situation(text, text, text, text, text, jsonb) from public;
revoke all on function public.delete_situation(text, text) from public;
grant execute on function public.update_situation(text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.delete_situation(text, text) to anon, authenticated;
