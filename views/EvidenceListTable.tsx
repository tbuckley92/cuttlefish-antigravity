
import React from 'react';
import {
    FileText, CheckCircle2, Clock, ShieldCheck, FileDown, Trash2
} from '../components/Icons';
import { EvidenceType, EvidenceStatus, EvidenceItem, UserProfile } from '../types';
import { generateEvidencePDF } from '../utils/pdfGenerator';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import { getEvidenceFileUrl } from '../utils/storageUtils';

interface EvidenceListTableProps {
    evidence: EvidenceItem[];
    profile: UserProfile;
    selectionMode?: boolean;
    selectedIds?: string[];
    selectedForExport?: string[];
    onToggleSelection?: (id: string) => void;
    onToggleExport?: (id: string) => void;
    onViewItem?: (item: EvidenceItem) => void;
    onEditEvidence?: (item: EvidenceItem) => void;
    onDeleteEvidence?: (id: string) => void;
    isSupervisorView?: boolean;
    currentUserEmail?: string; // To highlight sign-off actions for this supervisor
}

const DELETABLE_COMPLETE_TYPES = [
    EvidenceType.CurriculumCatchUp,
    EvidenceType.FourteenFish,
    EvidenceType.Reflection,
    EvidenceType.QIP,
    EvidenceType.Award,
    EvidenceType.Course,
    EvidenceType.SignificantEvent,
    EvidenceType.Research,
    EvidenceType.Leadership,
    EvidenceType.Logbook,
    EvidenceType.Additional,
    EvidenceType.Compliment,
    EvidenceType.Other
];

export const EvidenceListTable: React.FC<EvidenceListTableProps> = ({
    evidence,
    profile,
    selectionMode = false,
    selectedIds = [],
    selectedForExport = [],
    onToggleSelection,
    onToggleExport,
    onViewItem,
    onEditEvidence,
    onDeleteEvidence,
    isSupervisorView = false,
}) => {

    const handlePDFClick = async (e: React.MouseEvent, item: EvidenceItem) => {
        e.stopPropagation();

        // For Curriculum Catch Up and FourteenFish, open the uploaded file directly
        if (item.type === EvidenceType.CurriculumCatchUp || item.type === EvidenceType.FourteenFish) {
            try {
                let urlToOpen = item.fileUrl;

                // Lazy load if missing (legacy optimization)
                if (!urlToOpen && isSupabaseConfigured) {
                    const { data: fullData } = await supabase
                        .from('evidence')
                        .select('data')
                        .eq('id', item.id)
                        .single();

                    if (fullData?.data) {
                        // @ts-ignore
                        urlToOpen = fullData.data.fileUrl || fullData.data.fileBase64;
                    }
                }

                if (!urlToOpen) {
                    alert('No file attached to this legacy record.');
                    return;
                }

                // If Supabase is configured and it's not a base64/data URL, assume it's a storage path
                if (isSupabaseConfigured && !urlToOpen.startsWith('data:') && !urlToOpen.startsWith('http')) {
                    urlToOpen = await getEvidenceFileUrl(urlToOpen);
                }

                window.open(urlToOpen, '_blank');
                return;
            } catch (error) {
                alert('Error opening file. Please try again.');
                console.error('File open error:', error);
                return;
            }
        }

        // For other evidence types, generate PDF from metadata
        try {
            // Need allEvidence for context if needed, but passing current list is usually enough for single item gen
            const blob = generateEvidencePDF(item, profile, evidence);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const sanitizedTitle = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${item.type}_${sanitizedTitle}_${item.date}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error generating PDF. Please try again.');
            console.error('PDF generation error:', error);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteEvidence?.(id);
    };

    if (evidence.length === 0) {
        return null; // Let parent handle empty state or render nothing
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[100px]">Type</th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[120px]">SIA</th>
                            <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[50px] text-center">Level</th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[90px]">Date</th>
                            <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[80px] text-center">Status</th>
                            <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[60px] text-center">Actions</th>
                            {!isSupervisorView && <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[55px] text-center">Select</th>}
                            {selectionMode && <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[45px] text-center">Link</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {evidence.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => {
                                        if (selectionMode) {
                                            onToggleSelection?.(item.id);
                                        } else if (onEditEvidence) {
                                            onEditEvidence(item);
                                        } else if (onViewItem) {
                                            onViewItem(item);
                                        }
                                    }}
                                    className={`
                    group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer
                    ${selectionMode && isSelected ? 'bg-teal-500/5 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}
                  `}
                                >
                                    <td className="px-3 py-3">
                                        <span className={`
                      inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight truncate max-w-full
                      ${getTypeColors(item.type)}
                    `} title={item.type}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-1.5 max-w-[200px] md:max-w-[300px] lg:max-w-[450px]">
                                            <span
                                                className="text-sm font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white whitespace-nowrap overflow-hidden flex-1 min-w-0"
                                                style={{
                                                    maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                                                    WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
                                                }}
                                                title={item.title}
                                            >
                                                {item.title}
                                            </span>
                                            {item.fileName && (
                                                <div className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" title={`Attached: ${item.fileName}`}>
                                                    <FileText size={8} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-slate-500 dark:text-white/50 truncate" title={item.sia || ''}>
                                        {item.sia || '–'}
                                    </td>
                                    <td className="px-2 py-3 text-xs text-slate-500 dark:text-white/50 text-center">
                                        {item.level || '–'}
                                    </td>
                                    <td className="px-3 py-3 text-slate-500 dark:text-white/50 font-mono text-[11px]">
                                        {formatDate(item.date)}
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <span className={`
                      inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                      ${getStatusColors(item.status)}
                    `}>
                                            {getStatusIcon(item.status)}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {item.status === EvidenceStatus.SignedOff && (
                                                <button
                                                    onClick={(e) => handlePDFClick(e, item)}
                                                    className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <FileDown size={14} />
                                                </button>
                                            )}
                                            {(item.status === EvidenceStatus.Draft ||
                                                (item.status === EvidenceStatus.SignedOff && DELETABLE_COMPLETE_TYPES.includes(item.type))) && onDeleteEvidence && (
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, item.id)}
                                                        className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                        </div>
                                    </td>
                                    {!isSupervisorView && <td className="px-2 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            {(item.status === EvidenceStatus.SignedOff && onToggleExport) ? (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForExport.includes(item.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        onToggleExport(item.id);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            ) : (
                                                <span className="text-slate-300 dark:text-white/20">–</span>
                                            )}
                                        </div>
                                    </td>}
                                    {selectionMode && (
                                        <td className="px-2 py-3 text-center">
                                            <div className="flex justify-center">
                                                <div className={`
                          w-4 h-4 rounded border flex items-center justify-center transition-all
                          ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-white/20 text-transparent'}
                        `}>
                                                    <CheckCircle2 size={10} strokeWidth={3} />
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Utils (Duplicated or should be imported shared)
const formatDate = (dateString: string): string => {
    if (!dateString) return '–';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getTypeColors = (type: EvidenceType) => {
    switch (type) {
        case EvidenceType.CbD: return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30';
        case EvidenceType.DOPs: return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30';
        case EvidenceType.OSATs: return 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/20 dark:border-orange-500/30';
        case EvidenceType.Reflection: return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30';
        case EvidenceType.CRS: return 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30';
        case EvidenceType.EPA: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
        case EvidenceType.EPAOperatingList: return 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30';
        case EvidenceType.MSF: return 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/20';
        case EvidenceType.CurriculumCatchUp: return 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30';
        case EvidenceType.FourteenFish: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
        case EvidenceType.ARCPFullReview: return 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/20 dark:border-violet-500/30';
        case EvidenceType.ARCPInterimReview: return 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/20 dark:border-fuchsia-500/30';
        default: return 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/20';
    }
};

const getStatusColors = (status: EvidenceStatus) => {
    switch (status) {
        case EvidenceStatus.SignedOff: return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
        case EvidenceStatus.Submitted: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
        case EvidenceStatus.Draft: return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40 border border-slate-200 dark:border-white/10';
        default: return 'bg-white/5 text-white/40';
    }
};

const getStatusIcon = (status: EvidenceStatus) => {
    switch (status) {
        case EvidenceStatus.SignedOff: return <ShieldCheck size={12} />;
        case EvidenceStatus.Submitted: return <Clock size={12} />;
        case EvidenceStatus.Draft: return <FileText size={12} />;
        default: return null;
    }
};
