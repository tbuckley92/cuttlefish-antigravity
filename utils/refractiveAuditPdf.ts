import jsPDF from 'jspdf';

/**
 * Generate a PDF with multiple letters for the refractive audit.
 * Each letter contains the QR code, instructions for opticians, and space for patient information.
 * 
 * @param formUrl - The URL that the QR code points to
 * @param qrDataUrl - The QR code as a data URL
 * @param lettersPerPage - Number of letters per page (default 2)
 * @param totalLetters - Total number of letters to generate (default 10)
 */
export const generateRefractiveAuditLetterPdf = async (
  formUrl: string,
  qrDataUrl: string,
  lettersPerPage: number = 2,
  totalLetters: number = 10
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const letterHeight = (pageHeight - margin * 2 - 10) / lettersPerPage; // 10mm gap between letters

  for (let i = 0; i < totalLetters; i++) {
    const letterIndexOnPage = i % lettersPerPage;
    
    // Add new page if needed (except for first letter)
    if (i > 0 && letterIndexOnPage === 0) {
      doc.addPage();
    }

    const yOffset = margin + letterIndexOnPage * (letterHeight + 5);
    
    renderLetter(doc, yOffset, letterHeight, pageWidth, margin, qrDataUrl);
  }

  return doc.output('blob');
};

/**
 * Render a single letter at the specified vertical position
 */
const renderLetter = (
  doc: jsPDF,
  yStart: number,
  height: number,
  pageWidth: number,
  margin: number,
  qrDataUrl: string
) => {
  const contentWidth = pageWidth - margin * 2;
  
  // Letter border with rounded corners effect (using lines)
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.rect(margin, yStart, contentWidth, height - 5);

  // Dotted cut line above the letter (except first one)
  if (yStart > 20) {
    doc.setLineDashPattern([2, 2], 0);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, yStart - 2.5, margin + contentWidth, yStart - 2.5);
    doc.setLineDashPattern([], 0); // Reset to solid
  }

  let y = yStart + 8;

  // Header
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(margin, yStart, contentWidth, 12, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Refractive Audit - Post-Cataract Assessment', margin + 5, yStart + 8);

  y = yStart + 20;

  // Two columns layout
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;
  const leftColX = margin + 5;
  const rightColX = margin + leftColWidth;

  // Left column - Instructions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('For the Optician:', leftColX, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  
  const instructions = [
    '1. Scan the QR code with your mobile phone',
    '2. Complete the refraction assessment form',
    '3. Enter visual acuity and refraction data',
    '4. Submit - data goes directly to the surgeon'
  ];
  
  instructions.forEach(line => {
    doc.text(line, leftColX, y);
    y += 5;
  });

  y += 3;
  
  // Patient sticker area
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(leftColX, y, leftColWidth - 15, 28, 'FD');
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Patient sticker / details', leftColX + 3, y + 5);
  
  doc.setFontSize(7);
  doc.text('Name: ________________________________', leftColX + 3, y + 12);
  doc.text('DOB: _________________________________', leftColX + 3, y + 18);
  doc.text('Hospital No: __________________________', leftColX + 3, y + 24);

  // Right column - QR Code
  const qrSize = 40;
  const qrX = rightColX + (rightColWidth - qrSize) / 2 - 5;
  const qrY = yStart + 18;
  
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  
  // "Scan me" text below QR
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241); // indigo-500
  doc.text('Scan to submit data', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });

  // Footer note
  const footerY = yStart + height - 12;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    'Thank you for supporting ophthalmology training quality improvement.',
    margin + contentWidth / 2,
    footerY,
    { align: 'center' }
  );
};

/**
 * Generate a single-page summary/cover sheet for the refractive audit letters
 */
export const generateRefractiveAuditCoverSheet = async (
  residentName: string,
  formUrl: string,
  qrDataUrl: string
): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Refractive Audit', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Post-Cataract Outcome Data Collection', pageWidth / 2, 38, { align: 'center' });

  let y = 70;

  // Resident info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Surgeon:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(residentName, margin + 25, y);

  y += 20;

  // QR Code section
  const qrSize = 60;
  const qrX = (pageWidth - qrSize) / 2;
  doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);

  y += qrSize + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('Scan this QR code to submit data', pageWidth / 2, y, { align: 'center' });

  y += 15;

  // URL
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const urlLines = doc.splitTextToSize(formUrl, pageWidth - margin * 2);
  doc.text(urlLines, pageWidth / 2, y, { align: 'center' });

  y += urlLines.length * 5 + 20;

  // Instructions
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Instructions for Opticians', margin, y);

  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const instructionsList = [
    '1. Scan the QR code above using your smartphone camera',
    '2. A form will open in your mobile browser (no app required)',
    '3. Enter the patient\'s details, visual acuity, and refraction',
    '4. Submit the form - data is sent securely to the surgeon',
    '5. No login or registration is required'
  ];

  instructionsList.forEach(instruction => {
    doc.text(instruction, margin, y);
    y += 8;
  });

  y += 10;

  // Data collected box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 3, 3, 'FD');

  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Data Collected:', margin + 5, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const dataPoints = [
    '• Patient ID and date of birth',
    '• Visual acuity (Snellen) - right and left eye',
    '• Refraction: sphere, cylinder, and axis for each eye',
    '• Subjective vision change assessment (better/same/worse)'
  ];

  dataPoints.forEach(point => {
    doc.text(point, margin + 5, y);
    y += 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generated by EyePortfolio - Supporting ophthalmology training',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 15,
    { align: 'center' }
  );

  return doc.output('blob');
};
