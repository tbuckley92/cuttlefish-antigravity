import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateLogbookHTML } from './htmlGenerator';
import { generateEvidencePDF } from './pdfGenerator';
import { EvidenceItem, EvidenceType, EvidenceStatus, UserProfile, SIA, PortfolioProgressItem, EyeLogbookEntry, EyeLogbookComplication } from '../types';

interface ZipExportOptions {
    profile: UserProfile;
    evidence: EvidenceItem[];
    sias: SIA[];
    portfolioProgress: PortfolioProgressItem[];
    logbookEntries: EyeLogbookEntry[];
    complicationCases: EyeLogbookComplication[];
    onProgress?: (progress: number) => void;
}

export const exportPortfolioAsZip = async (options: ZipExportOptions) => {
    const { profile, evidence, sias, portfolioProgress, logbookEntries, complicationCases, onProgress } = options;

    console.log('🔍 Starting ZIP export...');
    console.log('📊 Total evidence items:', evidence.length);

    const zip = new JSZip();
    const evidenceFolder = zip.folder("evidence");

    const localPathMap = new Map<string, string>();

    // Filter to COMPLETE evidence items only (these are the ones with PDFs)
    const completedEvidence = evidence.filter(item =>
        item.status === EvidenceStatus.SignedOff
    );

    // Exclude certain types that don't have PDF exports
    const excludedTypes = [
        EvidenceType.ARCPPrep,
        EvidenceType.Logbook // Eye Logbook PDFs are handled separately
    ];

    const pdfableEvidence = completedEvidence.filter(item =>
        !excludedTypes.includes(item.type)
    );

    const totalItems = pdfableEvidence.length;
    console.log('📄 Completed evidence items to export as PDF:', totalItems);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Generate PDFs for each evidence item
    for (const item of pdfableEvidence) {
        try {
            console.log(`📄 Generating PDF [${processedCount + 1}/${totalItems}]:`, item.title);

            // Generate the PDF using the existing generator
            const pdfBlob = generateEvidencePDF(item, profile, evidence);

            // Create a safe filename
            const safeTitle = item.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 40) || 'evidence';
            const safeType = item.type?.replace(/[^a-z0-9]/gi, '_') || 'form';
            const fileName = `${safeType}_${safeTitle}_${item.date || 'undated'}.pdf`;

            if (evidenceFolder) {
                evidenceFolder.file(fileName, pdfBlob);
                localPathMap.set(item.id, `./evidence/${fileName}`);
                successCount++;
                console.log('   ✅ Added:', fileName);
            }
        } catch (error) {
            errorCount++;
            console.error(`   ❌ Error generating PDF for ${item.title}:`, error);
        }

        processedCount++;
        if (onProgress && totalItems > 0) {
            const progress = Math.round((processedCount / totalItems) * 85);
            onProgress(progress);
        }
    }

    console.log(`\n📊 PDF Generation Summary:
  - Total COMPLETE items: ${completedEvidence.length}
  - Items with PDFs: ${totalItems}
  - Success: ${successCount}
  - Errors: ${errorCount}
  - LocalPathMap size: ${localPathMap.size}`);

    // Generate HTML with local PDF links
    console.log('\n📄 Generating HTML with', localPathMap.size, 'local PDF links...');

    const htmlContent = generateLogbookHTML(
        profile,
        evidence,
        sias,
        portfolioProgress,
        logbookEntries,
        complicationCases,
        localPathMap
    );

    zip.file("index.html", htmlContent);
    console.log('✅ index.html added to ZIP');

    if (onProgress) onProgress(95);

    // Generate ZIP and trigger download
    console.log('\n📦 Generating ZIP file...');
    const content = await zip.generateAsync({ type: "blob" });
    console.log('✅ ZIP generated. Size:', (content.size / 1024 / 1024).toFixed(2), 'MB');

    if (onProgress) onProgress(100);

    const fileName = `Portfolio_Archive_${profile.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    console.log('💾 Saving as:', fileName);

    saveAs(content, fileName);
    console.log('✅ ZIP export complete!');

    return {
        total: totalItems,
        success: successCount,
        errors: errorCount
    };
};
