# Educational Supervisor Report (ESR) Implementation Plan

## Goal
Create an Educational Supervisor Report (ESR) interface that allows supervisors to review trainee progress, link evidence, and generate a report. The ESR will be saved as an evidence item in the trainee's portfolio.

## User Review Required
> [!IMPORTANT]
> - **Evidence Type**: A new `ESR` evidence type will be added.
> - **Navigation**: Access to this form will need to be added (likely from the Supervisor Dashboard or ARCP Panel).
> - **Data Persistence**: The ESR will be saved to the `evidence` table. Linked evidence (PDPs, GSAT, etc.) will be stored in the `data` JSONB column of the ESR record.

## Proposed Changes

### 1. Types & Constants
#### [MODIFY] [types.ts](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/types.ts)
- Add `ESR` to `EvidenceType` enum.
- Define `ESRFormData` interface for the specific fields (comments, linked evidence IDs).

### 2. Application Logic
#### [MODIFY] [App.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/App.tsx)
- Add `ESRForm` to `View` enum.
- Add `View.ESRForm` to `viewToEvidenceType` mapping.
- Add case in `renderView` (or equivalent switch) to render the `ESRForm` component.
- Add retrieval of specific trainee data (if not already handled by generic "viewingTrainee" logic).

### 3. New Views
#### [NEW] [views/ESRForm.tsx](file:///c:/Users/tmwbu/Documents/OphthaoPortfolio-AI-Studio - AG/views/ESRForm.tsx)
- **Layout**: 
    - **Left Panel**: Trainee details (Photo, Name, Grade, Deanery), Form R status (link to view Form R).
    - **Top Center**: Progress Section (reuse `Progress.tsx` or `TraineeSummary` logic).
    - **Right Panel**: Phacoemulsification summary and Eye Logbook link.
    - **Center Bottom**: Form Fields.
- **Form Sections**:
    - **PDP**: List current PDPs from profile. Fields for 'Agreed action' and 'Trainee appraisal'.
    - **Evidence Linking**: Sections for GSAT, EPAs, MSF, Last ESR.
        - Button to "Link Evidence" -> Opens `MyEvidence` in selection mode.
        - Display list of linked items with ability to remove.
    - **Comments**: Trainee comments, Educational Supervisor comments (Rich text or standard textarea).
    - **Actions**:
        - **Save Draft**: Saves to `evidence` table with status `Draft`.
        - **Email**: Trigger email logic (mock or real).
        - **In Person Sign Off**: Transition status to `Complete` (Signed Off). Requires Supervisor validation (if not already logged in as one).
- **Integration**:
    - Uses `MyEvidence` component for selecting evidence.
    - Saves results to `evidence` table.

## Verification Plan

### Automated Tests
- N/A (Project currently relies on manual testing).

### Manual Verification
1.  **Access**: Navigate to the ESR Form (via temporary button or route).
2.  **Display**: Verify Left Panel shows correct trainee details and Form R status.
3.  **Phaco Stats**: Verify Right Panel shows correct phaco numbers.
4.  **Linking**:
    *   Click "Link Evidence" for GSAT. Select items. Verify they appear in the list.
    *   Repeat for EPAs, MSF.
5.  **PDP**: Verify PDPs are listed and editable.
6.  **Save Draft**: Click "Save Draft". Check "My Evidence" to see the new Draft ESR item.
7.  **Persistence**: Reload page/re-open draft. Verify all links and text remain.
8.  **Sign Off**: Complete details and Sign Off. Verify status changes to `Complete`.
