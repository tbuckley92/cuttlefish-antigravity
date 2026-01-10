-- Backfill Supervisor History
-- Populates the history table with the CURRENT supervisor for all profiles.
-- Run this ONCE to initialize the history feature.

INSERT INTO public.supervisor_history (
    trainee_id, 
    supervisor_email, 
    supervisor_name, 
    supervisor_gmc, 
    start_date, 
    source
)
SELECT 
    user_id, 
    supervisor_email, 
    supervisor_name, 
    supervisor_gmc, 
    CURRENT_DATE, -- Or use created_at if you prefer, but NOW implies "active as of history start"
    'backfill'
FROM public.user_profile
WHERE supervisor_email IS NOT NULL
-- Safety check: don't double insert if they already have an active history row
AND NOT EXISTS (
    SELECT 1 
    FROM public.supervisor_history 
    WHERE trainee_id = user_profile.user_id 
    AND end_date IS NULL
);
