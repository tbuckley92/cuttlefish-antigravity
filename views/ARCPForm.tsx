import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { ArrowLeft, Download, ShieldCheck, User, Calendar, FileText, CheckCircle2 } from '../components/Icons';
import { ARCPOutcomeData, ARCPOutcomeStatus, ARCPOutcome } from '../types';
// import { generateEvidencePDF, generatePDFBlob } from '../utils/pdfGenerator';

interface ARCPFormProps {
    initialData: any; // Using any to handle the evidence.data structure which matches ARCPOutcomeData
    onBack: () => void;
    traineeName?: string;
    canEdit?: boolean;
    initialEditMode?: boolean;
}

import { supabase } from '../utils/supabaseClient';

export const ARCPForm: React.FC<ARCPFormProps> = ({ initialData, onBack, traineeName, canEdit = false, initialEditMode = false }) => {
    // Cast initialData to ARCPOutcomeData shape
    const [data, setData] = React.useState<ARCPOutcomeData | null>(initialData as ARCPOutcomeData);
    const [isEditing, setIsEditing] = React.useState(initialEditMode);
    const [saving, setSaving] = React.useState(false);

    // Form state
    const [formData, setFormData] = React.useState({
        outcome: data?.outcome || ARCPOutcome.Outcome1,
        panelComments: data?.panelComments || '',
        gradeAssessed: data?.gradeAssessed || '',
        nextTrainingGrade: data?.nextTrainingGrade || '',
        lockDate: data?.lockDate || new Date().toISOString().split('T')[0],
        panelReviewDate: data?.panelReviewDate || new Date().toISOString().split('T')[0],
        chairName: data?.chairName || ''
    });

    React.useEffect(() => {
        if (initialData) {
            setData(initialData as ARCPOutcomeData);
            setFormData({
                outcome: initialData.outcome || ARCPOutcome.Outcome1,
                panelComments: initialData.panelComments || '',
                gradeAssessed: initialData.gradeAssessed || '',
                nextTrainingGrade: initialData.nextTrainingGrade || '',
                lockDate: initialData.lockDate || new Date().toISOString().split('T')[0],
                panelReviewDate: initialData.panelReviewDate || new Date().toISOString().split('T')[0],
                chairName: initialData.chairName || ''
            });
        }
    }, [initialData]);

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            // Update arcp_outcome table
            // We need to find the record by evidence_id or ID. ARCPOutcomeData has 'id' which might be outcome ID or evidence ID?
            // The mapping puts evidence ID in 'id'. 
            // BUT arcp_outcome has its own ID.
            // We can query arcp_outcome by evidence_id = data.id

            // 1. Update Evidence data column
            const updatedData = {
                ...data,
                ...formData
            };

            const { error: evidenceError } = await supabase
                .from('evidence')
                .update({
                    data: updatedData,
                    title: `${data.reviewType || 'ARCP'} - ${formData.outcome}`, // Update title in case outcome changed
                    updated_at: new Date().toISOString()
                })
                .eq('id', data.id); // data.id is evidence ID from mapper

            if (evidenceError) throw evidenceError;

            // 2. Update arcp_outcome table
            const { error: outcomeError } = await supabase
                .from('arcp_outcome')
                .update({
                    outcome: formData.outcome,
                    panel_comments: formData.panelComments,
                    grade_assessed: formData.gradeAssessed,
                    next_training_grade: formData.nextTrainingGrade,
                    chair_name: formData.chairName,
                    lock_date: formData.lockDate,
                    panel_review_date: formData.panelReviewDate
                })
                .eq('evidence_id', data.id);

            if (outcomeError) throw outcomeError;

            setData(updatedData);
            setIsEditing(false);
            // alert('Saved successfully'); // Optional, or just switch mode
        } catch (err) {
            console.error('Error save outcome:', err);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!data) {
        return (
            <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-4">
                    Error: Outcome data not found.
                </div>
                <button
                    onClick={onBack}
                    className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Helper to format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleDownloadPDF = async () => {
        // Create a dummy evidence item structure for the PDF generator
        const dummyEvidence = {
            id: data.id || 'temp',
            title: `${data.reviewType || 'ARCP'} - ${data.outcome}`,
            date: data.lockDate, // Use lock date as event date
            type: data.reviewType === 'Interim Review' ? 'ARCP Interim Review' : 'ARCP Full Review',
            data: data,
            status: data.status === 'CONFIRMED' ? 'SignedOff' : 'Draft',
            // Add other required fields with defaults
            level: 0,
            sia: 'N/A'
        };

        // Note: In a real implementation, we might want a specific PDF generator for ARCP outcomes
        // For now, we reuse the existing one or alert if not available
        try {
            // Check if generateEvidencePDF supports this structure or if we need a custom one.
            // The existing generateEvidencePDF takes (item, profile, allEvidence).
            // We might not have profile/allEvidence here easily. 
            // For now, let's just alert or log as this is an enhancement.
            // Actually, let's make it robust by checking imports. 
            // The user requested table has download buttons, this form should too.
            // We can implement a simple print or rely on the table's download function.
            alert("Please download the official PDF from the ARCP Outcomes table.");
        } catch (e) {
            console.error(e);
            alert("Error downloading PDF");
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    type="button"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                        {data.reviewType || 'ARCP Review'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-white/40">
                        {formatDate(data.lockDate)} {data.status === ARCPOutcomeStatus.Pending && `• ${data.status}`}
                    </p>
                </div>
                {/* Status Badge */}
                {data.status === ARCPOutcomeStatus.Pending && (
                    <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-amber-100 text-amber-700 border-amber-200">
                        Pending
                    </div>
                )}

                {/* Edit Actions */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 transition-colors"
                            title="Edit Outcome"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                    )}
                    {isEditing && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Trainee & Review Details */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <User size={20} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Trainee Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Trainee Name</label>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{data.traineeName || traineeName || 'N/A'}</div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Date of panel review</label>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={formData.panelReviewDate}
                                        onChange={e => setFormData({ ...formData, panelReviewDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                    />
                                ) : formatDate(data.panelReviewDate)}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">AUTO-CONFIRM OUTCOME ON</label>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={formData.lockDate}
                                        onChange={e => setFormData({ ...formData, lockDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                    />
                                ) : formatDate(data.lockDate)}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Grade Assessed</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.gradeAssessed}
                                    onChange={e => setFormData({ ...formData, gradeAssessed: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                />
                            ) : (
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{data.gradeAssessed}</div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Next Training Grade</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.nextTrainingGrade}
                                    onChange={e => setFormData({ ...formData, nextTrainingGrade: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                />
                            ) : (
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{data.nextTrainingGrade}</div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Outcome Decision */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Panel Decision</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Outcome</label>
                            {isEditing ? (
                                <select
                                    value={formData.outcome}
                                    onChange={e => setFormData({ ...formData, outcome: e.target.value as ARCPOutcome })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                                >
                                    {Object.values(ARCPOutcome).map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.outcome}</div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Panel Comments</label>
                            {isEditing ? (
                                <textarea
                                    value={formData.panelComments}
                                    onChange={e => setFormData({ ...formData, panelComments: e.target.value })}
                                    className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-y"
                                />
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {data.panelComments || 'No comments provided.'}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                            <div className="text-xs text-slate-500">Panel Chair:</div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.chairName}
                                    onChange={e => setFormData({ ...formData, chairName: e.target.value })}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                    placeholder="Enter Chair Name"
                                />
                            ) : (
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{data.chairName || 'Not recorded'}</div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* 3. Linked EPAs */}
                {data.currentArcpEpas && data.currentArcpEpas.length > 0 && (
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <FileText size={20} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Current ARCP EPAs</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {data.currentArcpEpas.map((epaId, idx) => (
                                <div key={idx} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <CheckCircle2 size={12} className="text-green-500" />
                                    <span>Evidence #{epaId.substring(0, 8)}...</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div >
    );
};

export default ARCPForm;
