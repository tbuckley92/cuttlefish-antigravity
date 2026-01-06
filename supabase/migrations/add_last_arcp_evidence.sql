-- Add last_arcp_evidence column to arcp_prep table
-- This stores general evidence linked to the last ARCP (any type)

ALTER TABLE public.arcp_prep
ADD COLUMN IF NOT EXISTS last_arcp_evidence jsonb DEFAULT '[]'::jsonb;

-- Add no_msf_planned column for tracking when no MSF is planned for current review
ALTER TABLE public.arcp_prep
ADD COLUMN IF NOT EXISTS no_msf_planned boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.arcp_prep.last_arcp_evidence IS 'Array of evidence IDs linked to the last ARCP';
COMMENT ON COLUMN public.arcp_prep.no_msf_planned IS 'True if no MSF is planned for the current ARCP review';
