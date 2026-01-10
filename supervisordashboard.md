# Supervisor Dashboard Overhaul Plan

## Goal
Implement a complete overhaul of the **Supervisor Dashboard** to match the provided mockup. This dashboard serves as the central hub for Educational Supervisors to manage their trainees, view statistics, and handle sign-offs.

## Architecture

### 1. New Component: `views/SupervisorDashboard.tsx`
We will create a new standalone component to replace any existing placeholder.

**Props:**
- `currentUser`: UserProfile (The supervisor)
- `onViewTrainee`: (traineeId: string) => void
- `onViewInbox`: () => void
- `onLogout`: () => void

### 2. Layout Structure
The layout follows a **Two-Column Grid** (approx 1:3 ratio):

#### Left Sidebar (Fixed / Col-span-3)
1.  **User Profile Widget**:
    - Supervisor Name, "Active Deanery connections", Deanery Name.
    - Roles list (Supervisor, ARCP Panel).
    - Edit Icon (for profile settings).
2.  **Mini Inbox**:
    - Header: "Inbox", "Trainee notifications".
    - Filter: "Unread only (N)".
    - List: Compact notification items (Icon + Title + Subtitle).
    - Action: "VIEW INBOX" button (navigates to full inbox).

#### Main Content Area (Col-span-9)
1.  **Header**:
    - Tabs: **DASHBOARD** (Active) | **SIGN OFFS**.
    - Settings Icon (Top right).
2.  **"Educational supervisor for:" Section**:
    - List of Trainees assigned to this supervisor.
    - **Trainee Card (Expanded)**:
        - **Header**: Avatar, Name, Grade (ST3), Deanery.
        - **Grid Info**:
            - FTE, ARCP Month, CCT Date, Next ARCP Date.
        - **Stats & status**:
            - **Current ARCP**: Status (e.g. "Full ARCP"), Date.
            - **EPAs**: List highest EPAs (e.g. "EPA Level 3: Oculoplastics").
            - **Forms**: "Forms pending sign off", "Forms signed off" (Lists or counts).
            - **Exam Results**: FRCOphth Part 1/2 status badges.
            - **Cataract Cases**: Box with Total (459), Breakdown (Performed/Supervised/Assisted), PCR Rate.
        - **Action**: "EYELOGBOOK" button.
3.  **"Inactive relationships" Section**:
    - Collapsed/Dimmed cards for previous trainees or inactive connections (Locked icon).

## Data Integration

### 1. Database Queries (Supabase)
We will leverage existing tables (`user_profile`, `evidence`, `arcp_prep`, `notifications`).

-   **Fetch Trainees**:
    ```sql
    SELECT * FROM user_profile
    WHERE supervisor_id = 'CURRENT_USER_ID'
    -- OR via supervisor_email if IDs aren't strictly linked yet, but ID is preferred.
    ```
-   **Trainee Stats**:
    -   Reuse the `phaco_*` columns in `user_profile` for the Cataract Stats box.
    -   Reuse `frcophth_*` columns for Exam Results.
    -   Reuse `arcp_*` columns for dates/status.
-   **Pending Forms**:
    -   Query `evidence` table:
    ```sql
    SELECT count(*), status FROM evidence
    WHERE trainee_id = 'TRAINEE_ID' AND status = 'SUBMITTED' -- or 'review_requested'
    ```
    -   *Note*: We might need to check if we use a specific status for "Waiting for Supervisor". Usually it's `SUBMITTED` or `REVIEW_REQUESTED`. If generic 'DRAFT'/'COMPLETE', we'll filter by "Requires Signoff".
-   **Inbox**:
    -   Query `notifications` table for `user_id = supervisor_id` AND `role_context = 'supervisor'`.

### 2. Reusing Code
-   **`GlassCard`**: Base container for all widgets.
-   **`Icons`**: Standard set from `lucide-react` (or similar library used in project).
-   **`ARCPPanelDashboard.tsx` Logic**:
    -   We effectively are building a "Supervisor View" version of the ARCP Panel.
    -   We can reuse `renderTraineeRow` logic but apply the **New Styling** from the mockup.

## Styling Strategy

-   **Theme**: Light, clean, "Medical/Professional".
-   **Colors**:
    -   Backgrounds: White cards (`bg-white/80` or `GlassCard`).
    -   Accents: Indigo/Purple gradients for Avatars (`bg-gradient-to-br from-indigo-400 to-purple-500`).
    -   Text: `slate-900` (headings), `slate-500` (labels).
    -   Badges: `bg-green-100 text-green-700` (Pass/Success), `bg-indigo-50 text-indigo-600` (Info).
-   **Typography**: Consistent sans-serif (Inter/System). Labels are often Uppercase + Trackingider (e.g. "CCT DATE").

## Implementation Steps

1.  **Create `SupervisorDashboard.tsx`**.
2.  **Implement Layout**: Sidebar + Main Content Grid.
3.  **Implement Data Fetching**:
    -   `useEffect` to load Supervisor's trainees.
    -   `useEffect` to load Notifications.
4.  **Build Components**:
    -   `SupervisorProfileCard`: Left sidebar top.
    -   `MiniInbox`: Left sidebar middle.
    -   `TraineeCard`: The complex card with stats.
        -   *Crucial*: Implement the "Cataract Cases" stats box on the right side of the card as shown in mockup.
5.  **Route Integration in `App.tsx`**: Ensure `View.SupervisorDashboard` is reachable.

## Discrepancies / Notes
-   **Fonts/Colors**: Mockup fonts might differ slightly from current app. We will use the app's existing font stack but adapt sizes/weights to match the visual hierarchy of the mockup.
-   **"Forms pending sign off"**: Depending on current DB structure, we might simulate this or query purely based on `status != 'SignedOff'`.

This plan is ready for review.
