-- Migration to update arcp_prep table with improved schema
-- Run this in Supabase SQL Editor

-- Add new columns to arcp_prep
ALTER TABLE public.arcp_prep
ADD COLUMN IF NOT EXISTS last_arcp_date date,
ADD COLUMN IF NOT EXISTS last_arcp_type text,
ADD COLUMN IF NOT EXISTS linked_form_r jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_evidence_epas jsonb,
ADD COLUMN IF NOT EXISTS current_evidence_gsat jsonb,
ADD COLUMN IF NOT EXISTS current_evidence_msf jsonb,
ADD COLUMN IF NOT EXISTS current_evidence_esr jsonb;

-- Rename existing columns (if they exist with old names)
-- First check if old columns exist and new ones don't
DO $$
BEGIN
  -- Rename linked_evidence_epas to last_evidence_epas if old exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'linked_evidence_epas')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'last_evidence_epas') THEN
    ALTER TABLE public.arcp_prep RENAME COLUMN linked_evidence_epas TO last_evidence_epas;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'linked_evidence_gsat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'last_evidence_gsat') THEN
    ALTER TABLE public.arcp_prep RENAME COLUMN linked_evidence_gsat TO last_evidence_gsat;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'linked_evidence_msf')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'last_evidence_msf') THEN
    ALTER TABLE public.arcp_prep RENAME COLUMN linked_evidence_msf TO last_evidence_msf;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'linked_evidence_esr')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'arcp_prep' AND column_name = 'last_evidence_esr') THEN
    ALTER TABLE public.arcp_prep RENAME COLUMN linked_evidence_esr TO last_evidence_esr;
  END IF;
END $$;

-- Add last_evidence columns if they don't exist (for fresh installs)
ALTER TABLE public.arcp_prep
ADD COLUMN IF NOT EXISTS last_evidence_epas jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_evidence_gsat jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_evidence_msf jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_evidence_esr jsonb DEFAULT '[]'::jsonb;

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'arcp_prep_user_id_unique' AND conrelid = 'public.arcp_prep'::regclass
  ) THEN
    ALTER TABLE public.arcp_prep ADD CONSTRAINT arcp_prep_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
