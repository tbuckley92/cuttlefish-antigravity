-- Create a view to easily fetch inactive relationships
-- This view filters out trainees who have an active relationship with the supervisor
-- ensuring they don't appear in both lists.

CREATE OR REPLACE VIEW public.inactive_supervisor_relationships_view
WITH (security_invoker = true) -- Use RLS of the querying user
AS
SELECT DISTINCT ON (sh.trainee_id, sh.supervisor_email)
    sh.id AS history_id,
    sh.trainee_id,
    sh.supervisor_email,
    sh.supervisor_name,
    sh.start_date,
    sh.end_date,
    up.name AS trainee_name,
    up.grade AS trainee_grade,
    up.email AS trainee_email
FROM public.supervisor_history sh
LEFT JOIN public.user_profile up ON sh.trainee_id = up.user_id
WHERE sh.end_date IS NOT NULL
  -- Exclude if there is an active relationship for the same supervisor/trainee pair
  AND NOT EXISTS (
      SELECT 1 
      FROM public.supervisor_history active 
      WHERE active.trainee_id = sh.trainee_id
        AND active.supervisor_email = sh.supervisor_email
        AND active.end_date IS NULL
  )
ORDER BY sh.trainee_id, sh.supervisor_email, sh.end_date DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.inactive_supervisor_relationships_view TO authenticated;
