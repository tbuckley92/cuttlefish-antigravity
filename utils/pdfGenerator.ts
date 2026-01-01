
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EvidenceItem, EvidenceType, EvidenceStatus, UserProfile } from '../types';
import { CURRICULUM_DATA } from '../constants';
import { EPA_SPECIALTY_DATA } from '../constants/epaSpecialtyData';

// ============================================================================
// COLOR SCHEME - Matching Web App Design
// ============================================================================

const COLORS = {
  // Primary colors
  indigo: { r: 99, g: 102, b: 241 },      // #6366f1 - Primary accent
  indigoLight: { r: 238, g: 242, b: 255 }, // #eef2ff - Light indigo bg
  
  // Slate grays
  slate900: { r: 15, g: 23, b: 42 },      // #0f172a - Darkest text
  slate700: { r: 51, g: 65, b: 85 },      // #334155 - Dark text
  slate500: { r: 100, g: 116, b: 139 },   // #64748b - Muted text
  slate300: { r: 203, g: 213, b: 225 },   // #cbd5e1 - Borders
  slate100: { r: 241, g: 245, b: 249 },   // #f1f5f9 - Light bg
  slate50: { r: 248, g: 250, b: 252 },    // #f8fafc - Lightest bg
  
  // Status colors
  green: { r: 34, g: 197, b: 94 },        // #22c55e - SignedOff
  greenLight: { r: 220, g: 252, b: 231 }, // #dcfce7 - Green bg
  blue: { r: 59, g: 130, b: 246 },        // #3b82f6 - Submitted
  blueLight: { r: 219, g: 234, b: 254 },  // #dbeafe - Blue bg
  amber: { r: 245, g: 158, b: 11 },       // #f59e0b - Draft
  amberLight: { r: 254, g: 243, b: 199 }, // #fef3c7 - Amber bg
  
  // Form type colors
  epa: { r: 20, g: 184, b: 166 },         // #14b8a6 - Teal
  gsat: { r: 99, g: 102, b: 241 },        // #6366f1 - Indigo
  dops: { r: 139, g: 92, b: 246 },        // #8b5cf6 - Purple
  osats: { r: 249, g: 115, b: 22 },       // #f97316 - Orange
  cbd: { r: 16, g: 185, b: 129 },         // #10b981 - Emerald
  crs: { r: 59, g: 130, b: 246 },         // #3b82f6 - Blue
  
  white: { r: 255, g: 255, b: 255 },
};

// Get form type color
const getFormTypeColor = (type: EvidenceType): { r: number; g: number; b: number } => {
  switch (type) {
    case EvidenceType.EPA: return COLORS.epa;
    case EvidenceType.GSAT: return COLORS.gsat;
    case EvidenceType.DOPs: return COLORS.dops;
    case EvidenceType.OSATs: return COLORS.osats;
    case EvidenceType.CbD: return COLORS.cbd;
    case EvidenceType.CRS: return COLORS.crs;
    default: return COLORS.indigo;
  }
};

// Get status color
const getStatusColor = (status: EvidenceStatus): { bg: { r: number; g: number; b: number }; text: { r: number; g: number; b: number } } => {
  switch (status) {
    case EvidenceStatus.SignedOff:
      return { bg: COLORS.greenLight, text: COLORS.green };
    case EvidenceStatus.Submitted:
      return { bg: COLORS.blueLight, text: COLORS.blue };
    case EvidenceStatus.Draft:
    default:
      return { bg: COLORS.amberLight, text: COLORS.amber };
  }
};

// ============================================================================
// EPA FORM DATA - Level 1 & 2 criteria (matching EPAForm.tsx)
// ============================================================================

const LEVEL_1_LEARNING_OUTCOMES = [
  "PM1.6 - Communicate and deliver feedback to referrers and patients to support integrated care.",
  "PM1.5 - Understand the role of a Community Ophthalmology Service.",
  "PM1.4 - Work effectively with patients and the multi-professional team.",
  "PM1.3 - Justify the diagnoses and plan with reference to basic and clinical science.",
  "PM1.2 - Independently formulate and initiate a management plan for low complexity cases.",
  "PM1.1 - Independently perform a patient assessment and investigations sufficient to identify, describe and interpret clinical findings to arrive at differential diagnoses."
];

const LEVEL_2_LEARNING_OUTCOMES = [
  "PM2.4 - Understand the environmental impact of eye health.",
  "PM2.3 - Be aware of common public health issues and requirements specific to ophthalmology.",
  "PM2.2 - Refine the differential diagnoses and management plan by application of clinical knowledge.",
  "PM2.1 - Independently manage patients at an appropriate work-rate, employing the most appropriate clinical examination equipment and investigation modalities."
];

const LEVEL_1_CRITERIA = {
  sectionB: [
    "CRS Consultation skills", "CRS Vision", "CRS Fields", "CRS External eye",
    "CRS Pupil", "CRS Ocular Motility", "CRS IOP", "CRS Slit lamp",
    "CRS Direct ophthalmoscopy", "CRS 78D/90D", "CRS Contact lens", "CRS Gonioscopy"
  ],
  sectionC: [
    "Corneal scrape", "Use an exophthalmometer", "Assess lacrimal function",
    "Punctal plug insertion", "Interpretation of automated visual fields"
  ],
  sectionD: ["OSATS Microsurgical skills", "OSATS Cataract Surgery", "OSATS Lid Surgery"],
  sectionE: ["Operating microscope"],
  sectionF: [
    "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
    "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
    "Review of record keeping and letters:",
    "Case-based Discussions (CbDs)",
    "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA"
  ]
};

const LEVEL_2_CRITERIA = {
  sectionB: ["CRS Consultation skills", "CRS Indirect ophthalmoscopy", "CRS Retinoscopy"],
  sectionC: [
    "Insertion of bandage contact lens", "Remove of corneal foreign body",
    "Laser to lens capsule", "Laser for raised IOP", "Laser retinopexy",
    "Interpret biometry", "Interpret orthoptic assessment", "Interpret FFA"
  ],
  sectionD: ["OSATS Microsurgical skills", "OSATS Cataract Surgery", "OSATS Lid Surgery"],
  sectionE: ["Lateral canthotomy / cantholysis", "Interpret biometry"],
  sectionF: [
    "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
    "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
    "Review of record keeping and letters:",
    "Case-based Discussions (CbDs)",
    "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA"
  ]
};

// ============================================================================
// FORM COMPETENCIES DATA
// ============================================================================

const DOPS_SECTION_B_COMPETENCIES = [
  { key: "demonstratesUnderstandingOfIndications", label: "1. Demonstrates understanding of indications, relevant anatomy, techniques of procedure" },
  { key: "obtainsInformedConsent", label: "2. Obtains informed consent" },
  { key: "demonstratesAppropriatePreparationPreProcedure", label: "3. Demonstrates appropriate preparation pre-procedure" },
  { key: "appropriateAnalgesia", label: "4. Appropriate analgesia" },
  { key: "technicalAbility", label: "5. Technical ability" },
  { key: "asepticTechnique", label: "6. Aseptic technique" },
  { key: "seeksHelpWhereAppropriate", label: "7. Seeks help where appropriate" },
  { key: "awarenessOfPotentialComplications", label: "8. Awareness of potential complications and how to avoid them" },
  { key: "postProcedureManagement", label: "9. Post procedure management" }
];

const DOPS_SECTION_C_COMPETENCIES = [
  { key: "communicationSkills", label: "1. Communication skills" },
  { key: "considerationToPatient", label: "2. Consideration to patient / professionalism" }
];

const OSATS_SECTION_B_COMPETENCIES = [
  { key: "safeSurgery", label: "1. Safe surgery" },
  { key: "respectForTissue", label: "2. Respect for tissue" },
  { key: "instrumentHandling", label: "3. Instrument handling" },
  { key: "knowledgeAndUseOfInstrumentsAndEquipment", label: "4. Knowledge and use of instruments and equipment" },
  { key: "flowOfOperationAndForwardPlanning", label: "5. Flow of operation and forward planning" },
  { key: "knowledgeOfSpecificProcedure", label: "6. Knowledge of specific procedure" },
  { key: "useOfOperatingMicroscope", label: "7. Use of operating microscope" },
  { key: "managementOfLaboratorySpecimens", label: "8. Management of laboratory specimens" }
];

const OSATS_SECTION_C_COMPETENCIES = [
  { key: "communicationWithPatient", label: "1. Communication with patient" },
  { key: "communicationWithStaff", label: "2. Communication with staff" }
];

const CBD_SECTION_B_COMPETENCIES = [
  { key: "medicalRecordKeeping", label: "1. Medical Record Keeping" },
  { key: "clinicalAssessment", label: "2. Clinical Assessment" },
  { key: "investigationAndReferrals", label: "3. Investigation and Referrals" },
  { key: "diagnosisAndTreatment", label: "4. Diagnosis and Treatment" },
  { key: "followUpAndFuturePlanning", label: "5. Follow-up and Future Planning" },
  { key: "professionalism", label: "6. Professionalism" },
  { key: "clinicalJudgement", label: "7. Clinical Judgement" },
  { key: "recognitionAndReflectionOfPersonalLimits", label: "8. Recognition and Reflection of Personal Limits" },
  { key: "involvementAndLeadershipOfMultiDisciplinaryTeam", label: "9. Involvement and Leadership of the Multi-disciplinary Team" },
  { key: "awarenessOfGuidelinesProtocolsAndEvidence", label: "10. Awareness of Guidelines, Protocols and Evidence" },
  { key: "evaluationOfPublishedDevelopments", label: "11. Evaluation of Published Developments" }
];

// ============================================================================
// STYLED HELPER FUNCTIONS
// ============================================================================

// Track current page info for headers/footers
interface PageContext {
  profile: UserProfile;
  formType: EvidenceType;
  formTitle: string;
}

let pageContext: PageContext | null = null;

// Add page header
const addPageHeader = (doc: jsPDF, ctx: PageContext) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const color = getFormTypeColor(ctx.formType);
  
  // Top accent bar
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(0, 0, pageWidth, 4, 'F');
  
  // Header text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(ctx.profile.name, 14, 12);
  doc.text(ctx.formType, pageWidth - 14, 12, { align: 'right' });
};

// Add page footer
const addPageFooter = (doc: jsPDF, pageNum: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer line
  doc.setDrawColor(COLORS.slate300.r, COLORS.slate300.g, COLORS.slate300.b);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
  
  // Footer text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, pageHeight - 8);
  doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
};

// Check page break with header/footer support
const checkPageBreak = (doc: jsPDF, yPos: number, requiredSpace: number = 40): number => {
  if (yPos > 265 - requiredSpace) {
    doc.addPage();
    if (pageContext) {
      addPageHeader(doc, pageContext);
    }
    return 22;
  }
  return yPos;
};

// Add styled section header with background
const addStyledSectionHeader = (
  doc: jsPDF, 
  title: string, 
  yPos: number, 
  color: { r: number; g: number; b: number } = COLORS.indigo
): number => {
  yPos = checkPageBreak(doc, yPos, 25);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Background bar
  doc.setFillColor(color.r, color.g, color.b);
  doc.roundedRect(14, yPos - 4, pageWidth - 28, 10, 2, 2, 'F');
  
  // Header text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, yPos + 3);
  
  // Reset text color
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
  
  return yPos + 14;
};

// Add subsection header (no background)
const addSubsectionHeader = (doc: jsPDF, title: string, yPos: number): number => {
  yPos = checkPageBreak(doc, yPos, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
  doc.text(title, 14, yPos);
  
  // Underline
  doc.setDrawColor(COLORS.slate300.r, COLORS.slate300.g, COLORS.slate300.b);
  doc.setLineWidth(0.3);
  doc.line(14, yPos + 2, 80, yPos + 2);
  
  return yPos + 10;
};

// Add status badge
const addStatusBadge = (doc: jsPDF, status: EvidenceStatus, x: number, y: number): void => {
  const colors = getStatusColor(status);
  const statusText = status.toString().toUpperCase();
  const textWidth = doc.getTextWidth(statusText);
  
  // Badge background
  doc.setFillColor(colors.bg.r, colors.bg.g, colors.bg.b);
  doc.roundedRect(x, y - 4, textWidth + 8, 7, 2, 2, 'F');
  
  // Badge text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
  doc.text(statusText, x + 4, y + 1);
  
  // Reset
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
};

// Add type badge
const addTypeBadge = (doc: jsPDF, type: EvidenceType, x: number, y: number): void => {
  const color = getFormTypeColor(type);
  const typeText = type.toString();
  const textWidth = doc.getTextWidth(typeText);
  
  // Badge background
  doc.setFillColor(color.r, color.g, color.b);
  doc.roundedRect(x, y - 4, textWidth + 8, 7, 2, 2, 'F');
  
  // Badge text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(typeText, x + 4, y + 1);
  
  // Reset
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
};

// Add styled text field with label
const addStyledTextField = (doc: jsPDF, label: string, value: string, yPos: number): number => {
  if (!value) return yPos;
  yPos = checkPageBreak(doc, yPos, 20);
  
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(label.toUpperCase(), 14, yPos);
  yPos += 5;
  
  // Value
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
  const lines = doc.splitTextToSize(value, 180);
  doc.text(lines, 14, yPos);
  
  return yPos + lines.length * 5 + 6;
};

// Add info row (label: value on same line)
const addInfoRow = (doc: jsPDF, label: string, value: string, yPos: number): number => {
  if (!value) return yPos;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(`${label}:`, 14, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
  doc.text(value, 50, yPos);
  
  return yPos + 6;
};

// Render linked evidence table with styling
const renderLinkedEvidenceTable = (
  doc: jsPDF, 
  yPos: number, 
  reqKey: string, 
  evidenceIds: string[], 
  allEvidence: EvidenceItem[],
  headerColor: { r: number; g: number; b: number }
): number => {
  if (evidenceIds.length === 0) return yPos;
  
  yPos = checkPageBreak(doc, yPos, 35);
  
  // Requirement key label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(reqKey, 14, yPos);
  yPos += 5;
  
  // Get evidence items
  const evidenceItems = evidenceIds
    .map(id => allEvidence.find(e => e.id === id))
    .filter((e): e is EvidenceItem => e !== undefined);
  
  if (evidenceItems.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('(Evidence items not found)', 14, yPos);
    return yPos + 8;
  }
  
  // Create table data
  const tableData = evidenceItems.map(ev => [
    ev.title.substring(0, 55) + (ev.title.length > 55 ? '...' : ''),
    ev.type,
    ev.date || 'N/A',
    ev.status
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Title', 'Type', 'Date', 'Status']],
    body: tableData,
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
    },
    headStyles: { 
      fillColor: [headerColor.r, headerColor.g, headerColor.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
    },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 }
    }
  });
  
  return (doc as any).lastAutoTable.finalY + 10;
};

// ============================================================================
// GENERATE INDIVIDUAL EVIDENCE PDF
// ============================================================================

export const generateEvidencePDF = (item: EvidenceItem, profile: UserProfile, allEvidence: EvidenceItem[] = []): Blob => {
  const doc = new jsPDF();
  const formColor = getFormTypeColor(item.type);
  
  // Set page context for headers/footers
  pageContext = {
    profile,
    formType: item.type,
    formTitle: item.title
  };
  
  // Page 1 header
  addPageHeader(doc, pageContext);
  
  let yPos = 25;
  
  // Title section
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate900.r, COLORS.slate900.g, COLORS.slate900.b);
  const titleLines = doc.splitTextToSize(item.title, 160);
  doc.text(titleLines, 14, yPos);
  yPos += titleLines.length * 8 + 4;
  
  // Type and status badges
  addTypeBadge(doc, item.type, 14, yPos);
  const typeWidth = doc.getTextWidth(item.type.toString()) + 12;
  addStatusBadge(doc, item.status, 14 + typeWidth, yPos);
  yPos += 12;
  
  // Divider
  doc.setDrawColor(COLORS.slate300.r, COLORS.slate300.g, COLORS.slate300.b);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, doc.internal.pageSize.getWidth() - 14, yPos);
  yPos += 8;
  
  // Info section
  yPos = addInfoRow(doc, 'Trainee', profile.name, yPos);
  yPos = addInfoRow(doc, 'Grade', profile.grade, yPos);
  yPos = addInfoRow(doc, 'Date', item.date, yPos);
  if (item.sia) yPos = addInfoRow(doc, 'SIA', item.sia, yPos);
  if (item.level) yPos = addInfoRow(doc, 'Level', item.level.toString(), yPos);
  yPos += 8;

  // Form-specific content
  switch (item.type) {
    case EvidenceType.EPA:
      generateEPAPDF(doc, item, yPos, allEvidence, formColor);
      break;
    case EvidenceType.GSAT:
      generateGSATPDF(doc, item, yPos, allEvidence, formColor);
      break;
    case EvidenceType.DOPs:
      generateDOPsPDF(doc, item, yPos, formColor);
      break;
    case EvidenceType.OSATs:
      generateOSATsPDF(doc, item, yPos, formColor);
      break;
    case EvidenceType.CbD:
      generateCBDPDF(doc, item, yPos, formColor);
      break;
    case EvidenceType.CRS:
      generateCRSPDF(doc, item, yPos, formColor);
      break;
    default:
      if (item.notes) {
        yPos = addStyledSectionHeader(doc, 'Details', yPos, formColor);
        yPos = addStyledTextField(doc, 'Notes', item.notes, yPos);
      }
      break;
  }

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i);
  }

  pageContext = null;
  return doc.output('blob');
};

// ============================================================================
// EPA PDF GENERATOR
// ============================================================================

const generateEPAPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number, 
  allEvidence: EvidenceItem[],
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.epaFormData;
  const level = item.level || 1;
  const levelPrefix = level === 1 ? 'L1' : level === 2 ? 'L2' : level === 3 ? 'L3' : 'L4';

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Supervisor Information
  yPos = addStyledSectionHeader(doc, 'Supervisor Information', yPos, formColor);
  yPos = addInfoRow(doc, 'Supervisor', formData.supervisorName || 'N/A', yPos);
  yPos = addInfoRow(doc, 'Email', formData.supervisorEmail || 'N/A', yPos);
  if (formData.entrustment) {
    yPos = addInfoRow(doc, 'Entrustment', formData.entrustment, yPos);
  }
  yPos += 5;

  // Get learning outcomes based on level
  let learningOutcomes: string[] = [];
  let criteria: { sectionB: string[]; sectionC: string[]; sectionD: string[]; sectionE: string[]; sectionF: string[] } | null = null;

  if (level === 1) {
    learningOutcomes = LEVEL_1_LEARNING_OUTCOMES;
    criteria = LEVEL_1_CRITERIA;
  } else if (level === 2) {
    learningOutcomes = LEVEL_2_LEARNING_OUTCOMES;
    criteria = LEVEL_2_CRITERIA;
  } else if (level === 3 || level === 4) {
    const specialtyData = EPA_SPECIALTY_DATA[level]?.[item.sia || ''];
    if (specialtyData) {
      learningOutcomes = specialtyData.learningOutcomes;
      criteria = specialtyData.criteria;
    }
  }

  // Section A: Learning Outcomes
  yPos = addStyledSectionHeader(doc, 'A. Learning Outcomes', yPos, formColor);
  
  if (learningOutcomes.length > 0) {
    learningOutcomes.forEach((outcome, idx) => {
      yPos = checkPageBreak(doc, yPos, 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
      const lines = doc.splitTextToSize(`${idx + 1}. ${outcome}`, 175);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 4 + 3;
    });
  }
  yPos += 3;

  // Trainee Narrative
  if (formData.traineeNarrative) {
    yPos = addSubsectionHeader(doc, 'Trainee Narrative', yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b);
    const narrativeLines = doc.splitTextToSize(formData.traineeNarrative, 180);
    doc.text(narrativeLines, 14, yPos);
    yPos += narrativeLines.length * 4 + 8;
  }

  // Sections B through F
  if (criteria) {
    const sections = [
      { key: 'B', name: 'B. Mandatory CRS Forms', items: criteria.sectionB },
      { key: 'C', name: 'C. Mandatory Outpatient Requirements', items: criteria.sectionC },
      { key: 'D', name: 'D. Mandatory OSATS', items: criteria.sectionD },
      { key: 'E', name: 'E. Mandatory Requirements in Theatre', items: criteria.sectionE },
      { key: 'F', name: 'F. Ancillary Evidence & Entrustment', items: criteria.sectionF }
    ];

    sections.forEach(section => {
      if (section.items.length > 0) {
        yPos = addStyledSectionHeader(doc, section.name, yPos, formColor);

        const tableData = section.items.map((req, idx) => {
          const reqKey = `EPA-${levelPrefix}-${section.key}-${idx}`;
          const grade = formData.grading[reqKey] || '';
          const comment = formData.comments[reqKey] || '';
          return [(idx + 1).toString(), req, grade, comment];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Requirement', 'Grade', 'Comments']],
          body: tableData,
          styles: { 
            fontSize: 8, 
            cellPadding: 3,
            textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
          },
          headStyles: { 
            fillColor: [formColor.r, formColor.g, formColor.b],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
          },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 70 },
            2: { cellWidth: 45 },
            3: { cellWidth: 55 }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    });
  }

  // Aspects Especially Good
  if (formData.aspectsEspeciallyGood) {
    yPos = addStyledTextField(doc, 'Aspects Especially Good', formData.aspectsEspeciallyGood, yPos);
  }

  // Additional Evidence Needed
  if (formData.additionalEvidenceNeeded) {
    yPos = addStyledTextField(doc, 'Additional Evidence Needed', formData.additionalEvidenceNeeded, yPos);
  }

  // Linked Evidence
  if (formData.linkedEvidence && Object.keys(formData.linkedEvidence).length > 0) {
    yPos = addStyledSectionHeader(doc, 'Linked Evidence', yPos, COLORS.slate500);
    
    Object.entries(formData.linkedEvidence).forEach(([reqKey, evidenceIds]) => {
      if (evidenceIds.length > 0) {
        yPos = renderLinkedEvidenceTable(doc, yPos, reqKey, evidenceIds, allEvidence, formColor);
      }
    });
  }
};

// ============================================================================
// GSAT PDF GENERATOR
// ============================================================================

const generateGSATPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number,
  allEvidence: EvidenceItem[],
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.gsatFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  const domains = [
    "Research and Scholarship",
    "Education and Training",
    "Safeguarding and Holistic Patient Care",
    "Patient Safety and Quality Improvement",
    "Leadership and Team Working",
    "Health Promotion"
  ];

  domains.forEach((domain) => {
    yPos = addStyledSectionHeader(doc, domain, yPos, formColor);

    const requirements = CURRICULUM_DATA.filter(r => 
      r.domain === "Non-patient Management" && 
      r.level === (item.level || 1) && 
      r.formType === "GSAT" &&
      r.specialty === domain
    );

    if (requirements.length > 0) {
      const tableData = requirements.map((req, idx) => {
        const reqKey = `${domain}-${idx}`;
        const comment = formData.comments[reqKey] || '';
        return [(idx + 1).toString(), req.requirement, comment];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Requirement', 'Trainee Reflection']],
        body: tableData,
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
        },
        headStyles: { 
          fillColor: [formColor.r, formColor.g, formColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 90 },
          2: { cellWidth: 80 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
      doc.text('No requirements for this domain.', 14, yPos);
      yPos += 10;
    }
  });

  // Linked Evidence
  if (formData.linkedEvidence && Object.keys(formData.linkedEvidence).length > 0) {
    yPos = addStyledSectionHeader(doc, 'Linked Evidence', yPos, COLORS.slate500);
    
    Object.entries(formData.linkedEvidence).forEach(([reqKey, evidenceIds]) => {
      if (evidenceIds.length > 0) {
        yPos = renderLinkedEvidenceTable(doc, yPos, reqKey, evidenceIds, allEvidence, formColor);
      }
    });
  }
};

// ============================================================================
// DOPS PDF GENERATOR
// ============================================================================

const generateDOPsPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number,
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.dopsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Supervisor Information
  yPos = addStyledSectionHeader(doc, 'Supervisor Information', yPos, formColor);
  yPos = addInfoRow(doc, 'Supervisor', formData.supervisorName || 'N/A', yPos);
  yPos = addInfoRow(doc, 'Email', formData.supervisorEmail || 'N/A', yPos);
  if (formData.dopsType) yPos = addInfoRow(doc, 'DOPS Type', formData.dopsType, yPos);
  if (formData.specialty) yPos = addInfoRow(doc, 'Specialty', formData.specialty, yPos);
  yPos += 5;

  // Section A: Procedure Description
  if (formData.sectionA) {
    yPos = addStyledSectionHeader(doc, 'A. Procedure Description', yPos, formColor);
    
    if (formData.sectionA.descriptionOfProcedure) {
      yPos = addStyledTextField(doc, 'Description', formData.sectionA.descriptionOfProcedure, yPos);
    }
    if (formData.sectionA.furtherDetails) {
      yPos = addStyledTextField(doc, 'Further Details', formData.sectionA.furtherDetails, yPos);
    }
    if (formData.sectionA.numberOfProcedures) {
      yPos = addInfoRow(doc, 'Number of Procedures', formData.sectionA.numberOfProcedures, yPos);
    }
    if (formData.sectionA.procedurePerformedOn) {
      yPos = addInfoRow(doc, 'Performed On', formData.sectionA.procedurePerformedOn, yPos);
    }
    yPos += 5;
  }

  // Section B: Procedure Competencies
  if (formData.sectionB && Object.keys(formData.sectionB.ratings).length > 0) {
    yPos = addStyledSectionHeader(doc, 'B. Procedure Competencies', yPos, formColor);

    const tableData = DOPS_SECTION_B_COMPETENCIES.map(comp => {
      const rating = formData.sectionB.ratings[comp.key] || 'N/A';
      const comment = formData.sectionB.comments[comp.key] || '';
      return [comp.label, rating, comment];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Competency', 'Rating', 'Comments']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
      },
      headStyles: { 
        fillColor: [formColor.r, formColor.g, formColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section C: Communication
  if (formData.sectionC && Object.keys(formData.sectionC.ratings).length > 0) {
    yPos = addStyledSectionHeader(doc, 'C. Communication', yPos, formColor);

    const tableData = DOPS_SECTION_C_COMPETENCIES.map(comp => {
      const rating = formData.sectionC.ratings[comp.key] || 'N/A';
      const comment = formData.sectionC.comments[comp.key] || '';
      return [comp.label, rating, comment];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Competency', 'Rating', 'Comments']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
      },
      headStyles: { 
        fillColor: [formColor.r, formColor.g, formColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section D: Supervisor Comments
  if (formData.sectionD) {
    yPos = addStyledSectionHeader(doc, 'D. Supervisor Comments', yPos, formColor);

    if (formData.sectionD.aspectsEspeciallyGood) {
      yPos = addStyledTextField(doc, 'Aspects Especially Good', formData.sectionD.aspectsEspeciallyGood, yPos);
    }
    if (formData.sectionD.suggestionsForImprovement) {
      yPos = addStyledTextField(doc, 'Suggestions for Improvement', formData.sectionD.suggestionsForImprovement, yPos);
    }
    if (formData.sectionD.agreedActionPlan) {
      yPos = addStyledTextField(doc, 'Agreed Action Plan', formData.sectionD.agreedActionPlan, yPos);
    }
  }
};

// ============================================================================
// OSATS PDF GENERATOR
// ============================================================================

const generateOSATsPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number,
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.osatsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Supervisor Information
  yPos = addStyledSectionHeader(doc, 'Supervisor Information', yPos, formColor);
  yPos = addInfoRow(doc, 'Supervisor', formData.supervisorName || 'N/A', yPos);
  yPos = addInfoRow(doc, 'Email', formData.supervisorEmail || 'N/A', yPos);
  if (formData.osatsType) yPos = addInfoRow(doc, 'OSATS Type', formData.osatsType, yPos);
  if (formData.specialty) yPos = addInfoRow(doc, 'Specialty', formData.specialty, yPos);
  yPos += 5;

  // Section A: Case Description
  if (formData.sectionA) {
    yPos = addStyledSectionHeader(doc, 'A. Case Description', yPos, formColor);
    
    if (formData.sectionA.caseDescription) {
      yPos = addStyledTextField(doc, 'Description', formData.sectionA.caseDescription, yPos);
    }
    if (formData.sectionA.operativeDetails) {
      yPos = addStyledTextField(doc, 'Operative Details', formData.sectionA.operativeDetails, yPos);
    }
    if (formData.sectionA.numberOfProcedures) {
      yPos = addInfoRow(doc, 'Number of Procedures', formData.sectionA.numberOfProcedures, yPos);
    }
    if (formData.sectionA.procedurePerformedOn) {
      yPos = addInfoRow(doc, 'Performed On', formData.sectionA.procedurePerformedOn, yPos);
    }
    yPos += 5;
  }

  // Section B: Surgical Competencies
  if (formData.sectionB && Object.keys(formData.sectionB.ratings).length > 0) {
    yPos = addStyledSectionHeader(doc, 'B. Surgical Competencies', yPos, formColor);

    const tableData = OSATS_SECTION_B_COMPETENCIES.map(comp => {
      const rating = formData.sectionB.ratings[comp.key] || 'N/A';
      const comment = formData.sectionB.comments[comp.key] || '';
      return [comp.label, rating, comment];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Competency', 'Rating', 'Comments']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
      },
      headStyles: { 
        fillColor: [formColor.r, formColor.g, formColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section C: Communication
  if (formData.sectionC && Object.keys(formData.sectionC.ratings).length > 0) {
    yPos = addStyledSectionHeader(doc, 'C. Communication', yPos, formColor);

    const tableData = OSATS_SECTION_C_COMPETENCIES.map(comp => {
      const rating = formData.sectionC.ratings[comp.key] || 'N/A';
      const comment = formData.sectionC.comments[comp.key] || '';
      return [comp.label, rating, comment];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Competency', 'Rating', 'Comments']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
      },
      headStyles: { 
        fillColor: [formColor.r, formColor.g, formColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section D: Supervisor Comments
  if (formData.sectionD) {
    yPos = addStyledSectionHeader(doc, 'D. Supervisor Comments', yPos, formColor);

    if (formData.sectionD.aspectsEspeciallyGood) {
      yPos = addStyledTextField(doc, 'Aspects Especially Good', formData.sectionD.aspectsEspeciallyGood, yPos);
    }
    if (formData.sectionD.suggestionsForImprovement) {
      yPos = addStyledTextField(doc, 'Suggestions for Improvement', formData.sectionD.suggestionsForImprovement, yPos);
    }
    if (formData.sectionD.agreedActionPlan) {
      yPos = addStyledTextField(doc, 'Agreed Action Plan', formData.sectionD.agreedActionPlan, yPos);
    }
  }
};

// ============================================================================
// CBD PDF GENERATOR
// ============================================================================

const generateCBDPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number,
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.cbdFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Supervisor Information
  yPos = addStyledSectionHeader(doc, 'Supervisor Information', yPos, formColor);
  yPos = addInfoRow(doc, 'Supervisor', formData.supervisorName || 'N/A', yPos);
  yPos = addInfoRow(doc, 'Email', formData.supervisorEmail || 'N/A', yPos);
  if (formData.specialty) yPos = addInfoRow(doc, 'Specialty', formData.specialty, yPos);
  yPos += 5;

  // Section A: Clinical Scenario
  if (formData.sectionA) {
    yPos = addStyledSectionHeader(doc, 'A. Clinical Scenario', yPos, formColor);
    
    if (formData.sectionA.clinicalScenario) {
      yPos = addStyledTextField(doc, 'Scenario', formData.sectionA.clinicalScenario, yPos);
    }
    if (formData.sectionA.clinicalDiscussion) {
      yPos = addStyledTextField(doc, 'Discussion', formData.sectionA.clinicalDiscussion, yPos);
    }
  }

  // Section B: Multidimensional Assessment
  if (formData.sectionB && Object.keys(formData.sectionB.ratings).length > 0) {
    yPos = addStyledSectionHeader(doc, 'B. Multidimensional Assessment', yPos, formColor);

    const tableData = CBD_SECTION_B_COMPETENCIES.map(comp => {
      const rating = formData.sectionB.ratings[comp.key] || 'N/A';
      const comment = formData.sectionB.comments[comp.key] || '';
      return [comp.label, rating, comment];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Competency', 'Rating', 'Comments']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
      },
      headStyles: { 
        fillColor: [formColor.r, formColor.g, formColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section C: Supervisor Comments
  if (formData.sectionC) {
    yPos = addStyledSectionHeader(doc, 'C. Supervisor Comments', yPos, formColor);

    if (formData.sectionC.aspectsEspeciallyGood) {
      yPos = addStyledTextField(doc, 'Aspects Especially Good', formData.sectionC.aspectsEspeciallyGood, yPos);
    }
    if (formData.sectionC.suggestionsForImprovement) {
      yPos = addStyledTextField(doc, 'Suggestions for Improvement', formData.sectionC.suggestionsForImprovement, yPos);
    }
    if (formData.sectionC.agreedActionPlan) {
      yPos = addStyledTextField(doc, 'Agreed Action Plan', formData.sectionC.agreedActionPlan, yPos);
    }
  }
};

// ============================================================================
// CRS PDF GENERATOR
// ============================================================================

const generateCRSPDF = (
  doc: jsPDF, 
  item: EvidenceItem, 
  startY: number,
  formColor: { r: number; g: number; b: number }
) => {
  let yPos = startY;
  const formData = item.crsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Assessor Information
  yPos = addStyledSectionHeader(doc, 'Assessor Information', yPos, formColor);
  yPos = addInfoRow(doc, 'Assessor', formData.assessorName || 'N/A', yPos);
  yPos = addInfoRow(doc, 'Email', formData.assessorEmail || 'N/A', yPos);
  if (formData.crsType) yPos = addInfoRow(doc, 'CRS Type', formData.crsType, yPos);
  yPos += 5;

  // Case Description
  if (formData.caseDescription) {
    yPos = addStyledTextField(doc, 'Case Description', formData.caseDescription, yPos);
  }

  // Vision-specific data
  if (formData.visionData) {
    const v = formData.visionData;
    
    if (v.sectionA) {
      yPos = addStyledSectionHeader(doc, 'Attitude and Manner', yPos, formColor);
      
      const attitudeData = [
        ['Introduction to patient/carer', v.sectionA.introduction || 'N/A'],
        ['Establishes rapport', v.sectionA.rapport || 'N/A'],
        ['Respect for patient', v.sectionA.respect || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Criterion', 'Rating']],
        body: attitudeData,
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
        },
        headStyles: { 
          fillColor: [formColor.r, formColor.g, formColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (v.sectionB) {
      yPos = addStyledSectionHeader(doc, 'Visual Acuity', yPos, formColor);
      
      if (v.sectionB.method) {
        yPos = addInfoRow(doc, 'Method', `${v.sectionB.method}${v.sectionB.otherMethod ? ` (${v.sectionB.otherMethod})` : ''}`, yPos);
      }

      const vaData = [
        ['Appropriate occlusion', v.sectionB.appropriateOcclusion || 'N/A'],
        ['Technique', v.sectionB.technique || 'N/A'],
        ['Refractive correction', v.sectionB.refractiveCorrection || 'N/A'],
        ['Pinhole', v.sectionB.pinhole || 'N/A'],
        ['Distance acuity', v.sectionB.distanceAcuity || 'N/A'],
        ['Near acuity', v.sectionB.nearAcuity || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Criterion', 'Rating']],
        body: vaData,
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
        },
        headStyles: { 
          fillColor: [formColor.r, formColor.g, formColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (v.comments) {
      yPos = addStyledSectionHeader(doc, 'Comments & Recommendations', yPos, formColor);
      
      if (v.comments.especiallyGood) {
        yPos = addStyledTextField(doc, 'Especially Good', v.comments.especiallyGood, yPos);
      }
      if (v.comments.suggestionsForImprovement) {
        yPos = addStyledTextField(doc, 'Suggestions for Improvement', v.comments.suggestionsForImprovement, yPos);
      }
      if (v.comments.agreedActionPlan) {
        yPos = addStyledTextField(doc, 'Agreed Action Plan', v.comments.agreedActionPlan, yPos);
      }
    }
  }

  // Retinoscopy-specific data  
  if (formData.retinoscopyData) {
    const r = formData.retinoscopyData;
    
    if (r.sectionA) {
      yPos = addStyledSectionHeader(doc, 'Attitude and Manner', yPos, formColor);
      
      const attitudeData = [
        ['Introduction to patient/carer', r.sectionA.introduction || 'N/A'],
        ['Establishes rapport', r.sectionA.rapport || 'N/A'],
        ['Respect for patient', r.sectionA.respect || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Criterion', 'Rating']],
        body: attitudeData,
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
        },
        headStyles: { 
          fillColor: [formColor.r, formColor.g, formColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (r.sectionB) {
      yPos = addStyledSectionHeader(doc, 'Retinoscopy', yPos, formColor);

      const retData = [
        ['Patient positioning', r.sectionB.patientPositioning || 'N/A'],
        ['Appropriate cycloplegia', r.sectionB.appropriateCycloplegia || 'N/A'],
        ['Use of trial frame', r.sectionB.useOfTrialFrame || 'N/A'],
        ['Time taken', r.sectionB.timeTaken || 'N/A'],
        ['Accuracy', r.sectionB.accuracy || 'N/A'],
        ['Notation', r.sectionB.notation || 'N/A'],
        ['Appropriate prescription', r.sectionB.appropriatePrescription || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Criterion', 'Rating']],
        body: retData,
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
        },
        headStyles: { 
          fillColor: [formColor.r, formColor.g, formColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (r.comments) {
      yPos = addStyledSectionHeader(doc, 'Comments & Recommendations', yPos, formColor);
      
      if (r.comments.especiallyGood) {
        yPos = addStyledTextField(doc, 'Especially Good', r.comments.especiallyGood, yPos);
      }
      if (r.comments.suggestionsForImprovement) {
        yPos = addStyledTextField(doc, 'Suggestions for Improvement', r.comments.suggestionsForImprovement, yPos);
      }
      if (r.comments.agreedActionPlan) {
        yPos = addStyledTextField(doc, 'Agreed Action Plan', r.comments.agreedActionPlan, yPos);
      }
    }
  }

  // Generic message for other CRS types
  if (!formData.visionData && !formData.retinoscopyData) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
    doc.text('Detailed assessment data available in the application.', 14, yPos);
  }
};

// ============================================================================
// BULK PDF GENERATOR
// ============================================================================

export const generateBulkEvidencePDF = (items: EvidenceItem[], profile: UserProfile): Blob => {
  const doc = new jsPDF();
  
  // Cover Page
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Gradient-like header
  doc.setFillColor(COLORS.indigo.r, COLORS.indigo.g, COLORS.indigo.b);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Evidence Portfolio', pageWidth / 2, 35, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Ophthalmology Training Record', pageWidth / 2, 48, { align: 'center' });
  
  let yPos = 80;
  
  // Trainee info card
  doc.setFillColor(COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b);
  doc.roundedRect(30, yPos, pageWidth - 60, 50, 4, 4, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate900.r, COLORS.slate900.g, COLORS.slate900.b);
  doc.text(profile.name, pageWidth / 2, yPos + 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text(profile.grade, pageWidth / 2, yPos + 30, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 42, { align: 'center' });
  
  yPos += 70;
  
  // Stats
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.indigo.r, COLORS.indigo.g, COLORS.indigo.b);
  doc.text(items.length.toString(), pageWidth / 2, yPos, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b);
  doc.text('Evidence Items', pageWidth / 2, yPos + 10, { align: 'center' });

  // Table of Contents
  doc.addPage();
  yPos = 25;
  
  doc.setFillColor(COLORS.indigo.r, COLORS.indigo.g, COLORS.indigo.b);
  doc.roundedRect(14, yPos - 4, pageWidth - 28, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Table of Contents', 18, yPos + 4);
  yPos += 20;

  const tocData = items.map((item, idx) => [
    (idx + 1).toString(),
    item.type,
    item.title.substring(0, 45) + (item.title.length > 45 ? '...' : ''),
    item.date,
    item.status
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Type', 'Title', 'Date', 'Status']],
    body: tocData,
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      textColor: [COLORS.slate700.r, COLORS.slate700.g, COLORS.slate700.b]
    },
    headStyles: { 
      fillColor: [COLORS.slate500.r, COLORS.slate500.g, COLORS.slate500.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [COLORS.slate50.r, COLORS.slate50.g, COLORS.slate50.b]
    },
    margin: { left: 14, right: 14 }
  });

  // Generate each evidence item
  items.forEach((item, idx) => {
    doc.addPage();
    const formColor = getFormTypeColor(item.type);
    
    // Set page context
    pageContext = {
      profile,
      formType: item.type,
      formTitle: item.title
    };
    
    addPageHeader(doc, pageContext);
    
    yPos = 25;
    
    // Item number and title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.slate900.r, COLORS.slate900.g, COLORS.slate900.b);
    const titleLines = doc.splitTextToSize(`${idx + 1}. ${item.title}`, 160);
    doc.text(titleLines, 14, yPos);
    yPos += titleLines.length * 7 + 4;
    
    // Badges
    addTypeBadge(doc, item.type, 14, yPos);
    const typeWidth = doc.getTextWidth(item.type.toString()) + 12;
    addStatusBadge(doc, item.status, 14 + typeWidth, yPos);
    yPos += 12;
    
    // Divider
    doc.setDrawColor(COLORS.slate300.r, COLORS.slate300.g, COLORS.slate300.b);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;
    
    // Info
    yPos = addInfoRow(doc, 'Date', item.date, yPos);
    if (item.sia) yPos = addInfoRow(doc, 'SIA', item.sia, yPos);
    if (item.level) yPos = addInfoRow(doc, 'Level', item.level.toString(), yPos);
    yPos += 8;

    // Form-specific content
    switch (item.type) {
      case EvidenceType.EPA:
        generateEPAPDF(doc, item, yPos, items, formColor);
        break;
      case EvidenceType.GSAT:
        generateGSATPDF(doc, item, yPos, items, formColor);
        break;
      case EvidenceType.DOPs:
        generateDOPsPDF(doc, item, yPos, formColor);
        break;
      case EvidenceType.OSATs:
        generateOSATsPDF(doc, item, yPos, formColor);
        break;
      case EvidenceType.CbD:
        generateCBDPDF(doc, item, yPos, formColor);
        break;
      case EvidenceType.CRS:
        generateCRSPDF(doc, item, yPos, formColor);
        break;
      default:
        if (item.notes) {
          yPos = addStyledSectionHeader(doc, 'Notes', yPos, formColor);
          yPos = addStyledTextField(doc, 'Details', item.notes, yPos);
        }
        break;
    }
  });

  // Add footers to all pages (skip cover page)
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i - 1);
  }

  pageContext = null;
  return doc.output('blob');
};
