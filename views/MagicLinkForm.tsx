import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ShieldCheck, AlertCircle, CheckCircle2, Mail } from '../components/Icons';
import { validateMagicLinkToken, markMagicLinkUsed } from '../utils/emailUtils';
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
}

type ValidationState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'error';

const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ token, onComplete }) => {
    const [validationState, setValidationState] = useState<ValidationState>('loading');
    const [magicLinkData, setMagicLinkData] = useState<MagicLinkData | null>(null);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Validate the magic link on mount
    useEffect(() => {
        const validate = async () => {
            try {
                const result = await validateMagicLinkToken(token);

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
                    evidenceData: result.evidence
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
            // Mark magic link as used
            await markMagicLinkUsed(token);

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
            handleFormSubmit({});
        },
        onSave: async (evidence: Partial<EvidenceItem>) => {
            // In magic link mode, we need to save via API instead of direct Supabase
            // For now, this is handled by the form's internal save mechanism
            console.log('Magic link save:', evidence);
        },
        allEvidence: evidenceData ? [evidenceData] : [],
    };

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
        switch (formType) {
            case 'EPA':
                return (
                    <>
                        <MagicLinkHeader />
                        <EPAForm
                            {...commonFormProps}
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
                            initialSupervisorEmail={recipientEmail}
                        />
                    </>
                );
            case 'DOPS':
                return (
                    <>
                        <MagicLinkHeader />
                        <DOPsForm
                            {...commonFormProps}
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
                            initialSupervisorEmail={recipientEmail}
                        />
                    </>
                );
            case 'MSF_RESPONSE':
                return (
                    <>
                        <MagicLinkHeader />
                        <MSFResponseForm
                            evidenceId={evidenceId}
                            respondentEmail={recipientEmail}
                            onSubmit={handleFormSubmit}
                            onCancel={commonFormProps.onBack}
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
        </div>
    );
};

export default MagicLinkForm;
