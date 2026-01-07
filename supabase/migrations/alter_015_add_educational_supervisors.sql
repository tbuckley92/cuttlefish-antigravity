-- Migration to add Educational Supervisor fields to arcp_prep table
-- Run this in Supabase SQL Editor

-- Add Educational Supervisor columns to arcp_prep
ALTER TABLE public.arcp_prep
ADD COLUMN IF NOT EXISTS current_ES jsonb,
ADD COLUMN IF NOT EXISTS last_ES jsonb;

-- Add comments to document the fields
COMMENT ON COLUMN public.arcp_prep.current_ES IS 'Current Educational Supervisor (inherited from profile): {name, email, gmc}';
COMMENT ON COLUMN public.arcp_prep.last_ES IS 'Last Educational Supervisor (user-entered): {name, email, gmc}';
