-- Migration: add supervisor_gmc column to user_profile
-- Run this if the table already exists without the column.

alter table public.user_profile
add column if not exists supervisor_gmc text null;
