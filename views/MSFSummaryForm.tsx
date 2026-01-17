import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
    ArrowLeft, Users, BarChart2, MessageSquare, CheckCircle2,
    ShieldCheck, Clock, AlertCircle
} from '../components/Icons';
import { MSFRespondent, EvidenceItem, EvidenceStatus, EvidenceType } from '../types';
import { supabase } from '../utils/supabaseClient';
import { uuidv4 } from '../utils/uuid';

interface MSFSummaryFormProps {
    evidence: EvidenceItem;
    traineeName: string;
    onBack: () => void;
    onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
    isSupervisor?: boolean;
}

// MSF Response Statements (same as in MSFResponseForm)
const STATEMENTS = [
    "Follows local guidelines on general cleanliness and avoidance of cross infection.",
    "Communicates well with patients, listening actively, and ensuring that clinical information is communicated honestly and in a way that is comprehensible to the patient.",
    "Obtains valid consent in an appropriate manner, ensuring that both risks and benefits are understood by patients.",
    "Communicates potentially upsetting information in an appropriate and sensitive manner.",
    "Communicates well with colleagues, both clinical and non‑clinical.",
    "Dictates letters clearly, and responds to administrative queries promptly.",
    "Complies with local policies for the approval of leave and makes appropriate arrangements for cover if unable to work because of sickness or other reasons.",
    "Shows appropriate empathy and compassion for patients.",
    "Respects the confidential nature of clinical information obtained from patients, and shows awareness of relevant principles.",
    "Works within the limits of their clinical competence, and seeks help/advice when appropriate.",
    "Treats all patients and colleagues with respect, avoiding discrimination; prioritises tasks appropriately and copes well when under stress."
];

const RESPONSE_OPTIONS = [
    "They perform to a high standard in this area of practice.",
    "I have no concerns in this area of practice.",
    "I have some concerns in this area of practice.",
    "Not applicable (if you are unable to respond to any particular statement)."
];

const OPTION_COLORS = [
    'bg-emerald-500',  // High standard
    'bg-blue-500',     // No concerns
    'bg-amber-500',    // Some concerns
    'bg-slate-400'     // N/A
];

const OPTION_SHORT_LABELS = [
    'High standard',
    'No concerns',
    'Some concerns',
    'N/A'
];

const ROLES = [
    'Consultant',
    'Trainee/Fellow',
    'Senior nurse, theatre',
    'Senior nurse, OPD',
    'Outpatient staff',
    'Medical secretary'
] as const;

export const MSFSummaryForm: React.FC<MSFSummaryFormProps> = ({
    evidence,
    traineeName,
    onBack,
    onSave,
    isSupervisor = false
}) => {
    const [supervisorComments, setSupervisorComments] = useState(
        evidence?.data?.supervisorComments || ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check both locations for respondents (top-level or in data object)
    const respondents = evidence?.msfRespondents || evidence?.data?.msfRespondents || [];
    const completedRespondents = respondents.filter(r => r.status === 'Completed');
    const isLocked = evidence?.status === EvidenceStatus.SignedOff;

    // Aggregate responses by question
    const responseAggregation = useMemo(() => {
        return STATEMENTS.map((statement, qIndex) => {
            const counts: Record<string, number> = {};
            const comments: string[] = [];

            RESPONSE_OPTIONS.forEach(opt => { counts[opt] = 0; });

            completedRespondents.forEach(r => {
                const response = r.response;
                if (response?.selections?.[qIndex]) {
                    counts[response.selections[qIndex]] = (counts[response.selections[qIndex]] || 0) + 1;
                }
                if (response?.comments?.[qIndex]) {
                    comments.push(response.comments[qIndex]);
                }
            });

            return { statement, counts, comments };
        });
    }, [completedRespondents]);

    // Get all overall comments
    const overallComments = useMemo(() => {
        return completedRespondents
            .map(r => r.response?.overallComments)
            .filter(Boolean) as string[];
    }, [completedRespondents]);

    // Role summary
    const roleSummary = useMemo(() => {
        return ROLES.map(role => ({
            role,
            count: completedRespondents.filter(r => r.role === role).length,
            total: respondents.filter(r => r.role === role && r.inviteSent).length
        }));
    }, [respondents, completedRespondents]);

    const handleSignOff = async () => {
        if (!window.confirm('Are you sure you want to sign off this MSF? This action cannot be undone.')) {
            return;
        }

        setIsSubmitting(true);

        try {
            await onSave({
                id: evidence.id,
                title: evidence.title,
                status: EvidenceStatus.SignedOff,
                type: EvidenceType.MSF,
                msfRespondents: respondents, // Preserve at top level
                data: {
                    ...evidence.data,
                    supervisorComments,
                },
                supervisorComments, // Redundant but safe for some access patterns
                signedOffAt: new Date().toISOString(),
                linkedEvidence: evidence.linkedEvidence || evidence.data?.linkedEvidence || {}
            });

            // Create notification for trainee
            if (supabase && evidence.traineeId) {
                await supabase.from('notifications').insert({
                    id: uuidv4(),
                    user_id: evidence.traineeId,
                    role_context: 'trainee',
                    type: 'msf_signed',
                    title: 'MSF Signed Off',
                    body: 'Your Multi-Source Feedback has been reviewed and signed off by your supervisor.',
                    reference_id: evidence.id,
                    created_at: new Date().toISOString()
                });
            }

            alert('MSF signed off successfully. The trainee has been notified.');
        } catch (err) {
            console.error('Error signing off MSF:', err);
            alert('Failed to sign off MSF. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalResponses = completedRespondents.length;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Multi-Source Feedback Summary
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-white/50">
                        {traineeName} • {evidence.date}
                    </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${isLocked
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                    {evidence.status}
                </span>
            </div>

            {/* Respondent Summary */}
            <GlassCard className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Respondent Summary
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-white/50">
                            {totalResponses} responses received
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {roleSummary.map(({ role, count, total }) => (
                        <div key={role} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">{role}</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {count} <span className="text-sm font-normal text-slate-400">/ {total}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Response Histograms */}
            <GlassCard className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <BarChart2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Response Analysis
                    </h2>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-white/10">
                    {OPTION_SHORT_LABELS.map((label, idx) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-sm ${OPTION_COLORS[idx]}`} />
                            <span className="text-xs text-slate-600 dark:text-white/60">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    {responseAggregation.map((item, qIndex) => (
                        <div key={qIndex} className="space-y-2">
                            <p className="text-sm text-slate-700 dark:text-white/80">
                                <span className="font-bold text-slate-400 mr-2">{qIndex + 1}.</span>
                                {item.statement}
                            </p>

                            {/* Horizontal bar chart */}
                            <div className="h-6 flex rounded-lg overflow-hidden bg-slate-100 dark:bg-white/10">
                                {RESPONSE_OPTIONS.map((opt, optIdx) => {
                                    const count = item.counts[opt] || 0;
                                    const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                                    if (pct === 0) return null;
                                    return (
                                        <div
                                            key={opt}
                                            className={`${OPTION_COLORS[optIdx]} flex items-center justify-center transition-all`}
                                            style={{ width: `${pct}%` }}
                                            title={`${OPTION_SHORT_LABELS[optIdx]}: ${count}`}
                                        >
                                            {pct > 10 && (
                                                <span className="text-xs font-bold text-white">{count}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Comments for this question */}
                            {item.comments.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-white/10">
                                    {item.comments.map((comment, cIdx) => (
                                        <p key={cIdx} className="text-xs text-slate-500 dark:text-white/50 italic mb-1">
                                            "{comment}"
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Overall Comments */}
            {overallComments.length > 0 && (
                <GlassCard className="p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <MessageSquare size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Overall Feedback
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {overallComments.map((comment, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <p className="text-sm text-slate-700 dark:text-white/70 italic">"{comment}"</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Supervisor Comments & Sign Off */}
            {isSupervisor && (
                <GlassCard className="p-6 border-indigo-200 dark:border-indigo-500/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Supervisor Review
                        </h2>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
                            Supervisor Comments
                        </label>
                        <textarea
                            value={supervisorComments}
                            onChange={(e) => setSupervisorComments(e.target.value)}
                            disabled={isLocked}
                            placeholder="Add your comments and recommendations..."
                            className="w-full min-h-[120px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
                        />
                    </div>

                    {!isLocked && (
                        <button
                            onClick={handleSignOff}
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing Off...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Sign Off MSF
                                </>
                            )}
                        </button>
                    )}

                    {isLocked && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-700 dark:text-green-400">
                                This MSF has been signed off.
                            </p>
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Trainee View of Supervisor Comments (read-only, when signed off) */}
            {!isSupervisor && isLocked && supervisorComments && (
                <GlassCard className="p-6 border-green-200 dark:border-green-500/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Supervisor Review
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-white/50">
                                Signed off on {evidence.signedOffAt ? new Date(evidence.signedOffAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
                            Supervisor Comments
                        </p>
                        <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap">
                            {supervisorComments}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 mt-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                        <p className="text-sm text-green-700 dark:text-green-400">
                            This MSF has been reviewed and signed off by your supervisor.
                        </p>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

export default MSFSummaryForm;
