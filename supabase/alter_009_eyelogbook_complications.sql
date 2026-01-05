-- Add columns to eyelogbook table for improved complication tracking
ALTER TABLE eyelogbook
ADD COLUMN IF NOT EXISTS complication JSONB NULL,
ADD COLUMN IF NOT EXISTS has_complication BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS complication_cause TEXT,
ADD COLUMN IF NOT EXISTS complication_action TEXT,
ADD COLUMN IF NOT EXISTS added_to_log BOOLEAN DEFAULT FALSE;
