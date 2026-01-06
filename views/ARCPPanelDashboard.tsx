import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
    User, FileText, ClipboardCheck, Activity,
    CheckCircle2, AlertCircle, ArrowLeft, Edit2, BarChart2, Clock, Save
} from '../components/Icons';
import { TraineeSummary, UserRole, EvidenceType, EvidenceStatus, ARCPOutcome, UserProfile, EvidenceItem, TrainingGrade, ARCPPrepData } from '../types';
import { ARCP_OUTCOMES, SPECIALTIES } from '../constants';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface ARCPPanelDashboardProps {
    currentUser: UserProfile;
    onBack: () => void;
    onViewTraineeGSAT: (traineeId: string) => void;
    onViewActiveEPAs: (traineeId: string) => void;
    onViewComplications: (traineeId: string) => void;
    onViewTraineeEvidence: (traineeId: string) => void;
    onViewESR: (traineeId: string) => void;
    onUpdateARCPOutcome: (traineeId: string, outcome: ARCPOutcome) => void;
    onViewEvidenceItem?: (item: EvidenceItem) => void;
}

const ARCPPanelDashboard: React.FC<ARCPPanelDashboardProps> = ({
    currentUser, onBack, onViewTraineeGSAT, onViewActiveEPAs, onViewComplications,
    onViewTraineeEvidence, onViewESR, onUpdateARCPOutcome, onViewEvidenceItem
}) => {
    // Database state
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [selectedTraineeId, setSelectedTraineeId] = useState<string>(() => localStorage.getItem('arcp_selected_trainee_id') || '');
    const [currentSummary, setCurrentSummary] = useState<TraineeSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDeanery, setSelectedDeanery] = useState<string>(() => localStorage.getItem('arcp_selected_deanery') || 'all');
    const [arcpPrepByTrainee, setArcpPrepByTrainee] = useState<Record<string, ARCPPrepData>>({});
    const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, ARCPOutcome>>({});
    const [evidenceDialogData, setEvidenceDialogData] = useState<{ title: string; sia: string; level: number; items: EvidenceItem[] } | null>(null);
    const [loadingEvidence, setLoadingEvidence] = useState(false);
    const [phacoStats, setPhacoStats] = useState<{ total: number; performed: number; supervised: number; assisted: number; pcrRate: number } | null>(null);
    const [panelMembers, setPanelMembers] = useState<UserProfile[]>([]);
    const [outcomeFormData, setOutcomeFormData] = useState({
        chairId: '',
        gradeAtNextRotation: '',
        comments: '',
        outcome: '' as ARCPOutcome | '',
        lockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 2 weeks
    });

    // Persist selection
    useEffect(() => {
        localStorage.setItem('arcp_selected_trainee_id', selectedTraineeId);
    }, [selectedTraineeId]);

    useEffect(() => {
        localStorage.setItem('arcp_selected_deanery', selectedDeanery);
    }, [selectedDeanery]);

    // Fetch profiles only initially
    useEffect(() => {
        const fetchProfiles = async () => {
            if (!isSupabaseConfigured || !supabase) {
                setError('Database not configured');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Initialize deanery selection based on role
                if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.ARCPSuperuser) {
                    setSelectedDeanery(currentUser.deanery || 'all');
                }

                // Fetch profiles - RLS handles security
                let query = supabase.from('user_profile').select('*').order('name');

                const { data: fetchedProfiles, error: profilesError } = await query;

                if (profilesError) throw profilesError;

                const mappedProfiles: UserProfile[] = (fetchedProfiles || []).map(p => ({
                    id: p.user_id,
                    name: p.name,
                    email: p.email,
                    role: UserRole.Trainee,
                    deanery: p.deanery,
                    location: p.deanery || '',
                    gmcNumber: p.gmc_number,
                    rcophthNumber: p.rcophth_number,
                    grade: p.grade,
                    supervisorName: p.supervisor_name,
                    supervisorEmail: p.supervisor_email,
                    supervisorGmc: p.supervisor_gmc,
                    arcpMonth: p.arcp_month,
                    cctDate: p.cct_date,
                    fte: p.fte,
                    arcpDate: p.arcp_date,
                    arcpOutcome: p.arcp_outcome,
                    arcpInterimFull: undefined,
                    frcophthPart1: p.frcophth_part1,
                    frcophthPart2Written: p.frcophth_part2_written,
                    frcophthPart2Oral: p.frcophth_part2_oral,
                    refractionCertificate: p.refraction_certificate,
                    laserCertificate: p.laser_certificate,
                    sias: p.sias ? (Array.isArray(p.sias) ? p.sias : JSON.parse(p.sias)) : [],
                    predictedSIAs: p.predicted_sias || [],
                    pdpGoals: p.pdp_goals || []
                }));

                setProfiles(mappedProfiles);
            } catch (err: any) {
                console.error('Error fetching profiles:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [currentUser]);

    // Fetch details when trainee selected
    useEffect(() => {
        const fetchTraineeDetails = async () => {
            if (!selectedTraineeId || !supabase) {
                setCurrentSummary(null);
                setArcpPrepByTrainee({});
                return;
            }

            try {
                setLoadingDetails(true);
                const profile = profiles.find(p => p.id === selectedTraineeId);
                if (!profile) return;

                // Run queries in parallel for performance
                // Optimized: Select only necessary columns from evidence to avoid large data payloads
                // We'll fetch full evidence details on demand when viewing an item
                const [evidenceResult, arcpPrepResult] = await Promise.all([
                    supabase
                        .from('evidence')
                        .select('id, type, title, event_date, status, sia, level, notes')
                        .eq('trainee_id', selectedTraineeId),
                    supabase
                        .from('arcp_prep')
                        .select('*')
                        .eq('user_id', selectedTraineeId)
                ]);

                if (evidenceResult.error) console.error('Error fetching evidence:', evidenceResult.error);
                if (arcpPrepResult.error) console.error('Error fetching arcp_prep:', arcpPrepResult.error);

                // --- Fetch Phaco Stats ---
                let stats = { total: 0, performed: 0, supervised: 0, assisted: 0, pcrRate: 0 };
                try {
                    const { data: logbookData, error: logbookError } = await supabase
                        .from('eyelogbook')
                        .select('id, procedure, role, complication, has_complication, complication_cause, complication_action')
                        .eq('trainee_id', selectedTraineeId);

                    console.log('ARCP Dash Debug - Querying logbook for:', selectedTraineeId);
                    if (logbookError) {
                        console.error('ARCP Dash Debug - Error fetching logbook data:', logbookError);
                        // Keep stats as 0, do not fallback
                    } else if (logbookData) {
                        console.log('ARCP Dash Debug - Fetched rows:', logbookData.length);
                        const phacoCases = logbookData.filter(entry =>
                            (entry.procedure || '').toLowerCase().includes('phaco') ||
                            (entry.procedure || '').toLowerCase().includes('cataract')
                        );
                        console.log('ARCP Dash Debug - Phaco filtered rows:', phacoCases.length);

                        let pcrCount = 0;
                        stats.total = phacoCases.length;

                        phacoCases.forEach(c => {
                            // Exact role matching with EyeLogbook.tsx
                            // EyeLogbook uses: P, PS, SJ, A
                            const role = c.role;
                            if (role === 'P' || role === 'PS') stats.performed++;
                            else if (role === 'SJ' || role === 'S' || role === 'T') stats.supervised++; // Handle legacy T/S if present, but prefer SJ
                            else if (role === 'A') stats.assisted++;

                            // Check for PCR - Strict match with EyeLogbook.tsx
                            const hasPCR =
                                (c.has_complication && (c.complication_cause || '').toLowerCase().includes('pc rupture')) ||
                                (c.complication?.complications?.some((comp: string) => comp.toLowerCase().includes('pc rupture')));

                            if (hasPCR) pcrCount++;
                        });

                        if (stats.total > 0) {
                            stats.pcrRate = (pcrCount / stats.total) * 100;
                        }
                    }
                } catch (err) {
                    console.error('Error calculating phaco stats:', err);
                }
                setPhacoStats(stats);
                // -------------------------

                const arcpPreps = arcpPrepResult.data || [];
                const evidence = evidenceResult.data || [];

                const arcpPrepData = arcpPreps.length > 0 ? {
                    id: arcpPreps[0].id,
                    user_id: arcpPreps[0].user_id,
                    toot_days: arcpPreps[0].toot_days || 0,
                    last_arcp_date: arcpPreps[0].last_arcp_date,
                    last_arcp_type: arcpPreps[0].last_arcp_type,
                    no_msf_planned: arcpPreps[0].no_msf_planned || false,
                    linked_form_r: arcpPreps[0].linked_form_r || [],
                    last_arcp_evidence: arcpPreps[0].last_arcp_evidence || [],
                    last_evidence_epas: arcpPreps[0].last_evidence_epas || [],
                    last_evidence_gsat: arcpPreps[0].last_evidence_gsat || [],
                    last_evidence_msf: arcpPreps[0].last_evidence_msf || [],
                    last_evidence_esr: arcpPreps[0].last_evidence_esr || [],
                    current_evidence_epas: arcpPreps[0].current_evidence_epas,
                    current_evidence_gsat: arcpPreps[0].current_evidence_gsat,
                    current_evidence_msf: arcpPreps[0].current_evidence_msf,
                    current_evidence_esr: arcpPreps[0].current_evidence_esr,
                    status: arcpPreps[0].status || 'DRAFT'
                } : undefined;

                if (arcpPrepData) {
                    setArcpPrepByTrainee({ [selectedTraineeId]: arcpPrepData });
                } else {
                    setArcpPrepByTrainee({});
                }

                // Map evidence items
                const evidenceItems: EvidenceItem[] = evidence.map(ev => ({
                    id: ev.id,
                    type: ev.type as EvidenceType,
                    title: ev.title,
                    date: ev.event_date,
                    status: ev.status as EvidenceStatus,
                    sia: ev.sia || undefined,
                    level: ev.level || undefined,
                    notes: ev.notes || undefined,
                    // data: suppressed for performance
                }));

                setCurrentSummary({
                    profile,
                    sias: profile.sias,
                    allEvidence: evidenceItems
                });

                // Initialize outcome selection from profile if available, else default form data
                if (profile.arcpOutcome) {
                    setOutcomeFormData(prev => ({ ...prev, outcome: profile.arcpOutcome as ARCPOutcome }));
                }
                // Pre-fill grade if possible (though form says grade being assessed is inherited)

            } catch (err) {
                console.error('Error fetching details:', err);
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchTraineeDetails();
    }, [selectedTraineeId, profiles]);

    // Available deaneries for filter
    const availableDeaneries = useMemo(() => {
        const deaneries = new Set(profiles.map(p => p.deanery).filter(Boolean));
        return Array.from(deaneries).sort();
    }, [profiles]);

    // Filtered trainees for dropdown
    const filteredTrainees = useMemo(() => {
        if (selectedDeanery === 'all') {
            return profiles;
        }
        return profiles.filter(p => p.deanery === selectedDeanery);
    }, [profiles, selectedDeanery]);

    // Filter panel members based on selected trainee deanery
    useEffect(() => {
        if (!currentSummary?.profile?.deanery) {
            setPanelMembers([]);
            return;
        }

        const deaneryMembers = profiles.filter(p =>
            (p.role === UserRole.ARCPPanelMember || p.role === UserRole.Admin || p.role === 'ARCPSuperuser') &&
            p.deanery === currentSummary.profile.deanery
        );
        setPanelMembers(deaneryMembers);
    }, [currentSummary, profiles]);

    // Handle form changes
    const handleOutcomeFormChange = (field: string, value: any) => {
        setOutcomeFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveOutcomeForm = async () => {
        if (!selectedTraineeId) return;

        // In a real implementation, this would save to arcp_outcome_form table
        console.log('Saving ARCP Outcome Form:', {
            traineeId: selectedTraineeId,
            ...outcomeFormData
        });

        // Current behavior: update profile outcome
        if (outcomeFormData.outcome) {
            onUpdateARCPOutcome(selectedTraineeId, outcomeFormData.outcome as ARCPOutcome);
            // Show feedback
            const btn = document.getElementById('save-outcome-btn');
            if (btn) {
                const originalText = btn.innerText;
                btn.innerText = 'Saved!';
                setTimeout(() => btn.innerText = originalText, 2000);
            }
        } else {
            alert('Please select an outcome');
        }
    };

    // Optimize view item: fetch full details on demand
    const handleViewEvidenceItem = async (partialItem: EvidenceItem) => {
        if (!onViewEvidenceItem || !supabase) return;

        setLoadingEvidence(true);
        try {
            // Optimistic / fast fetch for full details
            const { data: fullItem, error } = await supabase
                .from('evidence')
                .select('*')
                .eq('id', partialItem.id)
                .single();

            if (error) {
                console.error("Error fetching evidence details:", error);
                // Fallback to partial item if fetch fails
                onViewEvidenceItem(partialItem);
                return;
            }

            if (fullItem) {
                const mappedItem: EvidenceItem = {
                    id: fullItem.id,
                    type: fullItem.type as EvidenceType,
                    title: fullItem.title,
                    date: fullItem.event_date,
                    status: fullItem.status as EvidenceStatus,
                    sia: fullItem.sia || undefined,
                    level: fullItem.level || undefined,
                    notes: fullItem.notes || undefined,
                    ...(fullItem.data || {})
                };
                onViewEvidenceItem(mappedItem);
            }
        } catch (e) {
            console.error("Failed to load evidence details:", e);
            onViewEvidenceItem(partialItem);
        } finally {
            setLoadingEvidence(false);
        }
    };

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
        console.log('Rendering Trainee Row for:', summary.profile.name, 'PhacoStats:', phacoStats);
        const cases = phacoStats || { total: 0, performed: 0, supervised: 0, assisted: 0, pcrRate: 0 };
        // calculated locally for now to support legacy select
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
                    </div >

                    {/* Center Panel: EPA Grid */}
                    < div className="col-span-8 px-1" >
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

                        {/* Legend */}
                        <div className="mt-2 flex items-center justify-end gap-3 px-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded bg-emerald-500/90"></span>
                                <span className="text-[10px] text-slate-500 font-medium">Signed Off</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded bg-amber-400/90"></span>
                                <span className="text-[10px] text-slate-500 font-medium">Submitted</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded bg-sky-400/90"></span>
                                <span className="text-[10px] text-slate-500 font-medium">Draft</span>
                            </div>
                        </div>


                        {/* ARCP Prep: Last ARCP & Current ARCP */}
                        <div className="mt-4 border-t border-slate-200 pt-3">
                            {
                                (() => {
                                    const arcpPrep = arcpPrepByTrainee[summary.profile.id!] || {};

                                    // Helper to get evidence items by IDs
                                    const getEvidenceItems = (ids: string[] | undefined): EvidenceItem[] => {
                                        if (!ids || ids.length === 0) return [];
                                        return summary.allEvidence.filter(e => ids.includes(e.id));
                                    };

                                    // Get default current evidence (signed off EPAs, latest GSAT/MSF)
                                    const signedOffEPAs = summary.allEvidence.filter(e => e.type === EvidenceType.EPA && e.status === EvidenceStatus.SignedOff);
                                    const latestGSAT = summary.allEvidence
                                        .filter(e => e.type === EvidenceType.GSAT && e.status === EvidenceStatus.SignedOff)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                    const latestMSF = summary.allEvidence
                                        .filter(e => e.type === EvidenceType.MSF && e.status === EvidenceStatus.SignedOff)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                                    // Use custom or defaults for current
                                    const currentEPAs = arcpPrep?.current_evidence_epas !== undefined && arcpPrep?.current_evidence_epas !== null
                                        ? getEvidenceItems(arcpPrep.current_evidence_epas)
                                        : signedOffEPAs;
                                    const currentGSAT = arcpPrep?.current_evidence_gsat !== undefined && arcpPrep?.current_evidence_gsat !== null
                                        ? getEvidenceItems(arcpPrep.current_evidence_gsat)
                                        : (latestGSAT ? [latestGSAT] : []);
                                    const currentMSF = arcpPrep?.current_evidence_msf !== undefined && arcpPrep?.current_evidence_msf !== null
                                        ? getEvidenceItems(arcpPrep.current_evidence_msf)
                                        : (latestMSF ? [latestMSF] : []);
                                    const currentESR = getEvidenceItems(arcpPrep?.current_evidence_esr);

                                    // Last ARCP evidence
                                    const lastEPAs = getEvidenceItems(arcpPrep?.last_evidence_epas);
                                    const lastGSAT = getEvidenceItems(arcpPrep?.last_evidence_gsat);
                                    const lastMSF = getEvidenceItems(arcpPrep?.last_evidence_msf);
                                    const lastESR = getEvidenceItems(arcpPrep?.last_evidence_esr);

                                    const formatDate = (dateStr?: string) => {
                                        if (!dateStr) return 'Not set';
                                        return new Date(dateStr).toLocaleDateString('en-GB');
                                    };

                                    const EvidenceList: React.FC<{ items: EvidenceItem[], emptyText?: string }> = ({ items, emptyText = 'No items' }) => (
                                        items.length > 0 ? (
                                            <div className="space-y-1">
                                                {items.slice(0, 3).map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate cursor-pointer hover:text-indigo-600 group"
                                                        onClick={() => handleViewEvidenceItem(item)}
                                                    >
                                                        <span className="truncate flex-1">• {item.title}</span>
                                                        {item.status === EvidenceStatus.SignedOff && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                                                                COMPLETE
                                                            </span>
                                                        )}
                                                        {item.status === EvidenceStatus.Submitted && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                                                                SUBMITTED
                                                            </span>
                                                        )}
                                                        {item.status === EvidenceStatus.Draft && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                                                                DRAFT
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {items.length > 3 && (
                                                    <div className="text-[10px] font-medium text-slate-400 pl-2">+{items.length - 3} more</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-300 italic">{emptyText}</div>
                                        )
                                    );

                                    return (
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Last ARCP */}
                                            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last ARCP</span>
                                                    {arcpPrep?.last_arcp_date && (
                                                        <span className="text-[9px] text-slate-400">{formatDate(arcpPrep.last_arcp_date)}</span>
                                                    )}
                                                </div>
                                                {arcpPrep?.last_arcp_type && (
                                                    <div className="text-[9px] text-indigo-600 font-medium mb-2">{arcpPrep.last_arcp_type}</div>
                                                )}
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">EPAs</span>
                                                        <EvidenceList items={lastEPAs} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">GSAT</span>
                                                        <EvidenceList items={lastGSAT} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">MSF</span>
                                                        <EvidenceList items={lastMSF} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">ESR</span>
                                                        <EvidenceList items={lastESR} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Current ARCP */}
                                            <div className="bg-gradient-to-b from-white to-slate-50 rounded-lg p-2.5 border border-teal-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Current ARCP</span>
                                                    {summary.profile.arcpDate && (
                                                        <span className="text-[9px] text-slate-400">{formatDate(summary.profile.arcpDate)}</span>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">EPAs</span>
                                                        <EvidenceList items={currentEPAs} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">GSAT</span>
                                                        <EvidenceList items={currentGSAT} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">MSF</span>
                                                        {arcpPrep?.no_msf_planned ? (
                                                            <div className="text-[9px] text-amber-600 italic">No MSF planned for this review</div>
                                                        ) : (
                                                            <EvidenceList items={currentMSF} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">ESR</span>
                                                        <EvidenceList items={currentESR} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            }
                        </div>
                    </div>

                    {/* Right Panel: Cases & Outcome */}
                    <div className="col-span-2 border-l border-slate-200 pl-2 text-[10px]">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart2 size={16} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL CASES (LIVE/TRAINEE_ID)</span>
                            </div>
                            <div className="mb-2">
                                <span className="text-3xl font-bold text-slate-900">{cases.total}</span>
                                <p className="text-[10px] text-slate-500 mt-0.5">Phacoemulsification with IOL</p>
                            </div>
                            {/* PCR Rate */}
                            {cases.pcrRate !== undefined && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PCR RATE</div>
                                    <div className={`text-xl font-bold ${cases.pcrRate > 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {cases.pcrRate.toFixed(2)}%
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[10px] font-bold text-indigo-600">SOLE BREAKDOWNS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-slate-600">Performed</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.performed}</span>
                                    <span className="text-slate-400 text-[10px]">({cases.total ? Math.round(cases.performed / cases.total * 100) : 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-slate-600">Supervised</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.supervised}</span>
                                    <span className="text-slate-400 text-[10px]">({cases.total ? Math.round(cases.supervised / cases.total * 100) : 0}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span className="text-xs text-slate-600">Assisted</span>
                                    <span className="ml-auto font-bold text-slate-900">{cases.assisted}</span>
                                    <span className="text-slate-400 text-[10px]">({cases.total ? Math.round(cases.assisted / cases.total * 100) : 0}%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mb-4 space-y-2">
                            <button
                                onClick={() => onViewActiveEPAs(summary.profile.id!)}
                                className="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Activity size={12} /> EyeLogbook
                            </button>
                            <button
                                onClick={() => onViewComplications(summary.profile.id!)}
                                className="w-full py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                            >
                                <AlertCircle size={12} /> Complications
                            </button>
                            <button
                                onClick={() => onViewTraineeEvidence(summary.profile.id!)}
                                className="w-full py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-100 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={12} /> Evidence
                            </button>
                        </div>

                        {/* Outcome Form */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Grade Assessed</label>
                                <div className="w-full px-2 py-1.5 bg-slate-100 rounded border border-slate-200 text-xs font-semibold text-slate-600">
                                    {summary.profile.grade || 'N/A'}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Chair</label>
                                <select
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.chairId}
                                    onChange={(e) => handleOutcomeFormChange('chairId', e.target.value)}
                                >
                                    <option value="">Select Chair...</option>
                                    {panelMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Next Grade</label>
                                <select
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.gradeAtNextRotation}
                                    onChange={(e) => handleOutcomeFormChange('gradeAtNextRotation', e.target.value)}
                                >
                                    <option value="">Select Grade...</option>
                                    {['ST1', 'ST2', 'ST3', 'ST4', 'ST5', 'ST6', 'ST7', 'Consultant'].map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Panel Comments</label>
                                <textarea
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500 min-h-[60px]"
                                    placeholder="Enter comments..."
                                    value={outcomeFormData.comments}
                                    onChange={(e) => handleOutcomeFormChange('comments', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Outcome</label>
                                <select
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.outcome}
                                    onChange={(e) => handleOutcomeFormChange('outcome', e.target.value)}
                                >
                                    <option value="">Select Outcome...</option>
                                    {Object.values(ARCPOutcome).map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Lock Date</label>
                                <input
                                    type="date"
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.lockDate}
                                    onChange={(e) => handleOutcomeFormChange('lockDate', e.target.value)}
                                />
                            </div>

                            <button
                                id="save-outcome-btn"
                                onClick={handleSaveOutcomeForm}
                                className="w-full py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={12} /> Save Outcome
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content moved to Center Panel */}
            </GlassCard >
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

                {/* Deanery and Trainee Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div>
                            <label htmlFor="deanery-filter" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Deanery
                            </label>
                            <select
                                id="deanery-filter"
                                value={selectedDeanery}
                                onChange={(e) => {
                                    setSelectedDeanery(e.target.value);
                                    setSelectedTraineeId('');
                                    setCurrentSummary(null);
                                }}
                                disabled={currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.ARCPSuperuser}
                                className="w-full md:w-64 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                <option value="all">All Deaneries</option>
                                {availableDeaneries.map(deanery => (
                                    <option key={deanery} value={deanery}>{deanery}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="trainee-filter" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Trainee
                            </label>
                            <select
                                id="trainee-filter"
                                value={selectedTraineeId}
                                onChange={(e) => setSelectedTraineeId(e.target.value)}
                                className="w-full md:w-64 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">Select a Trainee...</option>
                                {filteredTrainees.map(p => (
                                    <option key={p.id} value={p.id!}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading && (
                <GlassCard className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading trainees list...</p>
                    </div>
                </GlassCard>
            )}

            {error && !loading && (
                <GlassCard className="p-12 text-center">
                    <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <p className="text-red-600 font-medium mb-2">Error loading data</p>
                    <p className="text-slate-500 text-sm">{error}</p>
                </GlassCard>
            )}

            {!loading && !error && !selectedTraineeId && (
                <GlassCard className="p-16 text-center">
                    <User size={64} className="text-slate-200 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a Trainee</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        Please select a trainee from the dropdown above to view their ARCP portfolio dashboard.
                    </p>
                </GlassCard>
            )}

            {!loading && !error && selectedTraineeId && loadingDetails && (
                <GlassCard className="p-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading trainee details...</p>
                    </div>
                </GlassCard>
            )}

            {!loadingDetails && !error && currentSummary && (
                <div>
                    {renderTraineeRow(currentSummary)}
                </div>
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
                                                handleViewEvidenceItem(item);
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

            {/* Loading Overlay */}
            {loadingEvidence && (
                <div className="fixed inset-0 bg-white/50 backdrop-blur-[1px] z-[60] flex items-center justify-center">
                    <div className="bg-white p-4 rounded-full shadow-xl">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ARCPPanelDashboard;
