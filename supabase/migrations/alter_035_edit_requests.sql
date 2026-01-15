-- Migration: Add edit_requests table and edit_history column
-- Purpose: Enable "Request to Edit" workflow for signed-off evidence

-- Create edit_requests table
CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES user_profile(user_id),
  supervisor_id UUID NOT NULL REFERENCES user_profile(user_id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  response_note TEXT, -- Supervisor's response (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profile(user_id)
);

-- Add edit_history column to evidence table
ALTER TABLE evidence 
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_edit_requests_evidence_id ON edit_requests(evidence_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_supervisor_id ON edit_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_trainee_id ON edit_requests(trainee_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);

-- RLS Policies
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Trainees can view their own requests
CREATE POLICY "Trainees can view own edit requests"
  ON edit_requests FOR SELECT
  USING (auth.uid() = trainee_id);

-- Trainees can create edit requests
CREATE POLICY "Trainees can create edit requests"
  ON edit_requests FOR INSERT
  WITH CHECK (auth.uid() = trainee_id);

-- Supervisors can view requests assigned to them
CREATE POLICY "Supervisors can view assigned edit requests"
  ON edit_requests FOR SELECT
  USING (auth.uid() = supervisor_id);

-- Supervisors can update requests assigned to them
CREATE POLICY "Supervisors can update assigned edit requests"
  ON edit_requests FOR UPDATE
  USING (auth.uid() = supervisor_id);

-- Grant permissions
GRANT SELECT, INSERT ON edit_requests TO authenticated;
GRANT UPDATE ON edit_requests TO authenticated;
