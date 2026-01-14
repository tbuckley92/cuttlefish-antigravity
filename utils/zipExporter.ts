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
    const zip = new JSZip();
    const evidenceFolder = zip.folder("evidence");

    const localPathMap = new Map<string, string>();
    const filesToDownload = evidence.filter(item => item.fileUrl);
    const totalFiles = filesToDownload.length;

    let downloadedCount = 0;

    // 1. Download Evidence Files
    for (const item of filesToDownload) {
        if (!item.fileUrl || !item.id) continue;

        try {
            let url = item.fileUrl;

            // Resolve Supabase path to URL if needed
            if (isSupabaseConfigured && !url.startsWith('http') && !url.startsWith('data:')) {
                url = await getEvidenceFileUrl(url);
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            const blob = await response.blob();

            // Generate a safe local filename
            const extension = item.fileName?.split('.').pop() || 'file';
            const safeTitle = item.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
            const fileName = `${item.id}_${safeTitle}.${extension}`;

            if (evidenceFolder) {
                evidenceFolder.file(fileName, blob);
                localPathMap.set(item.id, `./evidence/${fileName}`);
            }
        } catch (error) {
            console.error(`Error downloading file for evidence ${item.id}:`, error);
        }

        downloadedCount++;
        if (onProgress) {
            onProgress(Math.round((downloadedCount / totalFiles) * 90)); // 0-90% for file downloads
        }
    }

    // 2. Generate HTML with local paths
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

    if (onProgress) onProgress(95);

    // 3. Generate ZIP and trigger download
    const content = await zip.generateAsync({ type: "blob" });
    if (onProgress) onProgress(100);

    saveAs(content, `Portfolio_Archive_${profile.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`);
};
