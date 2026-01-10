# Inactive Relationships Implementation Plan

## Goal Description
Implement the "Inactive relationships" section in the `SupervisorDashboard`. This section will display trainees who have listed the current supervisor as their "Last Educational Supervisor" in their ARCP Preparation form. This relies on the `last_ES` JSONB field in the `arcp_prep` table.

## User Review Required
> [!IMPORTANT]
> **Data Persistence Limitation**: The `arcp_prep` table is a singleton per trainee (one row per user). This means we can only track the *most recent* "Last Educational Supervisor" entered by the trainee. If a trainee changes their "Last ES" multiple times, only the latest one will show up as an inactive relationship. Historical relationships beyond the immediate last one are not preserved in the current schema without creating a new history table.
>
> **Matching Logic**: Relationships are matched by **Email**. If the trainee enters a typo in the email address in `arcp_prep`, the relationship will not appear.

## Proposed Changes

### Backend (Supabase)

#### [NEW] [alter_031_add_supervisor_history.sql](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/supabase/migrations/alter_031_add_supervisor_history.sql)
-   Create `supervisor_history` table:
    -   `id` (uuid)
    -   `trainee_id` (uuid, FK to auth.users)
    -   `supervisor_email` (text)
    -   `supervisor_name` (text)
    -   `supervisor_gmc` (text)
    -   `start_date` (date, default now)
    -   `end_date` (date, nullable - null means active)
    -   `source` (text, e.g., 'profile_update', 'arcp_prep')
-   Create Trigger on `user_profile`:
    -   When `supervisor_email` changes:
        1.  Update the *existing* active history record for the old email (if any) -> set `end_date` = now().
        2.  Insert a *new* active history record for the new email.

#### [MODIFY] [App.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/App.tsx)
-   Update `handleUpdateProfile` (or ensure the trigger handles it entirely). The trigger approach is more robust.

### Frontend

#### [MODIFY] [SupervisorDashboard.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/views/SupervisorDashboard.tsx)
-   Update logic to fetch inactive relationships from `supervisor_history` table instead of `arcp_prep`.
-   Query: `supabase.from('supervisor_history').select('*').eq('supervisor_email', supervisor.email).not('end_date', 'is', null)`
-   Display these as the "Inactive relationships".


## Verification Plan

### Manual Verification
1.  **Pre-requisite**: Ensure there is a Trainee user (e.g., "Thomas Trainee") and a Supervisor (e.g., "Supervisor Sam").
2.  **Step 1 (Trainee)**: Log in as "Thomas Trainee".
3.  **Step 2 (Trainee)**: Go to ARCP Preparation.
4.  **Step 3 (Trainee)**: In "Educational Supervisors" -> "Last Educational Supervisor", enter "Supervisor Sam" and Sam's email. Save.
5.  **Step 4 (Supervisor)**: Log in as "Supervisor Sam".
6.  **Step 5 (Supervisor)**: Go to Dashboard.
7.  **Step 6 (Supervisor)**: Verify "Thomas Trainee" appears in "Inactive relationships".
8.  **Step 7 (Supervisor)**: Verify "Thomas Trainee" does *not* appear in "Active relationships" (unless they are also the current supervisor, which is an edge case but valid).
