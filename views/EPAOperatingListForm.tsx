import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Trash2, AlertCircle, Save, CheckCircle2, ChevronDown, ChevronUp, Plus, X, ChevronLeft, Mail, ShieldCheck } from '../components/Icons';
import { uuidv4 } from '../utils/uuid';
import { SignOffDialog } from '../components/SignOffDialog';
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
    traineeName?: string;
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
    'Observing',
    'Needs Direct Supervision',
    'Needs Indirect Supervision',
    'Competent to this level'
];

const RATING_OPTIONS = [
    'MAJOR CONCERNS',
    'MINOR CONCERNS',
    'MEETS EXPECTATIONS',
    'N/A'
];

const EPAOperatingListForm: React.FC<EPAOperatingListFormProps> = ({
    id,
    initialSubspecialty,
    initialSupervisorName,
    initialSupervisorEmail,
    initialStatus = EvidenceStatus.Draft,
    originView,
    originFormParams,
    traineeName,
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
    const [aspectsEspeciallyGood, setAspectsEspeciallyGood] = useState('');

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
                setAspectsEspeciallyGood(existing.epaOperatingListFormData.aspectsEspeciallyGood || '');
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
    }, [subspecialty, supervisorName, supervisorEmail, ratings, comments, entrustment, aspectsEspeciallyGood]);

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
                aspectsEspeciallyGood,
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

    const handleMarkAllMeets = () => {
        if (isReadOnly) return;
        const newRatings: Record<string, string> = {};
        OPERATING_LIST_CRITERIA.forEach((_, idx) => {
            newRatings[idx] = 'MEETS EXPECTATIONS';
        });
        setRatings(newRatings);
        // Clear all comments
        setComments({});
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
        if (!aspectsEspeciallyGood) {
            alert('Please enter aspects which were especially good');
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

    const confirmSignOff = (gmc: string, name: string, email: string, signature: string) => {
        setSupervisorName(name);
        setSupervisorEmail(email);
        const formData: Partial<EvidenceItem> = {
            id: id || uuidv4(),
            type: EvidenceType.EPAOperatingList,
            title: `EPA Operating List - ${subspecialty}`,
            date,
            status: EvidenceStatus.SignedOff,
            supervisorGmc: gmc,
            supervisorName: name,
            supervisorEmail: email,
            epaOperatingListFormData: {
                subspecialty,
                ratings,
                comments,
                entrustment,
                aspectsEspeciallyGood,
                supervisorName: name,
                supervisorEmail: email
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
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Section A: Operating List Management
                                </h2>
                                {!isReadOnly && (
                                    <button
                                        onClick={handleMarkAllMeets}
                                        className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-all"
                                    >
                                        MARK ALL AS MEETS EXPECTATIONS
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {OPERATING_LIST_CRITERIA.map((criterion, idx) => (
                                    <div key={idx} className="border-b border-slate-200 dark:border-white/10 pb-4 last:border-0">
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-white/80 mb-3">
                                            {idx + 1}. {criterion}
                                        </h3>

                                        {/* Rating */}
                                        <div className="mb-3">
                                            <div className="flex flex-wrap gap-2">
                                                {RATING_OPTIONS.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => !isReadOnly && handleRatingChange(idx, option)}
                                                        disabled={isReadOnly}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${ratings[idx] === option
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/10'
                                                            } disabled:opacity-50`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Comments */}
                                        {(ratings[idx] === 'MAJOR CONCERNS' || ratings[idx] === 'MINOR CONCERNS' || comments[idx]) && (
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
                        <GlassCard className="p-6 border-indigo-500/20 bg-indigo-500/[0.02]">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-widest">
                                Section B: Entrustment
                            </h2>
                            <p className="text-xs text-slate-500 mb-6">Based on my observations and the evidence indicated I consider that the overall level of entrustment for this trainee is</p>

                            <div className="space-y-3 mb-6">
                                {ENTRUSTMENT_LEVELS.map(level => (
                                    <label
                                        key={level}
                                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${entrustment === level
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="entrustment"
                                            className="hidden"
                                            disabled={isReadOnly}
                                            checked={entrustment === level}
                                            onChange={() => setEntrustment(level)}
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${entrustment === level ? 'border-white' : 'border-slate-300 dark:border-white/20'}`}>
                                            {entrustment === level && <div className="w-2.5 h-2.5 rounded-full bg-white animate-in zoom-in-50"></div>}
                                        </div>
                                        <span className="text-sm font-semibold">{level}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
                                        Please note any aspects which were especially good: <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        disabled={isReadOnly}
                                        value={aspectsEspeciallyGood}
                                        onChange={(e) => setAspectsEspeciallyGood(e.target.value)}
                                        className="w-full min-h-[100px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                                        placeholder="Enter aspects which were especially good..."
                                    />
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
                    {/* Read-Only Close View Action */}
                    {isReadOnly && (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 flex justify-end z-50">
                            <div className="max-w-7xl mx-auto w-full flex justify-end">
                                <button
                                    onClick={onBack}
                                    className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg"
                                >
                                    CLOSE VIEW
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Spacing for fixed bottom bar */}
                    {isReadOnly && <div className="h-20" />}
                </div>
            </div>

            <SignOffDialog
                isOpen={isSignOffOpen}
                onClose={() => setIsSignOffOpen(false)}
                onConfirm={confirmSignOff}
                formInfo={{
                    type: "EPA Operating List",
                    traineeName: traineeName || 'Trainee',
                    date: date,
                    supervisorName: supervisorName || "Supervisor",
                    supervisorEmail: supervisorEmail
                }}
            />
        </div>
    );
};

export default EPAOperatingListForm;
