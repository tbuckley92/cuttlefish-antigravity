import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ClipboardCheck, Search, Filter, AlertCircle, CheckCircle2 } from '../components/Icons';
import { EvidenceListTable } from './EvidenceListTable';
import { EvidenceItem, EvidenceStatus, EvidenceType, UserProfile, SupervisorProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { SPECIALTIES } from '../constants';

interface SignOffsPanelProps {
    supervisor: SupervisorProfile;
    onViewEvidence: (evidence: EvidenceItem) => void;
    onShowEditRequest?: (requestId: string) => void;
}

export const SignOffsPanel: React.FC<SignOffsPanelProps> = ({ supervisor, onViewEvidence, onShowEditRequest }) => {
    const [submittedEvidence, setSubmittedEvidence] = useState<EvidenceItem[]>([]);
    const [signedOffEvidence, setSignedOffEvidence] = useState<EvidenceItem[]>([]);
    const [editRequests, setEditRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters for Signed Off Table
    const [filterTrainee, setFilterTrainee] = useState('All');
    const [filterYear, setFilterYear] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Supervisor's Queue
    useEffect(() => {
        const fetchSupervisorEvidence = async () => {
            // Use GMC number for stable matching, fallback to email if GMC missing (though GMC is preferred)
            const identifier = supervisor.gmcNumber;
            const email = supervisor.email;

            if (!isSupabaseConfigured || !supabase || (!identifier && !email)) return;

            setIsLoading(true);
            try {
                // Fetch evidence where supervisor_gmc matches OR supervisor_email matches
                const supervisorId = (supervisor as any).id; // Try to get the UUID

                let filter = '';
                const conditions = [];
                if (identifier) conditions.push(`supervisor_gmc.eq.${identifier}`);
                if (email) conditions.push(`supervisor_email.ilike.${email}`); // ilike for case-insensitivity
                if (supervisorId) {
                    conditions.push(`signed_off_by.eq.${supervisorId}`);
                    // Also check likely new column 'supervisor_id' for explicit assignment
                    conditions.push(`supervisor_id.eq.${supervisorId}`);
                }

                filter = conditions.join(',');

                console.log(`Fetching supervisor evidence for ${supervisor.name} (GMC: ${identifier}, Email: ${email}, ID: ${supervisorId})`);
                console.log(`Using filter: ${filter}`);

                const { data, error } = await supabase
                    .from('evidence')
                    .select('*')
                    .or(filter)
                    .order('event_date', { ascending: false });

                if (error) {
                    console.error('Supabase error fetching supervisor evidence:', error);
                    throw error;
                }

                console.log(`Fetched ${data?.length || 0} total evidence items for supervisor.`);

                if (data) {
                    const { mapRowToEvidenceItem } = await import('../utils/evidenceMapper');
                    const items = data.map(mapRowToEvidenceItem);

                    setSubmittedEvidence(items.filter(i => i.status === EvidenceStatus.Submitted));

                    // Be robust: handle 'COMPLETE' or 'SignedOff' statuses
                    setSignedOffEvidence(items.filter(i =>
                        i.status === EvidenceStatus.SignedOff || (i.status as string) === 'SignedOff'
                    ));
                }

                // Also fetch pending edit requests
                const { data: editRequestsData, error: editRequestsError } = await supabase
                    .from('edit_requests')
                    .select(`
                        *,
                        evidence:evidence_id(*),
                        trainee:trainee_id(name)
                    `)
                    .eq('supervisor_id', supervisorId)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                if (editRequestsError) {
                    console.error('Error fetching edit requests:', editRequestsError);
                } else {
                    console.log(`Fetched ${editRequestsData?.length || 0} pending edit requests`);
                    setEditRequests(editRequestsData || []);
                }
            } catch (err) {
                console.error("Error fetching supervisor evidence:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupervisorEvidence();
    }, [supervisor.gmcNumber]);

    // Derived Filters
    const uniqueTrainees = useMemo(() => { // This would ideally use names, but we might only have IDs if not joined
        // For now we might depend on logic that evidence items *should* have traineeName embedded if we join? 
        // The current evidence fetch is raw evidence table. It doesn't join user_profile.
        // However, EvidenceItem has no 'traineeName' field in types.ts? 
        // Let's check types.ts... mapped item might not have trainee name.
        // Ideally we should join to get trainee name. 
        // For this pilot, if we don't have trainee name, we might just filter by ID or show ID.
        // Let's assume we can't filter by name easily without a join.
        // Actually, let's try to get distinct trainee_ids and maybe fetch profiles or map them if we have them in parent dashboard.
        // For simplicity -> No Trainee Name filter for now unless we do a join.
        // Wait, the prompt asked for "Trainee" filter. 
        // We can try to use 'traineeId' for now, or fetch profile map.
        return Array.from(new Set(signedOffEvidence.map(i => i.traineeId).filter(Boolean)));
    }, [signedOffEvidence]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        signedOffEvidence.forEach(item => {
            if (item.date) {
                years.add(new Date(item.date).getFullYear().toString());
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [signedOffEvidence]);

    const filteredSignedOff = useMemo(() => {
        return signedOffEvidence.filter(item => {
            const yearMatch = filterYear === 'All' || (item.date && new Date(item.date).getFullYear().toString() === filterYear);
            const typeMatch = filterType === 'All' || item.type === filterType;
            // const traineeMatch = filterTrainee === 'All' || item.traineeId === filterTrainee; // Re-enable if we have a way to map IDs to names in UI
            const searchMatch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.type && item.type.toLowerCase().includes(searchQuery.toLowerCase()));

            return yearMatch && typeMatch && searchMatch;
        });
    }, [signedOffEvidence, filterYear, filterType, searchQuery]);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* 1. Submitted Evidence (Awaiting Action) */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <ClipboardCheck size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Awaiting Your Sign Off</h2>
                        <p className="text-sm text-slate-500">Evidence submitters are waiting for your review.</p>
                    </div>
                    {(submittedEvidence.length > 0 || editRequests.length > 0) && (
                        <span className="ml-auto px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                            {submittedEvidence.length + editRequests.length} pending
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">Loading pending items...</div>
                ) : (
                    <div className="space-y-4">
                        {/* Edit Requests */}
                        {editRequests.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-orange-500" />
                                    Edit Requests
                                </h3>
                                <div className="space-y-2">
                                    {editRequests.map(request => (
                                        <GlassCard
                                            key={request.id}
                                            className="p-4 cursor-pointer hover:border-orange-300 transition-all"
                                            onClick={() => {
                                                // Call the callback to show edit request dialog
                                                if (onShowEditRequest) {
                                                    onShowEditRequest(request.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                            EDIT REQUEST
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {request.evidence?.title || 'Unknown Evidence'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mb-2">
                                                        <span className="font-medium">{request.trainee?.name || 'Trainee'}</span> requested to edit this {request.evidence?.type}
                                                    </p>
                                                    <p className="text-xs text-slate-500 italic">"{request.reason}"</p>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(request.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submitted Evidence */}
                        {submittedEvidence.length > 0 && (
                            <div>
                                {editRequests.length > 0 && (
                                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <ClipboardCheck size={16} className="text-blue-500" />
                                        New Submissions
                                    </h3>
                                )}
                                <EvidenceListTable
                                    evidence={submittedEvidence}
                                    profile={{} as UserProfile}
                                    isSupervisorView={true}
                                    onViewItem={onViewEvidence}
                                />
                            </div>
                        )}

                        {/* Empty State */}
                        {submittedEvidence.length === 0 && editRequests.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                                    <CheckCircle2 size={24} />
                                </div>
                                <p className="text-slate-500 font-medium">You're all caught up!</p>
                                <p className="text-xs text-slate-400">No evidence items or edit requests currently pending.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* 2. Signed Off Evidence (History) */}
            <section className="pt-8 border-t border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Sign Off History</h2>
                        <p className="text-sm text-slate-500">Record of assessments you have completed.</p>
                    </div>
                </div>

                <GlassCard className="p-1 mb-4 flex flex-col md:flex-row gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-100">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-300"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1 overflow-x-auto">
                        {/* Year Filter */}
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Years</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Types</option>
                            {Object.values(EvidenceType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {/* Trainee Filter (Placeholder until join logic implemented) 
             <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 outline-none hover:bg-slate-100 transition-colors opacity-50 cursor-not-allowed">
               <option>All Trainees</option>
             </select>
             */}
                    </div>
                </GlassCard>

                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">Loading history...</div>
                ) : filteredSignedOff.length > 0 ? (
                    <EvidenceListTable
                        evidence={filteredSignedOff}
                        profile={{} as UserProfile}
                        isSupervisorView={true}
                        onViewItem={onViewEvidence}
                    />
                ) : (
                    <div className="py-12 text-center text-slate-400 italic">No signed off records found matching filters.</div>
                )}
            </section>

        </div>
    );
};
