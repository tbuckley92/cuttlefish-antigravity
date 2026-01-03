-- Add CHECK constraint to enforce valid deanery values
-- Run this migration after schema.sql

ALTER TABLE public.user_profile
ADD CONSTRAINT check_deanery_valid
CHECK (deanery IN (
  'Defence Postgraduate Medical Deanery',
  'East Midlands',
  'East of England',
  'Kent, Surrey and Sussex',
  'North Central and East London',
  'North East',
  'North West',
  'South London',
  'South West',
  'Thames Valley',
  'Wessex',
  'West Midlands',
  'Yorkshire and the Humber',
  'Wales',
  'Scotland',
  'Northern Ireland'
));
