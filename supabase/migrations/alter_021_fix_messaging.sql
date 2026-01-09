-- ============================================
-- Fix Messaging Permissions & Scheduled Messages
-- ============================================

-- VALIDATION: Ensure functions and policies are updated safely

-- 1. Function to process scheduled messages
CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as superuser to bypass RLS
AS $$
DECLARE
    msg RECORD;
BEGIN
    -- Loop through scheduled messages that are due
    FOR msg IN 
        SELECT * FROM public.deanery_messages 
        WHERE status = 'SCHEDULED' 
        AND scheduled_at <= NOW()
    LOOP
        -- 1. Create notifications for all recipients
        -- We use the 'recipients' JSONB column which contains [{id, name, role, ...}]
        INSERT INTO public.notifications (user_id, role_context, type, title, body, reference_id, reference_type, attachments)
        SELECT 
            (r->>'id')::uuid,
            CASE 
                WHEN (r->>'role') = 'educational_supervisor' THEN 'supervisor'
                WHEN (r->>'role') = 'clinical_supervisor' THEN 'supervisor'
                WHEN (r->>'role') IS NOT NULL THEN (r->>'role')
                ELSE 'trainee'
            END,
            'deanery_broadcast',
            msg.subject,
            msg.body,
            msg.id,
            'deanery_message',
            msg.attachments
        FROM jsonb_array_elements(msg.recipients) AS r;
        
        -- 2. Update message status
        UPDATE public.deanery_messages 
        SET status = 'SENT', sent_at = NOW() 
        WHERE id = msg.id;
        
    END LOOP;
END;
$$;

-- 2. Update Notifications Policy to allow ARCPSuperuser
-- The existing 'notifications_insert_admin' only allows 'Admin'.
-- We replace it with one that allows 'Admin' OR 'ARCPSuperuser'.

DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_superuser" ON public.notifications;

CREATE POLICY "notifications_insert_superuser"
ON public.notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() 
    AND (
      'Admin' = ANY(up.roles) 
      OR 'ARCPSuperuser' = ANY(up.roles)
      OR 'ARCPPanelMember' = ANY(up.roles) -- Potentially
    )
  )
);
