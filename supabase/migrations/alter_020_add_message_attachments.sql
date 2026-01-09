-- Migration: Add Attachments to Deanery Messages and Notifications
-- Run this in Supabase SQL Editor

-- 1. Add attachments column to deanery_messages
ALTER TABLE public.deanery_messages 
ADD COLUMN IF NOT EXISTS attachments jsonb[] DEFAULT '{}';

COMMENT ON COLUMN public.deanery_messages.attachments IS 'Array of {name, url, type, size} objects';

-- 2. Add attachments column to notifications (to allow recipients to see them)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS attachments jsonb[] DEFAULT '{}';

COMMENT ON COLUMN public.notifications.attachments IS 'Snapshot of attachments from the source message';

-- 3. Storage Setup for Attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies

-- Allow 'authenticated' users to read all message attachments (simple access control for internal system)
-- Alternatively, we could restrict via join, but storage policies with joins are expensive. 
CREATE POLICY "Authenticated users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow users to upload attachments (any authenticated user, effectively. Or restrict to Admins/Superusers?)
-- For now, let's allow authenticated users to upload to their own folder structure if needed, or just generally.
-- We'll assume structure: "sender_id/filename"
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
