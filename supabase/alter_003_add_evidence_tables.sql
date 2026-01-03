-- Evidence architecture: trainee evidence + attachments + reviewer access
-- Access model:
-- - Trainee (owner) full access to their evidence
-- - Assigned supervisors can read + comment + sign off
-- - ARCP panel can read Submitted/COMPLETE evidence for trainees in allowed deaneries

-- Extensions (uuid generation)
create extension if not exists pgcrypto;

-- Supervisor relationship table (assignment)
create table if not exists public.trainee_supervisor (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references auth.users(id) on delete cascade,
  supervisor_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null default 'EDUCATIONAL',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Only one active relationship of the same kind per pair
create unique index if not exists ux_trainee_supervisor_active
on public.trainee_supervisor (trainee_id, supervisor_id, relationship)
where active;

-- ARCP panel membership scoped by deanery/deaneries
create table if not exists public.arcp_panel_member (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deaneries text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Evidence core table (hybrid relational + jsonb payload)
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references auth.users(id) on delete cascade,

  -- denormalized to avoid widening user_profile RLS for panel queries
  trainee_deanery text not null,

  type text not null,
  status text not null default 'Draft',
  title text not null,
  event_date date not null,

  sia text null,
  level int null,
  notes text null,

  -- form-specific payload (epaFormData, dopsFormData, etc.)
  data jsonb not null default '{}'::jsonb,

  submitted_at timestamptz null,
  signed_off_at timestamptz null,
  signed_off_by uuid null references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_evidence_status_valid
    check (status in ('Draft', 'Submitted', 'COMPLETE'))
);

create index if not exists ix_evidence_trainee_date
on public.evidence (trainee_id, event_date desc);

create index if not exists ix_evidence_trainee_type_status
on public.evidence (trainee_id, type, status);

-- Attachments (DB metadata; actual bytes in Supabase Storage)
create table if not exists public.evidence_attachment (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  storage_bucket text not null default 'evidence',
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists ix_evidence_attachment_evidence
on public.evidence_attachment (evidence_id, created_at desc);

-- Comments (review trail)
create table if not exists public.evidence_comment (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ix_evidence_comment_evidence
on public.evidence_comment (evidence_id, created_at asc);

-- updated_at helper (idempotent; also defined in schema.sql)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- updated_at triggers
drop trigger if exists trg_evidence_updated_at on public.evidence;
create trigger trg_evidence_updated_at
before update on public.evidence
for each row execute function public.set_updated_at();

-- Ensure trainee_deanery is populated from user_profile on insert
create or replace function public.set_evidence_trainee_deanery()
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

drop trigger if exists trg_evidence_set_trainee_deanery on public.evidence;
create trigger trg_evidence_set_trainee_deanery
before insert on public.evidence
for each row execute function public.set_evidence_trainee_deanery();

-- Maintain submitted_at and signed_off_at when status transitions
create or replace function public.set_evidence_status_timestamps()
returns trigger as $$
begin
  if new.status = 'Submitted' and (old.status is distinct from 'Submitted') then
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  if new.status = 'COMPLETE' and (old.status is distinct from 'COMPLETE') then
    new.signed_off_at := coalesce(new.signed_off_at, now());
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_evidence_status_timestamps on public.evidence;
create trigger trg_evidence_status_timestamps
before update on public.evidence
for each row execute function public.set_evidence_status_timestamps();

-- RLS
alter table public.trainee_supervisor enable row level security;
alter table public.arcp_panel_member enable row level security;
alter table public.evidence enable row level security;
alter table public.evidence_attachment enable row level security;
alter table public.evidence_comment enable row level security;

-- Grants (Supabase roles). RLS still controls actual access.
grant select on public.trainee_supervisor to authenticated;
grant select on public.arcp_panel_member to authenticated;
grant select, insert, update, delete on public.evidence to authenticated;
grant select, insert, delete on public.evidence_attachment to authenticated;
grant select, insert on public.evidence_comment to authenticated;

-- trainee_supervisor: visible to either side; mutations expected via service role/admin
drop policy if exists "trainee_supervisor_select_parties" on public.trainee_supervisor;
create policy "trainee_supervisor_select_parties"
on public.trainee_supervisor
for select
using (auth.uid() = trainee_id or auth.uid() = supervisor_id);

-- arcp_panel_member: members can read their own row
drop policy if exists "arcp_panel_member_select_self" on public.arcp_panel_member;
create policy "arcp_panel_member_select_self"
on public.arcp_panel_member
for select
using (auth.uid() = user_id);

-- evidence: read rules
drop policy if exists "evidence_select_owner_supervisor_panel" on public.evidence;
create policy "evidence_select_owner_supervisor_panel"
on public.evidence
for select
using (
  -- owner
  auth.uid() = trainee_id
  -- assigned supervisor (active)
  or exists (
    select 1
    from public.trainee_supervisor ts
    where ts.active
      and ts.trainee_id = public.evidence.trainee_id
      and ts.supervisor_id = auth.uid()
  )
  -- ARCP panel (submitted/complete only, deanery-scoped)
  or (
    public.evidence.status in ('Submitted', 'COMPLETE')
    and exists (
      select 1
      from public.arcp_panel_member ap
      where ap.active
        and ap.user_id = auth.uid()
        and public.evidence.trainee_deanery = any(ap.deaneries)
    )
  )
);

-- evidence: owner can create
drop policy if exists "evidence_insert_owner" on public.evidence;
create policy "evidence_insert_owner"
on public.evidence
for insert
with check (auth.uid() = trainee_id);

-- evidence: owner can update (supervisor sign-off via RPC below)
drop policy if exists "evidence_update_owner" on public.evidence;
create policy "evidence_update_owner"
on public.evidence
for update
using (auth.uid() = trainee_id)
with check (auth.uid() = trainee_id);

-- evidence: owner can delete drafts only
drop policy if exists "evidence_delete_owner_draft" on public.evidence;
create policy "evidence_delete_owner_draft"
on public.evidence
for delete
using (auth.uid() = trainee_id and status = 'Draft');

-- evidence_attachment: readable by anyone who can read the parent evidence
drop policy if exists "evidence_attachment_select_via_parent" on public.evidence_attachment;
create policy "evidence_attachment_select_via_parent"
on public.evidence_attachment
for select
using (
  exists (
    select 1 from public.evidence e
    where e.id = public.evidence_attachment.evidence_id
      and (
        auth.uid() = e.trainee_id
        or exists (
          select 1 from public.trainee_supervisor ts
          where ts.active and ts.trainee_id = e.trainee_id and ts.supervisor_id = auth.uid()
        )
        or (
          e.status in ('Submitted', 'COMPLETE')
          and exists (
            select 1 from public.arcp_panel_member ap
            where ap.active and ap.user_id = auth.uid() and e.trainee_deanery = any(ap.deaneries)
          )
        )
      )
  )
);

-- evidence_attachment: only the owner can upload (adjust if you want supervisors to upload too)
drop policy if exists "evidence_attachment_insert_owner" on public.evidence_attachment;
create policy "evidence_attachment_insert_owner"
on public.evidence_attachment
for insert
with check (
  uploader_id = auth.uid()
  and exists (
    select 1 from public.evidence e
    where e.id = public.evidence_attachment.evidence_id
      and e.trainee_id = auth.uid()
  )
);

-- evidence_attachment: owner (or uploader) can delete
drop policy if exists "evidence_attachment_delete_owner_or_uploader" on public.evidence_attachment;
create policy "evidence_attachment_delete_owner_or_uploader"
on public.evidence_attachment
for delete
using (
  uploader_id = auth.uid()
  or exists (
    select 1 from public.evidence e
    where e.id = public.evidence_attachment.evidence_id
      and e.trainee_id = auth.uid()
  )
);

-- evidence_comment: readable by anyone who can read the parent evidence
drop policy if exists "evidence_comment_select_via_parent" on public.evidence_comment;
create policy "evidence_comment_select_via_parent"
on public.evidence_comment
for select
using (
  exists (
    select 1 from public.evidence e
    where e.id = public.evidence_comment.evidence_id
      and (
        auth.uid() = e.trainee_id
        or exists (
          select 1 from public.trainee_supervisor ts
          where ts.active and ts.trainee_id = e.trainee_id and ts.supervisor_id = auth.uid()
        )
        or (
          e.status in ('Submitted', 'COMPLETE')
          and exists (
            select 1 from public.arcp_panel_member ap
            where ap.active and ap.user_id = auth.uid() and e.trainee_deanery = any(ap.deaneries)
          )
        )
      )
  )
);

-- evidence_comment: owner can comment any time; supervisors/panel can comment on Submitted/COMPLETE
drop policy if exists "evidence_comment_insert_reviewer_or_owner" on public.evidence_comment;
create policy "evidence_comment_insert_reviewer_or_owner"
on public.evidence_comment
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.evidence e
    where e.id = public.evidence_comment.evidence_id
      and (
        e.trainee_id = auth.uid()
        or (
          e.status in ('Submitted', 'COMPLETE')
          and (
            exists (
              select 1 from public.trainee_supervisor ts
              where ts.active and ts.trainee_id = e.trainee_id and ts.supervisor_id = auth.uid()
            )
            or exists (
              select 1 from public.arcp_panel_member ap
              where ap.active and ap.user_id = auth.uid() and e.trainee_deanery = any(ap.deaneries)
            )
          )
        )
      )
  )
);

-- Supervisor sign-off RPC (keeps evidence table updates owner-only)
create or replace function public.sign_off_evidence(p_evidence_id uuid)
returns public.evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.evidence;
begin
  select * into v_e
  from public.evidence e
  where e.id = p_evidence_id;

  if not found then
    raise exception 'Evidence not found';
  end if;

  if not exists (
    select 1 from public.trainee_supervisor ts
    where ts.active
      and ts.trainee_id = v_e.trainee_id
      and ts.supervisor_id = auth.uid()
  ) then
    raise exception 'Not authorised to sign off this evidence';
  end if;

  if v_e.status <> 'Submitted' then
    raise exception 'Evidence must be Submitted before sign-off';
  end if;

  update public.evidence
  set status = 'COMPLETE',
      signed_off_by = auth.uid(),
      signed_off_at = now()
  where id = p_evidence_id
  returning * into v_e;

  return v_e;
end;
$$;

revoke execute on function public.sign_off_evidence(uuid) from anon;
grant execute on function public.sign_off_evidence(uuid) to authenticated;

-- Optional: Storage bucket + policies (path convention: trainee_id/evidence_id/filename)
-- You can omit this section if you prefer configuring Storage in the dashboard.
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Allow owners to upload/read their own files
drop policy if exists "evidence_objects_owner_rw" on storage.objects;
create policy "evidence_objects_owner_rw"
on storage.objects
for all
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow reviewers (assigned supervisors + panel) to read files by evidence_id (2nd path segment)
drop policy if exists "evidence_objects_reviewer_read" on storage.objects;
create policy "evidence_objects_reviewer_read"
on storage.objects
for select
using (
  bucket_id = 'evidence'
  and (storage.foldername(storage.objects.name))[2] is not null
  and (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.evidence e
    where e.id = ((storage.foldername(storage.objects.name))[2])::uuid
      and (
        exists (
          select 1 from public.trainee_supervisor ts
          where ts.active and ts.trainee_id = e.trainee_id and ts.supervisor_id = auth.uid()
        )
        or (
          e.status in ('Submitted', 'COMPLETE')
          and exists (
            select 1 from public.arcp_panel_member ap
            where ap.active and ap.user_id = auth.uid() and e.trainee_deanery = any(ap.deaneries)
          )
        )
      )
  )
);

