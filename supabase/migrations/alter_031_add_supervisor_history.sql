-- Migration: Add Supervisor History Table and Triggers
-- Run this in Supabase SQL Editor

-- 1. Create the history table
CREATE TABLE IF NOT EXISTS public.supervisor_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supervisor_email text,
    supervisor_name text,
    supervisor_gmc text,
    start_date date DEFAULT CURRENT_DATE,
    end_date date, -- NULL means currently active
    source text DEFAULT 'profile_update', -- 'profile_update', 'arcp_prep', etc.
    created_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS ix_supervisor_history_trainee ON public.supervisor_history(trainee_id);
CREATE INDEX IF NOT EXISTS ix_supervisor_history_sup_email ON public.supervisor_history(supervisor_email);

-- Enable RLS
ALTER TABLE public.supervisor_history ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies

-- Trainees can view their own history
CREATE POLICY "trainee_view_own_history"
ON public.supervisor_history FOR SELECT
USING (auth.uid() = trainee_id);

-- Supervisors can view history where they are the supervisor
CREATE POLICY "supervisor_view_history"
ON public.supervisor_history FOR SELECT
USING (supervisor_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR 
       supervisor_email = (SELECT email FROM public.user_profile WHERE user_id = auth.uid()));

-- Admin can view all
CREATE POLICY "admin_view_history"
ON public.supervisor_history FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_profile WHERE user_id = auth.uid() AND 'Admin' = ANY(roles)));


-- 3. Trigger Function to auto-maintain history on profile update

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

-- 4. Create Trigger on user_profile
DROP TRIGGER IF EXISTS trg_maintain_supervisor_history ON public.user_profile;

CREATE TRIGGER trg_maintain_supervisor_history
AFTER UPDATE ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION public.maintain_supervisor_history();

-- 5. Backfill/Init (Optional - strictly for existing data if needed, usually cleaner to start fresh or run a separate script)
-- For this migration, we won't auto-backfill to avoid duplicates if run multiple times, 
-- but in production you might want to insert current relationships as the 'start' of history.
