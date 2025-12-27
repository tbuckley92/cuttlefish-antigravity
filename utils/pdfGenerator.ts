
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EvidenceItem, EvidenceType, UserProfile, CurriculumRequirement } from '../types';
import { CURRICULUM_DATA } from '../constants';

// Helper to get curriculum requirements
const getCurriculumRequirements = (specialty: string, level: number, formType: string) => {
  return CURRICULUM_DATA.filter(r => 
    r.specialty === specialty && 
    r.level === level && 
    r.formType === formType
  );
};

// Helper to sanitize filename
const sanitizeFilename = (str: string): string => {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

// Generate individual evidence PDF
export const generateEvidencePDF = (item: EvidenceItem, profile: UserProfile): Blob => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(item.title, 14, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Trainee: ${profile.name}`, 14, yPos);
  yPos += 6;
  doc.text(`Grade: ${profile.grade}`, 14, yPos);
  yPos += 6;
  doc.text(`Date: ${item.date}`, 14, yPos);
  yPos += 6;
  doc.text(`Status: ${item.status}`, 14, yPos);
  yPos += 6;
  if (item.sia) {
    doc.text(`SIA: ${item.sia}`, 14, yPos);
    yPos += 6;
  }
  if (item.level) {
    doc.text(`Level: ${item.level}`, 14, yPos);
    yPos += 6;
  }
  yPos += 5;

  // Form-specific content
  switch (item.type) {
    case EvidenceType.EPA:
      generateEPAPDF(doc, item, yPos);
      break;
    case EvidenceType.GSAT:
      generateGSATPDF(doc, item, yPos);
      break;
    case EvidenceType.DOPs:
      generateDOPsPDF(doc, item, yPos);
      break;
    case EvidenceType.OSATs:
      generateOSATsPDF(doc, item, yPos);
      break;
    case EvidenceType.CbD:
      generateCBDPDF(doc, item, yPos);
      break;
    case EvidenceType.CRS:
      generateCRSPDF(doc, item, yPos);
      break;
    default:
      // Generic PDF for other types
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Details', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (item.notes) {
        const notesLines = doc.splitTextToSize(item.notes, 180);
        doc.text(notesLines, 14, yPos);
      }
      break;
  }

  return doc.output('blob');
};

// Generate EPA PDF
const generateEPAPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.epaFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Supervisor Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Supervisor Information', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Supervisor: ${formData.supervisorName}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${formData.supervisorEmail}`, 14, yPos);
  yPos += 6;
  if (formData.entrustment) {
    doc.text(`Overall Entrustment: ${formData.entrustment}`, 14, yPos);
    yPos += 6;
  }
  yPos += 5;

  // Get requirements
  const requirements = getCurriculumRequirements(
    item.sia || 'Oculoplastics',
    item.level || 1,
    'EPA'
  );

  if (requirements.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Requirements Assessment', 14, yPos);
    yPos += 8;

    // Prepare table data
    const tableData = requirements.map((req, idx) => {
      const reqKey = `${idx}`;
      const comment = formData.comments[reqKey] || '';
      const grade = formData.grading[reqKey] || '';
      return [
        (idx + 1).toString(),
        req.requirement.substring(0, 80) + (req.requirement.length > 80 ? '...' : ''),
        grade,
        comment.substring(0, 60) + (comment.length > 60 ? '...' : '')
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Requirement', 'Grade', 'Comments']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 60 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Linked Evidence
  if (formData.linkedEvidence && Object.keys(formData.linkedEvidence).length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Linked Evidence', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    Object.entries(formData.linkedEvidence).forEach(([reqKey, evidenceIds]) => {
      doc.text(`Requirement ${reqKey}: ${evidenceIds.length} evidence item(s) linked`, 14, yPos);
      yPos += 6;
    });
  }
};

// Generate GSAT PDF
const generateGSATPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.gsatFormData;

  if (!formData) {
    doc.setFontSize(10);
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

  domains.forEach((domain, domainIdx) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(domain, 14, yPos);
    yPos += 8;

    // For GSAT, specialty field contains the domain name, domain field is "Non-patient Management"
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
        return [
          (idx + 1).toString(),
          req.requirement.substring(0, 100) + (req.requirement.length > 100 ? '...' : ''),
          comment.substring(0, 70) + (comment.length > 70 ? '...' : '')
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Requirement', 'Comments']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 100 },
          2: { cellWidth: 70 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  });
};

// Generate DOPs PDF
const generateDOPsPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.dopsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Assessor Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Assessor Information', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assessor: ${formData.assessorName}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${formData.assessorEmail}`, 14, yPos);
  yPos += 6;
  if (formData.assessorStatus) {
    doc.text(`Status: ${formData.assessorStatus}`, 14, yPos);
    yPos += 6;
  }
  yPos += 5;

  // Case Details
  if (formData.caseDescription) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Case Description', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const caseLines = doc.splitTextToSize(formData.caseDescription, 180);
    doc.text(caseLines, 14, yPos);
    yPos += caseLines.length * 5 + 5;
  }

  // Criteria Assessment
  const criteria = [
    "Demonstrates understanding of indications, relevant anatomy, techniques of procedure.",
    "Obtains informed consent.",
    "Demonstrates appropriate preparation pre‑procedure.",
    "Appropriate analgesia.",
    "Technical ability.",
    "Aseptic technique.",
    "Seeks help where appropriate.",
    "Awareness of potential complications and how to avoid them.",
    "Post‑procedure management.",
    "Communication skills.",
    "Consideration to patient / professionalism."
  ];

  if (Object.keys(formData.grading).length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Criteria Assessment', 14, yPos);
    yPos += 8;

    const tableData = criteria.map((criterion, idx) => {
      const grade = formData.grading[idx] || 'N/A';
      return [
        (idx + 1).toString(),
        criterion.substring(0, 90) + (criterion.length > 90 ? '...' : ''),
        grade
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Criterion', 'Grade']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 120 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Overall Assessment
  if (formData.overallAssessment || formData.strengths || formData.improvements) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Assessment', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (formData.overallAssessment) {
      const overallLines = doc.splitTextToSize(formData.overallAssessment, 180);
      doc.text(overallLines, 14, yPos);
      yPos += overallLines.length * 5 + 5;
    }
    if (formData.strengths) {
      doc.setFont('helvetica', 'bold');
      doc.text('Strengths:', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const strengthLines = doc.splitTextToSize(formData.strengths, 180);
      doc.text(strengthLines, 14, yPos);
      yPos += strengthLines.length * 5 + 5;
    }
    if (formData.improvements) {
      doc.setFont('helvetica', 'bold');
      doc.text('Areas for Improvement:', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const improvementLines = doc.splitTextToSize(formData.improvements, 180);
      doc.text(improvementLines, 14, yPos);
    }
  }
};

// Generate OSATs PDF
const generateOSATsPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.osatsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Assessor Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Assessor Information', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assessor: ${formData.assessorName}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${formData.assessorEmail}`, 14, yPos);
  yPos += 6;
  yPos += 5;

  // Operation Details
  if (formData.operationDetails) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Operation Details', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const opLines = doc.splitTextToSize(formData.operationDetails, 180);
    doc.text(opLines, 14, yPos);
    yPos += opLines.length * 5 + 5;
  }

  // Criteria Assessment
  const criteria = [
    "Safe Surgery.", "Respect for tissue.", "Instrument handling.", "Knowledge of instruments.",
    "Flow of operation and forward planning.", "Knowledge of specific procedure.", "Use of operating microscope.",
    "Use of procedure-specific equipment.", "Management of laboratory specimens.", "Communication with patient.", "Communication with staff."
  ];

  if (Object.keys(formData.grading).length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Criteria Assessment', 14, yPos);
    yPos += 8;

    const tableData = criteria.map((criterion, idx) => {
      const grade = formData.grading[idx] || 'N/A';
      return [
        (idx + 1).toString(),
        criterion,
        grade
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Criterion', 'Grade']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 120 },
        2: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Overall Assessment
  if (formData.overallAssessment || formData.strengths || formData.improvements) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Assessment', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (formData.overallAssessment) {
      const overallLines = doc.splitTextToSize(formData.overallAssessment, 180);
      doc.text(overallLines, 14, yPos);
      yPos += overallLines.length * 5 + 5;
    }
    if (formData.strengths) {
      doc.setFont('helvetica', 'bold');
      doc.text('Strengths:', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const strengthLines = doc.splitTextToSize(formData.strengths, 180);
      doc.text(strengthLines, 14, yPos);
      yPos += strengthLines.length * 5 + 5;
    }
    if (formData.improvements) {
      doc.setFont('helvetica', 'bold');
      doc.text('Areas for Improvement:', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const improvementLines = doc.splitTextToSize(formData.improvements, 180);
      doc.text(improvementLines, 14, yPos);
    }
  }
};

// Generate CbD PDF
const generateCBDPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.cbdFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Assessor Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Assessor Information', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assessor: ${formData.assessorName}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${formData.assessorEmail}`, 14, yPos);
  yPos += 6;
  yPos += 5;

  // Clinical Scenario
  if (formData.clinicalScenario) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Scenario', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scenarioLines = doc.splitTextToSize(formData.clinicalScenario, 180);
    doc.text(scenarioLines, 14, yPos);
    yPos += scenarioLines.length * 5 + 5;
  }

  // Diagnosis and Assessment
  if (formData.diagnosis || formData.overallAssessment) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Assessment', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (formData.diagnosis) {
      doc.text(`Diagnosis: ${formData.diagnosis}`, 14, yPos);
      yPos += 6;
    }
    if (formData.overallAssessment) {
      const assessmentLines = doc.splitTextToSize(formData.overallAssessment, 180);
      doc.text(assessmentLines, 14, yPos);
    }
  }
};

// Generate CRS PDF
const generateCRSPDF = (doc: jsPDF, item: EvidenceItem, startY: number) => {
  let yPos = startY;
  const formData = item.crsFormData;

  if (!formData) {
    doc.setFontSize(10);
    doc.text('No form data available', 14, yPos);
    return;
  }

  // Assessor Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Assessor Information', 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assessor: ${formData.assessorName}`, 14, yPos);
  yPos += 6;
  doc.text(`Email: ${formData.assessorEmail}`, 14, yPos);
  yPos += 6;
  yPos += 5;

  // CRS Type
  if (formData.crsType) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CRS Type', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.crsType, 14, yPos);
    yPos += 8;
  }

  // Case Description
  if (formData.caseDescription) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Case Description', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const caseLines = doc.splitTextToSize(formData.caseDescription, 180);
    doc.text(caseLines, 14, yPos);
  }
};

// Generate bulk PDF with all COMPLETE evidence
export const generateBulkEvidencePDF = (items: EvidenceItem[], profile: UserProfile): Blob => {
  const doc = new jsPDF();
  let yPos = 20;

  // Cover Page
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Evidence Portfolio', 105, 50, { align: 'center' });
  yPos = 70;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Trainee: ${profile.name}`, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Grade: ${profile.grade}`, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Total Evidence Items: ${items.length}`, 105, yPos, { align: 'center' });

  // Table of Contents
  doc.addPage();
  yPos = 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', 14, yPos);
  yPos += 15;

  const tocData = items.map((item, idx) => [
    (idx + 1).toString(),
    item.type,
    item.title,
    item.date,
    item.status
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Type', 'Title', 'Date', 'Status']],
    body: tocData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 }
  });

  // Generate each evidence item
  items.forEach((item, idx) => {
    doc.addPage();
    yPos = 20;

    // Item header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${item.title}`, 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Type: ${item.type}`, 14, yPos);
    yPos += 6;
    doc.text(`Date: ${item.date}`, 14, yPos);
    yPos += 6;
    doc.text(`Status: ${item.status}`, 14, yPos);
    yPos += 6;
    if (item.sia) {
      doc.text(`SIA: ${item.sia}`, 14, yPos);
      yPos += 6;
    }
    if (item.level) {
      doc.text(`Level: ${item.level}`, 14, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Generate form-specific content
    switch (item.type) {
      case EvidenceType.EPA:
        generateEPAPDF(doc, item, yPos);
        break;
      case EvidenceType.GSAT:
        generateGSATPDF(doc, item, yPos);
        break;
      case EvidenceType.DOPs:
        generateDOPsPDF(doc, item, yPos);
        break;
      case EvidenceType.OSATs:
        generateOSATsPDF(doc, item, yPos);
        break;
      case EvidenceType.CbD:
        generateCBDPDF(doc, item, yPos);
        break;
      case EvidenceType.CRS:
        generateCRSPDF(doc, item, yPos);
        break;
      default:
        if (item.notes) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Notes', 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const notesLines = doc.splitTextToSize(item.notes, 180);
          doc.text(notesLines, 14, yPos);
        }
        break;
    }
  });

  return doc.output('blob');
};

