
import React, { useState } from 'react';
import { X, Check, Ban, Unlock } from './Icons';
import { GlassCard } from './GlassCard';

interface Edit RequestDialogProps {
    request: {
        id: string;
        evidence_id: string;
        trainee_id: string;
        reason: string;
        created_at: string;
    };
    evidence: {
        id: string;
        title: string;
        type: string;
    };
    traineeName: string;
    onApprove: () => void;
    onDeny: () => void;
    onClose: () => void;
}

export const EditRequestDialog: React.FC<EditRequestDialogProps> = ({
    request,
    evidence,
    traineeName,
    onApprove,
    onDeny,
    onClose
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState<'approve' | 'deny' | null>(null);

    const handleApprove = async () => {
        setIsProcessing(true);
        setAction('approve');
        try {
            await onApprove();
        } finally {
            setIsProcessing(false);
            setAction(null);
        }
    };

    const handleDeny = async () => {
        setIsProcessing(true);
        setAction('deny');
        try {
            await onDeny();
        } finally {
            setIsProcessing(false);
            setAction(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
                <GlassCard className="p-8 relative overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Unlock size={24} className="text-amber-500" />
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Edit Request</h2>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] font-black">
                                Requires your approval
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors disabled:opacity-50"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Evidence Info */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                                        Trainee
                                    </label>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{traineeName}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                                        Date Requested
                                    </label>
                                    <p className="text-sm text-slate-600 dark:text-white/60">
                                        {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                                        Evidence Form
                                    </label>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{evidence.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Type: {evidence.type}</p>
                                </div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                                Reason for Edit Request
                            </label>
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap">{request.reason}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="flex-1 py-4 rounded-2xl bg-green-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-600/30 hover:bg-green-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check size={18} />
                                <span>{isProcessing && action === 'approve' ? 'Approving...' : 'Approve & Unlock'}</span>
                            </button>
                            <button
                                onClick={handleDeny}
                                disabled={isProcessing}
                                className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-600/30 hover:bg-rose-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Ban size={18} />
                                <span>{isProcessing && action === 'deny' ? 'Denying...' : 'Deny Request'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Decorative background element */}
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                </GlassCard>
            </div>
        </div>
    );
};
