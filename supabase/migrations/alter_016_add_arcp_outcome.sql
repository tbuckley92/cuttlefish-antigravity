-- Migration: Add ARCP Outcome Evidence tables and policies
-- Run this in Supabase SQL Editor

-- ARCP Outcome table for panel decisions
CREATE TABLE IF NOT EXISTS public.arcp_outcome (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  
  -- Panel decision data
  trainee_name text NOT NULL,
  grade_assessed text NOT NULL,
  next_training_grade text NOT NULL,
  chair_id uuid REFERENCES auth.users(id),
  chair_name text,
  outcome text NOT NULL,
  review_type text NOT NULL,
  panel_comments text,
  
  -- EPA summary (IDs of EPAs reviewed in current ARCP period)
  current_arcp_epas jsonb DEFAULT '[]'::jsonb,
  
  -- Lock management
  lock_date date NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  locked_at timestamptz,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Denormalized for RLS
  trainee_deanery text
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_arcp_outcome_trainee ON public.arcp_outcome(trainee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_arcp_outcome_status ON public.arcp_outcome(status, lock_date);
CREATE INDEX IF NOT EXISTS ix_arcp_outcome_deanery ON public.arcp_outcome(trainee_deanery);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_arcp_outcome_updated_at ON public.arcp_outcome;
CREATE TRIGGER trg_arcp_outcome_updated_at
BEFORE UPDATE ON public.arcp_outcome
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.arcp_outcome ENABLE ROW LEVEL SECURITY;

-- Trainee can read their own outcomes
DROP POLICY IF EXISTS "arcp_outcome_select_trainee" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_select_trainee"
ON public.arcp_outcome FOR SELECT
USING (auth.uid() = trainee_id);

-- Panel members can read outcomes in their deanery
DROP POLICY IF EXISTS "arcp_outcome_select_panel" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_select_panel"
ON public.arcp_outcome FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.arcp_panel_member ap
    WHERE ap.active AND ap.user_id = auth.uid()
      AND trainee_deanery = ANY(ap.deaneries)
  )
);

-- Admin can read all outcomes
DROP POLICY IF EXISTS "arcp_outcome_select_admin" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_select_admin"
ON public.arcp_outcome FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Panel can insert new outcomes
DROP POLICY IF EXISTS "arcp_outcome_insert_panel" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_insert_panel"
ON public.arcp_outcome FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.arcp_panel_member ap
    WHERE ap.active AND ap.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Panel can update at any time (before or after lock); Admin can also update
DROP POLICY IF EXISTS "arcp_outcome_update_panel_or_admin" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_update_panel_or_admin"
ON public.arcp_outcome FOR UPDATE
USING (
  -- Panel members in same deanery
  EXISTS (
    SELECT 1 FROM public.arcp_panel_member ap
    WHERE ap.active AND ap.user_id = auth.uid()
      AND trainee_deanery = ANY(ap.deaneries)
  )
  OR
  -- Admin can always update
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Panel can delete outcomes (admin always can)
DROP POLICY IF EXISTS "arcp_outcome_delete_panel_or_admin" ON public.arcp_outcome;
CREATE POLICY "arcp_outcome_delete_panel_or_admin"
ON public.arcp_outcome FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.arcp_panel_member ap
    WHERE ap.active AND ap.user_id = auth.uid()
      AND trainee_deanery = ANY(ap.deaneries)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);
