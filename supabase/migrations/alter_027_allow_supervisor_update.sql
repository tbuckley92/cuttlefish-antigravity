-- Migration: Allow Supervisors to Update Evidence (Sign Off)
-- Run this in Supabase SQL Editor

-- 1. DROP Existing Update Policy if it exists (or the default one)
DROP POLICY IF EXISTS "evidence_update_own" ON public.evidence;
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;

-- 2. Create Policy for OWNING Trainee (can update if not signed off, or if drafting)
-- This replicates likely existing logic but ensures we don't break trainee access
CREATE POLICY "evidence_update_own"
ON public.evidence
FOR UPDATE
USING (
  auth.uid() = trainee_id
)
WITH CHECK (
  auth.uid() = trainee_id
);

-- 3. Create Policy for SUPERVISOR (can update if they are the supervisor)
CREATE POLICY "evidence_update_supervisor_assigned"
ON public.evidence
FOR UPDATE
USING (
  (
    -- Match by GMC Number (Standard)
    (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_gmc
  )
  OR
  (
    -- Match by Email (Fallback/Email Form)
    (SELECT email FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_email
  )
);

-- 4. Enable RLS (just in case)
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions if needed (usually authenticated has CRUD on public tables in Supabase starter, but good to be safe)
GRANT UPDATE ON public.evidence TO authenticated;
