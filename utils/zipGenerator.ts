
import JSZip from 'jszip';
import { EvidenceItem, UserProfile } from '../types';
import { generateEvidencePDF } from './pdfGenerator';

// Helper to sanitize filename
const sanitizeFilename = (str: string): string => {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

// Create ZIP file containing individual PDFs for selected evidence items
export const createEvidenceZip = async (
  items: EvidenceItem[], 
  profile: UserProfile
): Promise<Blob> => {
  const zip = new JSZip();

  // Generate PDFs for each item and add to ZIP
  for (const item of items) {
    try {
      const pdfBlob = generateEvidencePDF(item, profile);
      
      // Convert blob to array buffer for JSZip
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // Create sanitized filename
      const sanitizedTitle = sanitizeFilename(item.title);
      const filename = `${item.type}_${sanitizedTitle}_${item.date}.pdf`;
      
      // Add PDF to ZIP
      zip.file(filename, arrayBuffer);
    } catch (error) {
      console.error(`Error generating PDF for ${item.title}:`, error);
      // Continue with other items even if one fails
    }
  }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
};

