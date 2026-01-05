-- Add supervisor details for in-person sign-off
alter table public.evidence 
add column if not exists supervisor_gmc text,
add column if not exists supervisor_name text,
add column if not exists supervisor_email text;

comment on column public.evidence.supervisor_gmc is 'GMC number of the supervisor who signed off in-person';
comment on column public.evidence.supervisor_name is 'Name of the supervisor who signed off in-person';
comment on column public.evidence.supervisor_email is 'Email of the supervisor who signed off in-person';
