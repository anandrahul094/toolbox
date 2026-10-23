-- Run in the Supabase SQL editor. Every table has row-level security: visitors can submit,
-- but only you (via the dashboard / service role) can read feedback.

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('feedback', 'tool-request', 'problem')),
  message     text not null check (char_length(message) between 3 and 4000),
  email       text check (email is null or char_length(email) <= 254),
  tool_id     text check (tool_id is null or char_length(tool_id) <= 64),
  tool_name   text check (tool_name is null or char_length(tool_name) <= 120),
  category    text check (category is null or char_length(category) <= 40),
  user_id     uuid references auth.users (id) on delete set null
);
alter table public.feedback enable row level security;
-- explicit grants, so this works even when new tables aren't exposed to the API automatically
grant insert on public.feedback to anon, authenticated;

create policy "anyone can submit feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create table if not exists public.ratings (
  tool_id     text not null check (char_length(tool_id) <= 64),
  client_id   text not null check (char_length(client_id) <= 64),
  user_id     uuid references auth.users (id) on delete set null,
  stars       smallint not null check (stars between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 1000),
  updated_at  timestamptz not null default now(),
  primary key (tool_id, client_id)
);
alter table public.ratings enable row level security;
-- no direct insert/update/select policies: visitors can only rate through rate_tool() below,
-- which only ever touches the row for their own (secret, random) browser id

create or replace function public.rate_tool(p_tool_id text, p_client_id text, p_stars int, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stars < 1 or p_stars > 5 then raise exception 'stars must be 1-5'; end if;
  if char_length(p_client_id) < 16 then raise exception 'invalid client id'; end if;
  insert into public.ratings (tool_id, client_id, user_id, stars, comment, updated_at)
  values (left(p_tool_id, 64), left(p_client_id, 64), auth.uid(), p_stars, nullif(left(p_comment, 1000), ''), now())
  on conflict (tool_id, client_id)
  do update set stars = excluded.stars, comment = excluded.comment, user_id = coalesce(excluded.user_id, ratings.user_id), updated_at = now();
end;
$$;
revoke all on function public.rate_tool(text, text, int, text) from public;
grant execute on function public.rate_tool(text, text, int, text) to anon, authenticated;

-- public averages only; individual ratings and comments stay private
create or replace view public.tool_rating_summary with (security_invoker = false) as
  select tool_id, round(avg(stars)::numeric, 1)::float as average, count(*)::int as count
  from public.ratings group by tool_id;
grant select on public.tool_rating_summary to anon, authenticated;

-- Tip: add rate limiting for inserts (e.g. Supabase Edge Function or a captcha) before launch.
