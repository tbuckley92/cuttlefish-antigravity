-- Migration: Add Deanery Messaging System for ARCP Superusers
-- Run this in Supabase SQL Editor

-- ============================================
-- DEANERY MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.deanery_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  deanery text NOT NULL,
  recipient_ids uuid[] NOT NULL DEFAULT '{}',
  recipient_list_type text, -- 'trainees', 'supervisors', 'arcp_panel', 'custom'
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, SCHEDULED, SENT, DELETED
  scheduled_at timestamptz, -- NULL = send immediately when status changes to SENT
  sent_at timestamptz,
  deleted_at timestamptz, -- Soft delete for "Deleted Items"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS ix_deanery_messages_sender ON public.deanery_messages(sender_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_deanery_messages_scheduled ON public.deanery_messages(status, scheduled_at) WHERE status = 'SCHEDULED';
CREATE INDEX IF NOT EXISTS ix_deanery_messages_deanery ON public.deanery_messages(deanery, status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_deanery_messages_updated_at ON public.deanery_messages;
CREATE TRIGGER trg_deanery_messages_updated_at
BEFORE UPDATE ON public.deanery_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.deanery_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- ARCP Superusers can read their own messages (any status)
DROP POLICY IF EXISTS "deanery_messages_select_own" ON public.deanery_messages;
CREATE POLICY "deanery_messages_select_own"
ON public.deanery_messages FOR SELECT
USING (auth.uid() = sender_id);

-- ARCP Superusers can create messages in their own deanery
DROP POLICY IF EXISTS "deanery_messages_insert_own" ON public.deanery_messages;
CREATE POLICY "deanery_messages_insert_own"
ON public.deanery_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
      AND 'ARCPSuperuser' = ANY(up.roles)
      AND up.deanery = deanery
  )
);

-- ARCP Superusers can update their own messages
DROP POLICY IF EXISTS "deanery_messages_update_own" ON public.deanery_messages;
CREATE POLICY "deanery_messages_update_own"
ON public.deanery_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- ARCP Superusers can delete their own messages
DROP POLICY IF EXISTS "deanery_messages_delete_own" ON public.deanery_messages;
CREATE POLICY "deanery_messages_delete_own"
ON public.deanery_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Admin can read all messages
DROP POLICY IF EXISTS "deanery_messages_select_admin" ON public.deanery_messages;
CREATE POLICY "deanery_messages_select_admin"
ON public.deanery_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid() AND 'Admin' = ANY(up.roles)
  )
);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.deanery_messages IS 'Messages composed by ARCP Superusers for deanery-wide communication';
COMMENT ON COLUMN public.deanery_messages.status IS 'Message workflow: DRAFT, SCHEDULED, SENT, DELETED';
COMMENT ON COLUMN public.deanery_messages.recipient_list_type IS 'Mailing list used: trainees, supervisors, arcp_panel, or custom for individual selection';
COMMENT ON COLUMN public.deanery_messages.scheduled_at IS 'When to send the message (NULL means send immediately)';
COMMENT ON COLUMN public.deanery_messages.deleted_at IS 'Soft delete timestamp for Deleted Items folder';
