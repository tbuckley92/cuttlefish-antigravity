-- Create portfolio_progress table to track SIA/GSAT matrix state
create table if not exists public.portfolio_progress (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references auth.users(id) on delete cascade,
  sia text not null, -- 'Cataract Surgery', 'GSAT', 'Cornea & Ocular Surface', etc.
  level int not null, -- 1, 2, 3, 4
  status text not null, -- 'Draft', 'Submitted', 'SignedOff', 'Not Started'
  evidence_type text null, -- 'EPA', 'GSAT', 'Curriculum Catch Up', 'FourteenFish'
  evidence_id uuid null references public.evidence(id) on delete set null, -- Optional link to source evidence
  notes text null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure unique entry per box per trainee
  unique(trainee_id, sia, level)
);

-- Enable RLS
alter table public.portfolio_progress enable row level security;

-- Policies

-- Trainee can view/edit their own progress
create policy "Users can manage their own progress"
  on public.portfolio_progress
  for all
  using (auth.uid() = trainee_id)
  with check (auth.uid() = trainee_id);

-- Supervisors can view their assigned trainees' progress
create policy "Supervisors can view trainee progress"
  on public.portfolio_progress
  for select
  using (
    exists (
      select 1 from public.trainee_supervisor ts
      where ts.active
        and ts.trainee_id = public.portfolio_progress.trainee_id
        and ts.supervisor_id = auth.uid()
    )
  );

-- ARCP Panel can view progress for trainees in their deanery (if needed)
create policy "ARCP Panel can view progress"
  on public.portfolio_progress
  for select
  using (
    exists (
      select 1 from public.user_profile up
      join public.arcp_panel_member ap on ap.user_id = auth.uid()
      where up.user_id = public.portfolio_progress.trainee_id
        and ap.active
        and up.deanery = any(ap.deaneries)
    )
  );

-- Trigger to update updated_at
create trigger trg_portfolio_progress_updated_at
  before update on public.portfolio_progress
  for each row execute function public.set_updated_at();
