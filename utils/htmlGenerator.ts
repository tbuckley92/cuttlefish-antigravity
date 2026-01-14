import { EvidenceItem, UserProfile, SIA, EvidenceType, EvidenceStatus, PortfolioProgressItem, EyeLogbookEntry, EyeLogbookComplication } from '../types';

// Constants for Matrix
const SIAs = [
    "Oculoplastics",
    "Cornea & Ocular Surface Disease",
    "Cataract Surgery",
    "Glaucoma",
    "Uveitis",
    "Medical Retina",
    "Vitreoretinal Surgery",
    "Ocular Motility",
    "Neuro-ophthalmology",
    "Paediatric Ophthalmology",
    "Urgent Eye Care",
    "Community Ophthalmology",
    "GSAT"
];
const LEVELS = [1, 2, 3, 4];

export const generateLogbookHTML = (
    profile: UserProfile,
    evidence: EvidenceItem[],
    sias: SIA[],
    portfolioProgress: PortfolioProgressItem[],
    logbookEntries: EyeLogbookEntry[],
    complicationCases: EyeLogbookComplication[],
    localPathMap?: Map<string, string>
): string => {
    const generatedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // Filter evidence: Remove "Eye Logbook" PDF uploads from the main list as we show detailed rows
    // Also remove "Logbook" type if it refers to the generic uploads
    const displayEvidence = evidence.filter(e => e.type !== EvidenceType.Logbook && !e.title.includes("Eye Logbook -"));

    // --- Helper Logic for Progress Matrix ---
    const getStatus = (column: string, level: number): EvidenceStatus | null => {
        // 1. Check portfolio_progress
        if (portfolioProgress) {
            const item = portfolioProgress.find(p => p.sia === column && p.level === level);
            if (item && item.status === EvidenceStatus.SignedOff) return EvidenceStatus.SignedOff;
        }

        // 2. Check Profile Completions (Legacy/CatchUp/14Fish)
        const boxKey = `${column}-${level}`;
        if (profile?.fourteenFishCompletions?.[boxKey]) return EvidenceStatus.SignedOff;
        if (profile?.curriculumCatchUpCompletions?.[boxKey]) return EvidenceStatus.SignedOff;

        // 3. GSAT Logic
        if (column === "GSAT") {
            const match = evidence.find(e => e.type === EvidenceType.GSAT && e.level === level);
            return match ? match.status : null;
        }

        // 4. Generic EPA Logic (L1 & L2)
        if (level === 1 || level === 2) {
            const epas = evidence.filter(e => e.type === EvidenceType.EPA && e.level === level);
            if (epas.some(e => e.status === EvidenceStatus.SignedOff)) return EvidenceStatus.SignedOff;
            if (epas.some(e => e.status === EvidenceStatus.Submitted)) return EvidenceStatus.Submitted;
            // Check if incomplete items exist
            if (epas.length > 0) return EvidenceStatus.Draft;
            return null;
        }

        // 5. Specialty Logic (L3 & L4)
        // Simplify matching logic for export (ignoring complex casing map for now, assuming standard names)
        const match = evidence.find(e => {
            if (e.type !== EvidenceType.EPA || e.level !== level) return false;
            const evidenceSia = e.sia?.toLowerCase().trim() || "";
            const columnSia = column.toLowerCase().trim();
            return evidenceSia.includes(columnSia) || columnSia.includes(evidenceSia);
        });

        return match ? match.status : null;
    };

    const getCellClass = (status: EvidenceStatus | null): string => {
        switch (status) {
            case EvidenceStatus.SignedOff: return 'cell-complete';
            case EvidenceStatus.Submitted: return 'cell-submitted';
            case EvidenceStatus.Draft: return 'cell-draft';
            default: return 'cell-empty';
        }
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Archive - ${profile.name}</title>
    <style>
        /* Base Reset & Typography */
        :root {
            --primary: #4f46e5;
            --text-dark: #1e293b;
            --text-light: #64748b;
            --border: #e2e8f0;
            --bg-gray: #f8fafc;
            --success: #10b981;
            --warning: #f59e0b;
            --info: #3b82f6;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: var(--text-dark);
            margin: 0;
            padding: 0;
            background: white;
            font-size: 14px;
        }
        @media print {
            body { background: white; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .container { padding: 0; max-width: none; }
             table { page-break-inside: auto; }
             tr { page-break-inside: avoid; page-break-after: auto; }
        }

        /* Layout */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* Header */
        header {
            border-bottom: 2px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        h1 { margin: 0; font-size: 2.5rem; letter-spacing: -1px; }
        .meta { color: var(--text-light); font-size: 0.9rem; margin-top: 5px; }
        
        .profile-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
            background: var(--bg-gray);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        .profile-item label { 
            display: block; 
            font-size: 0.75rem; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            color: var(--text-light); 
            font-weight: 700;
        }
        .profile-item span { 
            font-size: 1.1rem; 
            font-weight: 500; 
        }

        /* Sections */
        section { margin-bottom: 60px; }
        h2 { 
            font-size: 1.8rem; 
            border-bottom: 1px solid var(--border); 
            padding-bottom: 10px; 
            margin-bottom: 25px;
            color: var(--primary);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* Tables */
        .table-wrapper {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            background: white;
        }

        /* Specific scrollable wrapper for long lists */
        .scrollable-y {
            max-height: 600px; /* Approx 15 rows */
            overflow-y: auto;
        }

        table {
            width: 100%;
            border-collapse: separate; /* Required for sticky header border */
            border-spacing: 0;
            font-size: 0.85rem;
            min-width: 800px; 
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        th {
            background: var(--bg-gray);
            font-weight: 700;
            color: var(--text-light);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
            z-index: 10;
            border-bottom: 1px solid #cbd5e1; /* Stronger border for header */
        }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #f8fafc; }

        /* Progress Matrix */
        .matrix-container {
            overflow-x: auto;
            margin-bottom: 30px;
        }
        .matrix-table {
            border-collapse: separate;
            border-spacing: 4px;
            width: 100%;
        }
        .matrix-table th {
            background: none;
            text-align: center;
            font-size: 0.7rem;
            vertical-align: bottom;
            height: 100px;
            white-space: nowrap;
        }
        .matrix-table th div {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            max-height: 100px;
            margin: 0 auto;
        }
        .matrix-row th {
            text-align: right;
            writing-mode: horizontal-tb;
            transform: none;
            height: auto;
            width: 50px;
            padding-right: 15px;
        }
        .matrix-cell {
            height: 40px;
            border-radius: 4px;
            transition: all 0.2s;
            border: 1px solid rgba(0,0,0,0.05);
        }
        .cell-complete { background-color: var(--success); opacity: 0.9; }
        .cell-submitted { background-color: var(--warning); opacity: 0.9; }
        .cell-draft { background-color: var(--info); opacity: 0.9; }
        .cell-empty { background-color: #f1f5f9; }
        
        /* Legend */
        .legend { display: flex; gap: 20px; margin-bottom: 20px; font-size: 0.8rem; }
        .legend-item { display: flex; items-center; gap: 5px; }
        .legend-box { width: 12px; height: 12px; border-radius: 3px; }

        /* Controls */
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .control-input {
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.9rem;
        }
        select.control-input {
             background-color: white;
             cursor: pointer;
        }

        /* Badges */
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-gray { background: #f1f5f9; color: #64748b; }

    </style>
</head>
<body>

<div class="container">
    <header>
        <h1>Portfolio Archive</h1>
        <div class="meta">Generated: ${generatedDate}</div>

        <div class="profile-grid">
            <div class="profile-item">
                <label>Name</label>
                <span>${profile.name || 'Unknown'}</span>
            </div>
            <div class="profile-item">
                <label>GMC Number</label>
                <span>${profile.gmcNumber || 'N/A'}</span>
            </div>
             <div class="profile-item">
                <label>Current Grade</label>
                <span>${profile.grade || 'N/A'}</span>
            </div>
             <div class="profile-item">
                <label>Supervisor</label>
                <span>${profile.supervisorName || 'N/A'}</span>
            </div>
             <div class="profile-item">
                <label>Deanery</label>
                <span>${profile.deanery || profile.location || 'N/A'}</span>
            </div>
        </div>
    </header>

    <section>
        <h2>Training Progress</h2>
        <div class="legend no-print">
            <div class="legend-item"><div class="legend-box" style="background:var(--success)"></div> Complete</div>
            <div class="legend-item"><div class="legend-box" style="background:var(--warning)"></div> In Progress</div>
            <div class="legend-item"><div class="legend-box" style="background:var(--info)"></div> Draft</div>
            <div class="legend-item"><div class="legend-box" style="background:#f1f5f9"></div> Not Started</div>
        </div>
        <div class="matrix-container">
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th style="width:50px"></th> <!-- Corner -->
                        ${SIAs.map(sia => `<th><div>${sia}</div></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${LEVELS.map(level => `
                        <tr class="matrix-row">
                            <th>L${level}</th>
                            ${SIAs.map(sia => {
        const status = getStatus(sia, level);
        const className = getCellClass(status);
        return `<td class="matrix-cell ${className}" title="${sia} L${level}: ${status || 'Not Started'}"></td>`;
    }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </section>

    <div class="page-break"></div>

    <section>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:15px;">
             <h2>Evidence Portfolio
                 <span style="font-size:0.9rem; font-weight:normal; color:var(--text-light); margin-left:10px;">
                    (${displayEvidence.length} items)
                </span>
            </h2>
            <div class="no-print" style="width: 300px;">
                <input type="text" id="evidenceSearch" class="search-input" placeholder="Search evidence..." onkeyup="filterTable('evidenceTable', 'evidenceSearch')">
            </div>
        </div>
        
        <div class="controls no-print">
             <select id="evType" class="control-input" onchange="filterEvidenceByType()" style="flex:1">
                <option value="">All Types</option>
                ${Array.from(new Set(displayEvidence.map(e => e.type))).sort().map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
             <select id="evStatus" class="control-input" onchange="filterEvidenceByStatus()" style="flex:1">
                 <option value="">All Statuses</option>
                 <option value="COMPLETE">Complete</option>
                 <option value="Submitted">Submitted</option>
                 <option value="Draft">Draft</option>
            </select>
        </div>

        <div class="table-wrapper scrollable-y">
            <table id="evidenceTable">
                <thead>
                    <tr>
                        <th onclick="sortTable('evidenceTable', 0)">Date</th>
                        <th onclick="sortTable('evidenceTable', 1)">Type</th>
                        <th onclick="sortTable('evidenceTable', 2)">Title / Description</th>
                        <th onclick="sortTable('evidenceTable', 3)">SIA / Level</th>
                        <th onclick="sortTable('evidenceTable', 4)">Status</th>
                        <th onclick="sortTable('evidenceTable', 5)">Signed Off By</th>
                        ${localPathMap ? '<th class="no-print">File</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${displayEvidence.map(item => {
        const localPath = localPathMap?.get(item.id);
        return `
                        <tr>
                            <td style="white-space:nowrap;">${item.date || '-'}</td>
                            <td><span class="badge badge-gray">${item.type}</span></td>
                            <td>
                                <strong>${escapeHtml(item.title)}</strong>
                                ${item.notes ? `<br><small style="color:var(--text-light)">${escapeHtml(item.notes.substring(0, 100))}${item.notes.length > 100 ? '...' : ''}</small>` : ''}
                            </td>
                            <td>
                                ${item.sia ? `${item.sia}` : '-'} 
                                ${item.level ? `<span style="opacity:0.6"> (L${item.level})</span>` : ''}
                            </td>
                            <td>
                                <span class="badge ${item.status === EvidenceStatus.SignedOff ? 'badge-green' : item.status === EvidenceStatus.Submitted ? 'badge-blue' : 'badge-gray'}">
                                    ${item.status}
                                </span>
                            </td>
                            <td>
                                ${item.supervisorName || '-'}
                                ${item.supervisorGmc ? `<br><small style="color:#999">GMC: ${item.supervisorGmc}</small>` : ''}
                            </td>
                            ${localPathMap ? `
                                <td class="no-print">
                                    ${localPath
                    ? `<a href="${localPath}" target="_blank" class="badge badge-blue" style="text-decoration:none;">View</a>`
                    : item.fileUrl
                        ? `<a href="${item.fileUrl}" target="_blank" class="badge badge-gray" style="text-decoration:none;">Online</a>`
                        : '-'
                }
                                </td>
                            ` : ''}
                        </tr>
                    `}).join('')}
                    ${displayEvidence.length === 0 ? '<tr><td colspan="${localPathMap ? 7 : 6}" style="text-align:center; padding: 30px; color:#999;">No evidence found in portfolio.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </section>

    <div class="page-break"></div>

    <section>
         <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:15px;">
            <h2>Procedure Logbook
                 <span style="font-size:0.9rem; font-weight:normal; color:var(--text-light); margin-left:10px;">
                    (${logbookEntries.length} entries)
                </span>
            </h2>
             <div class="no-print" style="display:flex; gap:10px; align-items:center;">
                 <button onclick="downloadCSV()" style="padding:8px 16px; background:var(--primary); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Export CSV</button>
                <input type="text" id="logbookSearch" class="search-input" placeholder="Search procedures..." onkeyup="filterTable('logbookTable', 'logbookSearch')" style="width:250px; margin-bottom:0;">
            </div>
        </div>
        
        <div class="controls no-print">
             <select id="logRole" class="control-input" onchange="filterLogbook()" style="flex:1">
                <option value="">All Roles</option>
                <option value="P">Performed (P)</option>
                <option value="PS">Performed Supervised (PS)</option>
                <option value="A">Assisted (A)</option>
                <option value="SJ">Supervised Junior (SJ)</option>
            </select>
        </div>

        <div class="table-wrapper scrollable-y">
            <table id="logbookTable">
                <thead>
                    <tr>
                        <th onclick="sortTable('logbookTable', 0)">Date</th>
                        <th onclick="sortTable('logbookTable', 1)">Procedure</th>
                        <th onclick="sortTable('logbookTable', 2)">Role</th>
                        <th onclick="sortTable('logbookTable', 3)">Grade</th>
                        <th onclick="sortTable('logbookTable', 4)">Side</th>
                        <th onclick="sortTable('logbookTable', 5)">Hospital</th>
                        <th onclick="sortTable('logbookTable', 6)">Patient ID</th>
                        <th onclick="sortTable('logbookTable', 7)">Complication</th>
                    </tr>
                </thead>
                <tbody>
                    ${logbookEntries.map(entry => {
                    // Check for attached complication
                    const entryId = (entry as any).id;
                    const hasComp = complicationCases.some(c => c.eyelogbook_entry_id === entryId);

                    return `
                        <tr>
                            <td style="white-space:nowrap;">${entry.procedure_date || '-'}</td>
                            <td>${escapeHtml(entry.procedure)}</td>
                            <td>${entry.role || '-'}</td>
                            <td>${entry.trainee_grade || '-'}</td>
                            <td>${entry.side || '-'}</td>
                            <td>${escapeHtml(entry.hospital)}</td>
                            <td>${entry.patient_id || '-'}</td>
                            <td>
                                ${hasComp
                            ? `<span style="color:#ef4444; font-weight:bold;">Yes</span>`
                            : `<span style="color:#ccc; font-size:0.8rem;">None</span>`}
                            </td>
                        </tr>
                    `}).join('')}
                    ${logbookEntries.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#999;">No logbook entries found.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </section>

     <div class="page-break"></div>

    <section>
        <h2>Complications Log
            <span style="font-size:0.9rem; font-weight:normal; color:var(--text-light); margin-left:10px;">
                (${complicationCases.length} cases)
            </span>
        </h2>

         <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                         <th>Date</th>
                         <th>Procedure</th>
                         <th>Complication(s)</th>
                         <th>Cause & Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${complicationCases.map(c => `
                        <tr>
                            <td style="white-space:nowrap; vertical-align:top;">${c.procedure_date}</td>
                            <td style="vertical-align:top;">
                                <strong>${c.operation}</strong>
                                <br><small class="meta">Age/ID: ${c.patient_id} (${c.laterality})</small>
                            </td>
                            <td style="vertical-align:top;">
                                ${c.complications ? c.complications.map(comp => `<div style="color:#ef4444; margin-bottom:2px;">• ${comp}</div>`).join('') : '-'}
                            </td>
                            <td style="vertical-align:top;">
                                ${c.cause ? `<div><strong>Cause:</strong> ${escapeHtml(c.cause)}</div>` : ''}
                                ${c.action_taken ? `<div style="margin-top:5px;"><strong>Action:</strong> ${escapeHtml(c.action_taken)}</div>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                    ${complicationCases.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#999;">No complications recorded.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </section>

    <footer style="text-align:center; margin-top:50px; padding-top:20px; border-top:1px solid var(--border); color:var(--text-light); font-size:0.8rem;">
        <p>This document was generated by OphthaoPortfolio AI on ${generatedDate}.</p>
        <p>It is a permanent offline record.</p>
    </footer>

</div>

<script>
    // CSV Export
    function downloadCSV() {
        var table = document.getElementById("logbookTable");
        var rows = table.querySelectorAll("tr");
        var csv = [];
        
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll("td, th");
            
            // Skip if row is hidden by filter
            if (rows[i].style.display === "none") continue;

            for (var j = 0; j < cols.length; j++) {
                // Get clean text
                var data = cols[j].innerText.replace(/(\\r\\n|\\n|\\r)/gm, "").replace(/(\\s\\s)/gm, " ");
                // Escape double quotes
                data = data.replace(/"/g, '""');
                // Push enclosed in double quotes
                row.push('"' + data + '"');
            }
            csv.push(row.join(","));
        }

        var csvFile = new Blob([csv.join("\\n")], {type: "text/csv"});
        var downloadLink = document.createElement("a");
        downloadLink.download = "logbook_export.csv";
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    // Evidence Filter
    function filterEvidence() {
        // Legacy function, might be unused if broken down, but keeping for safety
        filterEvidenceByType();
        filterEvidenceByStatus();
    }

    function filterEvidenceByType() {
        var input = document.getElementById("evType").value.toUpperCase();
        var table = document.getElementById("evidenceTable");
        var tr = table.getElementsByTagName("tr");
        for (var i = 1; i < tr.length; i++) {
            var td = tr[i].getElementsByTagName("td")[1];
            if (td) {
                var txtValue = td.textContent || td.innerText;
                // Simple include check is enough for now
                if (input === "" || txtValue.toUpperCase().indexOf(input) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }

    function filterEvidenceByStatus() {
         var input = document.getElementById("evStatus").value.toUpperCase();
        var table = document.getElementById("evidenceTable");
        var tr = table.getElementsByTagName("tr");
        for (var i = 1; i < tr.length; i++) {
            var td = tr[i].getElementsByTagName("td")[4];
            if (td) {
                var txtValue = td.textContent || td.innerText;
                 if (input === "" || txtValue.toUpperCase().indexOf(input) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }


    // Logbook Filter
    function filterLogbook() {
        var input = document.getElementById("logSearch").value.toUpperCase();
        var roleFilter = document.getElementById("logRole").value.toUpperCase();
        
        var table = document.getElementById("logbookTable");
        var tr = table.getElementsByTagName("tr");

        for (var i = 1; i < tr.length; i++) {
            var proc = tr[i].getElementsByTagName("td")[1].textContent.toUpperCase();
            var role = tr[i].getElementsByTagName("td")[2].textContent.toUpperCase();
            
            var show = true;
            if (input && proc.indexOf(input) === -1) show = false;
            if (roleFilter && role !== roleFilter && roleFilter !== "ALL ROLES" && roleFilter !== "") show = false;
            
            tr[i].style.display = show ? "" : "none";
        }
    }

    // Generic Filter
     function filterTable(tableId, inputId) {
        var input, filter, table, tr, td, i, txtValue;
        input = document.getElementById(inputId);
        filter = input.value.toUpperCase();
        table = document.getElementById(tableId);
        tr = table.getElementsByTagName("tr");

        for (i = 1; i < tr.length; i++) {
            // Check all cells in row
            var rowMatch = false;
            var tds = tr[i].getElementsByTagName("td");
            for(var j=0; j < tds.length; j++){
                if (tds[j]) {
                    txtValue = tds[j].textContent || tds[j].innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        rowMatch = true;
                        break;
                    }
                }
            }
            tr[i].style.display = rowMatch ? "" : "none";
        }
    }

    // Simple sort function
    function sortTable(tableId, n) {
        var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
        table = document.getElementById(tableId);
        switching = true;
        dir = "asc"; 
        while (switching) {
            switching = false;
            rows = table.rows;
            for (i = 1; i < (rows.length - 1); i++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("TD")[n];
                y = rows[i + 1].getElementsByTagName("TD")[n];
                if (dir == "asc") {
                    if (x.textContent.toLowerCase() > y.textContent.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                } else if (dir == "desc") {
                    if (x.textContent.toLowerCase() < y.textContent.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                switchcount ++; 
            } else {
                if (switchcount == 0 && dir == "asc") {
                    dir = "desc";
                    switching = true;
                }
            }
        }
    }
</script>

</body>
</html>
  `;
};

// Helper for escaping HTML
function escapeHtml(unsafe: string | undefined): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
