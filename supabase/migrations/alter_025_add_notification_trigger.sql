-- Migration: Add Notification Trigger for Evidence Submission
-- Run this in Supabase SQL Editor

-- 1. Create the function that will handle the evidence submission event
CREATE OR REPLACE FUNCTION public.handle_evidence_submission_notification()
RETURNS TRIGGER AS $$
DECLARE
  trainee_record RECORD;
  found_supervisor_id UUID;
  target_email TEXT;
BEGIN
  -- Only proceed if status is 'Submitted'
  -- And either it's a new record OR the status changed to 'Submitted'
  IF (TG_OP = 'INSERT' AND NEW.status = 'Submitted') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'Submitted' AND OLD.status <> 'Submitted') THEN
     
     -- Determine Supervisor Email
     target_email := NEW.supervisor_email;
     
     -- Try to find a User ID for this supervisor email
     -- This requires the Supervisor to have signed up with this email
     SELECT user_id INTO found_supervisor_id
     FROM public.user_profile
     WHERE email = target_email
     LIMIT 1;

     -- If we found a supervisor user, create a notification
     IF found_supervisor_id IS NOT NULL THEN
       
       -- Get Trainee Name?
       -- Ideally evidence table has trainee_id, but current schema might not link easily to name without join
       -- We'll try to get it if possible, or use generic text.
       -- Assuming NEW.trainee_id exists or we can infer it. 
       -- Let's check table definition... actually evidence table has 'trainee_id'.
       
       -- Get Trainee Name
       SELECT name INTO trainee_record
       FROM public.user_profile
       WHERE user_id = NEW.trainee_id; -- Assuming evidence.trainee_id is the trainee
       
       INSERT INTO public.notifications (
         user_id,
         role_context,
         type,
         title,
         body,
         reference_id,
         reference_type,
         is_read,
         created_at,
         metadata
       ) VALUES (
         found_supervisor_id,
         'supervisor',
         'form_submission',
         'Evidence Awaiting Review',
         COALESCE(trainee_record.name, 'A trainee') || ' has submitted ' || NEW.title || ' for your sign off.',
         NEW.id,
         'evidence',
         false,
         NOW(),
         jsonb_build_object('sender', COALESCE(trainee_record.name, 'Trainge System'))
       );
       
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger on the evidence table
DROP TRIGGER IF EXISTS trg_evidence_submission_notification ON public.evidence;

CREATE TRIGGER trg_evidence_submission_notification
AFTER INSERT OR UPDATE ON public.evidence
FOR EACH ROW
EXECUTE FUNCTION public.handle_evidence_submission_notification();

-- 3. Comments
COMMENT ON FUNCTION public.handle_evidence_submission_notification IS 'Automatically creates a notification for the supervisor when evidence is submitted';
