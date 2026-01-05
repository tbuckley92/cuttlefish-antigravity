-- 1. Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('evidence-files', 'evidence-files', false)
on conflict (id) do nothing;

-- 2. Enable RLS (Already enabled by default in Supabase, skipping explicit enable to avoid permission errors)
-- alter table storage.objects enable row level security; 

-- 3. Policy: Allow users to upload files to their own folder (userid/*)
create policy "Users can upload their own evidence files"
on storage.objects for insert
with check (
  bucket_id = 'evidence-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policy: Allow users to view/download their own files
create policy "Users can view their own evidence files"
on storage.objects for select
using (
  bucket_id = 'evidence-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Policy: Allow users to update their own files
create policy "Users can update their own evidence files"
on storage.objects for update
using (
  bucket_id = 'evidence-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Policy: Allow users to delete their own files
create policy "Users can delete their own evidence files"
on storage.objects for delete
using (
  bucket_id = 'evidence-files' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);
