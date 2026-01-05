
import React, { useState, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ArrowLeft, UploadCloud, CheckCircle2, X, FileText, AlertCircle } from '../components/Icons';
import { EvidenceType, SIA } from '../types';

interface EPALegacyFormProps {
    onBack: () => void;
    onSave: (data: EPALegacyData) => void;
    sias: SIA[];
    initialData?: Partial<EPALegacyData> & { id?: string; status?: string; fileUrl?: string; fileName?: string };
    isReadOnly?: boolean;
}

export interface EPALegacyData {
    title: string;
    type: EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish;
    file: File | null;
    fileBase64?: string;
    selectedBoxes: Set<string>; // Format: "SIA-Level" e.g. "Cataract Surgery-1"
}

export const EPALegacyForm: React.FC<EPALegacyFormProps> = ({ onBack, onSave, sias, initialData, ...props }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState<EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish>(
        (initialData?.type as EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish) || EvidenceType.CurriculumCatchUp
    );
    const [file, setFile] = useState<File | null>(initialData?.file || null);
    const [filePreview, setFilePreview] = useState<string | null>(initialData?.fileBase64 || null);
    const [selectedBoxes, setSelectedBoxes] = useState<Set<string>>(initialData?.selectedBoxes || new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Read Only mode override or inference
    const readOnly = props.isReadOnly !== undefined ? props.isReadOnly : !!initialData?.id;

    // Populate file object stub if we have a URL or Base64 but no file object (for display)
    React.useEffect(() => {
        if ((initialData?.fileUrl || initialData?.fileBase64) && !file) {
            // Create a dummy file object for display purposes if we have a URL or Base64
            const dummyFile = new File([""], initialData.fileName || "Evidence File", { type: "application/pdf" });
            setFile(dummyFile);
        }
    }, [initialData, file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            // Create preview/base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const toggleBox = (sia: string, level: number) => {
        if (readOnly) return;
        const key = `${sia}-${level}`;
        const newSelected = new Set(selectedBoxes);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedBoxes(newSelected);
    };

    const handleViewFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = initialData?.fileUrl;
        const base64 = initialData?.fileBase64;

        // If regular URL that's not a data URI, open it directly
        if (url && !url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }

        // Handle data URIs (from url or base64 prop)
        let pdfData = base64 || (url && url.startsWith('data:') ? url : null);

        if (pdfData) {
            // Strip data prefix if present to get pure base64
            if (pdfData.startsWith('data:')) {
                pdfData = pdfData.split(',')[1];
            }

            try {
                // Clean input string - remove all whitespace
                pdfData = pdfData.replace(/\s/g, '');

                // Convert base64 to blob
                const byteCharacters = atob(pdfData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Create object URL and open
                const blobUrl = URL.createObjectURL(blob);
                const newWindow = window.open(blobUrl, '_blank');

                // Fallback: If blocked, try redirecting current
                if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                    alert("Popup blocked. Please allow popups for this site to view the PDF.");
                }

                // Clean up after a delay
                // setTimeout(() => URL.revokeObjectURL(blobUrl), 1000); 
                // Note: Revoking too early might break the new tab view in some browsers. 
                // Let the browser handle garbage collection for this session blob mostly.
            } catch (error) {
                console.error("Failed to process PDF", error);
                alert("Could not display PDF document. The file data may be corrupted.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !file || selectedBoxes.size === 0) return;

        setIsSubmitting(true);

        // Pass everything to parent handler
        onSave({
            title,
            type,
            file,
            fileBase64: filePreview || undefined,
            selectedBoxes
        });
    };

    return (
        <div className="max-w-5xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    type="button"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                        {readOnly ? 'Evidence Details' : 'EPA Legacy Upload'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-white/40">
                        {readOnly ? 'View details of uploaded historic evidence' : 'Upload historical evidence and map it to your curriculum progress'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Info */}
                <GlassCard className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Evidence Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. 2024 Logbook Summary"
                            disabled={readOnly}
                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Evidence Type
                        </label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setType(EvidenceType.CurriculumCatchUp)}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all ${type === EvidenceType.CurriculumCatchUp
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'bg-white/5 dark:bg-white/5 border-transparent hover:bg-slate-50 dark:hover:bg-white/10'
                                    }`}
                            >
                                Curriculum Catch Up
                            </button>
                            <button
                                type="button"
                                onClick={() => setType(EvidenceType.FourteenFish)}
                                className={`flex-1 py-3 px-4 rounded-xl border transition-all ${type === EvidenceType.FourteenFish
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'bg-white/5 dark:bg-white/5 border-transparent hover:bg-slate-50 dark:hover:bg-white/10'
                                    }`}
                            >
                                FourteenFish
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* 2. File Upload */}
                <GlassCard className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        Upload Document (PDF or Image)
                    </label>

                    <div
                        onClick={() => !readOnly && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${!readOnly && file
                            ? 'border-indigo-500/50 bg-indigo-500/5'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                            } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-full">
                                    <FileText size={24} />
                                </div>
                                <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <div className="flex gap-2 mt-2">
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setFilePreview(null);
                                            }}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    {(initialData?.fileUrl || initialData?.fileBase64) && (
                                        <button
                                            type="button"
                                            onClick={handleViewFile}
                                            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                                        >
                                            <FileText size={12} />
                                            View PDF
                                        </button>
                                    )}
                                </div>

                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                                <UploadCloud size={24} />
                                <p>Click to browse or drag file here</p>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* 3. Curriculum Mapping */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Form Outcome Linkage</h3>
                        <span className="text-sm text-slate-500">Select all applicable levels</span>
                    </div>

                    <div className="space-y-6">
                        {sias.map(sia => (
                            <div key={sia.id || sia.specialty} className="flex flex-col md:flex-row md:items-center gap-4 py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
                                <div className="w-full md:w-1/3">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{sia.specialty}</span>
                                </div>
                                <div className="flex-1 flex gap-2 flex-wrap">
                                    {[1, 2, 3, 4].map(level => {
                                        const key = `${sia.specialty}-${level}`;
                                        const isSelected = selectedBoxes.has(key);
                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => toggleBox(sia.specialty, level)}
                                                className={`
                          w-12 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                          ${isSelected
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}
                        `}
                                            >
                                                L{level}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>


                {/* Read-Only Close View Action */}
                {readOnly && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 flex justify-end z-50">
                        <div className="max-w-7xl mx-auto w-full flex justify-end">
                            <button
                                type="button"
                                onClick={onBack}
                                className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                CLOSE VIEW
                            </button>
                        </div>
                    </div>
                )}
                {/* Spacing for fixed bottom bar */}
                {readOnly && <div className="h-20" />}
                {!readOnly && (
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title || !file || selectedBoxes.size === 0 || isSubmitting}
                            className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Save Linkage
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};
