-- GhostGames account sync schema (Supabase). Safe to re-run: everything is "if not exists" / "drop … if exists".
-- Run in Supabase Dashboard -> SQL editor. profiles / favourites / recent / votes already exist on the live project;
-- the NEW part needed for cross-device play streaks is the play_days block at the bottom.
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text, avatar_url text, updated_at timestamptz not null default now());
create table if not exists public.favourites(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game_id text not null, created_at timestamptz not null default now(),
  primary key(user_id,game_id));
create table if not exists public.recent(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game_id text not null, played_at timestamptz not null default now(),
  primary key(user_id,game_id));
create table if not exists public.votes(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game_id text not null, dir text not null check (dir in ('u','d')), created_at timestamptz not null default now(),
  primary key(user_id,game_id));

alter table public.profiles enable row level security;
alter table public.favourites enable row level security;
alter table public.recent enable row level security;
alter table public.votes enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "own favourites" on public.favourites;
create policy "own favourites" on public.favourites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own recent" on public.recent;
create policy "own recent" on public.recent for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own votes" on public.votes;
create policy "own votes" on public.votes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select,insert,update,delete on public.profiles,public.favourites,public.recent,public.votes to authenticated;
revoke all on public.profiles,public.favourites,public.recent,public.votes from anon;

-- auto-create a profile row from the OAuth metadata (Discord/Google) on signup
create or replace function public.gg_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,username,avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->'custom_claims'->>'global_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists gg_on_auth_user_created on auth.users;
create trigger gg_on_auth_user_created after insert on auth.users
  for each row execute function public.gg_handle_new_user();

-- ===================== NEW: play days (cross-device play streak) =====================
-- One row per user per local calendar day on which they launched a game. Used for the
-- "My GhostGames" streak and 7-day-streak badge. Without this table the streak still works
-- per device (localStorage) plus days derived from the synced recently-played timestamps.
create table if not exists public.play_days(
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  created_at timestamptz not null default now(),
  primary key(user_id,day));
alter table public.play_days enable row level security;
drop policy if exists "own play days" on public.play_days;
create policy "own play days" on public.play_days for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.play_days to authenticated;
revoke all on public.play_days from anon;
