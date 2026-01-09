-- Test Data Generation for Tickets
-- Run this in Supabase SQL Editor to create sample tickets from other users
-- Excludes user 59fa8b20-6f49-42dd-963a-91982f77cb7a (the admin)

-- Create tickets from other users in user_profile
INSERT INTO public.tickets (user_id, user_name, user_email, subject, status, is_urgent, status_history, created_at)
SELECT 
  up.user_id,
  up.name,
  au.email,
  subject_data.subject,
  subject_data.status,
  subject_data.is_urgent,
  CASE 
    WHEN subject_data.status = 'OPEN' THEN '[]'::jsonb
    WHEN subject_data.status = 'IN_PROGRESS' THEN jsonb_build_array(
      jsonb_build_object('status', 'IN_PROGRESS', 'changedBy', '59fa8b20-6f49-42dd-963a-91982f77cb7a', 'changedAt', now() - interval '1 day')
    )
    ELSE '[]'::jsonb
  END,
  now() - (subject_data.days_ago || ' days')::interval
FROM public.user_profile up
JOIN auth.users au ON au.id = up.user_id
CROSS JOIN (
  VALUES 
    ('Unable to access EPA form for L2 Cataract Surgery', 'OPEN', true, 1),
    ('Question about ARCP preparation requirements', 'OPEN', false, 3),
    ('Need clarification on MSF submission deadline', 'IN_PROGRESS', false, 5),
    ('Error when uploading evidence PDF', 'OPEN', true, 0),
    ('How do I link Form R to ARCP Prep?', 'OPEN', false, 2),
    ('Supervisor details not appearing correctly', 'IN_PROGRESS', false, 7),
    ('Request to change training deanery', 'OPEN', false, 4),
    ('Eye logbook sync issue with Medisoft', 'OPEN', true, 1)
) AS subject_data(subject, status, is_urgent, days_ago)
WHERE up.user_id != '59fa8b20-6f49-42dd-963a-91982f77cb7a'::uuid
LIMIT 10;

-- Add initial messages for the tickets we just created
INSERT INTO public.ticket_messages (ticket_id, sender_id, sender_name, sender_role, message, created_at)
SELECT 
  t.id,
  t.user_id,
  t.user_name,
  'user',
  CASE 
    WHEN t.subject LIKE '%EPA%' THEN 'I''ve been trying to complete my EPA form but the submit button is greyed out. I''ve filled in all required fields. Can you help?'
    WHEN t.subject LIKE '%ARCP%' THEN 'I''m preparing for my upcoming ARCP in March. Can you provide a checklist of everything I need to have completed?'
    WHEN t.subject LIKE '%MSF%' THEN 'I started my MSF assessment but I''m confused about the response deadline. Is it 2 weeks or 4 weeks?'
    WHEN t.subject LIKE '%PDF%' THEN 'Every time I try to upload a PDF evidence file, I get a network error. The file is only 2MB.'
    WHEN t.subject LIKE '%Form R%' THEN 'I have my Form R saved but can''t find where to link it to my ARCP Prep section. Where is this option?'
    WHEN t.subject LIKE '%Supervisor%' THEN 'My supervisor changed last month but the old supervisor name still shows on my dashboard. How do I update this?'
    WHEN t.subject LIKE '%deanery%' THEN 'I''m transferring from North West to London in August. What''s the process for updating my deanery in the system?'
    WHEN t.subject LIKE '%Medisoft%' THEN 'My phaco cases from Medisoft aren''t syncing to the eye logbook. Last successful sync was 3 weeks ago.'
    ELSE 'Please help with this issue.'
  END,
  t.created_at + interval '1 minute'
FROM public.tickets t
WHERE t.created_at > now() - interval '10 days';

-- Add admin response to IN_PROGRESS tickets
INSERT INTO public.ticket_messages (ticket_id, sender_id, sender_name, sender_role, message, created_at)
SELECT 
  t.id,
  '59fa8b20-6f49-42dd-963a-91982f77cb7a'::uuid,
  'Admin',
  'admin',
  CASE 
    WHEN t.subject LIKE '%MSF%' THEN 'Hi! The MSF response deadline is 4 weeks from when you send the invitation. You can see the deadline on each pending response. Let me know if you need anything else!'
    WHEN t.subject LIKE '%Supervisor%' THEN 'Thanks for reaching out. I can see your ES record needs updating. I''ve made the change on our end - please log out and back in to see the update. Let me know if it''s still showing incorrectly.'
    ELSE 'Thank you for contacting us. We''re looking into this issue.'
  END,
  t.created_at + interval '1 day'
FROM public.tickets t
WHERE t.status = 'IN_PROGRESS' AND t.created_at > now() - interval '10 days';

-- Verify: Show created tickets
SELECT 
  t.id,
  t.user_name,
  t.subject,
  t.status,
  t.is_urgent,
  t.created_at,
  (SELECT COUNT(*) FROM public.ticket_messages tm WHERE tm.ticket_id = t.id) as message_count
FROM public.tickets t
ORDER BY t.created_at DESC;
