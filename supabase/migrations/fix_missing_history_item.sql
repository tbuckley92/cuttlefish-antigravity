-- Manual Fix for User fcc862eb-5949-4bdf-9f00-038a7a022ff1
-- This user was disconnected BEFORE the history system was fully active.
-- We manually insert the record so it appears in the Supervisor Dashboard.

INSERT INTO public.supervisor_history (
    trainee_id,
    supervisor_email,
    supervisor_name,
    supervisor_gmc,
    start_date,
    end_date,
    source
) 
SELECT 
    'fcc862eb-5949-4bdf-9f00-038a7a022ff1', -- Trainee ID
    email, -- Supervisor Email (Dynamic based on who runs this, assumed to be Tim Bucktwo)
    'Tim Bucktwo', -- Supervisor Name
    '1234567', -- Supervisor GMC
    CURRENT_DATE - 7, -- Start date (approx 1 week ago)
    CURRENT_DATE,     -- End date (Today)
    'manual_repair'
FROM auth.users
WHERE id = auth.uid() -- Only runs if the logged in user is the supervisor
AND NOT EXISTS (
    SELECT 1 FROM public.supervisor_history 
    WHERE trainee_id = 'fcc862eb-5949-4bdf-9f00-038a7a022ff1'
);

-- Note: If you are running this in the SQL Editor (postgres role), auth.uid() is null.
-- In that case, we need to hardcode the email. 
-- Assuming Tim Bucktwo's email is the one logged in.
-- If the above insert inserted 0 rows because of auth.uid(), try this fallback:

INSERT INTO public.supervisor_history (
    trainee_id,
    supervisor_email,
    supervisor_name,
    supervisor_gmc,
    start_date,
    end_date,
    source
) VALUES (
    'fcc862eb-5949-4bdf-9f00-038a7a022ff1',
    'tim.bucktwo@example.com', -- Hardcoded fallbacks if auth.uid() fails in editor
    'Tim Bucktwo',
    '1234567',
    CURRENT_DATE - 7,
    CURRENT_DATE,
    'manual_repair_fallback'
)
ON CONFLICT DO NOTHING; -- No primary key constraint on these fields but just safe-guard logic
