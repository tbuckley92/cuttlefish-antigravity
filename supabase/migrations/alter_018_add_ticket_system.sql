-- Migration: Add Ticket System and Notifications
-- Run this in Supabase SQL Editor

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
  is_urgent boolean NOT NULL DEFAULT false,
  status_history jsonb DEFAULT '[]'::jsonb, -- Audit trail for status changes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS ix_tickets_user ON public.tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_tickets_status ON public.tickets(status, is_urgent, created_at DESC);

-- Updated_at trigger for tickets
DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- TICKET MESSAGES TABLE (Threaded conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_name text NOT NULL,
  sender_role text NOT NULL, -- 'user' or 'admin'
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for message lookups
CREATE INDEX IF NOT EXISTS ix_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at ASC);

-- ============================================
-- NOTIFICATIONS TABLE (Role-scoped inbox)
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_context text NOT NULL, -- 'trainee', 'supervisor', 'arcp_panel', 'admin'
  type text NOT NULL, -- 'ticket_created', 'ticket_response', 'ticket_status_change', 'form_signed', 'arcp_outcome'
  title text NOT NULL,
  body text,
  reference_id uuid, -- links to ticket/evidence/arcp_outcome (nullable for deleted references)
  reference_type text, -- 'ticket', 'evidence', 'arcp_outcome'
  email_sent boolean NOT NULL DEFAULT false, -- for future Resend integration
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient notification queries
CREATE INDEX IF NOT EXISTS ix_notifications_user_role ON public.notifications(user_id, role_context, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notifications_reference ON public.notifications(reference_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TICKETS RLS POLICIES
-- ============================================

-- Users can read their own tickets
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own"
ON public.tickets FOR SELECT
USING (auth.uid() = user_id);

-- Admin can read all tickets (except their own in admin context - handled in app)
DROP POLICY IF EXISTS "tickets_select_admin" ON public.tickets;
CREATE POLICY "tickets_select_admin"
ON public.tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Users can create their own tickets
DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited - mainly for urgency toggle)
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own"
ON public.tickets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can update any ticket (status changes, etc.)
DROP POLICY IF EXISTS "tickets_update_admin" ON public.tickets;
CREATE POLICY "tickets_update_admin"
ON public.tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- ============================================
-- TICKET MESSAGES RLS POLICIES
-- ============================================

-- Users can read messages on their own tickets
DROP POLICY IF EXISTS "ticket_messages_select_own" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_own"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND t.user_id = auth.uid()
  )
);

-- Admin can read all messages
DROP POLICY IF EXISTS "ticket_messages_select_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_admin"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Users can insert messages on their own OPEN/IN_PROGRESS tickets
DROP POLICY IF EXISTS "ticket_messages_insert_own" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_own"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id 
      AND t.user_id = auth.uid()
      AND t.status IN ('OPEN', 'IN_PROGRESS')
  )
);

-- Admin can insert messages on any ticket
DROP POLICY IF EXISTS "ticket_messages_insert_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_admin"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- ============================================
-- NOTIFICATIONS RLS POLICIES
-- ============================================

-- Users can read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can insert notifications for any user (for ticket responses)
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin"
ON public.notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- Users can insert notifications for themselves (self-notify on ticket creation for admin inbox)
-- This is primarily used by Edge Functions or server-side, but allow for flexibility
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system"
ON public.notifications FOR INSERT
WITH CHECK (true); -- Open insert for now; consider service_role key for production

-- Users can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.tickets IS 'Support tickets raised by users';
COMMENT ON TABLE public.ticket_messages IS 'Threaded messages within a ticket';
COMMENT ON TABLE public.notifications IS 'Role-scoped notification inbox for all users';
COMMENT ON COLUMN public.tickets.status_history IS 'JSON array of {status, changed_by, changed_at} for audit trail';
COMMENT ON COLUMN public.notifications.role_context IS 'Which dashboard inbox this notification appears in: trainee, supervisor, arcp_panel, admin';
COMMENT ON COLUMN public.notifications.email_sent IS 'Flag for future Resend email integration';
