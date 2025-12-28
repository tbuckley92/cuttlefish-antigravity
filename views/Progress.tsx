
import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { EvidenceItem, EvidenceType, EvidenceStatus, UserProfile } from '../types';
import { CheckCircle2, Clock, AlertCircle, Activity, ArrowLeft, ScrollText, UploadCloud, Save } from '../components/Icons';

interface ProgressProps {
  allEvidence: EvidenceItem[];
  traineeName?: string;
  isSupervisorView?: boolean;
  onBack?: () => void;
  profile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const SIAs = [
  "Cataract Surgery",
  "Community Ophthalmology",
  "Cornea & Ocular Surface",
  "Glaucoma",
  "Medical Retina",
  "Neuro‑ophthalmology",
  "Ocular Motility",
  "Oculoplastics",
  "Paediatric Ophthalmology",
  "Urgent Eye Care",
  "Uveitis",
  "Vitreoretinal Surgery"
];

const COLUMNS = [...SIAs, "GSAT"];
const LEVELS = [1, 2, 3, 4];

export const Progress: React.FC<ProgressProps> = ({ allEvidence, traineeName, isSupervisorView, onBack, profile, onUpdateProfile }) => {
  const [isCatchUpMode, setIsCatchUpMode] = useState(false);
  const [selectedCatchUpBoxes, setSelectedCatchUpBoxes] = useState<Set<string>>(new Set());
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);

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
  }, [profile]);

  const getStatus = (column: string, level: number): EvidenceStatus | null => {
    // Check for curriculum catch-up completion first
    const catchUpKey = `${column}-${level}`;
    if (profile?.curriculumCatchUpCompletions?.[catchUpKey]) {
      return EvidenceStatus.SignedOff; // Use SignedOff to indicate complete, but we'll handle display differently
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
    return profile?.curriculumCatchUpCompletions?.[catchUpKey] === true || selectedCatchUpBoxes.has(catchUpKey);
  };

  const isBoxSelectable = (column: string, level: number): boolean => {
    // Not selectable if GSAT column or level 4
    return column !== "GSAT" && level !== 4;
  };

  const getCellColor = (status: EvidenceStatus | null, column: string, level: number) => {
    // Check for catch-up completion first
    if (isCatchUpComplete(column, level)) {
      return "bg-emerald-500/90 dark:bg-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    }
    
    // Highlight selectable boxes in catch-up mode
    if (isCatchUpMode && isBoxSelectable(column, level)) {
      return "bg-indigo-100/50 dark:bg-indigo-500/10 border-2 border-indigo-300 dark:border-indigo-400";
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
    // Check for catch-up completion first
    if (isCatchUpComplete(column, level)) {
      return <ScrollText size={14} className="text-white" />;
    }

    switch (status) {
      case EvidenceStatus.SignedOff:
        return <CheckCircle2 size={14} className="text-white" />;
      case EvidenceStatus.Submitted:
        return <Activity size={14} className="text-white" />; // Representing "In Progress"
      case EvidenceStatus.Draft:
        return <Clock size={14} className="text-white" />;
      default:
        return null;
    }
  };

  const handleBoxClick = (column: string, level: number) => {
    if (!isCatchUpMode || !isBoxSelectable(column, level)) return;
    
    const catchUpKey = `${column}-${level}`;
    setSelectedCatchUpBoxes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catchUpKey)) {
        newSet.delete(catchUpKey);
      } else {
        newSet.add(catchUpKey);
      }
      return newSet;
    });
  };

  const handleSaveCatchUp = () => {
    if (!onUpdateProfile || !profile) return;

    // Convert Set to Record
    const completions: Record<string, boolean> = {};
    selectedCatchUpBoxes.forEach(key => {
      completions[key] = true;
    });

    const updatedProfile: UserProfile = {
      ...profile,
      curriculumCatchUpCompletions: completions,
      curriculumCatchUpPDF: uploadedPDF?.name || profile.curriculumCatchUpPDF
    };

    onUpdateProfile(updatedProfile);
    setIsCatchUpMode(false);
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white/90">
              {isSupervisorView && traineeName ? `${traineeName}'s Portfolio Progress` : 'Portfolio Progress'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
              {isSupervisorView ? 'Viewing trainee progress matrix' : 'Completion matrix for EPAs and GSAT outcomes across all training levels.'}
            </p>
          </div>
          {!isSupervisorView && onUpdateProfile && (
            <div className="flex items-center gap-2">
              {isCatchUpMode && (
                <button
                  onClick={handleSaveCatchUp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all"
                >
                  <Save size={16} />
                  SAVE
                </button>
              )}
              <button
                onClick={() => setIsCatchUpMode(!isCatchUpMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isCatchUpMode
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <ScrollText size={16} />
                Curriculum Catch Up
              </button>
            </div>
          )}
        </div>

        {isCatchUpMode && !isSupervisorView && (
          <GlassCard className="p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-white/90 mb-2">
                  Upload Curriculum Catch Up PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedPDF(file);
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadedPDF && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-white/70">
                    Selected: {uploadedPDF.name}
                  </p>
                )}
                {profile?.curriculumCatchUpPDF && !uploadedPDF && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-white/70">
                    Current: {profile.curriculumCatchUpPDF}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      <div className="flex gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <LegendItem color="bg-emerald-500" label="COMPLETE" icon={<CheckCircle2 size={10} className="text-white" />} />
        <LegendItem color="bg-emerald-500" label="COMPLETE (Curriculum Catch Up)" icon={<ScrollText size={10} className="text-white" />} />
        <LegendItem color="bg-amber-400" label="In Progress" icon={<Activity size={10} className="text-white" />} />
        <LegendItem color="bg-sky-400" label="Draft" icon={<Clock size={10} className="text-white" />} />
        <LegendItem color="bg-slate-200 dark:bg-white/10" label="Not Started" />
      </div>

      <GlassCard className="overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[850px]">
            <thead>
              <tr className="h-64">
                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#1a1f2e] p-4 text-center border-r border-b border-slate-200 dark:border-white/10 w-20 align-bottom">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block pb-4">Level</span>
                </th>
                {COLUMNS.map(col => (
                  <th key={col} className="p-0 border-b border-slate-200 dark:border-white/10 w-14 bg-white/40 dark:bg-white/5 backdrop-blur-md relative">
                    <div className="absolute inset-0 flex items-end justify-start pl-3 pb-6">
                      <span 
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/70 inline-block leading-relaxed overflow-wrap-normal break-words"
                        style={{ 
                          writingMode: 'vertical-rl', 
                          transform: 'rotate(180deg)',
                          maxHeight: '180px',
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
                  <td className="sticky left-0 z-20 bg-slate-50 dark:bg-[#1a1f2e] p-4 text-center border-r border-slate-200 dark:border-white/10 shadow-sm transition-colors group-hover:bg-slate-100 dark:group-hover:bg-[#252b3d]">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white whitespace-nowrap">
                      L{level}
                    </span>
                  </td>
                  {COLUMNS.map(col => {
                    const status = getStatus(col, level);
                    const catchUpKey = `${col}-${level}`;
                    const isSelected = selectedCatchUpBoxes.has(catchUpKey);
                    const isSelectable = isBoxSelectable(col, level);
                    const isClickable = isCatchUpMode && isSelectable && !isSupervisorView;
                    
                    return (
                      <td key={col} className="p-1 border-b border-slate-100 dark:border-white/5 group-hover:bg-slate-50/50 dark:group-hover:bg-white/[0.02] transition-colors">
                        <div 
                          className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all duration-500 transform hover:scale-105 hover:z-10 ${
                            isClickable ? 'cursor-pointer' : 'cursor-default'
                          } ${getCellColor(status, col, level)}`}
                          onClick={() => handleBoxClick(col, level)}
                          title={isCatchUpComplete(col, level) ? 'COMPLETE (Curriculum Catch Up)' : undefined}
                        >
                          {getStatusIcon(status, col, level)}
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
