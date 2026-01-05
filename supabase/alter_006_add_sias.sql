-- Add sias column to user_profile to store active EPAs
alter table public.user_profile
add column if not exists sias jsonb default '[]'::jsonb;

comment on column public.user_profile.sias is 'List of active EPAs (SIAs) for the user';
