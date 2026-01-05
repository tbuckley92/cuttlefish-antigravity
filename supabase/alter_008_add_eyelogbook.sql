-- EyeLogbook tables: surgical procedure entries + complication log
-- Deduplication: unique constraint prevents duplicate entries on re-upload
-- Access model: trainee owns data; supervisors and ARCP panel can read

-- Extensions
create extension if not exists pgcrypto;

-------------------------------------------------------------------------------
-- eyelogbook: parsed procedure entries from EyeLogbook PDFs
-------------------------------------------------------------------------------
create table if not exists public.eyelogbook (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references auth.users(id) on delete cascade,
  trainee_deanery text not null,
  evidence_id uuid null references public.evidence(id) on delete set null,

  procedure text not null,
  side text null,
  procedure_date date not null,
  patient_id text not null,
  role text null,
  hospital text null,
  trainee_grade text null,
  comments text null,
  surgical_images text[] not null default '{}'::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint for deduplication on re-upload
create unique index if not exists ux_eyelogbook_dedupe
on public.eyelogbook (trainee_id, patient_id, side, procedure, procedure_date);

create index if not exists ix_eyelogbook_trainee_date
on public.eyelogbook (trainee_id, procedure_date desc);

create index if not exists ix_eyelogbook_trainee_deanery
on public.eyelogbook (trainee_deanery);

-- Auto-set trainee_deanery from user_profile on insert
create or replace function public.set_eyelogbook_trainee_deanery()
returns trigger as $$
declare
  v_deanery text;
begin
  select up.deanery
    into v_deanery
  from public.user_profile up
  where up.user_id = new.trainee_id;

  if v_deanery is null then
    raise exception 'Missing user_profile.deanery for trainee_id=%', new.trainee_id;
  end if;

  new.trainee_deanery := v_deanery;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_eyelogbook_set_trainee_deanery on public.eyelogbook;
create trigger trg_eyelogbook_set_trainee_deanery
before insert on public.eyelogbook
for each row execute function public.set_eyelogbook_trainee_deanery();

-- updated_at trigger
drop trigger if exists trg_eyelogbook_updated_at on public.eyelogbook;
create trigger trg_eyelogbook_updated_at
before update on public.eyelogbook
for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- eyelogbook_complication: separately logged surgical complications
-------------------------------------------------------------------------------
create table if not exists public.eyelogbook_complication (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references auth.users(id) on delete cascade,
  trainee_deanery text not null,
  eyelogbook_entry_id uuid null references public.eyelogbook(id) on delete set null,

  patient_id text not null,
  procedure_date date not null,
  laterality text not null,
  operation text not null,
  complications text[] not null default '{}'::text[],
  other_details jsonb null,
  cause text null,
  action_taken text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_eyelogbook_complication_trainee
on public.eyelogbook_complication (trainee_id, procedure_date desc);

-- Auto-set trainee_deanery from user_profile on insert
create or replace function public.set_eyelogbook_complication_trainee_deanery()
returns trigger as $$
declare
  v_deanery text;
begin
  select up.deanery
    into v_deanery
  from public.user_profile up
  where up.user_id = new.trainee_id;

  if v_deanery is null then
    raise exception 'Missing user_profile.deanery for trainee_id=%', new.trainee_id;
  end if;

  new.trainee_deanery := v_deanery;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_eyelogbook_complication_set_trainee_deanery on public.eyelogbook_complication;
create trigger trg_eyelogbook_complication_set_trainee_deanery
before insert on public.eyelogbook_complication
for each row execute function public.set_eyelogbook_complication_trainee_deanery();

-- updated_at trigger
drop trigger if exists trg_eyelogbook_complication_updated_at on public.eyelogbook_complication;
create trigger trg_eyelogbook_complication_updated_at
before update on public.eyelogbook_complication
for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- RLS: eyelogbook
-------------------------------------------------------------------------------
alter table public.eyelogbook enable row level security;

-- Grants
grant select, insert, update, delete on public.eyelogbook to authenticated;

-- Owner can do everything
drop policy if exists "eyelogbook_owner_all" on public.eyelogbook;
create policy "eyelogbook_owner_all"
on public.eyelogbook
for all
using (auth.uid() = trainee_id)
with check (auth.uid() = trainee_id);

-- Assigned supervisors can read
drop policy if exists "eyelogbook_supervisor_read" on public.eyelogbook;
create policy "eyelogbook_supervisor_read"
on public.eyelogbook
for select
using (
  exists (
    select 1
    from public.trainee_supervisor ts
    where ts.active
      and ts.trainee_id = public.eyelogbook.trainee_id
      and ts.supervisor_id = auth.uid()
  )
);

-- ARCP panel can read (deanery-scoped)
drop policy if exists "eyelogbook_arcp_panel_read" on public.eyelogbook;
create policy "eyelogbook_arcp_panel_read"
on public.eyelogbook
for select
using (
  exists (
    select 1
    from public.arcp_panel_member ap
    where ap.active
      and ap.user_id = auth.uid()
      and public.eyelogbook.trainee_deanery = any(ap.deaneries)
  )
);

-------------------------------------------------------------------------------
-- RLS: eyelogbook_complication
-------------------------------------------------------------------------------
alter table public.eyelogbook_complication enable row level security;

-- Grants
grant select, insert, update, delete on public.eyelogbook_complication to authenticated;

-- Owner can do everything
drop policy if exists "eyelogbook_complication_owner_all" on public.eyelogbook_complication;
create policy "eyelogbook_complication_owner_all"
on public.eyelogbook_complication
for all
using (auth.uid() = trainee_id)
with check (auth.uid() = trainee_id);

-- Assigned supervisors can read
drop policy if exists "eyelogbook_complication_supervisor_read" on public.eyelogbook_complication;
create policy "eyelogbook_complication_supervisor_read"
on public.eyelogbook_complication
for select
using (
  exists (
    select 1
    from public.trainee_supervisor ts
    where ts.active
      and ts.trainee_id = public.eyelogbook_complication.trainee_id
      and ts.supervisor_id = auth.uid()
  )
);

-- ARCP panel can read (deanery-scoped)
drop policy if exists "eyelogbook_complication_arcp_panel_read" on public.eyelogbook_complication;
create policy "eyelogbook_complication_arcp_panel_read"
on public.eyelogbook_complication
for select
using (
  exists (
    select 1
    from public.arcp_panel_member ap
    where ap.active
      and ap.user_id = auth.uid()
      and public.eyelogbook_complication.trainee_deanery = any(ap.deaneries)
  )
);

