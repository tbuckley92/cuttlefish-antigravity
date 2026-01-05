
import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { PortfolioProgressItem, EvidenceItem, EvidenceType, EvidenceStatus, UserProfile } from '../types';
import { uuidv4 } from '../utils/uuid';
import { CheckCircle2, Clock, AlertCircle, Activity, ArrowLeft, ScrollText, UploadCloud, Save, Fish, X, Trash2, FileText, Link } from '../components/Icons';

interface ProgressProps {
  allEvidence: EvidenceItem[];
  traineeName?: string;
  isSupervisorView?: boolean;
  onBack?: () => void;
  profile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  onUpsertEvidence?: (item: Partial<EvidenceItem> & { id?: string }) => void;
  onDeleteEvidence?: (id: string) => void;
  portfolioProgress?: PortfolioProgressItem[];
  onUpsertProgress?: (item: Partial<PortfolioProgressItem>) => void;
  onDeleteProgress?: (sia: string, level: number, evidenceId: string) => void;
  onViewEvidence?: (item: EvidenceItem) => void;
}

import { SPECIALTIES } from '../constants';

const SIAs = SPECIALTIES;

const COLUMNS = [...SIAs, "GSAT"];
const LEVELS = [1, 2, 3, 4];

// Helper function to convert File to base64 data URL
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const Progress: React.FC<ProgressProps> = ({ allEvidence, traineeName, isSupervisorView, onBack, profile, onUpdateProfile, onUpsertEvidence, onDeleteEvidence, portfolioProgress, onUpsertProgress, onDeleteProgress, onViewEvidence }) => {
  const [isCatchUpMode, setIsCatchUpMode] = useState(false);
  const [selectedCatchUpBoxes, setSelectedCatchUpBoxes] = useState<Set<string>>(new Set());
  const [uploadedCatchUpFiles, setUploadedCatchUpFiles] = useState<Array<{ file: File, dataUrl: string, fileName: string }>>([]);

  const [isFourteenFishMode, setIsFourteenFishMode] = useState(false);
  const [selectedFourteenFishBoxes, setSelectedFourteenFishBoxes] = useState<Set<string>>(new Set());
  const [uploadedFourteenFishFiles, setUploadedFourteenFishFiles] = useState<Array<{ file: File, dataUrl: string, fileName: string }>>([]);

  // Linking mode state
  const [linkingFileUrl, setLinkingFileUrl] = useState<string | null>(null);
  const [linkingFileBoxKeys, setLinkingFileBoxKeys] = useState<string[]>([]);
  const [linkingIsCatchUp, setLinkingIsCatchUp] = useState<boolean>(false);
  const [linkingSelectedBoxes, setLinkingSelectedBoxes] = useState<Set<string>>(new Set());

  // Dialog state
  const [evidenceDialogData, setEvidenceDialogData] = useState<{ title: string, sia: string, level: number, items: EvidenceItem[] } | null>(null);

  // Ref removed: using allEvidence prop directly to ensure immediate UI updates

  // Initialize selected boxes from profile if available
  React.useEffect(() => {
    if (profile?.curriculumCatchUpCompletions) {
      const completedBoxes = new Set(
        Object.entries(profile.curriculumCatchUpCompletions)
          .filter(([_, completed]) => completed)
          .map(([key, _]) => key)
      );
      setSelectedCatchUpBoxes(completedBoxes);
    }
    if (profile?.fourteenFishCompletions) {
      const completedBoxes = new Set(
        Object.entries(profile.fourteenFishCompletions)
          .filter(([_, completed]) => completed)
          .map(([key, _]) => key)
      );
      setSelectedFourteenFishBoxes(completedBoxes);
    }
  }, [profile]);

  const getStatus = (column: string, level: number): EvidenceStatus | null => {
    // Check portfolio_progress first
    if (portfolioProgress) {
      const item = portfolioProgress.find(p => p.sia === column && p.level === level);
      if (item) {
        if (item.status === EvidenceStatus.SignedOff) return EvidenceStatus.SignedOff;
      }
    }

    // Check for FourteenFish completion first (takes precedence)
    const boxKey = `${column}-${level}`;
    if (profile?.fourteenFishCompletions?.[boxKey]) {
      return EvidenceStatus.SignedOff;
    }
    // Check for curriculum catch-up completion
    if (profile?.curriculumCatchUpCompletions?.[boxKey]) {
      return EvidenceStatus.SignedOff;
    }
    // 1. GSAT Logic: Stays domain-specific for all levels
    if (column === "GSAT") {
      const match = allEvidence.find(e => e.type === EvidenceType.GSAT && e.level === level);
      return match ? match.status : null;
    }

    // 2. Generic EPA Logic for Levels 1 & 2
    if (level === 1 || level === 2) {
      const epas = allEvidence.filter(e => e.type === EvidenceType.EPA && e.level === level);
      if (epas.length === 0) return null;

      // Status Priority: SignedOff > Submitted > Draft
      if (epas.some(e => e.status === EvidenceStatus.SignedOff)) return EvidenceStatus.SignedOff;
      if (epas.some(e => e.status === EvidenceStatus.Submitted)) return EvidenceStatus.Submitted;
      return EvidenceStatus.Draft;
    }

    // 3. Specialty-specific SIA Logic for Levels 3 & 4
    const match = allEvidence.find(e => {
      if (e.type !== EvidenceType.EPA || e.level !== level) return false;

      const evidenceSia = e.sia?.toLowerCase().trim() || "";
      const columnSia = column.toLowerCase().trim();

      if (columnSia === "cornea & ocular surface") {
        return evidenceSia.includes("cornea") && evidenceSia.includes("surface");
      }

      return evidenceSia === columnSia;
    });

    return match ? match.status : null;
  };

  const isCatchUpComplete = (column: string, level: number): boolean => {
    const catchUpKey = `${column}-${level}`;
    // Check portfolio_progress
    const progressEntry = portfolioProgress?.find(p => p.sia === column && p.level === level && p.evidence_type === EvidenceType.CurriculumCatchUp);
    if (progressEntry) {
      return progressEntry.status === EvidenceStatus.SignedOff;
    }
    return profile?.curriculumCatchUpCompletions?.[catchUpKey] === true || selectedCatchUpBoxes.has(catchUpKey);
  };

  const isFourteenFishComplete = (column: string, level: number): boolean => {
    const boxKey = `${column}-${level}`;
    // Check portfolio_progress
    const progressEntry = portfolioProgress?.find(p => p.sia === column && p.level === level && p.evidence_type === EvidenceType.FourteenFish);
    if (progressEntry) {
      return progressEntry.status === EvidenceStatus.SignedOff;
    }
    return profile?.fourteenFishCompletions?.[boxKey] === true || selectedFourteenFishBoxes.has(boxKey);
  };

  const isBoxSelectable = (column: string, level: number): boolean => {
    // Not selectable if GSAT column or level 4
    if (column === "GSAT" || level === 4) return false;

    // If we are in Linking Mode (linkingFileUrl is set), we allow selecting any box 
    // to link to this file, even if it's already completed by another file.
    // However, we prevent selecting boxes already linked to THIS file (handled by getCellColor logic mostly, 
    // but here we just want to ensure clickability).
    if (linkingFileUrl) {
      return true;
    }

    // Not selectable if already completed with CCU or 14Fish
    const boxKey = `${column}-${level}`;
    if (profile?.curriculumCatchUpCompletions?.[boxKey] || profile?.fourteenFishCompletions?.[boxKey]) {
      return false;
    }

    // Not selectable if box has any status (Draft, Submitted, SignedOff)
    const status = getStatus(column, level);
    if (status !== null) {
      return false;
    }

    return true;
  };

  const getCellColor = (status: EvidenceStatus | null, column: string, level: number) => {
    const boxKey = `${column}-${level}`;

    // When in CCU/Fish mode, prioritize showing already-completed boxes as dark grey
    if (isCatchUpMode || isFourteenFishMode) {
      // Check if box is already completed from profile (not just selected in current session)
      // Prioritize portfolio_progress status if available
      const isAlreadyCompleted = isCatchUpMode
        ? (() => {
          const entry = portfolioProgress?.find(p => p.sia === column && p.level === level && p.evidence_type === EvidenceType.CurriculumCatchUp);
          return entry ? entry.status === EvidenceStatus.SignedOff : profile?.curriculumCatchUpCompletions?.[boxKey];
        })()
        : (() => {
          const entry = portfolioProgress?.find(p => p.sia === column && p.level === level && p.evidence_type === EvidenceType.FourteenFish);
          return entry ? entry.status === EvidenceStatus.SignedOff : profile?.fourteenFishCompletions?.[boxKey];
        })();

      if (isAlreadyCompleted) {
        // Show dark grey for boxes already linked to other files
        return "bg-slate-400/60 dark:bg-slate-600/40";
      }

      // Show green only for boxes currently selected in this session (not yet saved)
      if (isCatchUpMode && selectedCatchUpBoxes.has(boxKey) && !isAlreadyCompleted) {
        return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
      }
      if (isFourteenFishMode && selectedFourteenFishBoxes.has(boxKey) && !isAlreadyCompleted) {
        return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
      }

      // Show dark grey for boxes that are not selectable (have status or are already completed)
      if (!isBoxSelectable(column, level)) {
        return "bg-slate-400/60 dark:bg-slate-600/40";
      }

      // Highlight selectable boxes in catch-up or FourteenFish mode
      if (isBoxSelectable(column, level)) {
        return "bg-indigo-100/50 dark:bg-indigo-500/10 border-2 border-indigo-300 dark:border-indigo-400";
      }
    }

    // Outside of CCU/Fish mode, use the original completion logic
    // Check for FourteenFish completion first (takes precedence)
    if (isFourteenFishComplete(column, level)) {
      return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    }
    // Check for catch-up completion
    if (isCatchUpComplete(column, level)) {
      return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    }

    // Highlight boxes selected for linking - Grey with Icon as requested
    if (linkingFileUrl && linkingSelectedBoxes.has(boxKey)) {
      return "bg-slate-400/80 dark:bg-slate-600/60 border-2 border-teal-400 dark:border-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.4)]";
    }

    // Highlight selectable grey boxes in linking mode
    if (linkingFileUrl && status === null && isBoxSelectable(column, level) &&
      !profile?.curriculumCatchUpCompletions?.[boxKey] && !profile?.fourteenFishCompletions?.[boxKey]) {
      return "bg-teal-50/50 dark:bg-teal-500/10 border-2 border-teal-300 dark:border-teal-400 border-dashed";
    }

    switch (status) {
      case EvidenceStatus.SignedOff:
        return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
      case EvidenceStatus.Submitted:
        return "bg-amber-400/90 dark:bg-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.3)]";
      case EvidenceStatus.Draft:
        return "bg-sky-400/90 dark:bg-sky-400/70 shadow-[0_0_15px_rgba(56,189,248,0.3)]";
      default:
        return "bg-slate-200/50 dark:bg-white/5";
    }
  };

  const getStatusIcon = (status: EvidenceStatus | null, column: string, level: number) => {
    // Check for FourteenFish completion first (takes precedence)
    if (isFourteenFishComplete(column, level)) {
      return <Fish size={12} className="text-white" />;
    }
    // Check for catch-up completion
    if (isCatchUpComplete(column, level)) {
      return <ScrollText size={12} className="text-white" />;
    }

    // Check for currently linking boxes
    const boxKey = `${column}-${level}`;
    if (linkingFileUrl && linkingSelectedBoxes.has(boxKey)) {
      return linkingIsCatchUp
        ? <ScrollText size={12} className="text-white" />
        : <Fish size={12} className="text-white" />;
    }

    switch (status) {
      case EvidenceStatus.SignedOff:
        return <CheckCircle2 size={12} className="text-white" />;
      case EvidenceStatus.Submitted:
        return <Activity size={12} className="text-white" />; // Representing "In Progress"
      case EvidenceStatus.Draft:
        return <Clock size={12} className="text-white" />;
      default:
        return null;
    }
  };



  /**
   * Helper to find all evidence associated with a box.
   * Merges explicit links (portfolioProgress) and implicit links (Evidence logic).
   */
  const getEvidenceForBox = (column: string, level: number): EvidenceItem[] => {
    const boxKey = `${column}-${level}`;
    const foundIds = new Set<string>();
    const foundItems: EvidenceItem[] = [];

    // 1. Check portfolio_progress (Explicit links)
    if (portfolioProgress) {
      const linkedProgress = portfolioProgress.filter(p => p.sia === column && p.level === level);
      linkedProgress.forEach(p => {
        if (p.evidence_id) foundIds.add(p.evidence_id);
      });
    }

    // 2. Check Implicit Logic (GSAT, EPA Levels 1/2, Specialty EPAs)
    // Note: This logic mirrors getStatus but returns items
    if (column === "GSAT") {
      allEvidence.filter(e => e.type === EvidenceType.GSAT && e.level === level).forEach(e => foundIds.add(e.id));
    } else if (level === 1 || level === 2) {
      // Generic EPAs apply to level 1 & 2
      allEvidence.filter(e => e.type === EvidenceType.EPA && e.level === level).forEach(e => foundIds.add(e.id));
    } else {
      // Specialty Logic
      allEvidence.filter(e => {
        if (e.type !== EvidenceType.EPA || e.level !== level) return false;
        const evidenceSia = e.sia?.toLowerCase().trim() || "";
        const columnSia = column.toLowerCase().trim();
        if (columnSia === "cornea & ocular surface") {
          return evidenceSia.includes("cornea") && evidenceSia.includes("surface");
        }
        return evidenceSia === columnSia;
      }).forEach(e => foundIds.add(e.id));
    }

    // 3. Check Legacy Completions (if they map to specific items in allEvidence)
    // Legacy mapping is tricky because one item covers multiple boxes, but we want to show that item here.
    const isLegacyCompleted = profile?.curriculumCatchUpCompletions?.[boxKey] || profile?.fourteenFishCompletions?.[boxKey];
    if (isLegacyCompleted) {
      const sia = column !== "GSAT" ? column : "GSAT";
      // Find items that MIGHT match this box
      allEvidence.filter(e => {
        const isCCU = e.type === EvidenceType.CurriculumCatchUp && profile?.curriculumCatchUpCompletions?.[boxKey];
        const isFish = e.type === EvidenceType.FourteenFish && profile?.fourteenFishCompletions?.[boxKey];
        if (!isCCU && !isFish) return false;

        const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
        // Naive title check often used in legacy mapping
        const titleMatch = e.title.includes(sia);
        return siaMatch && titleMatch;
      }).forEach(e => foundIds.add(e.id));
    }

    // Retrieve full objects
    foundIds.forEach(id => {
      const item = allEvidence.find(e => e.id === id);
      if (item) foundItems.push(item);
    });

    return foundItems;
  };


  const handleBoxClick = (column: string, level: number) => {
    // Desktop Check for Dialog (min-width 768px matching Tailwind md)
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

    // If we are NOT in special modes (CatchUp/FourteenFish/Linking), 
    // and on Desktop, we want to show the dialog of linked evidence.
    const isNormalMode = !isCatchUpMode && !isFourteenFishMode && !linkingFileUrl;

    if (isDesktop && isNormalMode) {
      const items = getEvidenceForBox(column, level);
      if (items.length > 0) {
        setEvidenceDialogData({
          title: `${column} - Level ${level}`,
          sia: column,
          level: level,
          items
        });
        return; // Stop processing explicit legacy clicks below if we opened dialog
      }
    }

    const boxKey = `${column}-${level}`;

    // If box is completed (check only profile, not selected boxes), open file in new tab
    // First check EvidenceItem entries (more reliable after page reload)
    // ... (rest of original logic)
    if (profile?.curriculumCatchUpCompletions?.[boxKey]) {
      // Look for EvidenceItem entry matching this SIA (not specific level)
      const sia = column !== "GSAT" ? column : "GSAT";
      const evidenceItem = allEvidence.find(e => {
        const typeMatch = e.type === EvidenceType.CurriculumCatchUp;
        const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
        const titleMatch = e.title.includes(sia) && e.title.includes('Curriculum Catch Up') && !e.title.match(/L\d/);
        return typeMatch && siaMatch && titleMatch;
      });

      // Try EvidenceItem fileUrl first
      if (evidenceItem?.fileUrl) {
        try {
          window.open(evidenceItem.fileUrl, '_blank');
          return;
        } catch (error) {
          // Blob URL might be invalid, try profile fallback
        }
      }

      // Fall back to profile URL
      if (profile?.curriculumCatchUpPDFs?.[boxKey]) {
        try {
          window.open(profile.curriculumCatchUpPDFs[boxKey], '_blank');
          return;
        } catch (error) {
          alert('The PDF file is no longer available. Please re-upload the Curriculum Catch Up PDF.');
          return;
        }
      }

      // If we have completion but no file URL
      if (evidenceItem) {
        alert(`Curriculum Catch Up PDF for ${column} L${level} exists but the file is no longer available. Please re-upload.`);
        return;
      }
    }

    // Similar for FourteenFish
    if (profile?.fourteenFishCompletions?.[boxKey]) {
      // Look for EvidenceItem entry matching this SIA (not specific level)
      const sia = column !== "GSAT" ? column : "GSAT";
      const evidenceItem = allEvidence.find(e => {
        const typeMatch = e.type === EvidenceType.FourteenFish;
        const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
        const titleMatch = e.title.includes(sia) && e.title.includes('FourteenFish') && !e.title.match(/L\d/);
        return typeMatch && siaMatch && titleMatch;
      });

      // Try EvidenceItem fileUrl first
      if (evidenceItem?.fileUrl) {
        try {
          window.open(evidenceItem.fileUrl, '_blank');
          return;
        } catch (error) {
          // Blob URL might be invalid, try profile fallback
        }
      }

      // Fall back to profile URL
      if (profile?.fourteenFishEvidence?.[boxKey]) {
        try {
          window.open(profile.fourteenFishEvidence[boxKey], '_blank');
          return;
        } catch (error) {
          alert('The image file is no longer available. Please re-upload the FourteenFish evidence.');
          return;
        }
      }

      // If we have completion but no file URL
      if (evidenceItem) {
        alert(`FourteenFish evidence for ${column} L${level} exists but the file is no longer available. Please re-upload.`);
        return;
      }
    }

    // Handle selection in linking mode
    if (linkingFileUrl && !isSupervisorView) {
      // Only allow selecting grey (NOT STARTED) boxes that are selectable
      const status = getStatus(column, level);
      const isNotStarted = status === null;
      const isSelectable = isBoxSelectable(column, level);
      const isNotCompleted = !profile?.curriculumCatchUpCompletions?.[boxKey] && !profile?.fourteenFishCompletions?.[boxKey];

      if (isNotStarted && isSelectable && isNotCompleted) {
        setLinkingSelectedBoxes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(boxKey)) {
            newSet.delete(boxKey);
          } else {
            newSet.add(boxKey);
          }
          return newSet;
        });
      }
      return;
    }

    // Handle selection in catch-up mode
    if (isCatchUpMode && !isSupervisorView) {
      // Only allow selection if box is selectable (checks status and completion)
      if (isBoxSelectable(column, level)) {
        setSelectedCatchUpBoxes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(boxKey)) {
            newSet.delete(boxKey);
          } else {
            newSet.add(boxKey);
          }
          return newSet;
        });
      }
      return;
    }

    // Handle selection in FourteenFish mode
    if (isFourteenFishMode && !isSupervisorView) {
      // Only allow selection if box is selectable (checks status and completion)
      if (isBoxSelectable(column, level)) {
        setSelectedFourteenFishBoxes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(boxKey)) {
            newSet.delete(boxKey);
          } else {
            newSet.add(boxKey);
          }
          return newSet;
        });
      }
      return;
    }
  };

  const handleRowClick = (level: number) => {
    if (level === 4) return; // Level 4 is not selectable

    if (isCatchUpMode && !isSupervisorView) {
      const boxesInRow = COLUMNS.filter(col => col !== "GSAT")
        .map(col => `${col}-${level}`);

      const allSelected = boxesInRow.every(key => selectedCatchUpBoxes.has(key));

      setSelectedCatchUpBoxes(prev => {
        const newSet = new Set(prev);
        if (allSelected) {
          boxesInRow.forEach(key => newSet.delete(key));
        } else {
          boxesInRow.forEach(key => newSet.add(key));
        }
        return newSet;
      });
    }

    if (isFourteenFishMode && !isSupervisorView) {
      const boxesInRow = COLUMNS.filter(col => col !== "GSAT")
        .map(col => `${col}-${level}`);

      const allSelected = boxesInRow.every(key => selectedFourteenFishBoxes.has(key));

      setSelectedFourteenFishBoxes(prev => {
        const newSet = new Set(prev);
        if (allSelected) {
          boxesInRow.forEach(key => newSet.delete(key));
        } else {
          boxesInRow.forEach(key => newSet.add(key));
        }
        return newSet;
      });
    }
  };

  const handleSaveCatchUp = () => {
    if (!onUpdateProfile || !profile) return;
    if (uploadedCatchUpFiles.length > 0 && !onUpsertEvidence) {
      alert('Unable to save: Evidence creation not available');
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:372', message: 'handleSaveCatchUp: Entry', data: { selectedBoxesCount: selectedCatchUpBoxes.size, selectedBoxes: Array.from(selectedCatchUpBoxes), uploadedFilesCount: uploadedCatchUpFiles.length, uploadedFileNames: uploadedCatchUpFiles.map(f => f.fileName) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    // Filter out boxes that are already completed in the profile
    // Only process newly selected boxes (not already linked to other files)
    const newlySelectedBoxes = Array.from(selectedCatchUpBoxes).filter((key) =>
      !profile?.curriculumCatchUpCompletions?.[key as string]
    ) as string[];

    // Convert Set to Record
    const completions: Record<string, boolean> = {};
    const pdfs: Record<string, string> = {};

    // Group newly selected boxes by specialty/SIA
    const boxesBySIA = new Map<string, string[]>(); // SIA -> array of box keys

    newlySelectedBoxes.forEach(key => {
      const [column] = key.split('-');
      const sia = column !== "GSAT" ? column : "GSAT";

      if (!boxesBySIA.has(sia)) {
        boxesBySIA.set(sia, []);
      }
      boxesBySIA.get(sia)!.push(key);
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:394', message: 'handleSaveCatchUp: boxesBySIA grouped', data: { boxesBySIA: Array.from(boxesBySIA.entries()).map(([sia, keys]) => ({ sia, keys })) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    // Process each uploaded file
    if (uploadedCatchUpFiles.length > 0 && onUpsertEvidence) {
      uploadedCatchUpFiles.forEach((fileData) => {
        const { dataUrl, fileName } = fileData;

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:399', message: 'handleSaveCatchUp: Processing file', data: { fileName, dataUrlPrefix: dataUrl.substring(0, 50) + '...' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion

        // Delete old evidence items for this file (same fileUrl and fileName) before creating new ones
        // This ensures that when the same file is uploaded multiple times, only the latest upload's boxes are shown
        if (onDeleteEvidence) {
          const oldEvidenceItems = allEvidence.filter(e =>
            e.type === EvidenceType.CurriculumCatchUp &&
            e.fileUrl === dataUrl &&
            e.fileName === fileName
          );

          oldEvidenceItems.forEach(oldItem => {
            onDeleteEvidence(oldItem.id);
          });
        }

        // For each file, link it to only newly selected boxes (not already completed)
        newlySelectedBoxes.forEach(key => {
          completions[key] = true;
          pdfs[key] = dataUrl;
        });

        // Create/update evidence items per SIA for this file
        boxesBySIA.forEach((boxKeys, sia) => {
          // Get levels for this SIA from selected boxes
          const levels = boxKeys.map(key => {
            const [, levelStr] = key.split('-');
            return parseInt(levelStr);
          }).sort((a, b) => a - b);
          const levelsText = levels.join(', ');
          const minLevel = levels.length > 0 ? levels[0] : undefined; // Use minimum (lowest) level

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:417', message: 'handleSaveCatchUp: Creating evidence item', data: { fileName, sia, boxKeys, levels, levelsText, minLevel }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
          // #endregion

          // Create evidence item with file name
          const evidenceId = uuidv4();
          onUpsertEvidence({
            id: evidenceId,
            type: EvidenceType.CurriculumCatchUp,
            title: sia === "GSAT"
              ? `GSAT - Curriculum Catch Up - ${fileName}`
              : `${sia} - Curriculum Catch Up - ${fileName}`,
            sia: sia !== "GSAT" ? sia : undefined,
            level: minLevel, // Set to minimum level instead of undefined
            date: new Date().toISOString().split('T')[0],
            status: EvidenceStatus.SignedOff,
            fileUrl: dataUrl,
            fileName: fileName,
            fileType: 'application/pdf',
            notes: `Levels: ${levelsText}`
          });

          // Also save to portfolio_progress if handler is available, creating entries for each level
          if (onUpsertProgress) {
            levels.forEach(level => {
              onUpsertProgress({
                sia,
                level,
                status: EvidenceStatus.SignedOff,
                evidence_type: EvidenceType.CurriculumCatchUp,
                evidence_id: evidenceId,
                notes: `Uploaded file: ${fileName}`
              });
            });
          }
        });
      });
    } else if (newlySelectedBoxes.length > 0) {
      // If no PDF uploaded but boxes selected, save to portfolio_progress anyway
      if (onUpsertProgress) {
        newlySelectedBoxes.forEach(key => {
          const [column, levelStr] = key.split('-');
          const level = parseInt(levelStr);
          const sia = column !== "GSAT" ? column : "GSAT";

          onUpsertProgress({
            sia,
            level,
            status: EvidenceStatus.SignedOff,
            evidence_type: EvidenceType.CurriculumCatchUp,
            notes: 'Manual catch-up completion'
          });
        });
      }
      // If no PDF is uploaded but boxes are selected, alert user that evidence won't be created
      alert('No PDF uploaded. Selections saved to profile and progress, but no evidence item created in MyEvidence.');
    }

    const updatedProfile: UserProfile = {
      ...profile,
      curriculumCatchUpCompletions: {
        ...profile.curriculumCatchUpCompletions,
        ...completions
      },
      curriculumCatchUpPDFs: {
        ...profile.curriculumCatchUpPDFs,
        ...pdfs
      }
    };

    onUpdateProfile(updatedProfile);
    setIsCatchUpMode(false);
    setSelectedCatchUpBoxes(new Set());
    setUploadedCatchUpFiles([]);
  };

  const handleSaveFourteenFish = () => {
    if (!onUpdateProfile || !profile) return;
    if (uploadedFourteenFishFiles.length > 0 && !onUpsertEvidence) {
      alert('Unable to save: Evidence creation not available');
      return;
    }

    // Filter out boxes that are already completed in the profile
    // Only process newly selected boxes (not already linked to other files)
    const newlySelectedBoxes = Array.from(selectedFourteenFishBoxes).filter((key) =>
      !profile?.fourteenFishCompletions?.[key as string]
    ) as string[];

    // Convert Set to Record
    const completions: Record<string, boolean> = {};
    const evidenceUrls: Record<string, string> = {};

    // Group newly selected boxes by specialty/SIA
    const boxesBySIA = new Map<string, string[]>(); // SIA -> array of box keys

    newlySelectedBoxes.forEach(key => {
      const [column] = key.split('-');
      const sia = column !== "GSAT" ? column : "GSAT";

      if (!boxesBySIA.has(sia)) {
        boxesBySIA.set(sia, []);
      }
      boxesBySIA.get(sia)!.push(key);
    });

    // Process each uploaded file
    if (uploadedFourteenFishFiles.length > 0 && onUpsertEvidence) {
      uploadedFourteenFishFiles.forEach((fileData) => {
        const { dataUrl, fileName } = fileData;

        // Delete old evidence items for this file (same fileUrl and fileName) before creating new ones
        // This ensures that when the same file is uploaded multiple times, only the latest upload's boxes are shown
        if (onDeleteEvidence) {
          const oldEvidenceItems = allEvidence.filter(e =>
            e.type === EvidenceType.FourteenFish &&
            e.fileUrl === dataUrl &&
            e.fileName === fileName
          );

          oldEvidenceItems.forEach(oldItem => {
            onDeleteEvidence(oldItem.id);
          });
        }

        // For each file, link it to only newly selected boxes (not already completed)
        newlySelectedBoxes.forEach(key => {
          completions[key] = true;
          evidenceUrls[key] = dataUrl;
        });

        // Create/update evidence items per SIA for this file
        boxesBySIA.forEach((boxKeys, sia) => {
          // Get levels for this SIA from selected boxes
          const levels = boxKeys.map(key => {
            const [, levelStr] = key.split('-');
            return parseInt(levelStr);
          }).sort((a, b) => a - b);
          const levelsText = levels.join(', ');
          const minLevel = levels.length > 0 ? levels[0] : undefined; // Use minimum (lowest) level

          // Create evidence item with file name
          const evidenceId = uuidv4();
          onUpsertEvidence({
            id: evidenceId,
            type: EvidenceType.FourteenFish,
            title: sia === "GSAT"
              ? `GSAT - FourteenFish - ${fileName}`
              : `${sia} - FourteenFish - ${fileName}`,
            sia: sia !== "GSAT" ? sia : undefined,
            level: minLevel, // Set to minimum level instead of undefined
            date: new Date().toISOString().split('T')[0],
            status: EvidenceStatus.SignedOff,
            fileUrl: dataUrl,
            fileName: fileName,
            fileType: fileData.file.type,
            notes: `Levels: ${levelsText}`
          });

          // Also save to portfolio_progress if handler is available
          if (onUpsertProgress) {
            levels.forEach(level => {
              onUpsertProgress({
                sia,
                level,
                status: EvidenceStatus.SignedOff,
                evidence_type: EvidenceType.FourteenFish,
                evidence_id: evidenceId,
                notes: `Uploaded file: ${fileName}`
              });
            });
          }
        });
      });
    } else if (newlySelectedBoxes.length > 0) {
      // If no image uploaded but boxes selected, save to portfolio_progress anyway
      if (onUpsertProgress) {
        newlySelectedBoxes.forEach(key => {
          const [column, levelStr] = key.split('-');
          const level = parseInt(levelStr);
          const sia = column !== "GSAT" ? column : "GSAT";

          onUpsertProgress({
            sia,
            level,
            status: EvidenceStatus.SignedOff,
            evidence_type: EvidenceType.FourteenFish,
            notes: 'Manual FourteenFish completion'
          });
        });
      }
      // If no image is uploaded but boxes are selected, alert user that evidence won't be created
      alert('No image uploaded. Selections saved to profile and progress, but no evidence item created in MyEvidence.');
    }

    const updatedProfile: UserProfile = {
      ...profile,
      fourteenFishCompletions: {
        ...profile.fourteenFishCompletions,
        ...completions
      },
      fourteenFishEvidence: {
        ...profile.fourteenFishEvidence,
        ...evidenceUrls
      }
    };

    onUpdateProfile(updatedProfile);
    setIsFourteenFishMode(false);
    setSelectedFourteenFishBoxes(new Set());
    setUploadedFourteenFishFiles([]);
  };

  const handleDeselectCatchUp = (column: string, level: number) => {
    if (!onUpdateProfile || !profile || !onDeleteEvidence || !onUpsertEvidence) return;

    const boxKey = `${column}-${level}`;
    const sia = column !== "GSAT" ? column : "GSAT";

    // Find evidence item for this SIA (not specific level)
    const evidenceItem = allEvidence.find(e => {
      const typeMatch = e.type === EvidenceType.CurriculumCatchUp;
      const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
      const titleMatch = e.title.includes(sia) && e.title.includes('Curriculum Catch Up') && !e.title.match(/L\d/);
      return typeMatch && siaMatch && titleMatch;
    });

    // Get remaining boxes for this SIA after deselection
    const remainingBoxes = Object.keys(profile.curriculumCatchUpCompletions || {})
      .filter(key => {
        const [col] = key.split('-');
        return (sia === "GSAT" ? col === "GSAT" : col === sia) && key !== boxKey;
      });

    // Remove from profile
    const updatedCompletions = { ...profile.curriculumCatchUpCompletions };
    delete updatedCompletions[boxKey];

    const updatedPDFs = { ...profile.curriculumCatchUpPDFs };
    delete updatedPDFs[boxKey];

    // Update or delete evidence item
    if (evidenceItem) {
      if (remainingBoxes.length === 0) {
        // No remaining boxes, delete the evidence item
        onDeleteEvidence(evidenceItem.id);
      } else {
        // Update evidence item with remaining levels
        const remainingLevels = remainingBoxes.map(key => {
          const [, levelStr] = key.split('-');
          return parseInt(levelStr);
        }).sort((a, b) => a - b);
        const levelsText = remainingLevels.join(', ');

        onUpsertEvidence({
          id: evidenceItem.id,
          type: EvidenceType.CurriculumCatchUp,
          title: sia === "GSAT" ? "GSAT - Curriculum Catch Up" : `${sia} - Curriculum Catch Up`,
          sia: sia !== "GSAT" ? sia : undefined,
          level: remainingLevels.length > 0 ? remainingLevels[0] : undefined, // Use minimum level
          date: evidenceItem.date,
          status: EvidenceStatus.SignedOff,
          fileUrl: evidenceItem.fileUrl,
          fileName: evidenceItem.fileName,
          fileType: evidenceItem.fileType,
          notes: `Levels: ${levelsText}`
        });
      }
    }

    const updatedProfile: UserProfile = {
      ...profile,
      curriculumCatchUpCompletions: updatedCompletions,
      curriculumCatchUpPDFs: updatedPDFs
    };

    onUpdateProfile(updatedProfile);
  };

  const handleDeselectFourteenFish = (column: string, level: number) => {
    if (!onUpdateProfile || !profile || !onDeleteEvidence || !onUpsertEvidence) return;

    const boxKey = `${column}-${level}`;
    const sia = column !== "GSAT" ? column : "GSAT";

    // Find evidence item for this SIA (not specific level)
    const evidenceItem = allEvidence.find(e => {
      const typeMatch = e.type === EvidenceType.FourteenFish;
      const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
      const titleMatch = e.title.includes(sia) && e.title.includes('FourteenFish') && !e.title.match(/L\d/);
      return typeMatch && siaMatch && titleMatch;
    });

    // Get remaining boxes for this SIA after deselection
    const remainingBoxes = Object.keys(profile.fourteenFishCompletions || {})
      .filter(key => {
        const [col] = key.split('-');
        return (sia === "GSAT" ? col === "GSAT" : col === sia) && key !== boxKey;
      });

    // Remove from profile
    const updatedCompletions = { ...profile.fourteenFishCompletions };
    delete updatedCompletions[boxKey];

    const updatedEvidence = { ...profile.fourteenFishEvidence };
    delete updatedEvidence[boxKey];

    // Update or delete evidence item
    if (evidenceItem) {
      if (remainingBoxes.length === 0) {
        // No remaining boxes, delete the evidence item
        onDeleteEvidence(evidenceItem.id);
      } else {
        // Update evidence item with remaining levels
        const remainingLevels = remainingBoxes.map(key => {
          const [, levelStr] = key.split('-');
          return parseInt(levelStr);
        }).sort((a, b) => a - b);
        const levelsText = remainingLevels.join(', ');

        onUpsertEvidence({
          id: evidenceItem.id,
          type: EvidenceType.FourteenFish,
          title: sia === "GSAT" ? "GSAT - FourteenFish" : `${sia} - FourteenFish`,
          sia: sia !== "GSAT" ? sia : undefined,
          level: remainingLevels.length > 0 ? remainingLevels[0] : undefined, // Use minimum level
          date: evidenceItem.date,
          status: EvidenceStatus.SignedOff,
          fileUrl: evidenceItem.fileUrl,
          fileName: evidenceItem.fileName,
          fileType: evidenceItem.fileType,
          notes: `Levels: ${levelsText}`
        });
      }
    }

    const updatedProfile: UserProfile = {
      ...profile,
      fourteenFishCompletions: updatedCompletions,
      fourteenFishEvidence: updatedEvidence
    };

    onUpdateProfile(updatedProfile);
  };

  const handleConfirmLink = () => {
    if (!onUpdateProfile || !profile || !linkingFileUrl || linkingSelectedBoxes.size === 0) return;
    if (!onUpsertEvidence) {
      alert('Unable to link: Evidence update not available');
      return;
    }

    // Convert selected boxes to completions and file URLs
    const newCompletions: Record<string, boolean> = {};
    const newFileUrls: Record<string, string> = {};

    linkingSelectedBoxes.forEach(boxKey => {
      newCompletions[boxKey] = true;
      newFileUrls[boxKey] = linkingFileUrl;
    });

    // Group new boxes by SIA
    const newBoxesBySIA = new Map<string, string[]>();
    linkingSelectedBoxes.forEach(boxKey => {
      const [sia] = boxKey.split('-');
      const normalizedSIA = sia !== "GSAT" ? sia : "GSAT";
      if (!newBoxesBySIA.has(normalizedSIA)) {
        newBoxesBySIA.set(normalizedSIA, []);
      }
      newBoxesBySIA.get(normalizedSIA)!.push(boxKey);
    });

    // Group existing boxes by SIA
    const existingBoxesBySIA = new Map<string, string[]>();
    linkingFileBoxKeys.forEach(boxKey => {
      const [sia] = boxKey.split('-');
      const normalizedSIA = sia !== "GSAT" ? sia : "GSAT";
      if (!existingBoxesBySIA.has(normalizedSIA)) {
        existingBoxesBySIA.set(normalizedSIA, []);
      }
      existingBoxesBySIA.get(normalizedSIA)!.push(boxKey);
    });

    // Get file name from existing evidence item or from the file URL
    let fileName: string | undefined;
    const anyEvidenceWithFile = allEvidence.find(e =>
      e.fileUrl === linkingFileUrl &&
      (linkingIsCatchUp ? e.type === EvidenceType.CurriculumCatchUp : e.type === EvidenceType.FourteenFish)
    );
    fileName = anyEvidenceWithFile?.fileName || (linkingIsCatchUp ? 'Curriculum Catch Up PDF' : 'FourteenFish Evidence');

    // Update or create evidence items for each SIA
    newBoxesBySIA.forEach((newBoxKeys, sia) => {
      // Get existing boxes for this SIA
      const existingBoxKeys = existingBoxesBySIA.get(sia) || [];
      const allBoxKeysForSIA = [...existingBoxKeys, ...newBoxKeys];

      // Get all levels for this SIA
      const allLevels = allBoxKeysForSIA.map(key => {
        const [, levelStr] = key.split('-');
        return parseInt(levelStr);
      }).sort((a, b) => a - b);
      const levelsText = allLevels.join(', ');

      // Find existing evidence item for this SIA and file
      const evidenceItem = allEvidence.find(e => {
        if (linkingIsCatchUp) {
          const typeMatch = e.type === EvidenceType.CurriculumCatchUp;
          const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
          const fileUrlMatch = e.fileUrl === linkingFileUrl;
          return typeMatch && siaMatch && fileUrlMatch;
        } else {
          const typeMatch = e.type === EvidenceType.FourteenFish;
          const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
          const fileUrlMatch = e.fileUrl === linkingFileUrl;
          return typeMatch && siaMatch && fileUrlMatch;
        }
      });

      // Update or create evidence item for this SIA
      // Update or create evidence item for this SIA
      const evidenceId = evidenceItem?.id || uuidv4();

      onUpsertEvidence({
        id: evidenceId,
        type: linkingIsCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
        title: sia === "GSAT"
          ? (linkingIsCatchUp ? `GSAT - Curriculum Catch Up - ${fileName}` : `GSAT - FourteenFish - ${fileName}`)
          : `${sia} - ${linkingIsCatchUp ? 'Curriculum Catch Up' : 'FourteenFish'} - ${fileName}`,
        sia: sia !== "GSAT" ? sia : undefined,
        level: allLevels.length > 0 ? allLevels[0] : undefined, // Use minimum level
        date: evidenceItem?.date || new Date().toISOString().split('T')[0],
        status: EvidenceStatus.SignedOff,
        fileUrl: linkingFileUrl,
        fileName: fileName,
        fileType: evidenceItem?.fileType || (linkingIsCatchUp ? 'application/pdf' : 'image/png'),
        notes: `Levels: ${levelsText}`
      });

      // Update portfolio progress for all levels in this SIA
      if (onUpsertProgress) {
        allLevels.forEach(level => {
          onUpsertProgress({
            sia: sia !== "GSAT" ? sia : "GSAT",
            level,
            status: EvidenceStatus.SignedOff,
            evidence_type: linkingIsCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
            evidence_id: evidenceId,
            notes: `Linked file: ${fileName}`
          });
        });
      }
    });

    // Also update existing evidence items for SIAs that don't have new boxes (to ensure they're still linked)
    existingBoxesBySIA.forEach((existingBoxKeys, sia) => {
      // Skip if we already processed this SIA (it has new boxes)
      if (newBoxesBySIA.has(sia)) return;

      // Get all levels for this SIA (only existing boxes)
      const allLevels = existingBoxKeys.map(key => {
        const [, levelStr] = key.split('-');
        return parseInt(levelStr);
      }).sort((a, b) => a - b);
      const levelsText = allLevels.join(', ');

      // Find existing evidence item for this SIA and file
      const evidenceItem = allEvidence.find(e => {
        if (linkingIsCatchUp) {
          const typeMatch = e.type === EvidenceType.CurriculumCatchUp;
          const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
          const fileUrlMatch = e.fileUrl === linkingFileUrl;
          return typeMatch && siaMatch && fileUrlMatch;
        } else {
          const typeMatch = e.type === EvidenceType.FourteenFish;
          const siaMatch = sia === "GSAT" ? !e.sia : e.sia === sia;
          const fileUrlMatch = e.fileUrl === linkingFileUrl;
          return typeMatch && siaMatch && fileUrlMatch;
        }
      });

      // Update evidence item to ensure it's still linked (with correct notes)
      // Update evidence item to ensure it's still linked (with correct notes)
      if (evidenceItem) {
        const evidenceId = evidenceItem.id; // Existing ID

        onUpsertEvidence({
          id: evidenceId,
          type: linkingIsCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
          title: sia === "GSAT"
            ? (linkingIsCatchUp ? `GSAT - Curriculum Catch Up - ${fileName}` : `GSAT - FourteenFish - ${fileName}`)
            : `${sia} - ${linkingIsCatchUp ? 'Curriculum Catch Up' : 'FourteenFish'} - ${fileName}`,
          sia: sia !== "GSAT" ? sia : undefined,
          level: allLevels.length > 0 ? allLevels[0] : undefined,
          date: evidenceItem.date,
          status: EvidenceStatus.SignedOff,
          fileUrl: linkingFileUrl,
          fileName: fileName,
          fileType: evidenceItem.fileType,
          notes: `Levels: ${levelsText}`
        });

        // Update portfolio progress for all levels in this SIA
        if (onUpsertProgress) {
          allLevels.forEach(level => {
            onUpsertProgress({
              sia: sia !== "GSAT" ? sia : "GSAT",
              level,
              status: EvidenceStatus.SignedOff,
              evidence_type: linkingIsCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
              evidence_id: evidenceId,
              notes: `Linked file: ${fileName}`
            });
          });
        }
      }
    });

    // Update profile
    if (linkingIsCatchUp) {
      const updatedProfile: UserProfile = {
        ...profile,
        curriculumCatchUpCompletions: {
          ...profile.curriculumCatchUpCompletions,
          ...newCompletions
        },
        curriculumCatchUpPDFs: {
          ...profile.curriculumCatchUpPDFs,
          ...newFileUrls
        }
      };
      onUpdateProfile(updatedProfile);
    } else {
      const updatedProfile: UserProfile = {
        ...profile,
        fourteenFishCompletions: {
          ...profile.fourteenFishCompletions,
          ...newCompletions
        },
        fourteenFishEvidence: {
          ...profile.fourteenFishEvidence,
          ...newFileUrls
        }
      };
      onUpdateProfile(updatedProfile);
    }

    // Clear linking mode
    setLinkingFileUrl(null);
    setLinkingFileBoxKeys([]);
    setLinkingSelectedBoxes(new Set());
  };

  // Helper function to get unique files with their associated boxes for Curriculum Catch Up
  const getCatchUpFiles = () => {
    // Get all Curriculum Catch Up evidence items
    const catchUpEvidence = allEvidence.filter(e => e.type === EvidenceType.CurriculumCatchUp && e.fileUrl);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:779', message: 'getCatchUpFiles: All catch up evidence items', data: { totalEvidence: catchUpEvidence.length, evidenceItems: catchUpEvidence.map(e => ({ id: e.id, fileName: e.fileName, fileUrl: e.fileUrl?.substring(0, 50) + '...', sia: e.sia, level: e.level, date: e.date, notes: e.notes })) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B,C' }) }).catch(() => { });
    // #endregion

    if (catchUpEvidence.length === 0) return [];

    // First, group evidence items by fileUrl+fileName to find all upload sessions
    const fileGroups = new Map<string, typeof catchUpEvidence>();
    catchUpEvidence.forEach(evidence => {
      if (!evidence.fileUrl || !evidence.fileName) return;
      const baseKey = `${evidence.fileUrl}|${evidence.fileName}`;
      if (!fileGroups.has(baseKey)) {
        fileGroups.set(baseKey, []);
      }
      fileGroups.get(baseKey)!.push(evidence);
    });

    // For each file, find the most recent upload session (by date, then by evidence ID)
    const fileMap = new Map<string, {
      fileUrl: string;
      fileName: string;
      boxes: string[];
      boxKeys: string[];
    }>();

    fileGroups.forEach((evidenceItems, baseKey) => {
      // Group by date to find upload sessions
      const dateGroups = new Map<string, typeof evidenceItems>();
      evidenceItems.forEach(evidence => {
        const date = evidence.date;
        if (!dateGroups.has(date)) {
          dateGroups.set(date, []);
        }
        dateGroups.get(date)!.push(evidence);
      });

      // Find the most recent date
      const dates = Array.from(dateGroups.keys()).sort().reverse();
      const mostRecentDate = dates[0];
      const mostRecentEvidence = dateGroups.get(mostRecentDate) || [];

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:810', message: 'getCatchUpFiles: Finding most recent upload', data: { baseKey: baseKey.substring(0, 100) + '...', allDates: dates, mostRecentDate, mostRecentEvidenceCount: mostRecentEvidence.length, mostRecentEvidenceIds: mostRecentEvidence.map(e => e.id) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B' }) }).catch(() => { });
      // #endregion

      // Process only the most recent evidence items
      const boxKeysSet = new Set<string>();
      const boxes: string[] = [];
      const boxKeys: string[] = [];

      mostRecentEvidence.forEach(evidence => {
        const levelsMatch = evidence.notes?.match(/Levels: (.+)/);
        if (levelsMatch) {
          const levels = levelsMatch[1].split(', ').map(l => parseInt(l.trim()));
          const sia = evidence.sia || "GSAT";

          levels.forEach(level => {
            const boxKey = `${sia}-${level}`;
            if (!boxKeysSet.has(boxKey)) {
              boxKeysSet.add(boxKey);
              boxKeys.push(boxKey);
              boxes.push(`${sia} L${level}`);
            }
          });
        }
      });

      if (mostRecentEvidence.length > 0) {
        const firstEvidence = mostRecentEvidence[0];
        fileMap.set(baseKey, {
          fileUrl: firstEvidence.fileUrl!,
          fileName: firstEvidence.fileName || 'Curriculum Catch Up PDF',
          boxes,
          boxKeys
        });
      }
    });

    const result = Array.from(fileMap.values());

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Progress.tsx:843', message: 'getCatchUpFiles: Final result', data: { fileCount: result.length, files: result.map(f => ({ fileName: f.fileName, boxCount: f.boxes.length, boxes: f.boxes, boxKeys: f.boxKeys })) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B,C,D,E' }) }).catch(() => { });
    // #endregion

    return result;
  };

  // Helper function to get unique files with their associated boxes for FourteenFish
  const getFourteenFishFiles = () => {
    // Get all FourteenFish evidence items
    const fourteenFishEvidence = allEvidence.filter(e => e.type === EvidenceType.FourteenFish && e.fileUrl);

    if (fourteenFishEvidence.length === 0) return [];

    // First, group evidence items by fileUrl+fileName to find all upload sessions
    const fileGroups = new Map<string, typeof fourteenFishEvidence>();
    fourteenFishEvidence.forEach(evidence => {
      if (!evidence.fileUrl || !evidence.fileName) return;
      const baseKey = `${evidence.fileUrl}|${evidence.fileName}`;
      if (!fileGroups.has(baseKey)) {
        fileGroups.set(baseKey, []);
      }
      fileGroups.get(baseKey)!.push(evidence);
    });

    // For each file, find the most recent upload session (by date, then by evidence ID)
    const fileMap = new Map<string, {
      fileUrl: string;
      fileName: string;
      boxes: string[];
      boxKeys: string[];
    }>();

    fileGroups.forEach((evidenceItems, baseKey) => {
      // Group by date to find upload sessions
      const dateGroups = new Map<string, typeof evidenceItems>();
      evidenceItems.forEach(evidence => {
        const date = evidence.date;
        if (!dateGroups.has(date)) {
          dateGroups.set(date, []);
        }
        dateGroups.get(date)!.push(evidence);
      });

      // Find the most recent date
      const dates = Array.from(dateGroups.keys()).sort().reverse();
      const mostRecentDate = dates[0];
      const mostRecentEvidence = dateGroups.get(mostRecentDate) || [];

      // Process only the most recent evidence items
      const boxKeysSet = new Set<string>();
      const boxes: string[] = [];
      const boxKeys: string[] = [];

      mostRecentEvidence.forEach(evidence => {
        const levelsMatch = evidence.notes?.match(/Levels: (.+)/);
        if (levelsMatch) {
          const levels = levelsMatch[1].split(', ').map(l => parseInt(l.trim()));
          const sia = evidence.sia || "GSAT";

          levels.forEach(level => {
            const boxKey = `${sia}-${level}`;
            if (!boxKeysSet.has(boxKey)) {
              boxKeysSet.add(boxKey);
              boxKeys.push(boxKey);
              boxes.push(`${sia} L${level}`);
            }
          });
        }
      });

      if (mostRecentEvidence.length > 0) {
        const firstEvidence = mostRecentEvidence[0];
        fileMap.set(baseKey, {
          fileUrl: firstEvidence.fileUrl!,
          fileName: firstEvidence.fileName || 'FourteenFish Evidence',
          boxes,
          boxKeys
        });
      }
    });

    return Array.from(fileMap.values());
  };
  // Handler to delete a file and all associated boxes
  const handleDeleteFile = (fileUrl: string, boxKeys: string[], isCatchUp: boolean) => {
    if (!onUpdateProfile || !profile || !onDeleteEvidence) return;

    // Find and delete evidence items that match the specific fileUrl
    const evidenceToDelete = allEvidence.filter(e => {
      if (isCatchUp) {
        return e.type === EvidenceType.CurriculumCatchUp && e.fileUrl === fileUrl;
      } else {
        return e.type === EvidenceType.FourteenFish && e.fileUrl === fileUrl;
      }
    });

    // Delete all evidence items for this file
    evidenceToDelete.forEach(evidence => {
      onDeleteEvidence(evidence.id);
    });

    // Update portfolio progress to remove Completed status for all associated boxes
    if (onUpsertProgress) {
      boxKeys.forEach(boxKey => {
        const [sia, levelStr] = boxKey.split('-');
        const level = parseInt(levelStr);
        const normalizedSia = sia === "GSAT" ? undefined : sia;

        // Only update if it was actually linked to this file (checked via profile or assumption)
        // Since we are deleting the FILE, and boxKeys come from that file, we should reset them.
        // Assumption: boxKeys passed here are ONLY for this file.
        onUpsertProgress({
          sia: normalizedSia || "GSAT",
          level: level,
          status: EvidenceStatus.Draft, // Reset to Draft
          evidence_type: isCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
          evidence_id: undefined,
          notes: 'File deleted'
        });
      });
    }

    // Remove from profile - only remove boxes that are associated with this specific file
    if (isCatchUp) {
      const updatedCompletions = { ...profile.curriculumCatchUpCompletions };
      const updatedPDFs = { ...profile.curriculumCatchUpPDFs };

      boxKeys.forEach(boxKey => {
        // Only delete if this box is linked to the file being deleted
        if (profile.curriculumCatchUpPDFs?.[boxKey] === fileUrl) {
          delete updatedCompletions[boxKey];
          delete updatedPDFs[boxKey];
        }
      });

      const updatedProfile: UserProfile = {
        ...profile,
        curriculumCatchUpCompletions: updatedCompletions,
        curriculumCatchUpPDFs: updatedPDFs
      };

      onUpdateProfile(updatedProfile);
    } else {
      const updatedCompletions = { ...profile.fourteenFishCompletions };
      const updatedEvidence = { ...profile.fourteenFishEvidence };

      boxKeys.forEach(boxKey => {
        // Only delete if this box is linked to the file being deleted
        if (profile.fourteenFishEvidence?.[boxKey] === fileUrl) {
          delete updatedCompletions[boxKey];
          delete updatedEvidence[boxKey];
        }
      });

      const updatedProfile: UserProfile = {
        ...profile,
        fourteenFishCompletions: updatedCompletions,
        fourteenFishEvidence: updatedEvidence
      };

      onUpdateProfile(updatedProfile);
    }
  };

  const handleUnlinkBox = (fileUrl: string, boxKey: string, isCatchUp: boolean) => {
    if (!onUpdateProfile || !profile || !onDeleteEvidence) return;

    const [sia, levelStr] = boxKey.split('-');
    const levelToRemove = parseInt(levelStr);
    const normalizedSia = sia === "GSAT" ? undefined : sia;

    // Find the specific evidence item(s) for this file and SIA
    const evidenceItems = allEvidence.filter(e => {
      const typeMatch = isCatchUp ? e.type === EvidenceType.CurriculumCatchUp : e.type === EvidenceType.FourteenFish;
      const keyMatch = e.fileUrl === fileUrl;
      const siaMatch = sia === "GSAT" ? !e.sia : e.sia === normalizedSia;
      return typeMatch && keyMatch && siaMatch;
    });

    evidenceItems.forEach(item => {
      // Parse levels from notes
      const levelsMatch = item.notes?.match(/Levels: (.+)/);
      if (levelsMatch) {
        const currentLevels = levelsMatch[1].split(', ').map(l => parseInt(l.trim()));
        // Remove the level
        const newLevels = currentLevels.filter(l => l !== levelToRemove);

        if (newLevels.length === 0) {
          // No levels left, delete the item
          onDeleteEvidence(item.id);
        } else {
          // Update the item with remaining levels
          const newLevelsText = newLevels.sort((a, b) => a - b).join(', ');
          onUpsertEvidence({
            ...item,
            level: newLevels[0],
            notes: `Levels: ${newLevelsText}`
          });
        }
      } else {
        // Fallback
        if (item.level === levelToRemove) {
          onDeleteEvidence(item.id);
        }
      }
    });

    // Remove from profile
    if (isCatchUp) {
      const updatedCompletions = { ...profile.curriculumCatchUpCompletions };
      const updatedPDFs = { ...profile.curriculumCatchUpPDFs };
      delete updatedCompletions[boxKey];
      delete updatedPDFs[boxKey];
      onUpdateProfile({
        ...profile,
        curriculumCatchUpCompletions: updatedCompletions,
        curriculumCatchUpPDFs: updatedPDFs
      });
    } else {
      const updatedCompletions = { ...profile.fourteenFishCompletions };
      const updatedEvidence = { ...profile.fourteenFishEvidence };
      delete updatedCompletions[boxKey];
      delete updatedEvidence[boxKey];
      onUpdateProfile({
        ...profile,
        fourteenFishCompletions: updatedCompletions,
        fourteenFishEvidence: updatedEvidence
      });
    }

    // Update portfolio progress to remove Completed status 
    if (onUpsertProgress) {
      onUpsertProgress({
        sia: sia !== "GSAT" ? sia : "GSAT",
        level: levelToRemove,
        status: EvidenceStatus.Draft, // Downgrade to Draft so it doesn't show as Completed
        evidence_type: isCatchUp ? EvidenceType.CurriculumCatchUp : EvidenceType.FourteenFish,
        evidence_id: undefined,
        notes: 'Unlinked'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {isSupervisorView && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Back to Supervisor Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white/90">
              {isSupervisorView && traineeName ? `${traineeName}'s Portfolio Progress` : 'Portfolio Progress'}
            </h1>
            <p className="hidden md:block text-sm text-slate-500 dark:text-white/40 mt-1">
              {isSupervisorView ? 'Viewing trainee progress matrix' : 'Completion matrix for EPAs and GSAT outcomes across all training levels.'}
            </p>
          </div>
          {!isSupervisorView && onUpdateProfile && (
            <div className="hidden md:flex items-center gap-2">
              {isCatchUpMode && (
                <button
                  onClick={handleSaveCatchUp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all"
                >
                  <Save size={16} />
                  SAVE
                </button>
              )}
              {isFourteenFishMode && (
                <button
                  onClick={handleSaveFourteenFish}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all"
                >
                  <Save size={16} />
                  SAVE
                </button>
              )}
              {/* Curriculum Catch Up / FourteenFish toggles hidden in favor of Legacy Form
              <button
                onClick={() => {
                  if (linkingFileUrl) {
                    // Clear linking mode when toggling catch-up mode
                    setLinkingFileUrl(null);
                    setLinkingFileBoxKeys([]);
                    setLinkingSelectedBoxes(new Set());
                  }
                  setIsCatchUpMode(!isCatchUpMode);
                  if (!isCatchUpMode) setIsFourteenFishMode(false); // Only one mode at a time
                }}
                disabled={linkingFileUrl !== null}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isCatchUpMode
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  } ${linkingFileUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ScrollText size={16} />
                Curriculum Catch Up
              </button>
              <button
                onClick={() => {
                  if (linkingFileUrl) {
                    // Clear linking mode when toggling FourteenFish mode
                    setLinkingFileUrl(null);
                    setLinkingFileBoxKeys([]);
                    setLinkingSelectedBoxes(new Set());
                  }
                  setIsFourteenFishMode(!isFourteenFishMode);
                  if (!isFourteenFishMode) setIsCatchUpMode(false); // Only one mode at a time
                }}
                disabled={linkingFileUrl !== null}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isFourteenFishMode
                  ? 'bg-teal-500 text-white hover:bg-teal-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  } ${linkingFileUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Fish size={16} />
                FourteenFish Evidence
              </button>
              */}
            </div>
          )}
        </div>

        {(isCatchUpMode || isFourteenFishMode) && !isSupervisorView && (
          <GlassCard className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload Area */}
              <div>
                {isCatchUpMode && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-2">
                      Upload Curriculum Catch Up PDF
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            if (file.type !== 'application/pdf') {
                              alert(`File "${file.name}" is not a PDF. Skipping.`);
                              continue;
                            }
                            try {
                              // Convert to base64 data URL for persistence
                              const dataUrl = await fileToDataURL(file);

                              // Create Draft Evidence immediately
                              if (onUpsertEvidence) {
                                onUpsertEvidence({
                                  id: uuidv4(),
                                  type: EvidenceType.CurriculumCatchUp,
                                  title: `Brief Catch Up - ${file.name}`,
                                  date: new Date().toISOString().split('T')[0],
                                  status: EvidenceStatus.Draft,
                                  fileUrl: dataUrl,
                                  fileName: file.name,
                                  fileType: 'application/pdf',
                                  notes: 'Draft upload'
                                });
                              }
                            } catch (error) {
                              alert(`Error reading PDF file "${file.name}". Skipping.`);
                              console.error('PDF read error:', error);
                            }
                          }
                          // Clear input
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {/* Selected files list removed as files are now shown in table immediately */}
                  </>
                )}
                {isFourteenFishMode && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-2">
                      Upload FourteenFish Evidence (PNG or JPEG)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            if (!file.type.startsWith('image/')) {
                              alert(`File "${file.name}" is not an image. Skipping.`);
                              continue;
                            }
                            try {
                              // Convert to base64 data URL for persistence
                              const dataUrl = await fileToDataURL(file);

                              // Create Draft Evidence immediately
                              if (onUpsertEvidence) {
                                onUpsertEvidence({
                                  id: uuidv4(),
                                  type: EvidenceType.FourteenFish,
                                  title: `Brief FourteenFish - ${file.name}`,
                                  date: new Date().toISOString().split('T')[0],
                                  status: EvidenceStatus.Draft,
                                  fileUrl: dataUrl,
                                  fileName: file.name,
                                  fileType: file.type,
                                  notes: 'Draft upload'
                                });
                              }
                            } catch (error) {
                              alert(`Error reading image file "${file.name}". Skipping.`);
                              console.error('Image read error:', error);
                            }
                          }
                          // Clear input
                          e.target.value = '';
                        }
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    />
                    {/* Selected files list removed as files are now shown in table immediately */}
                  </>
                )}
              </div>

              {/* File Management Table */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-2">
                  Previously Uploaded Evidence
                </label>
                <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-white/5">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-white/70">File</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-white/70">Boxes</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-white/70 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                      {isCatchUpMode && getCatchUpFiles().map((file, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <td className="px-3 py-2 text-xs text-slate-700 dark:text-white/80">
                            {file.fileName}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600 dark:text-white/60">
                            {file.boxes.join(', ')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingFileUrl(file.fileUrl);
                                  setLinkingFileBoxKeys(file.boxKeys);
                                  setLinkingIsCatchUp(true);
                                  setLinkingSelectedBoxes(new Set());
                                }}
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                                title="Link more boxes to this file"
                              >
                                <Link size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(file.fileUrl, '_blank');
                                }}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                title="Open PDF in new tab"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.fileUrl, file.boxKeys, true)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                title="Delete file and associated boxes"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {isFourteenFishMode && getFourteenFishFiles().map((file, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <td className="px-3 py-2 text-xs text-slate-700 dark:text-white/80">
                            {file.fileName}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600 dark:text-white/60">
                            {file.boxes.join(', ')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingFileUrl(file.fileUrl);
                                  setLinkingFileBoxKeys(file.boxKeys);
                                  setLinkingIsCatchUp(false);
                                  setLinkingSelectedBoxes(new Set());
                                }}
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                                title="Link more boxes to this file"
                              >
                                <Link size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(file.fileUrl, '_blank');
                                }}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                title="Open file in new tab"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.fileUrl, file.boxKeys, false)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                title="Delete file and associated boxes"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {((isCatchUpMode && getCatchUpFiles().length === 0) || (isFourteenFishMode && getFourteenFishFiles().length === 0)) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-xs text-slate-500 dark:text-white/40">
                            No saved files
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Linking Mode Banner */}
      {linkingFileUrl && !isSupervisorView && (
        <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-teal-600/10 dark:bg-teal-900/40 border-b border-teal-500/20 flex justify-between items-center shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setLinkingFileUrl(null);
                setLinkingFileBoxKeys([]);
                setLinkingSelectedBoxes(new Set());
              }}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-teal-700 dark:text-white/70"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-teal-900 dark:text-white font-medium">
                Linking boxes to {linkingIsCatchUp ? 'Curriculum Catch Up' : 'FourteenFish'} file
              </h2>
              <p className="text-xs text-teal-700/60 dark:text-white/60">
                Select grey (NOT STARTED) boxes to link to this file. Selected: {linkingSelectedBoxes.size}
              </p>
            </div>
          </div>
          <button
            disabled={linkingSelectedBoxes.size === 0}
            onClick={handleConfirmLink}
            className="px-6 py-2 rounded-lg bg-teal-500 text-white font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/20"
          >
            Confirm Link
          </button>
        </div>
      )}

      <div className={`flex gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar ${linkingFileUrl ? 'mt-20' : ''}`}>
        <LegendItem color="bg-emerald-500" label="COMPLETE" icon={<CheckCircle2 size={10} className="text-white" />} />
        <LegendItem color="bg-emerald-500" label="COMPLETE (Curriculum Catch Up)" icon={<ScrollText size={10} className="text-white" />} />
        <LegendItem color="bg-emerald-500" label="COMPLETE (FOURTEENFISH)" icon={<Fish size={10} className="text-white" />} />
        <LegendItem color="bg-amber-400" label="In Progress" icon={<Activity size={10} className="text-white" />} />
        <LegendItem color="bg-sky-400" label="Draft" icon={<Clock size={10} className="text-white" />} />
        <LegendItem color="bg-slate-200 dark:bg-white/10" label="Not Started" />
      </div>

      <GlassCard className="overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[700px]">
            <thead>
              <tr className="h-32">
                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#1a1f2e] p-2 text-center border-r border-b border-slate-200 dark:border-white/10 w-16 align-bottom">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block pb-2">Level</span>
                </th>
                {COLUMNS.map(col => (
                  <th key={col} className="p-0 border-b border-slate-200 dark:border-white/10 w-12 bg-white/40 dark:bg-white/5 backdrop-blur-md relative">
                    <div className="absolute inset-0 flex items-end justify-start pl-2 pb-0.5">
                      <span
                        className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-white/70 inline-block leading-tight overflow-wrap-normal break-words"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          maxHeight: '100px',
                          textAlign: 'left'
                        }}
                      >
                        {col}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map(level => (
                <tr key={level} className="group">
                  <td
                    className={`sticky left-0 z-20 bg-slate-50 dark:bg-[#1a1f2e] p-2 text-center border-r border-slate-200 dark:border-white/10 shadow-sm transition-colors group-hover:bg-slate-100 dark:group-hover:bg-[#252b3d] ${(isCatchUpMode || isFourteenFishMode) && level !== 4 && !isSupervisorView
                      ? 'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/20'
                      : ''
                      }`}
                    onClick={() => handleRowClick(level)}
                    title={(isCatchUpMode || isFourteenFishMode) && level !== 4 && !isSupervisorView ? 'Click to select all boxes in this row' : undefined}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white whitespace-nowrap">
                      L{level}
                    </span>
                  </td>
                  {COLUMNS.map(col => {
                    const status = getStatus(col, level);
                    const boxKey = `${col}-${level}`;
                    const isSelectable = isBoxSelectable(col, level);
                    const isClickable = (isCatchUpMode || isFourteenFishMode || linkingFileUrl) && isSelectable && !isSupervisorView;
                    const isCatchUp = isCatchUpComplete(col, level);
                    const isFourteenFish = isFourteenFishComplete(col, level);
                    const isLinkingSelected = linkingFileUrl && linkingSelectedBoxes.has(boxKey);
                    const isLinkingSelectable = linkingFileUrl && status === null && isSelectable &&
                      !profile?.curriculumCatchUpCompletions?.[boxKey] && !profile?.fourteenFishCompletions?.[boxKey];

                    let tooltip = '';
                    if (isCatchUp) {
                      tooltip = 'COMPLETE (Curriculum Catch Up) - Click to view PDF';
                    } else if (isFourteenFish) {
                      tooltip = 'COMPLETE (FOURTEENFISH) - Click to view image';
                    } else if (isLinkingSelected) {
                      tooltip = 'Selected for linking - Click to deselect';
                    } else if (isLinkingSelectable) {
                      tooltip = 'Click to select for linking';
                    }

                    return (
                      <td key={col} className="p-0.5 border-b border-slate-100 dark:border-white/5 group-hover:bg-slate-50/50 dark:group-hover:bg-white/[0.02] transition-colors">
                        <div
                          className={`w-full aspect-square rounded-md flex items-center justify-center transition-all duration-500 transform hover:scale-[1.03] hover:z-10 relative ${isClickable || isCatchUp || isFourteenFish || isLinkingSelectable ? 'cursor-pointer' : 'cursor-default'
                            } ${getCellColor(status, col, level)}`}
                          onClick={() => handleBoxClick(col, level)}
                          title={tooltip || undefined}
                        >
                          {getStatusIcon(status, col, level)}
                          {/* X button for deselection - only show for saved completed catch-up or FourteenFish boxes, not in supervisor view, and only when mode is toggled */}
                          {(profile?.curriculumCatchUpCompletions?.[boxKey] || profile?.fourteenFishCompletions?.[boxKey]) && !isSupervisorView && (isCatchUpMode || isFourteenFishMode) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (profile?.curriculumCatchUpCompletions?.[boxKey]) {
                                  handleDeselectCatchUp(col, level);
                                } else if (profile?.fourteenFishCompletions?.[boxKey]) {
                                  handleDeselectFourteenFish(col, level);
                                }
                              }}
                              className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity z-20"
                              title="Remove completion"
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600">
              <CheckCircle2 size={18} />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white/90">Progression Requirement</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">Level 1 and 2 EPAs are generic and required for core training progression. Level 3 and 4 SIAs are specialized based on your chosen sub-specialties.</p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Activity size={18} />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white/90">In-Progress States</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">Squares appear amber once you submit an EPA for review. They remain amber (In Progress) until your supervisor provides a final GMC-validated completion.</p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600">
              <AlertCircle size={18} />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white/90">GSAT Matrix</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">The GSAT column tracks the 6 domains of non-patient management (Research, Leadership, etc.) collectively for that training level.</p>
        </GlassCard>
      </div>
      {/* Evidence Dialog (Desktop Only) */}
      {evidenceDialogData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{evidenceDialogData.title}</h3>
                <p className="text-sm text-slate-500 dark:text-white/60">{evidenceDialogData.items.length} linked evidence item(s)</p>
              </div>
              <button
                onClick={() => setEvidenceDialogData(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500 dark:text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {evidenceDialogData.items.map(item => {
                const isLegacyType = item.type === EvidenceType.CurriculumCatchUp || item.type === EvidenceType.FourteenFish;
                const statusLabel = item.status === EvidenceStatus.SignedOff ? 'SIGNED OFF' :
                  item.status === EvidenceStatus.Submitted ? 'SUBMITTED' : 'DRAFT';
                const statusColor = item.status === EvidenceStatus.SignedOff ? 'text-emerald-600 bg-emerald-50' :
                  item.status === EvidenceStatus.Submitted ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100';

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === EvidenceStatus.SignedOff ? 'bg-emerald-100 text-emerald-600' :
                        item.status === EvidenceStatus.Submitted ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {item.status === EvidenceStatus.SignedOff ? <CheckCircle2 size={16} /> :
                          item.status === EvidenceStatus.Submitted ? <Clock size={16} /> :
                            <FileText size={16} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate pr-2">{item.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50 flex-wrap">
                          <span className="uppercase tracking-wider font-bold text-[10px]">{item.type}</span>
                          <span>•</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${statusColor}`}>{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLegacyType && onDeleteProgress && (
                        <button
                          onClick={() => {
                            const isComplete = item.status === EvidenceStatus.SignedOff;
                            const confirmMsg = isComplete
                              ? `This evidence is SIGNED OFF. Are you sure you want to unlink "${item.title}" from ${evidenceDialogData.sia} Level ${evidenceDialogData.level}? This will modify a completed record.`
                              : `Unlink "${item.title}" from ${evidenceDialogData.sia} Level ${evidenceDialogData.level}?`;

                            if (window.confirm(confirmMsg)) {
                              onDeleteProgress(evidenceDialogData.sia, evidenceDialogData.level, item.id);
                              // Refresh dialog by removing this item
                              const updatedItems = evidenceDialogData.items.filter(i => i.id !== item.id);
                              if (updatedItems.length === 0) {
                                setEvidenceDialogData(null);
                              } else {
                                setEvidenceDialogData({ ...evidenceDialogData, items: updatedItems });
                              }
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-rose-500 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                        >
                          Unlink
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEvidenceDialogData(null); // Close dialog
                          onViewEvidence?.(item); // Navigate
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-500 dark:hover:bg-indigo-500/30 transition-colors whitespace-nowrap shadow-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const LegendItem: React.FC<{ color: string, label: string, icon?: React.ReactNode }> = ({ color, label, icon }) => (
  <div className="flex items-center gap-2 whitespace-nowrap">
    <div className={`w-5 h-5 rounded-md ${color} flex items-center justify-center shadow-sm`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">{label}</span>
  </div>
);

export default Progress;
