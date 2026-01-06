import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
    User, FileText, ClipboardCheck, Activity,
    CheckCircle2, AlertCircle, ArrowLeft, Edit2, BarChart2, Clock
} from '../components/Icons';
import { TraineeSummary, UserRole, EvidenceType, EvidenceStatus, ARCPOutcome, UserProfile, EvidenceItem } from '../types';
import { ARCP_OUTCOMES, SPECIALTIES } from '../constants';
import { getAllTraineeSummaries } from '../mockData';

interface ARCPPanelDashboardProps {
    currentUser: UserProfile;
    onBack: () => void;
    onViewTraineeGSAT: (traineeId: string) => void;
    onViewActiveEPAs: (traineeId: string) => void;
    onViewTraineeEvidence: (traineeId: string) => void;
    onViewESR: (traineeId: string) => void;
    onUpdateARCPOutcome: (traineeId: string, outcome: ARCPOutcome) => void;
    onViewEvidenceItem?: (item: EvidenceItem) => void;
}

const ARCPPanelDashboard: React.FC<ARCPPanelDashboardProps> = ({
    currentUser,
    onBack,
    onViewTraineeGSAT,
    onViewActiveEPAs,
    onViewTraineeEvidence,
    onViewESR,
    onUpdateARCPOutcome,
    onViewEvidenceItem
}) => {
    const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, ARCPOutcome>>({});
    const [evidenceDialogData, setEvidenceDialogData] = useState<{ title: string; sia: string; level: number; items: EvidenceItem[] } | null>(null);

    // Get all Thames Valley trainees
    const trainees = useMemo(() => {
        return getAllTraineeSummaries().filter(
            t => t.profile.deanery === 'Thames Valley Deanery' || t.profile.deanery === 'Thames Valley'
        );
    }, []);

    // Get evidence for a specific box (specialty + level)
    const getEvidenceForBox = (summary: TraineeSummary, column: string, level: number): EvidenceItem[] => {
        const foundItems: EvidenceItem[] = [];

        // GSAT logic
        if (column === "GSAT") {
            summary.allEvidence
                .filter(e => e.type === EvidenceType.GSAT && e.level === level)
                .forEach(e => foundItems.push(e));
        }
        // Generic EPAs for levels 1 & 2
        else if (level === 1 || level === 2) {
            summary.allEvidence
                .filter(e => e.type === EvidenceType.EPA && e.level === level)
                .forEach(e => foundItems.push(e));
        }
        // Specialty-specific EPAs for levels 3 & 4
        else {
            summary.allEvidence
                .filter(e => {
                    if (e.type !== EvidenceType.EPA || e.level !== level) return false;
                    const evidenceSia = e.sia?.toLowerCase().trim() || "";
                    const columnSia = column.toLowerCase().trim();
                    if (columnSia === "cornea & ocular surface") {
                        return evidenceSia.includes("cornea") && evidenceSia.includes("surface");
                    }
                    return evidenceSia === columnSia;
                })
                .forEach(e => foundItems.push(e));
        }

        return foundItems;
    };

    // Get EPA status for a trainee at a specific level and specialty
    const getEPAStatus = (summary: TraineeSummary, specialty: string, level: number): EvidenceStatus | null => {
        const epa = summary.allEvidence.find(
            e => e.type === EvidenceType.EPA && e.sia === specialty && e.level === level
        );
        if (!epa) return null;
        if (epa.status === EvidenceStatus.SignedOff) return EvidenceStatus.SignedOff;
        return 'in-progress' as any;
    };

    // Count total cases (Phaco with IOL estimate based on completed EPAs)
    const getTotalCases = (summary: TraineeSummary): { total: number; performed: number; supervised: number; assisted: number } => {
        const cataractEPAs = summary.allEvidence.filter(
            e => e.type === EvidenceType.EPA && e.sia === 'Cataract Surgery' && e.status === EvidenceStatus.SignedOff
        );
        const baseCount = cataractEPAs.length * 50 + (parseInt(summary.profile.grade?.replace('ST', '') || '1') - 1) * 100;
        const performed = Math.floor(baseCount * 0.9);
        const supervised = Math.floor(baseCount * 0.03);
        const assisted = Math.floor(baseCount * 0.07);
        return { total: baseCount, performed, supervised, assisted };
    };

    const handleOutcomeChange = (traineeId: string, outcome: ARCPOutcome) => {
        setSelectedOutcomes(prev => ({ ...prev, [traineeId]: outcome }));
    };

    const handleConfirmOutcome = (traineeId: string) => {
        const outcome = selectedOutcomes[traineeId];
        if (outcome) {
            onUpdateARCPOutcome(traineeId, outcome);
        }
    };

    const renderTraineeRow = (summary: TraineeSummary) => {
        const cases = getTotalCases(summary);
        const selectedOutcome = selectedOutcomes[summary.profile.id!];

        return (
            <GlassCard key={summary.profile.id} className="mb-4 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3">
                    {/* Left Panel: Profile Info */}
                    <div className="col-span-2 border-r border-slate-200 pr-2 text-[10px]">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{summary.profile.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold border border-indigo-500/20">
                                        {summary.profile.grade}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{summary.profile.deanery}</span>
                                </div>
                            </div>
                            <button className="ml-auto p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                <Edit2 size={14} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">FTE</span>
                                <span className="font-medium text-slate-700">{summary.profile.fte}% Full Time</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">ARCP MONTH</span>
                                <span className="font-medium text-slate-700">{summary.profile.arcpMonth}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">CCT DATE</span>
                                <span className="font-medium text-slate-700">{summary.profile.cctDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">NEXT ARCP DATE</span>
                                <span className="font-medium text-slate-700">{summary.profile.arcpDate || '—'}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EXAM RESULTS</span>
                                <button className="p-0.5 hover:bg-slate-100 rounded transition-colors">
                                    <Edit2 size={10} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">FRCOphth Part 1</span>
                                    {summary.profile.frcophthPart1 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">PASS</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">—</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">FRCOphth Part 2 Written</span>
                                    {summary.profile.frcophthPart2Written ? (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">PASS</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">—</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PDP</span>
                                {summary.profile.pdpGoals && summary.profile.pdpGoals.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">COMPLETE</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">IN PROGRESS</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EDUCATIONAL SUPERVISOR</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                    <User size={12} className="text-slate-500" />
                                </div>
                                <span className="text-xs text-slate-700">{summary.profile.supervisorName || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center Panel: EPA Grid */}
                    <div className="col-span-8 px-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EPA MATRIX</span>
                            <span className="text-[10px] text-slate-400">LEVEL</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="text-[10px] w-full">
                                <thead>
                                    <tr>
                                        <th className="w-8 h-28 align-bottom pb-1"><span className="text-slate-600 font-semibold text-[8px]">LEVEL</span></th>
                                        {[...SPECIALTIES, 'GSAT'].map((spec, idx) => (
                                            <th key={idx} className="px-0.5 h-28 align-bottom pb-1 text-center">
                                                <span className="inline-block text-[8px] text-slate-600 font-semibold uppercase tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                    {spec}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4].map(level => (
                                        <tr key={level}>
                                            <td className="font-bold text-slate-600 pr-1 text-[10px]">L{level}</td>
                                            {[...SPECIALTIES, 'GSAT'].map((spec, idx) => {
                                                const evidence = getEvidenceForBox(summary, spec, level);
                                                const status = evidence.length > 0
                                                    ? (evidence.some(e => e.status === EvidenceStatus.SignedOff)
                                                        ? EvidenceStatus.SignedOff
                                                        : evidence.some(e => e.status === EvidenceStatus.Submitted)
                                                            ? EvidenceStatus.Submitted
                                                            : EvidenceStatus.Draft)
                                                    : null;

                                                const cellColor = status === EvidenceStatus.SignedOff
                                                    ? 'bg-emerald-500/90 hover:bg-emerald-600/90'
                                                    : status === EvidenceStatus.Submitted
                                                        ? 'bg-amber-400/90 hover:bg-amber-500/90'
                                                        : status === EvidenceStatus.Draft
                                                            ? 'bg-sky-400/90 hover:bg-sky-500/90'
                                                            : 'bg-slate-200/50 hover:bg-slate-300/50';

                                                const icon = status === EvidenceStatus.SignedOff
                                                    ? <CheckCircle2 size={12} className="text-white" />
                                                    : status === EvidenceStatus.Submitted
                                                        ? <Activity size={12} className="text-white" />
                                                        : status === EvidenceStatus.Draft
                                                            ? <Clock size={12} className="text-white" />
                                                            : null;

                                                return (
                                                    <td key={idx} className="p-0.5">
                                                        <button
                                                            onClick={() => {
                                                                if (evidence.length > 0) {
                                                                    setEvidenceDialogData({
                                                                        title: `${spec} - Level ${level}`,
                                                                        sia: spec,
                                                                        level: level,
                                                                        items: evidence
                                                                    });
                                                                }
                                                            }}
                                                            className={`w-8 h-8 rounded border transition-all flex items-center justify-center ${cellColor} ${evidence.length > 0 ? 'cursor-pointer shadow-sm' : 'cursor-default'}`}
                                                            disabled={evidence.length === 0}
                                                        >
                                                            {icon}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Panel: Cases & Outcome */}
                    <div className="col-span-2 border-l border-slate-200 pl-2 text-[10px]">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart2 size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL CASES</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">{cases.total}</div>
                            <div className="text-xs text-slate-500">Phacoemulsification with IOL</div>

                            <div className="mt-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[10px] font-bold text-indigo-600">SOLE BREAKDOWNS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-slate-600">Performed</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.performed}</span>
                                    <span className="text-slate-400 text-[10px]">({Math.round(cases.performed / cases.total * 100) || 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-slate-600">Supervised</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.supervised}</span>
                                    <span className="text-slate-400 text-[10px]">({Math.round(cases.supervised / cases.total * 100) || 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span className="text-xs text-slate-600">Assisted</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.assisted}</span>
                                    <span className="text-slate-400 text-[10px]">({Math.round(cases.assisted / cases.total * 100) || 0}%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-medium text-slate-700">Form R</span>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="mb-2">
                                <span className="text-xs font-medium text-slate-700">Outcome selection</span>
                            </div>
                            <select
                                value={selectedOutcome || summary.profile.arcpOutcome || ''}
                                onChange={(e) => handleOutcomeChange(summary.profile.id!, e.target.value as ARCPOutcome)}
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            >
                                <option value="">Select outcome...</option>
                                {Object.values(ARCPOutcome).map(outcome => (
                                    <option key={outcome} value={outcome}>{outcome}</option>
                                ))}
                            </select>

                            {selectedOutcome && (
                                <button
                                    onClick={() => handleConfirmOutcome(summary.profile.id!)}
                                    className="mt-2 w-full py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={12} /> Confirm
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed Information Section */}
                <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-3">
                    {/* Current EPAs */}
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Current EPA</h4>
                        {summary.sias && summary.sias.length > 0 ? (
                            <div className="space-y-1.5">
                                {summary.sias.map((sia, idx) => {
                                    // Find EPA for this SIA
                                    const epaForSIA = summary.allEvidence.find(
                                        e => e.type === EvidenceType.EPA &&
                                            e.sia === sia.specialty &&
                                            e.level === sia.level
                                    );
                                    const status = epaForSIA?.status || 'Not Started';

                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-[10px] font-semibold text-slate-700">
                                                    {sia.specialty} - Level {sia.level}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${status === EvidenceStatus.SignedOff
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : status === EvidenceStatus.Submitted
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : status === EvidenceStatus.Draft
                                                                ? 'bg-sky-100 text-sky-700'
                                                                : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (epaForSIA && onViewEvidenceItem) {
                                                        onViewEvidenceItem(epaForSIA);
                                                    }
                                                }}
                                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                                                disabled={!epaForSIA}
                                            >
                                                View Form
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">No active EPAs set</p>
                        )}
                    </div>

                    {/* GSAT */}
                    <div>
                        <div className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                            <div className="flex items-center gap-2">
                                <ClipboardCheck size={14} className="text-purple-600" />
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-700">GSAT</span>
                                    {(() => {
                                        const gsat = summary.allEvidence.find(e => e.type === EvidenceType.GSAT);
                                        return gsat ? (
                                            <span className="text-[9px] text-slate-500 ml-1">
                                                (Completed: {gsat.date})
                                            </span>
                                        ) : (
                                            <span className="text-[9px] text-slate-400 ml-1 italic">
                                                (Not completed)
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <button
                                onClick={() => onViewTraineeGSAT(summary.profile.id!)}
                                className="text-[9px] font-bold text-purple-600 hover:text-purple-700 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                            >
                                View
                            </button>
                        </div>
                    </div>

                    {/* ESR */}
                    <div>
                        <div className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                            <div className="flex items-center gap-2">
                                <User size={14} className="text-amber-600" />
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-700">ESR</span>
                                    <span className="text-[9px] text-slate-400 ml-1 italic">
                                        (Not available)
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => onViewESR(summary.profile.id!)}
                                className="text-[9px] font-bold text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                            >
                                View
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                            onClick={() => onViewActiveEPAs(summary.profile.id!)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-[10px] font-bold hover:bg-indigo-600/20 transition-all"
                        >
                            <Activity size={12} /> View EyeLogbook
                        </button>
                        <button
                            onClick={() => onViewTraineeEvidence(summary.profile.id!)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600/10 border border-teal-500/20 text-teal-700 text-[10px] font-bold hover:bg-teal-600/20 transition-all"
                        >
                            <FileText size={12} /> View Evidence
                        </button>
                    </div>
                </div>
            </GlassCard>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-4"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <h1 className="text-2xl font-semibold text-slate-900">ARCP Panel Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Thames Valley Deanery • {trainees.length} Trainees</p>
            </div>

            <div>
                {trainees.map(summary => renderTraineeRow(summary))}
            </div>

            {trainees.length === 0 && (
                <GlassCard className="p-12 text-center">
                    <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No trainees found in Thames Valley Deanery</p>
                </GlassCard>
            )}

            {/* Evidence Dialog */}
            {evidenceDialogData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setEvidenceDialogData(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {evidenceDialogData.title}
                                </h3>
                                <button
                                    onClick={() => setEvidenceDialogData(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <AlertCircle size={20} className="text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {evidenceDialogData.items.length > 0 ? (
                                <div className="space-y-3">
                                    {evidenceDialogData.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                            onClick={() => {
                                                if (onViewEvidenceItem) {
                                                    onViewEvidenceItem(item);
                                                    setEvidenceDialogData(null);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === EvidenceStatus.SignedOff
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : item.status === EvidenceStatus.Submitted
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-sky-100 text-sky-700'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {item.date}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-medium text-slate-900 text-sm">
                                                        {item.title}
                                                    </h4>
                                                    {item.notes && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                <FileText size={20} className="text-slate-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-8">
                                    No evidence found for this box
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ARCPPanelDashboard;
