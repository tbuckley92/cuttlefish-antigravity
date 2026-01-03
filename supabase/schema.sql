-- EyePortfolio: minimal Supabase schema for auth + profile
-- Apply in Supabase SQL editor (or via migrations).
-- This is the starting point for branch: supabase-login-profile

-- Enums
do $$ begin
  create type public.user_base_role as enum ('RESIDENT', 'SUPERVISOR');
exception
  when duplicate_object then null;
end $$;

-- Core profile table (1 row per auth user)
create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,

  name text not null,
  gmc_number text not null,
  rcophth_number text not null,
  deanery text not null,
  base_role public.user_base_role not null,

  frcophth_part1 boolean not null default false,
  frcophth_part2_written boolean not null default false,
  frcophth_part2_viva boolean not null default false,
  refraction_certificate boolean not null default false,

  cct_date date null,
  arcp_month text null,
  fte numeric(5,2) not null default 100,
  arcp_date date null,

  -- Optional fields used by current UI
  grade text null,
  supervisor_name text null,
  supervisor_email text null,
  supervisor_gmc text null,
  predicted_sias text[] not null default '{}'::text[],
  pdp_goals jsonb not null default '[]'::jsonb,
  arcp_outcome text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profile_updated_at on public.user_profile;
create trigger trg_user_profile_updated_at
before update on public.user_profile
for each row execute function public.set_updated_at();

-- RLS: users can read/write only their row
alter table public.user_profile enable row level security;

drop policy if exists "user_profile_select_own" on public.user_profile;
create policy "user_profile_select_own"
on public.user_profile
for select
using (auth.uid() = user_id);

drop policy if exists "user_profile_insert_own" on public.user_profile;
create policy "user_profile_insert_own"
on public.user_profile
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_profile_update_own" on public.user_profile;
create policy "user_profile_update_own"
on public.user_profile
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
