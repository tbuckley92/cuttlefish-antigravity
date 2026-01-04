-- ============================================================================
-- REFRACTIVE AUDIT ENTRIES TABLE
-- Stores post-cataract refractive outcomes submitted by opticians via QR form
-- ============================================================================

CREATE TABLE IF NOT EXISTS refractive_audit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- The resident (trainee) this entry belongs to
  resident_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Patient identification
  patient_id text NOT NULL,
  patient_dob date NOT NULL,
  
  -- Visual acuity (Snellen values stored as text, e.g. "6/6", "6/12", "CF", "HM")
  va_right text NOT NULL,
  va_left text NOT NULL,
  
  -- Refraction - Spherical equivalent (-5.00 to +5.00 in 0.25 steps)
  sph_right numeric(4,2) NOT NULL CHECK (sph_right >= -5.00 AND sph_right <= 5.00),
  sph_left numeric(4,2) NOT NULL CHECK (sph_left >= -5.00 AND sph_left <= 5.00),
  
  -- Refraction - Astigmatism/Cylinder (-2.50 to +2.50 in 0.25 steps)
  cyl_right numeric(4,2) NOT NULL CHECK (cyl_right >= -2.50 AND cyl_right <= 2.50),
  cyl_left numeric(4,2) NOT NULL CHECK (cyl_left >= -2.50 AND cyl_left <= 2.50),
  
  -- Refraction - Axis (0 to 180 degrees)
  axis_right int NOT NULL CHECK (axis_right >= 0 AND axis_right <= 180),
  axis_left int NOT NULL CHECK (axis_left >= 0 AND axis_left <= 180),
  
  -- Vision change assessment (better/same/worse)
  vision_change_right text NOT NULL CHECK (vision_change_right IN ('better', 'same', 'worse')),
  vision_change_left text NOT NULL CHECK (vision_change_left IN ('better', 'same', 'worse'))
);

-- Index for efficient resident-specific queries sorted by date
CREATE INDEX IF NOT EXISTS idx_refractive_audit_resident_date 
  ON refractive_audit_entries (resident_user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE refractive_audit_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/public inserts (opticians submitting via QR form without login)
CREATE POLICY "Allow public inserts to refractive_audit_entries"
  ON refractive_audit_entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to read only their own entries
CREATE POLICY "Users can view own refractive_audit_entries"
  ON refractive_audit_entries
  FOR SELECT
  TO authenticated
  USING (resident_user_id = auth.uid());

-- Allow authenticated users to update their own entries (for corrections)
CREATE POLICY "Users can update own refractive_audit_entries"
  ON refractive_audit_entries
  FOR UPDATE
  TO authenticated
  USING (resident_user_id = auth.uid())
  WITH CHECK (resident_user_id = auth.uid());

-- Allow authenticated users to delete their own entries
CREATE POLICY "Users can delete own refractive_audit_entries"
  ON refractive_audit_entries
  FOR DELETE
  TO authenticated
  USING (resident_user_id = auth.uid());
