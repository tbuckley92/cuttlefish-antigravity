-- 1. Enable Search: Allow authenticated users to read basic profile info
-- Note: Postgres RLS is row-level. Existing policy usually restricts to 'auth.uid() = user_id'.
-- We add a new policy that allows reading ALL profiles (OR condition) for search visibility.
-- If you need stricter column usage, you'd use a view, but for now this enables the feature.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profile;

CREATE POLICY "Enable read access for all users"
ON public.user_profile FOR SELECT
TO authenticated
USING (true);

-- 2. Ensure Supervisor History Table Exists (Idempotent)
CREATE TABLE IF NOT EXISTS public.supervisor_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supervisor_email text,
    supervisor_name text,
    supervisor_gmc text,
    start_date date DEFAULT CURRENT_DATE,
    end_date date, -- NULL means currently active
    source text DEFAULT 'profile_update',
    created_at timestamptz DEFAULT now()
);

-- 3. RLS for History Table (Idempotent: Drop first or just create if not exists? Policies don't have IF NOT EXISTS easily)
-- We'll try to drop them to be safe/clean
DROP POLICY IF EXISTS "Trainees can view their own history" ON public.supervisor_history;
DROP POLICY IF EXISTS "Supervisors can view history where they are the supervisor" ON public.supervisor_history;
DROP POLICY IF EXISTS "Admins can view all history" ON public.supervisor_history;

CREATE POLICY "Trainees can view their own history"
ON public.supervisor_history FOR SELECT
TO authenticated
USING (auth.uid() = trainee_id);

CREATE POLICY "Supervisors can view history where they are the supervisor"
ON public.supervisor_history FOR SELECT
TO authenticated
USING (
    lower(supervisor_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())) 
);

-- 4. Trigger Logic (Idempotent)
CREATE OR REPLACE FUNCTION public.maintain_supervisor_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if supervisor_email has changed
    IF NEW.supervisor_email IS DISTINCT FROM OLD.supervisor_email THEN
        -- A. If there was an old supervisor, mark their history as ended
        IF OLD.supervisor_email IS NOT NULL THEN
            UPDATE public.supervisor_history
            SET end_date = CURRENT_DATE
            WHERE trainee_id = NEW.user_id 
              AND supervisor_email = OLD.supervisor_email
              AND end_date IS NULL;
            
            -- CHECK: If no row was updated, it means we missed the start of this relationship.
            -- We must insert a closed record so it appears in history.
            IF NOT FOUND THEN
                 INSERT INTO public.supervisor_history (
                    trainee_id,
                    supervisor_email,
                    supervisor_name,
                    supervisor_gmc,
                    start_date,
                    end_date,
                    source
                ) VALUES (
                    NEW.user_id,
                    OLD.supervisor_email,
                    OLD.supervisor_name,
                    OLD.supervisor_gmc,
                    CURRENT_DATE, -- Best guess for start is today since we don't know
                    CURRENT_DATE,
                    'missing_history_repair'
                );
            END IF;
        END IF;

        -- B. If there is a new supervisor, create a new ACTIVE history record
        IF NEW.supervisor_email IS NOT NULL THEN
            INSERT INTO public.supervisor_history (
                trainee_id, 
                supervisor_email, 
                supervisor_name, 
                supervisor_gmc, 
                start_date, 
                source
            ) VALUES (
                NEW.user_id,
                NEW.supervisor_email,
                NEW.supervisor_name,
                NEW.supervisor_gmc,
                CURRENT_DATE,
                'profile_update'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger safely
DROP TRIGGER IF EXISTS trg_maintain_supervisor_history ON public.user_profile;

CREATE TRIGGER trg_maintain_supervisor_history
AFTER UPDATE ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION public.maintain_supervisor_history();
