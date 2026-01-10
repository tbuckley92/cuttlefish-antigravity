-- Migration: Fix Supervisor Evidence Access and Notification Visibility
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX EVIDENCE ACCESS
-- ============================================

-- Drop the old policy that only checked GMC number
DROP POLICY IF EXISTS "evidence_select_supervisor_assigned" ON public.evidence;

-- Create new policy that checks GMC OR Email
CREATE POLICY "evidence_select_supervisor_assigned"
ON public.evidence
FOR SELECT
USING (
  (
    -- Match by GMC Number
    (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_gmc
  )
  OR
  (
    -- Match by Email
    (SELECT email FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_email
  )
);

-- ============================================
-- 2. FIX NOTIFICATION VISIBILITY
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Allow users to update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = user_id
);
