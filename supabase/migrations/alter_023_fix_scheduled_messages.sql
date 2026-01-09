-- ============================================
-- Fix Scheduled Messages Processing
-- ============================================

-- The previous implementation of process_scheduled_messages referenced a non-existent 
-- 'recipients' JSONB column. The actual column is 'recipient_ids' (uuid[]).
-- We need to join with user_profile to get recipient details.

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
        -- Create notifications by unnesting recipient_ids and joining with user_profile
        INSERT INTO public.notifications (
            user_id, 
            role_context, 
            type, 
            title, 
            body, 
            reference_id, 
            reference_type, 
            attachments, 
            metadata
        )
        SELECT 
            u.user_id,
            CASE 
                WHEN 'EducationalSupervisor' = ANY(u.roles) THEN 'supervisor'
                WHEN 'ClinicalSupervisor' = ANY(u.roles) THEN 'supervisor'
                WHEN 'Supervisor' = ANY(u.roles) THEN 'supervisor'
                WHEN 'ARCPPanelMember' = ANY(u.roles) THEN 'arcp_panel'
                WHEN 'ARCPSuperuser' = ANY(u.roles) THEN 'arcp_panel'
                WHEN 'Admin' = ANY(u.roles) THEN 'admin'
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
        FROM unnest(msg.recipient_ids) AS rid
        JOIN public.user_profile u ON u.user_id = rid;
        
        -- Update message status
        UPDATE public.deanery_messages 
        SET status = 'SENT', sent_at = NOW() 
        WHERE id = msg.id;
    END LOOP;
END;
$$;
