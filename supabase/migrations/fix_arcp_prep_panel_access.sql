-- Allow ARCP panel members to read arcp_prep for trainees in their deanery
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "arcp_panel_read_arcp_prep" ON public.arcp_prep;

-- Create policy for ARCP panel members to read arcp_prep
CREATE POLICY "arcp_panel_read_arcp_prep"
ON public.arcp_prep
FOR SELECT
USING (
    -- User can read their own arcp_prep
    auth.uid() = user_id
    OR
    -- ARCP panel members can read arcp_prep for trainees in their deanery
    (
        public.is_arcp_panel_member()
        AND EXISTS (
            SELECT 1 FROM public.user_profile up
            WHERE up.user_id = arcp_prep.user_id
            AND up.deanery = public.get_current_user_deanery()
        )
    )
);
