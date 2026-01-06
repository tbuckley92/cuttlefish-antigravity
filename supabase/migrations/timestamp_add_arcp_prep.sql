-- Create arcp_prep table
create table if not exists public.arcp_prep (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  toot_days integer default 0,
  linked_evidence_epas jsonb default '[]'::jsonb,
  linked_evidence_gsat jsonb default '[]'::jsonb,
  linked_evidence_msf jsonb default '[]'::jsonb,
  linked_evidence_esr jsonb default '[]'::jsonb,
  status text default 'DRAFT',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.arcp_prep enable row level security;

-- Create policy for users to see only their own data
create policy "Users can view own arcp_prep"
  on public.arcp_prep for select
  using (auth.uid() = user_id);

create policy "Users can insert own arcp_prep"
  on public.arcp_prep for insert
  with check (auth.uid() = user_id);

create policy "Users can update own arcp_prep"
  on public.arcp_prep for update
  using (auth.uid() = user_id);

-- Add fields to user_profile
alter table public.user_profile
add column if not exists last_arcp_date date,
add column if not exists last_arcp_type text;
