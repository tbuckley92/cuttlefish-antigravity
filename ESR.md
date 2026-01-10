# Educational Supervisor Report (ESR) Implementation Plan

## Goal
Create an Educational Supervisor Report (ESR) interface that allows supervisors to review trainee progress, link evidence, and generate a report. The ESR will be saved as an evidence item in the trainee's portfolio.

## User Review Required
> [!IMPORTANT]
> - **Github branch**: create a new github branch from 'ticket-system-inbox' called esr-form-new
> - **Evidence Type**: A new `ESR` evidence type will be added.
> - **Navigation**: Access to this form will be via:
>   1. **Record Form** (Add Evidence) on the Trainee Dashboard.
>   2. **New Button** on the Trainee Dashboard, located above the "VIEW GSAT" button in the Educational Supervisor section.
> - **Data Persistence**: The ESR will be saved to the `evidence` table. Linked evidence (PDPs, GSAT, etc.) will be stored in the `data` JSONB column of the ESR record.

## Proposed Changes

### 1. Types & Constants
#### [MODIFY] [types.ts](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/types.ts)
- Add `ESR` to `EvidenceType` enum.
- Define `ESRFormData` interface for the specific fields.

### 2. Application Logic
#### [MODIFY] [App.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/App.tsx)
- Add `ESRForm` to `View` enum.
- Add `View.ESRForm` to `viewToEvidenceType` mapping.
- Update `renderView` to handle `View.ESRForm`.
- Handle navigation to `ESRForm`.

### 3. Navigation & Dashboard
#### [MODIFY] [views/RecordForm.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/views/RecordForm.tsx)
- Add `ESR` to the `formTypes` list so it appears as an option for trainees to start.

#### [MODIFY] [views/Dashboard.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/views/Dashboard.tsx)
- Add a new button "Create ESR Report" (or similar) in the Educational Supervisor card on the sidebar, above the "VIEW GSAT" button.
- Ensure this button navigates to the new `ESRForm`.

### 4. New Views
#### [NEW] [views/ESRForm.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/views/ESRForm.tsx)
- **Layout**: 
    - **Back Button**: Returns to dashboard/origin.
    - **Header**: "Educational Supervisor Report".
    - **Left Panel**: Trainee details (Photo, Name, Grade, Deanery), Form R status (link to view Form R).
    - **Top Center**: Progress Section (reuse `Progress.tsx` or `TraineeSummary` logic).
    - **Right Panel**: Phacoemulsification summary and Eye Logbook link.
    - **Center Bottom**: Form Fields.
- **Form Sections**:
    - **PDP**: List current PDPs from profile. Fields for 'Agreed action' and 'Trainee appraisal'.
    - **Evidence Linking**: Sections for GSAT, EPAs, MSF, Last ESR.
        - Button to "Link Evidence" -> Opens `MyEvidence` in selection mode.
        - Display list of linked items with ability to remove.
    - **Comments**: Trainee comments, Educational Supervisor comments.
    - **Actions**:
        - **Save Draft**: Saves to `evidence` table with status `Draft`.
        - **Email**: Trigger email logic.
        - **In Person Sign Off**: Transition status to `Complete`. Should require Supervisor credentials or specific "Sign Off" modal if not already authenticated as Supervisor.

## Verification Plan

### Automated Tests
- N/A (Project currently relies on manual testing).

### Manual Verification
1.  **Access**: 
    *   Click "Add Evidence" -> Verify "ESR" option exists.
    *   Click "Create ESR" from Dashboard Sidebar -> Verify navigation.
2.  **Display**: Verify Left Panel shows correct trainee details and Form R status.
3.  **Phaco Stats**: Verify Right Panel shows correct phaco numbers.
4.  **Linking**:
    *   Click "Link Evidence" for GSAT. Select items. Verify they appear in the list.
    *   Repeat for EPAs, MSF.
5.  **PDP**: Verify PDPs are listed and editable.
6.  **Save Draft**: Click "Save Draft". Check "My Evidence" to see the new Draft ESR item.
7.  **Persistence**: Reload page/re-open draft. Verify all links and text remain.
8.  **Sign Off**: Complete details and Sign Off. Verify status changes to `Complete`.
