import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateLogbookHTML } from './htmlGenerator';
import { EvidenceItem, UserProfile, SIA, PortfolioProgressItem, EyeLogbookEntry, EyeLogbookComplication } from '../types';
import { getEvidenceFileUrl } from './storageUtils';
import { isSupabaseConfigured } from './supabaseClient';

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
    const filesToDownload = evidence.filter(item => item.fileUrl);
    const totalFiles = filesToDownload.length;

    console.log('📁 Items with fileUrl:', totalFiles);

    let downloadedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let skippedBlobCount = 0;

    // Download Evidence Files
    for (const item of filesToDownload) {
        if (!item.fileUrl || !item.id) {
            console.warn('⚠️ Skipping item without fileUrl or id:', item.title);
            continue;
        }

        try {
            const url = item.fileUrl;
            let blob: Blob;

            console.log(`📥 Downloading [${downloadedCount + 1}/${totalFiles}]:`, item.title);
            console.log('   URL:', url.substring(0, 60) + (url.length > 60 ? '...' : ''));

            // Blob URLs are temporary browser references - skip them
            if (url.startsWith('blob:')) {
                console.log('   ⚠️ Blob URL detected - file was never uploaded to cloud storage');
                skippedBlobCount++;
                throw new Error('Temporary blob URL (re-upload file to include in export)');
            }

            // Handle Supabase storage paths (format: userId/filename.ext)
            if (isSupabaseConfigured && !url.startsWith('http') && !url.startsWith('data:')) {
                console.log('   🔄 Downloading from Supabase Storage...');

                const { supabase } = await import('./supabaseClient');

                const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from('evidence-files')
                    .download(url);

                if (downloadError || !fileData) {
                    throw new Error(`Storage download failed: ${downloadError?.message}`);
                }

                blob = fileData;
                console.log('   ✅ Downloaded. Size:', (blob.size / 1024).toFixed(2), 'KB');

            } else if (url.startsWith('http')) {
                // Regular HTTP/HTTPS URLs
                console.log('   🌐 Fetching from URL...');
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                blob = await response.blob();
                console.log('   ✅ Downloaded. Size:', (blob.size / 1024).toFixed(2), 'KB');

            } else if (url.startsWith('data:')) {
                // Base64 data URLs
                console.log('   📎 Processing embedded data URL...');
                const response = await fetch(url);
                blob = await response.blob();
                console.log('   ✅ Extracted. Size:', (blob.size / 1024).toFixed(2), 'KB');

            } else {
                throw new Error('Unknown URL format');
            }

            // Generate a safe local filename
            const extension = item.fileName?.split('.').pop() || 'file';
            const safeTitle = item.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
            const fileName = `${item.id.substring(0, 8)}_${safeTitle}.${extension}`;

            if (evidenceFolder) {
                evidenceFolder.file(fileName, blob);
                localPathMap.set(item.id, `./evidence/${fileName}`);
                successCount++;
                console.log('   ✅ Added to ZIP:', fileName);
            }
        } catch (error) {
            errorCount++;
            console.error(`   ❌ Error:`, error);
        }

        downloadedCount++;
        if (onProgress && totalFiles > 0) {
            const progress = Math.round((downloadedCount / totalFiles) * 90);
            onProgress(progress);
        }
    }

    console.log(`\n📊 Download Summary:
  - Total: ${totalFiles}
  - Success: ${successCount}
  - Skipped (blob URLs): ${skippedBlobCount}
  - Other Errors: ${errorCount - skippedBlobCount}
  - LocalPathMap size: ${localPathMap.size}`);

    // Generate HTML with local paths
    console.log('\n📄 Generating HTML with', localPathMap.size, 'local file links...');

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

    // Return summary for UI
    return {
        total: totalFiles,
        success: successCount,
        skippedBlob: skippedBlobCount,
        errors: errorCount - skippedBlobCount
    };
};
