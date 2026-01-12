-- Fix missing roles for users who signed up before the roles column was added/populated
-- Run this in your Supabase SQL Editor

-- 1. Ensure the roles column exists (safe to run if already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile' AND column_name = 'roles') THEN
        ALTER TABLE public.user_profile ADD COLUMN roles text[] NOT NULL DEFAULT '{}';
    END IF;
END $$;

-- 2. Backfill roles based on base_role for 'RESIDENT'
UPDATE public.user_profile
SET roles = ARRAY['Trainee']
WHERE base_role = 'RESIDENT' 
  AND (roles IS NULL OR roles = '{}');

-- 3. Backfill roles based on base_role for 'SUPERVISOR'
UPDATE public.user_profile
SET roles = ARRAY['Supervisor']
WHERE base_role = 'SUPERVISOR' 
  AND (roles IS NULL OR roles = '{}');

-- 4. Verify the fix for your specific user ID
SELECT * FROM public.user_profile WHERE user_id = '19920475-6e70-40f1-b0c8-6d0ce62329fc';
