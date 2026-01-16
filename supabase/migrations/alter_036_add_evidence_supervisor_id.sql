-- Add supervisor_id column to evidence table for robust assignment tracking
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES user_profile(user_id);

-- Add index for performance in Supervisor Dashboard queries
CREATE INDEX IF NOT EXISTS idx_evidence_supervisor_id ON evidence(supervisor_id);

-- Ensure RLS allows Supervisors to see evidence assigned to them
CREATE POLICY "Supervisors can view evidence assigned to them" 
ON evidence FOR SELECT 
USING (
  auth.uid() = supervisor_id
);

-- Note: Existing policies might cover this via email, but ID is cleaner.
