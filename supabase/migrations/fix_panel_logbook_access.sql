-- Enable RLS for eyelogbook if not already enabled (should be)
ALTER TABLE eyelogbook ENABLE ROW LEVEL SECURITY;

-- Allow Panel Members and Admins to SELECT from eyelogbook
DROP POLICY IF EXISTS "Panel members can view all logbooks" ON eyelogbook;
CREATE POLICY "Panel members can view all logbooks"
ON eyelogbook FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_profile 
    WHERE 'Admin' = ANY(roles) 
       OR 'ARCPPanelMember' = ANY(roles) 
       OR 'ARCPSuperuser' = ANY(roles)
  )
);

-- Allow Panel Members and Admins to SELECT from evidence
DROP POLICY IF EXISTS "Panel members can view all evidence" ON evidence;
CREATE POLICY "Panel members can view all evidence"
ON evidence FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_profile 
    WHERE 'Admin' = ANY(roles) 
       OR 'ARCPPanelMember' = ANY(roles) 
       OR 'ARCPSuperuser' = ANY(roles)
  )
);
