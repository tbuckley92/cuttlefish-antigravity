
import React, { useState, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ArrowLeft, UploadCloud, CheckCircle2, X, FileText, AlertCircle } from '../components/Icons';
import { EvidenceType, SIA } from '../types';

interface EPALegacyFormProps {
    onBack: () => void;
    onSave: (data: EPALegacyData) => void;
    sias: SIA[];
}

export interface EPALegacyData {
    title: string;
    type: EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish;
    file: File | null;
    fileBase64?: string;
    selectedBoxes: Set<string>; // Format: "SIA-Level" e.g. "Cataract Surgery-1"
}

export const EPALegacyForm: React.FC<EPALegacyFormProps> = ({ onBack, onSave, sias }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish>(EvidenceType.CurriculumCatchUp);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [selectedBoxes, setSelectedBoxes] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        const key = `${sia}-${level}`;
        const newSelected = new Set(selectedBoxes);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedBoxes(newSelected);
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
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">EPA Legacy Upload</h1>
                    <p className="text-sm text-slate-500 dark:text-white/40">Upload historical evidence and map it to your curriculum progress</p>
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
                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file
                            ? 'border-indigo-500/50 bg-indigo-500/5'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                            }`}
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
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setFilePreview(null);
                                    }}
                                    className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
                                >
                                    Remove
                                </button>
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


                {/* Submit Actions */}
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
            </form>
        </div>
    );
};
