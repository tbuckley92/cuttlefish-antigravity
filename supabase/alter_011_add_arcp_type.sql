-- Add arcp_interim_full column to user_profile table
-- This field stores whether the next ARCP is "Full ARCP" or "Interim Review"

ALTER TABLE user_profile 
ADD COLUMN arcp_interim_full TEXT DEFAULT 'Full ARCP';

-- Update existing records to have default value
UPDATE user_profile 
SET arcp_interim_full = 'Full ARCP' 
WHERE arcp_interim_full IS NULL;
