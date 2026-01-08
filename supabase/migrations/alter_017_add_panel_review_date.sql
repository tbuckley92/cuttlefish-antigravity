ALTER TABLE arcp_outcome
ADD COLUMN IF NOT EXISTS panel_review_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN arcp_outcome.panel_review_date IS 'Date when the panel review took place';
