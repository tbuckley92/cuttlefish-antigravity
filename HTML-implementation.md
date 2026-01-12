# HTML "Time Capsule" Export - Implementation Plan

## Goal
Create a **single, self-contained HTML file** that serves as a permanent, offline-readable archive of the user's portfolio. It must work 20+ years from now without an internet connection or the original OphthaoPortfolio server.

## Design Philosophy
*   **Zero Dependencies:** No CDNs (Bootstrap/Tailwind), no external fonts, no external images.
*   **Single File:** Everything (CSS, JS, Data) is embedded.
*   **Readability:** Data is pre-rendered as HTML tables so it's readable even if JavaScript fails.

## Technical Architecture

### 1. The Utility: `utils/htmlGenerator.ts`
A new utility file handles the generation. It constructs a large string using template literals.

### 2. Styling (CSS)
*   **Technique:** Embed a `<style>` block in the `<head>`.
*   **Theme:** Minimalist, print-friendly CSS. Clean typography (Simulated system fonts).
*   **Print Support:** `@media print` rules to ensure the logbook prints nicely to PDF export if the user "Prints to PDF" from the browser.

### 3. Data Rendering
*   **Profile Section:** Header with user details (Name, GMC, RCOphth) and **Generated Date/Time**.
*   **Progress & Curriculum:** A visualization of the user's progress.
    *   **Levels:** Breakdown of L1-L4 progress.
    *   **SIAs:** Status of the 12 Special Interest Areas.
    *   **GSAT:** Summary of Generic Surgical Assessment Tool scores.
*   **Summary Stats:** Simple grid showing total procedures, complications, etc.
*   **Logbook Table:** A full HTML table of all procedures.
    *   Columns: Date, ID, Procedure, Role, Grade, Complications.
    *   *Optimization:* If list is huge (>5000), we might paginate or just render all (browser handles 5000 rows fine).
*   **Evidence & Portfolio:** A comprehensive table of all other evidence (WBAs, CBDs, Mini-CEX, Reflections).
    *   Columns: Date, Type, Title, Description, Supervisor, Tags.
    *   *Note:* The actual PDF/Image attachments will NOT be embedded (to keep file size manageable), but the *record* of the evidence will be permanently preserved.
*   **Complications Log:** Separate table emphasizing complications.

### 4. Interactivity (Vanilla JS)
We will include a small `<script>` block (approx. 50 lines of Vanilla JS) to allow:
*   **Search/Filter:** Simple text input to hide table rows that don't match.
*   **Sort:** Click headers to sort.
*   *Note:* The page must remain functional even if this script breaks.

### 5. Images & Attachments
*   **Logo/Icons:** Converted to **Base64** strings and embedded directly in `<img>` tags.
*   **Evidence Files (PDFs):** 
    *   *Option A (Recommended):* Do not embed (files too big). List filenames and metadata only.
    *   *Option B:* User extracts ZIP bundle which contains `archive.html` and a `files/` folder. The HTML links to `./files/xxx.pdf`.

## Proposed User Flow
1. User goes to **Settings** or **My Data**.
2. Clicks **"Download Personal Archive (.html)"**.
3. Browser generates the `blob` locally and downloads `My_Logbook_Archive_[Date].html`.
4. User double-clicks file -> Opens in Chrome/Edge/Safari immediately.

## Development Checklist
- [ ] Create `utils/htmlGenerator.ts`
- [ ] Design CSS template (System fonts, clean tables)
- [ ] Implement `generateLogbookHTML(entries, profile)` function
- [ ] Add "Download HTML Archive" button in UI
