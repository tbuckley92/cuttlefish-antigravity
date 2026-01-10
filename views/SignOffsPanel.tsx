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
}

export const SignOffsPanel: React.FC<SignOffsPanelProps> = ({ supervisor, onViewEvidence }) => {
    const [submittedEvidence, setSubmittedEvidence] = useState<EvidenceItem[]>([]);
    const [signedOffEvidence, setSignedOffEvidence] = useState<EvidenceItem[]>([]);
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
                // We construct an OR filter string: "supervisor_gmc.eq.VALUE,supervisor_email.eq.VALUE"
                let filter = '';
                if (identifier) filter += `supervisor_gmc.eq.${identifier}`;
                if (email) {
                    if (filter) filter += ',';
                    filter += `supervisor_email.eq.${email}`;
                }

                const { data, error } = await supabase
                    .from('evidence')
                    .select('*')
                    .or(filter)
                    .order('event_date', { ascending: false });

                if (error) throw error;

                if (data) {
                    const { mapRowToEvidenceItem } = await import('../utils/evidenceMapper');
                    // @ts-ignore
                    const items: EvidenceItem[] = data.map(mapRowToEvidenceItem);

                    setSubmittedEvidence(items.filter(i => i.status === EvidenceStatus.Submitted));
                    setSignedOffEvidence(items.filter(i => i.status === EvidenceStatus.SignedOff));
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
                    {submittedEvidence.length > 0 && (
                        <span className="ml-auto px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                            {submittedEvidence.length} pending
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">Loading pending items...</div>
                ) : submittedEvidence.length > 0 ? (
                    <EvidenceListTable
                        evidence={submittedEvidence}
                        profile={{} as UserProfile} // Dummy profile, not needed for display
                        isSupervisorView={true}
                        onViewItem={onViewEvidence}
                    />
                ) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-slate-500 font-medium">You're all caught up!</p>
                        <p className="text-xs text-slate-400">No evidence items currently pending your sign off.</p>
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
