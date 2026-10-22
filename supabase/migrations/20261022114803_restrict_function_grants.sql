-- Supabase grants EXECUTE on new public functions to anon and authenticated by default.
-- Admin functions are for signed-in users only (they also check is_admin()), and the
-- trigger function is never meant to be called through the API.
revoke execute on function public.admin_update_situation(text, text, text, text, jsonb) from anon;
revoke execute on function public.admin_delete_situation(text) from anon;
revoke execute on function public.admin_delete_comment(uuid) from anon;
revoke execute on function public.bump_comment_count() from anon, authenticated;
