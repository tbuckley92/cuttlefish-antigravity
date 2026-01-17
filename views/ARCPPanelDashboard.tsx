import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
    User, FileText, ClipboardCheck, Activity,
    CheckCircle2, AlertCircle, ArrowLeft, Edit2, BarChart2, Clock, Save, Trash2, Download,
    CheckSquare, Square
} from '../components/Icons';
import { TraineeSummary, UserRole, EvidenceType, EvidenceStatus, ARCPOutcome, UserProfile, EvidenceItem, TrainingGrade, ARCPPrepData, ARCPOutcomeData, ARCPOutcomeStatus } from '../types';
import { ARCP_OUTCOMES, SPECIALTIES } from '../constants';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { generateEvidencePDF } from '../utils/pdfGenerator';
import { uuidv4 } from '../utils/uuid';
import { sendNotificationEmail } from '../utils/emailUtils';

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
    onEditEvidenceItem?: (item: EvidenceItem) => void;
    onRefreshEvidence?: () => void;
}

const ARCPPanelDashboard: React.FC<ARCPPanelDashboardProps> = ({
    currentUser, onBack, onViewTraineeGSAT, onViewActiveEPAs, onViewComplications,
    onViewTraineeEvidence, onViewESR, onUpdateARCPOutcome, onViewEvidenceItem, onEditEvidenceItem,
    onRefreshEvidence
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
        lockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 2 weeks
        panelReviewDate: new Date().toISOString().split('T')[0] // Default today
    });
    const [showPendingWarning, setShowPendingWarning] = useState(false);

    // View mode state: 'overview' (current composite) or 'outcomes' (ARCP outcomes table)
    type ViewMode = 'overview' | 'outcomes';
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [arcpOutcomes, setArcpOutcomes] = useState<ARCPOutcomeData[]>([]);
    const [loadingOutcomes, setLoadingOutcomes] = useState(false);

    // Outcome filters and sort
    const [outcomeFilterTraineeId, setOutcomeFilterTraineeId] = useState<string>('all');
    const [outcomeStatusFilter, setOutcomeStatusFilter] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING'); // Default to PENDING
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<Set<string>>(new Set());
    const [outcomeSort, setOutcomeSort] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
    const [outcomeDateRange, setOutcomeDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    const uniqueOutcomeTrainees = useMemo(() => {
        const trainees = new Map();
        arcpOutcomes.forEach(o => {
            if (!trainees.has(o.traineeId)) {
                trainees.set(o.traineeId, o.traineeName);
            }
        });
        return Array.from(trainees.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [arcpOutcomes]);

    const filteredAndSortedOutcomes = useMemo(() => {
        let result = [...arcpOutcomes];

        if (outcomeFilterTraineeId !== 'all') {
            result = result.filter(o => o.traineeId === outcomeFilterTraineeId);
        }

        if (outcomeStatusFilter !== 'ALL') {
            result = result.filter(o => o.status === outcomeStatusFilter);
        }

        if (outcomeDateRange.start) {
            result = result.filter(o => o.createdAt && o.createdAt >= outcomeDateRange.start);
        }
        if (outcomeDateRange.end) {
            result = result.filter(o => o.createdAt && o.createdAt.split('T')[0] <= outcomeDateRange.end);
        }

        result.sort((a, b) => {
            switch (outcomeSort) {
                case 'date-desc':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'date-asc':
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                case 'name-asc':
                    return a.traineeName.localeCompare(b.traineeName);
                case 'name-desc':
                    return b.traineeName.localeCompare(a.traineeName);
                default:
                    return 0;
            }
        });

        return result;
    }, [arcpOutcomes, outcomeFilterTraineeId, outcomeStatusFilter, outcomeSort, outcomeDateRange]);

    // Handle batch selection
    const toggleOutcomeSelection = (outcomeId: string) => {
        const newSelected = new Set(selectedOutcomeIds);
        if (newSelected.has(outcomeId)) {
            newSelected.delete(outcomeId);
        } else {
            newSelected.add(outcomeId);
        }
        setSelectedOutcomeIds(newSelected);
    };

    const toggleAllOutcomesSelection = () => {
        if (selectedOutcomeIds.size === filteredAndSortedOutcomes.length) {
            setSelectedOutcomeIds(new Set());
        } else {
            setSelectedOutcomeIds(new Set(filteredAndSortedOutcomes.map(o => o.id)));
        }
    };

    // Handle batch confirmation
    const handleBatchConfirmOutcomes = async () => {
        if (selectedOutcomeIds.size === 0 || !supabase) return;

        if (!confirm(`Are you sure you want to confirm ${selectedOutcomeIds.size} outcomes? This will lock them.`)) {
            return;
        }

        try {
            setLoadingOutcomes(true);
            const outcomeIds = Array.from(selectedOutcomeIds);

            // Update outcomes to CONFIRMED
            const { error } = await supabase
                .from('arcp_outcome')
                .update({
                    status: 'CONFIRMED',
                    locked_at: new Date().toISOString()
                })
                .in('id', outcomeIds);

            if (error) throw error;

            // Also update associated evidence to COMPLETE
            // First get the evidence IDs for these outcomes
            const outcomesToUpdate = arcpOutcomes.filter(o => outcomeIds.includes(o.id));
            const evidenceIds = outcomesToUpdate.map(o => o.evidenceId).filter(Boolean) as string[];

            if (evidenceIds.length > 0) {
                // Update top-level status
                const { error: evidenceError } = await supabase
                    .from('evidence')
                    .update({ status: 'COMPLETE' })
                    .in('id', evidenceIds);

                if (evidenceError) {
                    console.error('Error updating evidence status:', evidenceError);
                    alert('Failed to update evidence status: ' + evidenceError.message);
                } else {
                    console.log('Successfully updated evidence status for ids:', evidenceIds);

                    // Sync individual JSONB data status
                    await Promise.all(outcomesToUpdate.map(async outcome => {
                        if (!outcome.evidenceId) return;

                        const updatedData = {
                            id: outcome.evidenceId,
                            outcome: outcome.outcome,
                            gradeAssessed: outcome.gradeAssessed,
                            nextTrainingGrade: outcome.nextTrainingGrade,
                            chairId: outcome.chairId,
                            chairName: outcome.chairName,
                            panelComments: outcome.panelComments,
                            lockDate: outcome.lockDate,
                            currentArcpEpas: outcome.currentArcpEpas,
                            status: 'CONFIRMED',
                            panelReviewDate: outcome.panelReviewDate,
                            reviewType: outcome.reviewType
                        };

                        await supabase
                            .from('evidence')
                            .update({ data: updatedData })
                            .eq('id', outcome.evidenceId);
                    }));
                }
            }

            // Clear selection and refresh
            setSelectedOutcomeIds(new Set());
            await fetchArcpOutcomes();

        } catch (err: any) {
            console.error('Batch confirm error:', err);
            alert('Failed to confirm outcomes: ' + err.message);
        } finally {
            setLoadingOutcomes(false);
        }
    };

    // Individual confirm
    const handleConfirmIndividualOutcome = async (outcomeId: string, evidenceId?: string) => {
        if (!supabase) return;
        if (!confirm('Confirm this outcome?')) return;

        try {
            setLoadingOutcomes(true);
            await supabase
                .from('arcp_outcome')
                .update({
                    status: 'CONFIRMED',
                    locked_at: new Date().toISOString()
                })
                .eq('id', outcomeId);

            if (evidenceId) {
                // To keep data in sync, update the JSONB column's status too
                const outcome = arcpOutcomes.find(o => o.id === outcomeId);
                const updatedData = outcome ? {
                    id: outcome.evidenceId,
                    outcome: outcome.outcome,
                    gradeAssessed: outcome.gradeAssessed,
                    nextTrainingGrade: outcome.nextTrainingGrade,
                    chairId: outcome.chairId,
                    chairName: outcome.chairName,
                    panelComments: outcome.panelComments,
                    lockDate: outcome.lockDate,
                    currentArcpEpas: outcome.currentArcpEpas,
                    status: 'CONFIRMED',
                    panelReviewDate: outcome.panelReviewDate,
                    reviewType: outcome.reviewType
                } : undefined;

                const { error: evidenceError } = await supabase
                    .from('evidence')
                    .update({
                        status: 'COMPLETE',
                        ...(updatedData ? { data: updatedData } : {})
                    })
                    .eq('id', evidenceId);

                if (evidenceError) {
                    console.error('Error updating individual evidence status:', evidenceError);
                    alert('Failed to update evidence status: ' + evidenceError.message);
                }
            }

            await fetchArcpOutcomes();

        } catch (err: any) {
            console.error('Confirm error:', err);
            alert('Failed to confirm outcome: ' + err.message);
        } finally {
            setLoadingOutcomes(false);
        }
    };

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
                    role: (p.roles && p.roles.length > 0) ? p.roles[0] : (p.role || UserRole.Trainee), // Better role inference
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
                    arcpInterimFull: p.arcp_interim_full,
                    frcophthPart1: p.frcophth_part1,
                    frcophthPart2Written: p.frcophth_part2_written,
                    frcophthPart2Oral: p.frcophth_part2_oral,
                    refractionCertificate: p.refraction_certificate,
                    laserCertificate: p.laser_certificate,
                    sias: p.sias ? (Array.isArray(p.sias) ? p.sias : JSON.parse(p.sias)) : [],
                    predictedSIAs: p.predicted_sias || [],
                    pdpGoals: p.pdp_goals || [],
                    roles: p.roles || [], // Map roles array
                    // Phaco stats from stored values
                    phacoTotal: p.phaco_total || 0,
                    phacoPerformed: p.phaco_performed || 0,
                    phacoSupervised: p.phaco_supervised || 0,
                    phacoAssisted: p.phaco_assisted || 0,
                    phacoPcrCount: p.phaco_pcr_count || 0,
                    phacoPcrRate: p.phaco_pcr_rate || 0,
                    phacoStatsUpdatedAt: p.phaco_stats_updated_at
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

                // --- Use Stored Phaco Stats from Profile ---
                // Stats are now stored in user_profile and updated when EyeLogbook changes
                const stats = {
                    total: profile.phacoTotal || 0,
                    performed: profile.phacoPerformed || 0,
                    supervised: profile.phacoSupervised || 0,
                    assisted: profile.phacoAssisted || 0,
                    pcrRate: profile.phacoPcrRate || 0
                };
                console.log('ARCP Dash Debug - Using stored phaco stats:', stats);
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
                    current_es: arcpPreps[0].current_es,
                    last_es: arcpPreps[0].last_es,
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
            ((p.roles && p.roles.includes(UserRole.ARCPPanelMember)) ||
                (p.roles && p.roles.includes(UserRole.ARCPSuperuser)) ||
                p.role === UserRole.ARCPPanelMember ||
                p.role === UserRole.Admin ||
                p.role === UserRole.ARCPSuperuser) &&
            p.deanery === currentSummary.profile.deanery
        );
        setPanelMembers(deaneryMembers);
    }, [currentSummary, profiles]);

    // Handle form changes
    const handleOutcomeFormChange = (field: string, value: any) => {
        setOutcomeFormData(prev => ({ ...prev, [field]: value }));
    };

    // Fetch ARCP outcomes for the selected deanery
    const fetchArcpOutcomes = async () => {
        if (!supabase) return;

        setLoadingOutcomes(true);
        try {
            const { data, error } = await supabase
                .from('arcp_outcome')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const today = new Date().toISOString().split('T')[0];
            const mappedOutcomes: ARCPOutcomeData[] = (data || []).map(o => ({
                id: o.id,
                traineeId: o.trainee_id,
                traineeName: o.trainee_name,
                gradeAssessed: o.grade_assessed,
                nextTrainingGrade: o.next_training_grade,
                chairId: o.chair_id,
                chairName: o.chair_name,
                outcome: o.outcome as ARCPOutcome,
                reviewType: o.review_type as 'Full ARCP' | 'Interim Review',
                panelComments: o.panel_comments,
                currentArcpEpas: o.current_arcp_epas || [],
                lockDate: o.lock_date,
                status: o.lock_date <= today && o.status === 'PENDING'
                    ? ARCPOutcomeStatus.Confirmed
                    : o.status as ARCPOutcomeStatus,
                lockedAt: o.locked_at,
                createdBy: o.created_by,
                createdAt: o.created_at,
                evidenceId: o.evidence_id,
                traineeDeanery: o.trainee_deanery,
                panelReviewDate: o.panel_review_date
            }));

            // Process on-demand lock transitions
            for (const outcome of mappedOutcomes) {
                if (outcome.lockDate <= today && outcome.status === ARCPOutcomeStatus.Pending) {
                    // Update to confirmed in database
                    await supabase
                        .from('arcp_outcome')
                        .update({ status: 'CONFIRMED', locked_at: new Date().toISOString() })
                        .eq('id', outcome.id);

                    // Update evidence status
                    if (outcome.evidenceId) {
                        const updatedData = {
                            id: outcome.evidenceId,
                            outcome: outcome.outcome,
                            gradeAssessed: outcome.gradeAssessed,
                            nextTrainingGrade: outcome.nextTrainingGrade,
                            chairId: outcome.chairId,
                            chairName: outcome.chairName,
                            panelComments: outcome.panelComments,
                            lockDate: outcome.lockDate,
                            currentArcpEpas: outcome.currentArcpEpas,
                            status: 'CONFIRMED',
                            panelReviewDate: outcome.panelReviewDate,
                            reviewType: outcome.reviewType
                        };

                        await supabase
                            .from('evidence')
                            .update({
                                status: 'COMPLETE',
                                data: updatedData
                            })
                            .eq('id', outcome.evidenceId);
                    }

                    // Clear arcp_prep linked evidence for this trainee
                    await supabase
                        .from('arcp_prep')
                        .update({
                            current_evidence_epas: null,
                            current_evidence_gsat: null,
                            current_evidence_msf: null,
                            current_evidence_esr: null
                        })
                        .eq('user_id', outcome.traineeId);

                    outcome.status = ARCPOutcomeStatus.Confirmed;
                }
            }

            setArcpOutcomes(mappedOutcomes);
        } catch (err) {
            console.error('Error fetching ARCP outcomes:', err);
        } finally {
            setLoadingOutcomes(false);
        }
    };

    // Fetch outcomes when view mode changes to 'outcomes'
    useEffect(() => {
        if (viewMode === 'outcomes') {
            fetchArcpOutcomes();
        }
    }, [viewMode, selectedDeanery]);

    const handleSaveOutcomeInit = async () => {
        if (!selectedTraineeId || !supabase) return;

        // Check for existing pending outcomes for this trainee
        const { data: pendingOutcomes } = await supabase
            .from('arcp_outcome')
            .select('id')
            .eq('trainee_id', selectedTraineeId)
            .eq('status', 'PENDING');

        if (pendingOutcomes && pendingOutcomes.length > 0) {
            setShowPendingWarning(true);
            return;
        }

        executeSaveOutcome();
    };

    const executeSaveOutcome = async () => {
        setShowPendingWarning(false); // Close dialog if open
        if (!selectedTraineeId || !supabase) return;

        if (!outcomeFormData.outcome) {
            alert('Please select an outcome');
            return;
        }

        const lockDate = outcomeFormData.lockDate;
        const reviewType = currentSummary?.profile.arcpInterimFull || 'Full ARCP';
        const evidenceType = reviewType === 'Interim Review'
            ? EvidenceType.ARCPInterimReview
            : EvidenceType.ARCPFullReview;

        // Get current ARCP EPAs from arcp_prep
        const currentEpas = arcpPrepByTrainee[selectedTraineeId]?.current_evidence_epas || [];
        const chairName = panelMembers.find(m => m.id === outcomeFormData.chairId)?.name;

        try {
            // 1. Create evidence record
            const evidencePayload = {
                trainee_id: selectedTraineeId,
                type: evidenceType,
                title: `${reviewType} - ${outcomeFormData.outcome} (${currentSummary?.profile.grade})`,
                event_date: new Date().toISOString().split('T')[0],
                status: 'Draft', // Displayed as PENDING in UI
                trainee_deanery: currentSummary?.profile.deanery,
                data: {
                    outcome: outcomeFormData.outcome,
                    gradeAssessed: currentSummary?.profile.grade,
                    nextTrainingGrade: outcomeFormData.gradeAtNextRotation,
                    chairId: outcomeFormData.chairId,
                    chairName: chairName,
                    panelComments: outcomeFormData.comments,
                    lockDate: lockDate,
                    currentArcpEpas: currentEpas,
                    status: 'PENDING',
                    panelReviewDate: outcomeFormData.panelReviewDate
                }
            };

            const { data: evidenceData, error: evidenceError } = await supabase
                .from('evidence')
                .insert(evidencePayload)
                .select()
                .single();

            if (evidenceError) {
                console.error('Error creating evidence:', evidenceError);
                alert('Failed to save outcome evidence: ' + evidenceError.message);
                return;
            }

            // 2. Create arcp_outcome record
            const outcomePayload = {
                trainee_id: selectedTraineeId,
                evidence_id: evidenceData.id,
                trainee_name: currentSummary?.profile.name,
                grade_assessed: currentSummary?.profile.grade,
                next_training_grade: outcomeFormData.gradeAtNextRotation,
                chair_id: outcomeFormData.chairId || null,
                chair_name: chairName || null,
                outcome: outcomeFormData.outcome,
                review_type: reviewType,
                panel_comments: outcomeFormData.comments,
                current_arcp_epas: currentEpas,
                lock_date: lockDate,
                status: 'PENDING',
                created_by: currentUser.id,
                trainee_deanery: currentSummary?.profile.deanery,
                panel_review_date: outcomeFormData.panelReviewDate
            };

            const { error: outcomeError } = await supabase
                .from('arcp_outcome')
                .insert(outcomePayload);

            if (outcomeError) {
                console.error('Error creating outcome record:', outcomeError);
                // Evidence was created, so show partial success
                alert('Evidence created but outcome record failed: ' + outcomeError.message);
            }

            // 3. Update profile with outcome
            onUpdateARCPOutcome(selectedTraineeId, outcomeFormData.outcome as ARCPOutcome);

            // Create notification for trainee
            const notificationPayload = {
                id: uuidv4(),
                user_id: selectedTraineeId,
                role_context: 'trainee',
                type: 'arcp_outcome',
                title: 'ARCP Outcome Available',
                body: `Your ARCP outcome for ${reviewType} has been recorded as ${outcomeFormData.outcome}.`,
                reference_id: evidenceData.id,
                reference_type: 'evidence',
                email_sent: false,
                is_read: false
            };

            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notificationPayload);

            if (notifError) {
                console.error('Error creating ARCP outcome notification:', notifError);
            } else {
                // Send email notification (fire and forget)
                sendNotificationEmail({
                    type: 'arcp_outcome',
                    userId: selectedTraineeId,
                    recipientName: currentSummary?.profile.name,
                    data: {
                        arcpOutcome: outcomeFormData.outcome,
                        message: `Your ARCP outcome for ${reviewType} has been recorded as ${outcomeFormData.outcome}.`
                    }
                }).catch(err => console.warn('ARCP email failed:', err));
            }

            // 4. Refresh parent evidence list so that if we view this item, it exists in state
            if (onRefreshEvidence) {
                onRefreshEvidence();
            }

            // Show success feedback
            const btn = document.getElementById('save-outcome-btn');
            if (btn) {
                const originalText = btn.innerText;
                btn.innerText = 'Saved!';
                setTimeout(() => btn.innerText = originalText, 2000);
            }

            // Reset form for next entry
            setOutcomeFormData({
                chairId: '',
                gradeAtNextRotation: '',
                comments: '',
                outcome: '' as ARCPOutcome | '',
                lockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                panelReviewDate: new Date().toISOString().split('T')[0]
            });

        } catch (err: any) {
            console.error('Save error:', err);
            alert('An error occurred while saving: ' + err.message);
        }
    };

    // Delete ARCP outcome
    const handleDeleteOutcome = async (outcomeId: string) => {
        if (!supabase) return;

        if (!confirm('Are you sure you want to delete this ARCP outcome? This action cannot be undone.')) {
            return;
        }

        try {
            // Find the outcome to get evidence ID
            const outcome = arcpOutcomes.find(o => o.id === outcomeId);

            // Delete the outcome record
            const { error: outcomeError } = await supabase
                .from('arcp_outcome')
                .delete()
                .eq('id', outcomeId);

            if (outcomeError) throw outcomeError;

            // Delete associated evidence if exists
            if (outcome?.evidenceId) {
                await supabase
                    .from('evidence')
                    .delete()
                    .eq('id', outcome.evidenceId);
            }

            // Refresh parent evidence list
            if (onRefreshEvidence) {
                onRefreshEvidence();
            }

            // Refresh outcomes list
            fetchArcpOutcomes();
        } catch (err: any) {
            console.error('Delete error:', err);
            alert('Failed to delete outcome: ' + err.message);
        }
    };

    // Download PDF for outcome
    const handleDownloadOutcomePDF = async (outcome: ARCPOutcomeData) => {
        const evidenceItem: EvidenceItem = {
            id: outcome.evidenceId || outcome.id,
            type: outcome.reviewType === 'Full ARCP' ? EvidenceType.ARCPFullReview : EvidenceType.ARCPInterimReview,
            title: `${outcome.reviewType} - ${outcome.outcome} (${outcome.gradeAssessed})`,
            date: outcome.createdAt?.split('T')[0] || '',
            status: outcome.status === ARCPOutcomeStatus.Confirmed ? EvidenceStatus.SignedOff : EvidenceStatus.Draft,
            notes: outcome.panelComments,
        };

        try {
            await generateEvidencePDF(evidenceItem, { name: outcome.traineeName } as UserProfile);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF');
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
                    traineeId: fullItem.trainee_id,
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
                            <button
                                onClick={() => onViewTraineeEvidence(summary.profile.id!)}
                                className="w-full py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-100 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={12} /> Evidence
                            </button>
                        </div>

                        {/* Form R Section */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FORM R</span>
                            </div>
                            {(() => {
                                const arcpPrep = arcpPrepByTrainee[summary.profile.id!] || {};
                                const linkedFormRDs = arcpPrep.linked_form_r || [];
                                const formRItems = summary.allEvidence.filter(e => linkedFormRDs.includes(e.id));

                                if (formRItems.length === 0) return <div className="text-[10px] text-slate-300 italic">No Form R linked</div>;

                                return (
                                    <div className="space-y-1">
                                        {formRItems.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate cursor-pointer hover:text-indigo-600 group" onClick={() => handleViewEvidenceItem(item)}>
                                                <span className="truncate flex-1">• {item.title}</span>
                                                {item.status === EvidenceStatus.SignedOff && (
                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">COMPLETE</span>
                                                )}
                                                {item.status === EvidenceStatus.Submitted && (
                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">SUBMITTED</span>
                                                )}
                                                {item.status === EvidenceStatus.Draft && (
                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider">DRAFT</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
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
                                    const lastArcpEvidence = getEvidenceItems(arcpPrep?.last_arcp_evidence);

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
                                                        className="flex items-center gap-2 text-xs truncate cursor-pointer hover:text-indigo-600 group"
                                                        onClick={() => handleViewEvidenceItem(item)}
                                                    >
                                                        <span className="truncate flex-1 font-semibold text-slate-700">• {item.title}</span>
                                                        {item.date && (
                                                            <span className="shrink-0 text-[9px] text-slate-400">{formatDate(item.date)}</span>
                                                        )}
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
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">LAST ARCP OUTCOME</span>
                                                        <EvidenceList items={lastArcpEvidence} emptyText="No outcome linked" />
                                                    </div>
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
                                                    <div className="pt-2 border-t border-slate-100">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Educational Supervisor</span>
                                                        {arcpPrep?.last_es ? (
                                                            <div className="text-[10px] text-slate-700">
                                                                <div className="font-semibold">{arcpPrep.last_es.name}</div>
                                                                {arcpPrep.last_es.email && (
                                                                    <div className="text-slate-500">{arcpPrep.last_es.email}</div>
                                                                )}
                                                                {arcpPrep.last_es.gmc && (
                                                                    <div className="text-slate-500">GMC: {arcpPrep.last_es.gmc}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-300 italic">Not specified</div>
                                                        )}
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
                                                {summary.profile.arcpInterimFull && (
                                                    <div className="text-[9px] text-teal-600 font-medium mb-2">{summary.profile.arcpInterimFull}</div>
                                                )}
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
                                                    <div className="pt-2 border-t border-teal-100">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Educational Supervisor</span>
                                                        {arcpPrep?.current_es ? (
                                                            <div className="text-[10px] text-slate-700">
                                                                <div className="font-semibold">{arcpPrep.current_es.name}</div>
                                                                {arcpPrep.current_es.email && (
                                                                    <div className="text-slate-500">{arcpPrep.current_es.email}</div>
                                                                )}
                                                                {arcpPrep.current_es.gmc && (
                                                                    <div className="text-slate-500">GMC: {arcpPrep.current_es.gmc}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-300 italic">Not specified</div>
                                                        )}
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
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CATARACT CASES (PHACO/IOL)</span>
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
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">ROLE BREAKDOWN</span>
                                </div>
                                {/* P/PS Combined */}
                                {(() => {
                                    const pCount = cases.performed;
                                    const percentage = cases.total > 0 ? Math.round((pCount / cases.total) * 100) : 0;
                                    if (pCount === 0) return null;
                                    return (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                                    P/PS
                                                </span>
                                                <span className="text-xs text-slate-600">Performed</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">{pCount}</span>
                                                <span className="text-xs text-slate-400">({percentage}%)</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {/* SJ */}
                                {(cases.supervised || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                                SJ
                                            </span>
                                            <span className="text-xs text-slate-600">Supervised Junior</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">{cases.supervised}</span>
                                            <span className="text-xs text-slate-400">({Math.round(((cases.supervised || 0) / cases.total) * 100)}%)</span>
                                        </div>
                                    </div>
                                )}
                                {/* A */}
                                {(cases.assisted || 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                                A
                                            </span>
                                            <span className="text-xs text-slate-600">Assisted</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">{cases.assisted}</span>
                                            <span className="text-xs text-slate-400">({Math.round(((cases.assisted || 0) / cases.total) * 100)}%)</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-4 space-y-2">
                            <button
                                onClick={() => onViewActiveEPAs(summary.profile.id!)}
                                className="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Activity size={12} /> EyeLogbook
                            </button>
                        </div>

                        {/* Outcome Form */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3">ARCP Panel Review</h4>

                            <div className="mb-3">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Grade Assessed</label>
                                <div className="w-full px-2 py-1.5 bg-slate-100 rounded border border-slate-200 text-xs font-semibold text-slate-600">
                                    {summary.profile.grade || 'N/A'}
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Date of panel review</label>
                                <input
                                    type="date"
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.panelReviewDate}
                                    onChange={(e) => handleOutcomeFormChange('panelReviewDate', e.target.value)}
                                />
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
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">AUTO-CONFIRM OUTCOME ON</label>
                                <input
                                    type="date"
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    value={outcomeFormData.lockDate}
                                    onChange={(e) => handleOutcomeFormChange('lockDate', e.target.value)}
                                />
                            </div>

                            <button
                                id="save-outcome-btn"
                                onClick={handleSaveOutcomeInit}
                                disabled={!outcomeFormData.outcome}
                                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow group"
                            >
                                <Save size={18} className="group-hover:scale-110 transition-transform" />
                                Save Outcome
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
                            <label htmlFor="view-mode" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                View
                            </label>
                            <select
                                id="view-mode"
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as 'overview' | 'outcomes')}
                                className="w-full md:w-48 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="overview">ARCP Overview</option>
                                <option value="outcomes">ARCP Outcomes</option>
                            </select>
                        </div>

                        {viewMode === 'overview' && (
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
                        )}
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

            {/* ARCP Overview View */}
            {viewMode === 'overview' && !loading && !error && (
                <>
                    {!selectedTraineeId && (
                        <GlassCard className="p-16 text-center">
                            <User size={64} className="text-slate-200 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a Trainee</h2>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                Please select a trainee from the dropdown above to view their ARCP portfolio dashboard.
                            </p>
                        </GlassCard>
                    )}

                    {selectedTraineeId && loadingDetails && (
                        <GlassCard className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-slate-500 font-medium">Loading trainee details...</p>
                            </div>
                        </GlassCard>
                    )}

                    {!loadingDetails && currentSummary && (
                        <div>
                            {renderTraineeRow(currentSummary)}
                        </div>
                    )}
                </>
            )}

            {/* ARCP Outcomes View */}
            {viewMode === 'outcomes' && !loading && !error && (
                <GlassCard className="p-4">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">ARCP Outcomes</h2>
                            <div className="flex items-center gap-3">
                                {outcomeStatusFilter === 'PENDING' && selectedOutcomeIds.size > 0 && (
                                    <button
                                        onClick={handleBatchConfirmOutcomes}
                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 animate-in fade-in"
                                    >
                                        <CheckCircle2 size={14} />
                                        Confirm Selected ({selectedOutcomeIds.size})
                                    </button>
                                )}
                                <span className="text-sm text-slate-500">{filteredAndSortedOutcomes.length} outcome(s)</span>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                                <select
                                    value={outcomeStatusFilter}
                                    onChange={(e) => {
                                        setOutcomeStatusFilter(e.target.value as any);
                                        setSelectedOutcomeIds(new Set()); // Clear selection on filter change
                                    }}
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500 mb-2 md:mb-0"
                                >
                                    <option value="PENDING">Pending (Recommended)</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="ALL">All Outcomes</option>
                                </select>
                            </div>

                            {/* Trainee Filter */}
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trainee</label>
                                <select
                                    value={outcomeFilterTraineeId}
                                    onChange={(e) => setOutcomeFilterTraineeId(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                >
                                    <option value="all">All Trainees</option>
                                    {uniqueOutcomeTrainees.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="flex-1 md:max-w-[200px]">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sort By</label>
                                <select
                                    value={outcomeSort}
                                    onChange={(e) => setOutcomeSort(e.target.value as any)}
                                    className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                >
                                    <option value="date-desc">Newest First</option>
                                    <option value="date-asc">Oldest First</option>
                                    <option value="name-asc">Name (A-Z)</option>
                                    <option value="name-desc">Name (Z-A)</option>
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="flex gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From</label>
                                    <input
                                        type="date"
                                        value={outcomeDateRange.start}
                                        onChange={(e) => setOutcomeDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To</label>
                                    <input
                                        type="date"
                                        value={outcomeDateRange.end}
                                        onChange={(e) => setOutcomeDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {(outcomeFilterTraineeId !== 'all' || outcomeStatusFilter !== 'PENDING' || outcomeDateRange.start || outcomeDateRange.end) && (
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setOutcomeFilterTraineeId('all');
                                            setOutcomeStatusFilter('PENDING');
                                            setOutcomeDateRange({ start: '', end: '' });
                                        }}
                                        className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors mb-[1px]"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {loadingOutcomes && (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500 text-sm">Loading outcomes...</p>
                        </div>
                    )}

                    {!loadingOutcomes && filteredAndSortedOutcomes.length === 0 && (
                        <div className="py-12 text-center">
                            <ClipboardCheck size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500">No outcomes found</p>
                            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or create a new outcome.</p>
                        </div>
                    )}

                    {!loadingOutcomes && filteredAndSortedOutcomes.length > 0 && (
                        <div className="space-y-2">
                            {/* Header Row for Batch Select */}
                            {outcomeStatusFilter === 'PENDING' && (
                                <div className="flex items-center px-4 py-2 border-b border-slate-200 mb-2">
                                    <button
                                        onClick={toggleAllOutcomesSelection}
                                        className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                                    >
                                        {selectedOutcomeIds.size > 0 && selectedOutcomeIds.size === filteredAndSortedOutcomes.length ? (
                                            <CheckSquare size={16} className="text-indigo-600" />
                                        ) : (
                                            <Square size={16} className="text-slate-300" />
                                        )}
                                        Select All
                                    </button>
                                </div>
                            )}

                            {filteredAndSortedOutcomes.map(outcome => (
                                <div
                                    key={outcome.id}
                                    className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        if (outcome.evidenceId && onViewEvidenceItem) {
                                            handleViewEvidenceItem({
                                                id: outcome.evidenceId,
                                                type: outcome.reviewType === 'Full ARCP' ? EvidenceType.ARCPFullReview : EvidenceType.ARCPInterimReview,
                                                title: `${outcome.reviewType} - ${outcome.outcome}`,
                                                date: outcome.createdAt?.split('T')[0] || '',
                                                status: outcome.status === ARCPOutcomeStatus.Confirmed ? EvidenceStatus.SignedOff : EvidenceStatus.Draft,
                                                traineeId: outcome.traineeId
                                            } as any);
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Checkbox for Batch Select (Only for Pending) */}
                                        {outcomeStatusFilter === 'PENDING' && (
                                            <div
                                                className="pt-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleOutcomeSelection(outcome.id);
                                                }}
                                            >
                                                {selectedOutcomeIds.has(outcome.id) ? (
                                                    <CheckSquare size={20} className="text-indigo-600 hover:scale-110 transition-transform" />
                                                ) : (
                                                    <Square size={20} className="text-slate-300 hover:text-indigo-400 transition-colors" />
                                                )}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-slate-900 truncate">{outcome.traineeName}</h4>
                                                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${outcome.status === ARCPOutcomeStatus.Confirmed
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {outcome.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-1">
                                                <span className="font-medium">{outcome.reviewType}</span> •
                                                <span className="text-indigo-600 font-semibold ml-1">{outcome.outcome}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {outcome.gradeAssessed} → {outcome.nextTrainingGrade} •
                                                Lock: {outcome.lockDate} •
                                                Chair: {outcome.chairName || 'N/A'}
                                            </p>
                                            {outcome.panelComments && (
                                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                                                    {outcome.panelComments}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Edit functionality - navigate to ARCPForm in edit mode
                                                    if (outcome.evidenceId && onEditEvidenceItem) {
                                                        const item: any = {
                                                            id: outcome.evidenceId,
                                                            type: outcome.reviewType === 'Full ARCP' ? EvidenceType.ARCPFullReview : EvidenceType.ARCPInterimReview,
                                                            title: `${outcome.reviewType} - ${outcome.outcome}`,
                                                            date: outcome.createdAt?.split('T')[0] || '',
                                                            status: outcome.status === ARCPOutcomeStatus.Confirmed ? EvidenceStatus.SignedOff : EvidenceStatus.Draft,
                                                            traineeId: outcome.traineeId
                                                        };
                                                        onEditEvidenceItem(item);
                                                    } else {
                                                        // Fallback to old behavior if prop not provided or no evidence ID
                                                        setSelectedTraineeId(outcome.traineeId);
                                                        setViewMode('overview');
                                                    }
                                                }}
                                                className="p-2 hover:bg-white rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} className="text-slate-500" />
                                            </button>

                                            {/* Confirm Button */}
                                            {outcomeStatusFilter === 'PENDING' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmIndividualOutcome(outcome.id, outcome.evidenceId);
                                                    }}
                                                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Confirm / Sign Off"
                                                >
                                                    <CheckCircle2 size={14} className="text-green-600" />
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteOutcome(outcome.id);
                                                }}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} className="text-red-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadOutcomePDF(outcome);
                                                }}
                                                className="p-2 hover:bg-white rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download size={14} className="text-slate-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Pending Warning Dialog */}
            {showPendingWarning && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <AlertCircle size={24} />
                            <h3 className="text-lg font-semibold text-slate-900">Pending Outcome Exists</h3>
                        </div>
                        <p className="text-slate-600 mb-6">
                            ARCP Outcome for this Trainee already exists, pending confirmation. Click SAVE OUTCOME to create a new ARCP Outcome or Cancel.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowPendingWarning(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeSaveOutcome}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm hover:shadow"
                            >
                                SAVE OUTCOME
                            </button>
                        </div>
                    </div>
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
