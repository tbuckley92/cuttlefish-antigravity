-- ROLLBACK: Remove problematic supervisor search policy
-- Run this immediately to restore login functionality

DROP POLICY IF EXISTS "trainee_search_supervisors" ON public.user_profile;

-- This removes the infinite recursion issue
