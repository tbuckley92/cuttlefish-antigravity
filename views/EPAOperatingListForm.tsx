import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ChevronLeft, CheckCircle2, Save, Info, Mail, ShieldCheck } from '../components/Icons';
import { EvidenceType, EvidenceStatus, EvidenceItem } from '../types';
import { SPECIALTIES } from '../constants';

interface EPAOperatingListFormProps {
    id?: string;
    initialSubspecialty?: string;
    initialSupervisorName?: string;
    initialSupervisorEmail?: string;
    initialStatus?: EvidenceStatus;
    originView?: any;
    originFormParams?: any;
    onBack: () => void;
    onSubmitted: () => void;
    onSave: (item: Partial<EvidenceItem>) => void;
    allEvidence?: EvidenceItem[];
}

// Operating list criteria from operating_list_epa_l4.csv
const OPERATING_LIST_CRITERIA = [
    'Creating an appropriate operating list',
    'Review of case notes',
    'Consent and marking surgical site',
    'Review of patients',
    'Successful surgical management',
    'Medical record completion',
    'Post-operative review',
    'Debrief at completion list',
    'Communication with patient',
    'Communication with nursing and other medical staff'
];

const ENTRUSTMENT_LEVELS = [
    'Unable to do',
    'Can do with direct supervision',
    'Can do with indirect supervision',
    'Can do unsupervised',
    'Can supervise others'
];

const RATING_OPTIONS = [
    'Concern',
    'Borderline',
    'Competent',
    'Excellent'
];

const EPAOperatingListForm: React.FC<EPAOperatingListFormProps> = ({
    id,
    initialSubspecialty,
    initialSupervisorName,
    initialSupervisorEmail,
    initialStatus = EvidenceStatus.Draft,
    originView,
    originFormParams,
    onBack,
    onSubmitted,
    onSave,
    allEvidence = []
}) => {
    const [subspecialty, setSubspecialty] = useState(initialSubspecialty || '');
    const [supervisorName, setSupervisorName] = useState(initialSupervisorName || '');
    const [supervisorEmail, setSupervisorEmail] = useState(initialSupervisorEmail || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<EvidenceStatus>(initialStatus);

    // Form data
    const [ratings, setRatings] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [entrustment, setEntrustment] = useState('');

    const [isSignOffOpen, setIsSignOffOpen] = useState(false);

    const isLocked = status === EvidenceStatus.SignedOff || status === EvidenceStatus.Submitted;
    const isReadOnly = isLocked || (!!originFormParams && !!id);

    // Determine if form came from COMPLETE EPA button
    const hasOriginContext = !!originFormParams && !id;
    const backButtonText = hasOriginContext ? 'Back to EPA' : 'Back';

    // Load existing form data
    useEffect(() => {
        if (id && allEvidence) {
            const existing = allEvidence.find(e => e.id === id && e.type === EvidenceType.EPAOperatingList);
            if (existing?.epaOperatingListFormData) {
                setSubspecialty(existing.epaOperatingListFormData.subspecialty || '');
                setRatings(existing.epaOperatingListFormData.ratings || {});
                setComments(existing.epaOperatingListFormData.comments || {});
                setEntrustment(existing.epaOperatingListFormData.entrustment || '');
                setSupervisorName(existing.epaOperatingListFormData.supervisorName || '');
                setSupervisorEmail(existing.epaOperatingListFormData.supervisorEmail || '');
                setDate(existing.date);
                setStatus(existing.status);
            }
        }
    }, [id, allEvidence]);

    // Auto-save
    useEffect(() => {
        if (!isReadOnly) {
            const autoSaveTimer = setTimeout(() => {
                saveToParent();
            }, 2000);
            return () => clearTimeout(autoSaveTimer);
        }
    }, [subspecialty, supervisorName, supervisorEmail, ratings, comments, entrustment]);

    const saveToParent = (overrideStatus?: EvidenceStatus) => {
        const formData: Partial<EvidenceItem> = {
            id,
            type: EvidenceType.EPAOperatingList,
            title: `EPA Operating List${subspecialty ? ` - ${subspecialty}` : ''}`,
            date,
            status: overrideStatus || status,
            epaOperatingListFormData: {
                subspecialty,
                ratings,
                comments,
                entrustment,
                supervisorName,
                supervisorEmail
            }
        };
        onSave(formData);
    };

    const handleSaveDraft = () => {
        saveToParent(EvidenceStatus.Draft);
        alert("Draft saved");
    };

    const handleEmailForm = () => {
        if (!supervisorName || !supervisorEmail) {
            alert("Please provide supervisor name and email.");
            return;
        }
        if (!subspecialty) {
            alert('Please select a subspecialty');
            return;
        }

        setStatus(EvidenceStatus.Submitted);
        saveToParent(EvidenceStatus.Submitted);
        alert("Form emailed to supervisor");
        onSubmitted();
    };

    const handleRatingChange = (criterionIndex: number, rating: string) => {
        setRatings(prev => ({ ...prev, [criterionIndex]: rating }));
    };

    const handleCommentChange = (criterionIndex: number, comment: string) => {
        setComments(prev => ({ ...prev, [criterionIndex]: comment }));
    };

    const handleSubmit = () => {
        if (!subspecialty) {
            alert('Please select a subspecialty');
            return;
        }
        if (!supervisorName || !supervisorEmail) {
            alert('Please enter supervisor details');
            return;
        }
        if (!entrustment) {
            alert('Please select an entrustment level');
            return;
        }

        // Check all criteria have ratings
        const missingRatings = OPERATING_LIST_CRITERIA.filter((_, idx) => !ratings[idx]);
        if (missingRatings.length > 0) {
            alert('Please rate all criteria');
            return;
        }

        setIsSignOffOpen(true);
    };

    const confirmSignOff = () => {
        const formData: Partial<EvidenceItem> = {
            id: id || Math.random().toString(36).substr(2, 9),
            type: EvidenceType.EPAOperatingList,
            title: `EPA Operating List - ${subspecialty}`,
            date,
            status: EvidenceStatus.Submitted,
            epaOperatingListFormData: {
                subspecialty,
                ratings,
                comments,
                entrustment,
                supervisorName,
                supervisorEmail
            }
        };

        onSave(formData);
        setIsSignOffOpen(false);
        onSubmitted();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Top Bar */}
            {hasOriginContext && (
                <div className="fixed top-0 left-0 right-0 z-40 px-6 py-4 backdrop-blur-xl bg-purple-600/10 dark:bg-purple-900/40 border-b border-purple-500/20">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-purple-700 dark:text-purple-200 font-medium">
                            Creating EPA Operating List for linkage • You'll return to your EPA form after submission
                        </p>
                    </div>
                </div>
            )}

            <div className={`max-w-7xl mx-auto p-6 ${hasOriginContext ? 'mt-16' : ''}`}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-slate-600 dark:text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            EPA Operating List
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-white/40">
                            Document management of subspecialty operating lists
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    {/* Left Column - Metadata */}
                    <div className="space-y-4">
                        <GlassCard className="p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-4">
                                Form Details
                            </h3>

                            {/* Subspecialty */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                    Subspecialty *
                                </label>
                                <select
                                    value={subspecialty}
                                    onChange={(e) => setSubspecialty(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                                >
                                    <option value="">Select subspecialty...</option>
                                    {SPECIALTIES.filter(s => s !== 'No attached SIA').map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Supervisor */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                    Supervisor Name *
                                </label>
                                <input
                                    type="text"
                                    value={supervisorName}
                                    onChange={(e) => setSupervisorName(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="Enter supervisor name"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                    Supervisor Email *
                                </label>
                                <input
                                    type="email"
                                    value={supervisorEmail}
                                    onChange={(e) => setSupervisorEmail(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="supervisor@hospital.nhs.uk"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                    Status
                                </label>
                                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${status === EvidenceStatus.SignedOff
                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                    : status === EvidenceStatus.Submitted
                                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}>
                                    {status}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Submit Button Removed - Moved to bottom */}
                    </div>

                    {/* Right Column - Form Content */}
                    <div className="space-y-6">
                        {/* Section A: Operating List Management */}
                        <GlassCard className="p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                Section A: Operating List Management
                            </h2>

                            <div className="space-y-6">
                                {OPERATING_LIST_CRITERIA.map((criterion, idx) => (
                                    <div key={idx} className="border-b border-slate-200 dark:border-white/10 pb-4 last:border-0">
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-white/80 mb-3">
                                            {idx + 1}. {criterion}
                                        </h3>

                                        {/* Rating */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                                Rating *
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {RATING_OPTIONS.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => !isReadOnly && handleRatingChange(idx, option)}
                                                        disabled={isReadOnly}
                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${ratings[idx] === option
                                                            ? 'bg-cyan-500 text-white border-2 border-cyan-600'
                                                            : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:border-cyan-400'
                                                            } disabled:opacity-50`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Comments */}
                                        {(ratings[idx] === 'Concern' || ratings[idx] === 'Borderline' || comments[idx]) && (
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2">
                                                    Comments
                                                </label>
                                                <textarea
                                                    value={comments[idx] || ''}
                                                    onChange={(e) => !isReadOnly && handleCommentChange(idx, e.target.value)}
                                                    disabled={isReadOnly}
                                                    placeholder="Add comments..."
                                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Section B: Entrustment */}
                        <GlassCard className="p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                Section B: Entrustment
                            </h2>

                            <div className="mb-4">
                                <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/20">
                                    <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Based on today's performance, what level of supervision would you recommend for this trainee managing an operating list?
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {ENTRUSTMENT_LEVELS.map(level => (
                                        <button
                                            key={level}
                                            onClick={() => !isReadOnly && setEntrustment(level)}
                                            disabled={isReadOnly}
                                            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${entrustment === level
                                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                                                : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                                } disabled:opacity-50`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Action Buttons */}
                        {!isReadOnly && (
                            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                                <button
                                    onClick={handleSaveDraft}
                                    className="h-12 px-6 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                                >
                                    <Save size={18} /> <span>SAVE DRAFT</span>
                                </button>

                                <button
                                    onClick={handleEmailForm}
                                    className="h-12 px-6 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
                                >
                                    <Mail size={18} /> <span>EMAIL FORM</span>
                                </button>

                                <button
                                    onClick={handleSubmit} // Using handleSubmit which calls setIsSignOffOpen
                                    className="h-12 px-6 rounded-xl bg-green-600 text-white text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2"
                                >
                                    <ShieldCheck size={18} /> <span>IN PERSON SIGN OFF</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sign-off Dialog */}
            {isSignOffOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-slate-900">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Confirm Submission
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                            Are you ready to submit this EPA Operating List for sign-off? Once submitted, it cannot be edited.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmSignOff}
                                className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm uppercase tracking-widest shadow-xl shadow-cyan-600/30 hover:bg-cyan-500 transition-all"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setIsSignOffOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default EPAOperatingListForm;
