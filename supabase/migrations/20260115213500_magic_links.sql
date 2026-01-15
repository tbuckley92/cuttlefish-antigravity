-- Migration: Magic Links for form access without authentication
-- Purpose: Enable email-based form completion via one-time magic links

-- Create magic_links table
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_gmc TEXT,  -- NULL for MSF respondents (non-doctors)
  form_type TEXT NOT NULL,  -- 'MSF_RESPONSE', 'EPA', 'CRS', etc.
  used_at TIMESTAMPTZ,  -- NULL until form completed (no time-based expiry)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_evidence_id ON magic_links(evidence_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_recipient_email ON magic_links(recipient_email);

-- Enable RLS
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Users can view magic links they created
DROP POLICY IF EXISTS "Users can view own magic links" ON magic_links;
CREATE POLICY "Users can view own magic links"
  ON magic_links FOR SELECT
  USING (created_by = auth.uid());

-- Authenticated users can create magic links
DROP POLICY IF EXISTS "Authenticated users can create magic links" ON magic_links;
CREATE POLICY "Authenticated users can create magic links"
  ON magic_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow public read access for token validation (used by Edge Functions)
DROP POLICY IF EXISTS "Public can validate magic links by token" ON magic_links;
CREATE POLICY "Public can validate magic links by token"
  ON magic_links FOR SELECT
  USING (true);

-- Validation function: returns evidence data if link is valid (not yet used)
CREATE OR REPLACE FUNCTION validate_magic_link(link_token TEXT)
RETURNS TABLE(
  evidence_id UUID,
  recipient_email TEXT,
  recipient_gmc TEXT,
  form_type TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.evidence_id,
    ml.recipient_email,
    ml.recipient_gmc,
    ml.form_type,
    (ml.used_at IS NULL) as is_valid
  FROM magic_links ml
  WHERE ml.token = link_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark magic link as used (called after form submission)
CREATE OR REPLACE FUNCTION mark_magic_link_used(link_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE magic_links
  SET used_at = NOW()
  WHERE token = link_token AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add email_sent_at column to notifications table for tracking
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Grant permissions
GRANT SELECT, INSERT ON magic_links TO authenticated;
GRANT EXECUTE ON FUNCTION validate_magic_link(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_magic_link_used(TEXT) TO anon, authenticated;
