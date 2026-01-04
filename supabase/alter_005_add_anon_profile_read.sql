-- ============================================================================
-- ALLOW ANONYMOUS READ OF RESIDENT PROFILE FOR REFRACTIVE AUDIT FORM
-- ============================================================================
-- This policy allows the public optician form to display the resident's name
-- and GMC number in the header, so opticians know whose audit they're submitting to.
--
-- Note: This exposes name and gmc_number publicly. The policy allows reading
-- all columns, but the application only fetches name and gmc_number.
-- ============================================================================

-- Allow anonymous users to read user_profile rows (for displaying resident info on optician form)
CREATE POLICY "Allow anon to read user_profile for refractive audit"
  ON user_profile
  FOR SELECT
  TO anon
  USING (true);
