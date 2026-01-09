-- ============================================
-- Messaging UX Improvements
-- ============================================

-- 1. Add metadata column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN public.notifications.metadata IS 'Flexible metadata for notifications (e.g., sender info)';

-- 2. Update process_scheduled_messages to include sender info in metadata
CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
        -- Create notifications with metadata
        INSERT INTO public.notifications (
            user_id, role_context, type, title, body, 
            reference_id, reference_type, attachments, metadata
        )
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
            msg.attachments,
            jsonb_build_object(
                'sender', msg.sender_name, 
                'senderId', msg.sender_id,
                'sentAt', NOW()
            )
        FROM jsonb_array_elements(msg.recipients) AS r;
        
        -- Update message status
        UPDATE public.deanery_messages 
        SET status = 'SENT', sent_at = NOW() 
        WHERE id = msg.id;
    END LOOP;
END;
$$;
