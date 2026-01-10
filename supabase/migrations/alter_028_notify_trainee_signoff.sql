-- Migration: Add Notification Trigger for Evidence Sign-Off
-- This notifies the Trainee when their evidence is Signed Off

CREATE OR REPLACE FUNCTION public.handle_evidence_signoff_notification()
RETURNS TRIGGER AS $$
DECLARE
  supervisor_name_text TEXT;
BEGIN
  -- Only proceed if status is 'SignedOff'
  -- And either it's a new record (unlikely to be SignedOff immediately but possible) OR the status changed to 'SignedOff'
  IF (TG_OP = 'INSERT' AND NEW.status = 'SignedOff') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'SignedOff' AND OLD.status <> 'SignedOff') THEN
     
     -- Determine Supervisor Name for the message
     supervisor_name_text := COALESCE(NEW.supervisor_name, 'A Supervisor');

     -- Create notification for the Trainee
     -- We assume NEW.trainee_id is the content owner
     IF NEW.trainee_id IS NOT NULL THEN
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
         NEW.trainee_id,
         'trainee', -- Role context for the recipient
         'evidence_approved',
         'Evidence Signed Off',
         supervisor_name_text || ' has signed off ' || COALESCE(NEW.title, 'your evidence') || '.',
         NEW.id,
         'evidence',
         false,
         NOW(),
         jsonb_build_object('sender', supervisor_name_text)
       );
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger on the evidence table
DROP TRIGGER IF EXISTS trg_evidence_signoff_notification ON public.evidence;

CREATE TRIGGER trg_evidence_signoff_notification
AFTER INSERT OR UPDATE ON public.evidence
FOR EACH ROW
EXECUTE FUNCTION public.handle_evidence_signoff_notification();

COMMENT ON FUNCTION public.handle_evidence_signoff_notification IS 'Automatically creates a notification for the trainee when evidence is signed off';
