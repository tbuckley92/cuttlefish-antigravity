# Add Exam Results Editing to Dashboard

## Overview
Add a dedicated edit button to the Exam Results section on the Dashboard that allows users to toggle which exams they have passed. The exam results will be saved to the user_profile database table.

## Current State
- Exam Results are displayed in the Dashboard sidebar (lines 477-522) as read-only badges
- Currently shows "PASS" (green) or "NOT PASSED" (gray) for each exam
- The database schema has fields: `frcophth_part1`, `frcophth_part2_written`, `frcophth_part2_viva`, `refraction_certificate`
- The `handleUpdateProfile` function in `App.tsx` (lines 298-322) does NOT currently save exam results to the database
- Exam results are stored in `UserProfile` as: `frcophthPart1`, `frcophthPart2Written`, `frcophthPart2Viva`, `refractionCertificate`

## Display Rules
- **When exam status = TRUE**: Display the exam with a green "PASS" badge
- **When exam status = FALSE**: Do NOT display the exam at all (hide it completely)

## Implementation

### 1. Update Dashboard.tsx

**Update display logic (lines 480-521):**
- Filter exams to only show those where status is `true`
- Remove the "NOT PASSED" badge display logic
- Only render exams that have `profile.frcophthPart1 === true` (and same for other exams)

**Add state for Exam Results editing:**
- Add `isEditingExams` state (similar to `isPDPModalOpen`)
- Add `tempExamResults` state to hold values during editing (all 4 exams)

**Add edit button to Exam Results section:**
- Add an Edit button (similar to PDP edit button on line 551-557)
- Position it next to the "EXAM RESULTS" heading

**Add toggle functionality when editing:**
- When `isEditingExams` is true, show ALL 4 exams with checkboxes or toggle buttons
- Allow users to check/uncheck which exams they have passed
- Use checkboxes or toggle buttons consistent with the UI design

**Add save/cancel handlers:**
- `handleSaveExams()`: Updates profile via `onUpdateProfile` with exam results (sets to `true` for checked, `false` for unchecked)
- `handleCancelExams()`: Resets `isEditingExams` to false

### 2. Update App.tsx - handleUpdateProfile function

**Add exam result fields to database update (lines 305-318):**
- Include `frcophth_part1: nextProfile.frcophthPart1 ?? false`
- Include `frcophth_part2_written: nextProfile.frcophthPart2Written ?? false`
- Include `frcophth_part2_viva: nextProfile.frcophthPart2Viva ?? false`
- Include `refraction_certificate: nextProfile.refractionCertificate ?? false`

These fields need to be added to the `payload` object before the database update on line 321.

## Files to Modify

1. **views/Dashboard.tsx**
   - Add state for exam editing
   - Add edit button to Exam Results section
   - Add toggle UI when editing
   - Add save/cancel handlers

2. **App.tsx**
   - Update `handleUpdateProfile` to include exam result fields in database payload

## UI Design
- Edit button should match the PDP edit button style (small icon button)
- When NOT editing: Only show exams with status = TRUE (green "PASS" badges)
- When editing: Show all 4 exams with checkboxes/toggles to select which are passed
- Toggle buttons/checkboxes should match existing UI design patterns
