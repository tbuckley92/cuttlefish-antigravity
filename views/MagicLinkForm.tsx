import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { GlassCard } from '../components/GlassCard';
import { ShieldCheck, AlertCircle, CheckCircle2, Mail, X, FileText, Eye, Clock } from '../components/Icons';
import { validateMagicLinkToken, markMagicLinkUsed } from '../utils/emailUtils';
import { mapRowToEvidenceItem } from '../utils/evidenceMapper';
import { EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

// Import form components
import EPAForm from './EPAForm';
import CBDForm from './CBDForm';
import DOPsForm from './DOPsForm';
import OSATSForm from './OSATSForm';
import CRSForm from './CRSForm';
import GSATForm from './GSATForm';
import MARForm from './MARForm';
import ESRForm from './ESRForm';
import EPAOperatingListForm from './EPAOperatingListForm';
import { MSFResponseForm } from './MSFResponseForm';

interface MagicLinkFormProps {
    token: string;
    onComplete: () => void;
}

interface MagicLinkData {
    evidenceId: string;
    recipientEmail: string;
    formType: string;
    isValid: boolean;
    evidenceData?: EvidenceItem;
    linkedEvidence?: EvidenceItem[];
}

type ValidationState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'error';

const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ token, onComplete }) => {
    const [validationState, setValidationState] = useState<ValidationState>('loading');
    const [magicLinkData, setMagicLinkData] = useState<MagicLinkData | null>(null);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
    const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);

    // Validate the magic link on mount
    useEffect(() => {
        const validate = async () => {
            try {
                const result = await validateMagicLinkToken(token);
                console.log('Magic Link Validation Result:', result); // DEBUG LOG

                if (!result.valid) {
                    setValidationState('error');
                    setError(result.error || 'Failed to validate magic link');
                    return;
                }

                setMagicLinkData({
                    evidenceId: result.evidence?.id || '',
                    recipientEmail: result.recipientEmail || '',
                    formType: result.formType || '',
                    isValid: true,
                    evidenceData: result.evidence,
                    linkedEvidence: result.linkedEvidence
                        ? result.linkedEvidence.map((item: any) => mapRowToEvidenceItem(item))
                        : []
                });
                setValidationState('valid');
            } catch (err) {
                setValidationState('error');
                setError('An unexpected error occurred');
            }
        };

        validate();
    }, [token]);

    // Handle form submission (called by child form)
    const handleFormSubmit = async (formData: Partial<EvidenceItem>) => {
        if (!magicLinkData) return;

        setIsSubmitting(true);
        try {
            // Mark magic link as used - Handled by edge function
            // await markMagicLinkUsed(token);

            // The form component handles saving the data via its own save mechanism
            setIsComplete(true);
        } catch (err) {
            setError('Failed to submit form');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render loading state
    if (validationState === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <GlassCard className="p-8 max-w-md w-full text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Validating Access...
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-white/50">
                        Please wait while we verify your magic link.
                    </p>
                </GlassCard>
            </div>
        );
    }

    // Render invalid/error states
    if (validationState === 'invalid' || validationState === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <GlassCard className="p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Invalid Link
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
                        {error || 'This magic link is invalid or has expired.'}
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Go to Homepage
                    </button>
                </GlassCard>
            </div>
        );
    }

    // Render already used state
    if (validationState === 'used') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <GlassCard className="p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Form Already Completed
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
                        This form has already been signed off. If you need to make changes, please contact the trainee directly.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Go to Homepage
                    </button>
                </GlassCard>
            </div>
        );
    }

    // Render success state
    if (isComplete) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <GlassCard className="p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={32} className="text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Form Signed Off Successfully!
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
                        Thank you for completing this assessment. The trainee will be notified of your sign-off.
                    </p>
                    <button
                        onClick={onComplete}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                        Done
                    </button>
                </GlassCard>
            </div>
        );
    }

    // Render the appropriate form based on form type
    if (!magicLinkData) return null;

    const { formType, evidenceId, recipientEmail, evidenceData } = magicLinkData;

    // Common props for all forms in magic link mode
    const commonFormProps = {
        id: evidenceId,
        isSupervisor: true, // Magic link users act as supervisors
        initialStatus: EvidenceStatus.Submitted,
        onBack: () => {
            if (confirm('Are you sure you want to leave? Your changes may not be saved.')) {
                onComplete();
            }
        },
        onSubmitted: () => {
            // Redirection handled by onComplete
            handleFormSubmit({});
        },
        onSave: async (evidence: Partial<EvidenceItem>) => {
            try {
                const isComplete = evidence.status === EvidenceStatus.SignedOff;

                const { error } = await supabase.functions.invoke('submit-magic-link-form', {
                    body: {
                        token: token,
                        evidenceId: evidenceId,
                        updates: evidence,
                        complete: isComplete
                    }
                });

                if (error) {
                    console.error('Magic link save failed:', error);
                } else {
                    console.log('Magic link saved successfully');
                }
            } catch (err) {
                console.error('Error saving magic form:', err);
            }
        },
        allEvidence: [] as EvidenceItem[],
        linkedEvidenceData: {} as Record<string, string[]>,
        onLinkRequested: () => { },
        onRemoveLink: () => { },
        onViewLinkedEvidence: (evidenceId: string) => {
            // Find the evidence in allEvidence and open dialog
            const allEv = commonFormProps.allEvidence;
            const ev = allEv.find(e => e.id === evidenceId);
            if (ev) {
                setViewingEvidence(ev);
                setIsEvidenceDialogOpen(true);
            } else {
                console.warn('Evidence not found:', evidenceId);
            }
        },
    };

    // Combine main evidence with linked evidence for form context
    // AND extract the linkedEvidence map from epaFormData
    if (evidenceData) {
        const mainItem = mapRowToEvidenceItem(evidenceData as any);
        const linkedItems = magicLinkData.linkedEvidence || [];
        commonFormProps.allEvidence = [mainItem, ...linkedItems];

        // CRITICAL: Extract the linkedEvidence map from the evidence data
        // This map contains { criterionKey: [evidenceId1, evidenceId2, ...] }
        const rawEvidence = evidenceData as any;
        if (rawEvidence.data?.epaFormData?.linkedEvidence) {
            commonFormProps.linkedEvidenceData = rawEvidence.data.epaFormData.linkedEvidence;
        } else if (rawEvidence.epaFormData?.linkedEvidence) {
            // Fallback: already mapped via mapRowToEvidenceItem
            commonFormProps.linkedEvidenceData = rawEvidence.epaFormData.linkedEvidence;
        }
        console.log('Magic Link - linkedEvidenceData passed to form:', commonFormProps.linkedEvidenceData);
    }

    // Header for magic link forms
    const MagicLinkHeader = () => (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 mb-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h1 className="font-semibold">Form Sign-Off Request</h1>
                        <p className="text-sm text-white/80">You're signing off as: {recipientEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm">
                    <ShieldCheck size={16} />
                    <span>Secure Link</span>
                </div>
            </div>
        </div>
    );

    // Render the form based on type
    const renderForm = () => {
        // Extract supervisor name from evidence data (works for all form types)
        const getSupervisorName = () => {
            const ed = evidenceData as any;
            return ed?.supervisor_name
                || ed?.supervisorName
                || ed?.data?.supervisorName
                || ed?.epaFormData?.supervisorName
                || ed?.data?.epaFormData?.supervisorName
                || ed?.cbdFormData?.supervisorName
                || ed?.dopsFormData?.supervisorName
                || ed?.osatsFormData?.supervisorName
                || ed?.crsFormData?.assessorName
                || ed?.gsatFormData?.supervisorName
                || ed?.marFormData?.assessorName
                || ed?.epaOperatingListFormData?.supervisorName
                || '';
        };

        const supervisorName = getSupervisorName();

        switch (formType) {
            case 'EPA':
                return (
                    <>
                        <MagicLinkHeader />
                        <EPAForm
                            {...commonFormProps}
                            initialSupervisorName={supervisorName}
                            initialSupervisorEmail={recipientEmail}
                        />
                    </>
                );
            case 'CBD':
                return (
                    <>
                        <MagicLinkHeader />
                        <CBDForm
                            {...commonFormProps}
                            initialAssessorName={supervisorName}
                            initialAssessorEmail={recipientEmail}
                        />
                    </>
                );
            case 'DOPS':
                return (
                    <>
                        <MagicLinkHeader />
                        <DOPsForm
                            {...commonFormProps}
                            initialSupervisorName={supervisorName}
                            initialSupervisorEmail={recipientEmail}
                        />
                    </>
                );
            case 'OSATS':
                return (
                    <>
                        <MagicLinkHeader />
                        <OSATSForm
                            {...commonFormProps}
                            initialAssessorName={supervisorName}
                            initialAssessorEmail={recipientEmail}
                        />
                    </>
                );
            case 'CRS':
                return (
                    <>
                        <MagicLinkHeader />
                        <CRSForm
                            {...commonFormProps}
                            initialAssessorName={supervisorName}
                            initialAssessorEmail={recipientEmail}
                        />
                    </>
                );
            case 'GSAT':
                return (
                    <>
                        <MagicLinkHeader />
                        <GSATForm
                            {...commonFormProps}
                            initialSupervisorName={supervisorName}
                            initialSupervisorEmail={recipientEmail}
                            linkedEvidenceData={{}}
                            onLinkRequested={() => { }}
                            onRemoveLink={() => { }}
                        />
                    </>
                );
            case 'MAR':
                return (
                    <>
                        <MagicLinkHeader />
                        <MARForm
                            {...commonFormProps}
                            initialAssessorName={supervisorName}
                            initialAssessorEmail={recipientEmail}
                        />
                    </>
                );
            case 'ESR':
                return (
                    <>
                        <MagicLinkHeader />
                        <ESRForm
                            profile={{} as any} // Will need to get trainee profile from evidence data
                            allEvidence={commonFormProps.allEvidence}
                            onBack={commonFormProps.onBack}
                            onSave={commonFormProps.onSave}
                            initialData={evidenceData}
                            isSupervisor={true}
                            onViewActiveEPAs={() => { }}
                            onViewEvidenceItem={() => { }}
                            onNavigateToEvidence={() => { }}
                            onNavigateToRecordForm={() => { }}
                        />
                    </>
                );
            case 'EPAOperatingList':
                return (
                    <>
                        <MagicLinkHeader />
                        <EPAOperatingListForm
                            {...commonFormProps}
                            initialSupervisorName={supervisorName}
                            initialSupervisorEmail={recipientEmail}
                        />
                    </>
                );
            case 'MSF_RESPONSE':
                // Get trainee name from evidence data
                const getTraineeName = () => {
                    const ed = evidenceData as any;
                    // Try various paths to find the trainee name
                    if (ed?.trainee_profile?.name) return ed.trainee_profile.name;
                    if (ed?.data?.traineeName) return ed.data.traineeName;
                    if (ed?.title) {
                        // Try to extract name from title like "MSF - Dr John Smith - January 2026"
                        const match = ed.title.match(/MSF - (.+?) -/);
                        if (match) return match[1];
                    }
                    return 'the trainee';
                };

                return (
                    <>
                        <MagicLinkHeader />
                        <MSFResponseForm
                            traineeName={getTraineeName()}
                            onBack={() => {
                                if (confirm('Are you sure you want to leave? Your feedback will not be saved.')) {
                                    onComplete();
                                }
                            }}
                            onSubmitted={async (responseData: any) => {
                                // Save the MSF response via edge function
                                try {
                                    const { error } = await supabase.functions.invoke('submit-magic-link-form', {
                                        body: {
                                            token: token,
                                            evidenceId: evidenceId,
                                            updates: {
                                                msfResponse: {
                                                    respondentEmail: recipientEmail,
                                                    ...responseData,
                                                    submittedAt: new Date().toISOString()
                                                }
                                            },
                                            complete: true,
                                            formType: 'MSF_RESPONSE'
                                        }
                                    });

                                    if (error) {
                                        console.error('Failed to save MSF response:', error);
                                        alert('Failed to save your response. Please try again.');
                                        return;
                                    }

                                    handleFormSubmit(responseData);
                                } catch (err) {
                                    console.error('Error saving MSF response:', err);
                                    alert('An error occurred. Please try again.');
                                }
                            }}
                        />
                    </>
                );
            default:
                return (
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                        <GlassCard className="p-8 max-w-md w-full text-center">
                            <AlertCircle size={32} className="text-amber-600 mx-auto mb-4" />
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                Unsupported Form Type
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-white/50">
                                Form type "{formType}" is not supported for magic link access.
                            </p>
                        </GlassCard>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {renderForm()}

            {/* Full Form Viewer Modal */}
            {isEvidenceDialogOpen && viewingEvidence && (
                <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-white/10">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                            >
                                <X size={16} />
                                Back to Form
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    {viewingEvidence.type}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${viewingEvidence.status === EvidenceStatus.SignedOff
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : viewingEvidence.status === EvidenceStatus.Submitted
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                    {viewingEvidence.status === EvidenceStatus.SignedOff ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                    {viewingEvidence.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="max-w-7xl mx-auto p-4">
                        {viewingEvidence.type === EvidenceType.CRS && (
                            <CRSForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                            />
                        )}

                        {viewingEvidence.type === EvidenceType.DOPs && (
                            <DOPsForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                            />
                        )}

                        {viewingEvidence.type === EvidenceType.OSATs && (
                            <OSATSForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                            />
                        )}

                        {viewingEvidence.type === EvidenceType.CbD && (
                            <CBDForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                            />
                        )}

                        {viewingEvidence.type === EvidenceType.GSAT && (
                            <GSATForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                                linkedEvidenceData={{}}
                                onLinkRequested={() => { }}
                                onRemoveLink={() => { }}
                            />
                        )}

                        {viewingEvidence.type === EvidenceType.MAR && (
                            <MARForm
                                id={viewingEvidence.id}
                                initialStatus={EvidenceStatus.SignedOff}
                                onBack={() => {
                                    setIsEvidenceDialogOpen(false);
                                    setViewingEvidence(null);
                                }}
                                onSave={async () => { }}
                                allEvidence={commonFormProps.allEvidence}
                            />
                        )}

                        {/* Fallback for unsupported types */}
                        {![EvidenceType.CRS, EvidenceType.DOPs, EvidenceType.OSATs, EvidenceType.CbD, EvidenceType.GSAT, EvidenceType.MAR].includes(viewingEvidence.type) && (
                            <GlassCard className="p-8 text-center">
                                <FileText size={48} className="mx-auto text-slate-300 dark:text-white/20 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    {viewingEvidence.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-white/50 mb-4">
                                    {viewingEvidence.type} - {viewingEvidence.date}
                                </p>
                                {viewingEvidence.notes && (
                                    <p className="text-sm text-slate-600 dark:text-white/70 bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                                        {viewingEvidence.notes}
                                    </p>
                                )}
                            </GlassCard>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MagicLinkForm;
