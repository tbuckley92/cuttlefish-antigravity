import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
    User, FileText, Activity, CheckCircle2, ArrowLeft, BarChart2, Clock, Save, Trash2, Plus, MessageSquare, ClipboardCheck, ShieldCheck
} from '../components/Icons';
import { UserProfile, EvidenceItem, EvidenceType, EvidenceStatus, PDPGoal, TrainingGrade } from '../types';
import { SPECIALTIES } from '../constants';
import MyEvidence from './MyEvidence';
import { SignOffDialog } from '../components/SignOffDialog';

interface ESRFormProps {
    profile: UserProfile;
    allEvidence: EvidenceItem[];
    currentUserRole?: string;
    onViewActiveEPAs: () => void;
    onViewEvidenceItem: (item: EvidenceItem) => void;
    onNavigateToEvidence: () => void;
    onNavigateToRecordForm: () => void;
    onBack: () => void;
    onSave: (evidence: Partial<EvidenceItem>) => void;
    initialData?: EvidenceItem;
}

const ESRForm: React.FC<ESRFormProps> = ({
    profile,
    allEvidence,
    currentUserRole,
    onBack,
    onSave,
    initialData,
    onViewActiveEPAs,
    onViewEvidenceItem,
    onNavigateToEvidence,
    onNavigateToRecordForm
}) => {
    // --- State Management ---
    const [pdpGoals, setPdpGoals] = useState<PDPGoal[]>(
        initialData?.esrFormData?.pdpGoals || (profile.pdpGoals.length > 0 ? profile.pdpGoals : [])
    );

    const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<{
        gsat: string[];
        epas: string[];
        msf: string[];
        lastEsr: string[];
    }>({
        gsat: initialData?.esrFormData?.linkedEvidence?.gsat || [],
        epas: initialData?.esrFormData?.linkedEvidence?.epas || [],
        msf: initialData?.esrFormData?.linkedEvidence?.msf || [],
        lastEsr: initialData?.esrFormData?.linkedEvidence?.lastEsr || []
    });

    const [comments, setComments] = useState({
        trainee: initialData?.esrFormData?.traineeComments || '',
        supervisor: initialData?.esrFormData?.educationalSupervisorComments || ''
    });

    const [arcpReviewType, setArcpReviewType] = useState(initialData?.esrFormData?.arcpReviewType || 'Full / Interim');

    // Linking Mode
    const [linkingMode, setLinkingMode] = useState<{
        active: boolean;
        type: 'gsat' | 'epas' | 'msf' | 'lastEsr' | null;
        filterType?: EvidenceType;
    }>({ active: false, type: null });

    // Matrix Evidence Dialog (Local state)
    const [evidenceDialogData, setEvidenceDialogData] = useState<{ title: string; items: EvidenceItem[] } | null>(null);

    // Sign Off Dialog State
    const [isSignOffOpen, setIsSignOffOpen] = useState(false);
    const [supervisorName, setSupervisorName] = useState(initialData?.supervisorName || profile.supervisorName || "");
    const [supervisorEmail, setSupervisorEmail] = useState(initialData?.supervisorEmail || profile.supervisorEmail || "");

    // Phaco Stats Calculation (Ensure we use profile stats if available, otherwise 0)
    const phacoStats = useMemo(() => ({
        total: profile.phacoTotal || 0,
        performed: profile.phacoPerformed || 0,
        supervised: profile.phacoSupervised || 0,
        assisted: profile.phacoAssisted || 0,
        pcrRate: profile.phacoPcrRate || 0
    }), [profile]);

    // --- Helpers ---
    const getEvidenceForBox = (column: string, level: number): EvidenceItem[] => {
        const foundItems: EvidenceItem[] = [];
        if (column === "GSAT") {
            allEvidence
                .filter(e => e.type === EvidenceType.GSAT && e.level === level)
                .forEach(e => foundItems.push(e));
        } else if (level === 1 || level === 2) {
            allEvidence
                .filter(e => e.type === EvidenceType.EPA && e.level === level)
                .forEach(e => foundItems.push(e));
        } else {
            allEvidence
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

    // --- Handlers ---
    const handleSave = (status: EvidenceStatus, gmc?: string, name?: string, email?: string) => {
        if (status === EvidenceStatus.SignedOff && !comments.supervisor && !name) {
            // Note: Supervisor comments usually required, but if doing in-person sign off, maybe less critical?
            // Keeping the check for now.
            if (!comments.supervisor) {
                alert('Supervisor comments are required for sign off.');
                return;
            }
        }

        const formData = {
            pdpGoals,
            linkedEvidence: linkedEvidenceIds,
            traineeComments: comments.trainee,
            educationalSupervisorComments: comments.supervisor,
            arcpReviewType
        };

        const evidenceItem: Partial<EvidenceItem> = {
            id: initialData?.id,
            type: EvidenceType.ESR,
            title: `Educational Supervisor Report - ${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`,
            date: new Date().toISOString().split('T')[0],
            status: status,
            esrFormData: formData,
            level: 0,
            sia: '',
            supervisorName: name || supervisorName || profile.supervisorName,
            supervisorEmail: email || supervisorEmail || profile.supervisorEmail,
            supervisorGmc: gmc,
            data: formData
        };

        onSave(evidenceItem);
        // Only close if signed off or submitted? Or always?
        // Original code closed always.
        if (status !== EvidenceStatus.Draft || name) { // Close if signed off/submitted or explicit save (not auto-save draft if we had that)
            // Actually, original code always called onBack().
            onBack();
        } else {
            // If just saving draft manually via button, maybe close too? 
            // Original code: always called onBack(). keeping it.
            onBack();
        }
    };

    const handleSignOffConfirm = (gmc: string, name: string, email: string, signature: string) => {
        setSupervisorName(name);
        setSupervisorEmail(email);
        handleSave(EvidenceStatus.SignedOff, gmc, name, email);
        setIsSignOffOpen(false);
    };

    const handleLinkEvidence = (type: 'gsat' | 'epas' | 'msf' | 'lastEsr') => {
        let filterType: EvidenceType | undefined;
        setLinkingMode({ active: true, type, filterType });
    };

    const handleConfirmLink = (ids: string[]) => {
        if (linkingMode.type) {
            setLinkedEvidenceIds(prev => ({
                ...prev,
                [linkingMode.type!]: Array.from(new Set([...prev[linkingMode.type!], ...ids]))
            }));
        }
        setLinkingMode({ active: false, type: null });
    };

    const removeLinkedEvidence = (type: 'gsat' | 'epas' | 'msf' | 'lastEsr', id: string) => {
        setLinkedEvidenceIds(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item !== id)
        }));
    };

    // --- Partial Renders ---
    if (linkingMode.active) {
        return (
            <MyEvidence
                allEvidence={allEvidence}
                profile={profile}
                selectionMode={true}
                onConfirmSelection={handleConfirmLink}
                onCancel={() => setLinkingMode({ active: false, type: null })}
                onViewItem={onViewEvidenceItem ? (item) => {
                    onViewEvidenceItem(item);
                } : undefined}
            />
        );
    }

    const renderLinkedEvidenceList = (ids: string[], type: 'gsat' | 'epas' | 'msf' | 'lastEsr') => {
        const items = allEvidence.filter(e => ids.includes(e.id));
        if (items.length === 0) return <div className="text-[10px] text-slate-300 italic pl-1">No items linked</div>;

        return (
            <div className="space-y-1">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-1 rounded" onClick={() => onViewEvidenceItem(item)}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
                            <span className="truncate flex-1">• {item.title}</span>
                            {item.status === EvidenceStatus.SignedOff && <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">COMPLETE</span>}
                            {item.status === EvidenceStatus.Submitted && <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">SUBMITTED</span>}
                            {item.status === EvidenceStatus.Draft && <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider">DRAFT</span>}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); removeLinkedEvidence(type, item.id); }}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-2"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-2xl font-semibold text-slate-900">Educational Supervisor Report</h1>
                </div>
            </div>

            <GlassCard className="mb-4 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3">

                    {/* Left Panel: Profile Info (Col 2) */}
                    <div className="col-span-2 border-r border-slate-200 pr-2 text-[10px]">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{profile.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold border border-indigo-500/20">
                                        {profile.grade}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{profile.deanery}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">FTE</span>
                                <span className="font-medium text-slate-700">{profile.fte}% Full Time</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">ARCP MONTH</span>
                                <span className="font-medium text-slate-700">{profile.arcpMonth}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">CCT DATE</span>
                                <span className="font-medium text-slate-700">{profile.cctDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">NEXT ARCP DATE</span>
                                <span className="font-medium text-slate-700">{profile.arcpDate || '—'}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EXAM RESULTS</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">FRCOphth Part 1</span>
                                    {profile.frcophthPart1 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">PASS</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">—</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">FRCOphth Part 2 Written</span>
                                    {profile.frcophthPart2Written ? (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">PASS</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">—</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form R Section */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FORM R</span>
                            </div>
                            <button
                                onClick={() => {
                                    const formR = allEvidence.find(e => e.type === EvidenceType.FormR);
                                    if (formR) onViewEvidenceItem(formR);
                                    else alert("No recent Form R found.");
                                }}
                                className="flex items-center gap-2 w-full hover:bg-slate-50 p-1 -ml-1 rounded transition-colors"
                            >
                                <span className="text-[10px] text-slate-600">Form R (Part B)</span>
                                <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold ${allEvidence.some(e => e.type === EvidenceType.FormR) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {allEvidence.some(e => e.type === EvidenceType.FormR) ? 'View' : 'None'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Center Panel: Matrix & Form (Col 8) */}
                    <div className="col-span-8 px-1">
                        {/* 1. EPA Matrix */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EPA MATRIX</span>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-[9px] text-slate-500">Complete</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    <span className="text-[9px] text-slate-500">In Progress</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                                    <span className="text-[9px] text-slate-500">Draft</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto mb-6">
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
                                                const evidence = getEvidenceForBox(spec, level);
                                                const status = evidence.length > 0
                                                    ? (evidence.some(e => e.status === EvidenceStatus.SignedOff) ? EvidenceStatus.SignedOff
                                                        : evidence.some(e => e.status === EvidenceStatus.Submitted) ? EvidenceStatus.Submitted
                                                            : EvidenceStatus.Draft)
                                                    : null;

                                                const cellColor = status === EvidenceStatus.SignedOff ? 'bg-emerald-500/90 hover:bg-emerald-600/90'
                                                    : status === EvidenceStatus.Submitted ? 'bg-amber-400/90 hover:bg-amber-500/90'
                                                        : status === EvidenceStatus.Draft ? 'bg-sky-400/90 hover:bg-sky-500/90'
                                                            : 'bg-slate-200/50 hover:bg-slate-300/50';

                                                const icon = status === EvidenceStatus.SignedOff ? <CheckCircle2 size={12} className="text-white" />
                                                    : status === EvidenceStatus.Submitted ? <Activity size={12} className="text-white" />
                                                        : status === EvidenceStatus.Draft ? <Clock size={12} className="text-white" />
                                                            : null;
                                                return (
                                                    <td key={idx} className="p-0.5">
                                                        <button
                                                            className={`w-8 h-8 rounded border transition-all flex items-center justify-center ${cellColor}`}
                                                            onClick={() => {
                                                                if (evidence.length > 0) {
                                                                    setEvidenceDialogData({
                                                                        title: `${spec} - Level ${level}`,
                                                                        items: evidence
                                                                    });
                                                                }
                                                            }}
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

                        <div className="h-px bg-slate-200 my-4" />

                        {/* 2. ESR Form Content - Styled like "Current ARCP" box in dashboard */}
                        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-800">Review Form Details</h3>
                                <span className="text-xs text-slate-400">Current Date: {new Date().toLocaleDateString()}</span>
                            </div>

                            <div className="space-y-6">
                                {/* PDP Section */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">PDP PROGRESS</span>
                                    {pdpGoals.map((goal, idx) => (
                                        <div key={idx} className="mb-3 p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 mr-2">
                                                    <span className="font-bold text-slate-800 block mb-1">{goal.title}</span>
                                                    {goal.targetDate && (
                                                        <span className="text-[10px] text-slate-400 block mb-2">Target Date: {goal.targetDate}</span>
                                                    )}
                                                </div>
                                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${goal.status === 'COMPLETE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {goal.status || 'IN PROGRESS'}
                                                </span>
                                            </div>

                                            {goal.actions && (
                                                <div className="mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Agreed Actions</span>
                                                    <p className="text-slate-700 whitespace-pre-wrap">{goal.actions}</p>
                                                </div>
                                            )}

                                            {goal.successCriteria && (
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Trainee Appraisal</span>
                                                    <p className="text-slate-500 italic whitespace-pre-wrap">{goal.successCriteria}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {pdpGoals.length === 0 && <p className="text-xs text-slate-400 italic">No PDP goals set in dashboard.</p>}
                                </div>

                                {/* Evidence Linking Sections Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Link GSAT */}
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GSAT EVIDENCE</span>
                                            <button onClick={() => handleLinkEvidence('gsat')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                                <Plus size={10} /> LINK
                                            </button>
                                        </div>
                                        {renderLinkedEvidenceList(linkedEvidenceIds.gsat, 'gsat')}
                                    </div>

                                    {/* Link EPAs */}
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CURRENT EPAs</span>
                                            <button onClick={() => handleLinkEvidence('epas')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                                <Plus size={10} /> LINK
                                            </button>
                                        </div>
                                        {renderLinkedEvidenceList(linkedEvidenceIds.epas, 'epas')}
                                    </div>

                                    {/* Link MSF */}
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">MSF</span>
                                            <button onClick={() => handleLinkEvidence('msf')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                                <Plus size={10} /> LINK
                                            </button>
                                        </div>
                                        {renderLinkedEvidenceList(linkedEvidenceIds.msf, 'msf')}
                                    </div>

                                    {/* Link Last ESR */}
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">LAST ESR REVIEW</span>
                                            <button onClick={() => handleLinkEvidence('lastEsr')} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                                <Plus size={10} /> LINK
                                            </button>
                                        </div>
                                        {renderLinkedEvidenceList(linkedEvidenceIds.lastEsr, 'lastEsr')}
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Trainee Comments</label>
                                        <textarea
                                            value={comments.trainee}
                                            onChange={(e) => setComments(prev => ({ ...prev, trainee: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500 min-h-[80px]"
                                            placeholder="Enter trainee comments..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Educational Supervisor Comments</label>
                                        <textarea
                                            value={comments.supervisor}
                                            onChange={(e) => setComments(prev => ({ ...prev, supervisor: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500 min-h-[80px]"
                                            placeholder="Enter supervisor comments (required for sign off)..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Stats & Actions (Col 2) */}
                    <div className="col-span-2 border-l border-slate-200 pl-2 text-[10px]">
                        {/* Phaco Stats */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart2 size={16} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CATARACT CASES (P/PS)</span>
                            </div>
                            <div className="mb-2">
                                <span className="text-3xl font-bold text-slate-900">{phacoStats.performed}</span>
                                <p className="text-[10px] text-slate-500 mt-0.5">Phacoemulsification with IOL</p>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PCR RATE</div>
                                <div className={`text-xl font-bold ${phacoStats.pcrRate < 1.0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {phacoStats.pcrRate.toFixed(2)}%
                                </div>
                            </div>

                            <div className="mt-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-slate-600">Performed</span>
                                    <span className="ml-auto font-bold text-slate-900">{phacoStats.performed}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-slate-600">Supervised</span>
                                    <span className="ml-auto font-bold text-slate-900">{phacoStats.supervised}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span className="text-xs text-slate-600">Assisted</span>
                                    <span className="ml-auto font-bold text-slate-900">{phacoStats.assisted}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 space-y-2">
                            <button
                                onClick={onViewActiveEPAs}
                                className="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                                <Activity size={12} /> EyeLogbook
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3">Actions</h4>
                            <button
                                onClick={() => handleSave(EvidenceStatus.Draft)}
                                className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2 text-xs uppercase"
                            >
                                <Save size={14} /> Save Draft
                            </button>
                            <button
                                onClick={() => handleSave(EvidenceStatus.Submitted)}
                                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 text-xs uppercase"
                            >
                                <MessageSquare size={14} /> Email Form
                            </button>
                            <button
                                onClick={() => setIsSignOffOpen(true)}
                                className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 text-xs uppercase shadow-lg shadow-emerald-600/20"
                            >
                                <ShieldCheck size={14} /> IN PERSON SIGN OFF
                            </button>
                        </div>
                    </div>

                </div>
            </GlassCard>

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
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200">
                                        <span className="text-slate-500 font-bold">X</span>
                                    </div>
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
                                                if (onViewEvidenceItem) onViewEvidenceItem(item);
                                                setEvidenceDialogData(null);
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

            {/* Sign Off Dialog */}
            <SignOffDialog
                isOpen={isSignOffOpen}
                onClose={() => setIsSignOffOpen(false)}
                onConfirm={handleSignOffConfirm}
                formInfo={{
                    type: "Educational Supervisor Report",
                    traineeName: profile.name,
                    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                    supervisorName: supervisorName,
                    supervisorEmail: supervisorEmail
                }}
            />
        </div>
    );
};

export default ESRForm;
