-- Add phaco/cataract surgery statistics columns to user_profile
-- These are updated whenever EyeLogbook entries change

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS phaco_total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS phaco_performed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS phaco_supervised INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS phaco_assisted INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS phaco_pcr_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS phaco_pcr_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS phaco_stats_updated_at TIMESTAMPTZ NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profile.phaco_total IS 'Total phaco/cataract procedures from eyelogbook';
COMMENT ON COLUMN user_profile.phaco_performed IS 'P/PS (Performed/Performed Supervised) count';
COMMENT ON COLUMN user_profile.phaco_supervised IS 'SJ (Supervised Junior) count';
COMMENT ON COLUMN user_profile.phaco_assisted IS 'A (Assisted) count';
COMMENT ON COLUMN user_profile.phaco_pcr_count IS 'Number of PC rupture complications';
COMMENT ON COLUMN user_profile.phaco_pcr_rate IS 'PCR rate percentage (pcr_count / total * 100)';
COMMENT ON COLUMN user_profile.phaco_stats_updated_at IS 'Timestamp of last stats calculation';
