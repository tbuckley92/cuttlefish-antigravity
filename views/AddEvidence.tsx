
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, FileText, Database, Award, BookOpen, AlertCircle, 
  Search, Users, ClipboardCheck, Plus, CheckCircle2,
  UploadCloud, Save, ChevronRight, X, Heart, Trash2, Clock, ShieldCheck
} from '../components/Icons';
import { SPECIALTIES } from '../constants';
import { EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

interface AddEvidenceProps {
  sia?: string;
  level?: number;
  initialType?: string;
  editingEvidence?: EvidenceItem;
  onBack: () => void;
  onCreated: (item: Partial<EvidenceItem>) => void;
}

const evidenceTypes = [
  { id: 'Reflection', label: 'Reflection', icon: <FileText size={18} />, description: 'Reflect on a case or experience' },
  { id: 'QIP', label: 'Quality Improvement and Audit', icon: <Database size={18} />, description: 'Audit or project documentation' },
  { id: 'Award', label: 'Prizes/Awards', icon: <Award size={18} />, description: 'Recognitions and honors' },
  { id: 'Course', label: 'Courses', icon: <BookOpen size={18} />, description: 'Seminars, workshops, or training' },
  { id: 'SignificantEvent', label: 'Significant Event', icon: <AlertCircle size={18} />, description: 'Formal review of clinical events' },
  { id: 'Research', label: 'Research', icon: <Search size={18} />, description: 'Publications or presentations' },
  { id: 'Leadership', label: 'Leadership, management and teamwork', icon: <Users size={18} />, description: 'Committee work or leadership roles' },
  { id: 'Logbook', label: 'Eye Logbook', icon: <ClipboardCheck size={18} />, description: 'Surgical procedure entries' },
  { id: 'Additional', label: 'Additional evidence', icon: <Plus size={18} />, description: 'Any other portfolio content' },
  { id: 'Compliment', label: 'Compliments', icon: <Heart size={18} />, description: 'Patient or peer feedback' },
];

const AddEvidence: React.FC<AddEvidenceProps> = ({ sia, level, initialType, editingEvidence, onBack, onCreated }) => {
  const isLocked = editingEvidence?.status === EvidenceStatus.Submitted || editingEvidence?.status === EvidenceStatus.SignedOff;
  const isSignedOff = editingEvidence?.status === EvidenceStatus.SignedOff;

  const [selectedType, setSelectedType] = useState<string | null>(() => {
    if (editingEvidence) {
      return evidenceTypes.find(t => t.label === editingEvidence.type)?.id || null;
    }
    return initialType || null;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [title, setTitle] = useState(editingEvidence?.title || '');
  const [date, setDate] = useState(editingEvidence?.date || new Date().toISOString().split('T')[0]);
  const [selectedSia, setSelectedSia] = useState(editingEvidence?.sia || sia || 'All');
  const [selectedLevel, setSelectedLevel] = useState(editingEvidence?.level?.toString() || level?.toString() || '1');
  const [notes, setNotes] = useState(editingEvidence?.notes || '');
  const [fileName, setFileName] = useState(editingEvidence?.fileName || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      setFileName(file.name);
    }
  };

  const removeFile = () => {
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (final: boolean) => {
    if (!title || !date || isLocked) return;
    const typeLabel = evidenceTypes.find(t => t.id === selectedType)?.label as EvidenceType;
    onCreated({
      id: editingEvidence?.id,
      title,
      date,
      sia: selectedSia,
      level: parseInt(selectedLevel) || undefined,
      type: typeLabel || EvidenceType.Other,
      notes,
      fileName: fileName || undefined,
      fileType: fileName ? 'application/pdf' : undefined,
      status: final ? EvidenceStatus.SignedOff : EvidenceStatus.Draft
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-white/40">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white/90">
              {isLocked ? 'View Record' : (editingEvidence ? 'Edit Evidence' : 'Add Evidence')}
            </h1>
            {selectedType && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">
                  {evidenceTypes.find(t => t.id === selectedType)?.label}
                </p>
                {isLocked && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSignedOff ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isSignedOff ? <ShieldCheck size={10} /> : <Clock size={10} />}
                    {editingEvidence?.status}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className={`lg:col-span-4 space-y-3 ${selectedType ? 'hidden lg:block' : 'block'} lg:max-h-[80vh] lg:overflow-y-auto lg:pr-2 no-scrollbar ${(editingEvidence || isLocked) ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-4 ml-1">Select Evidence Type</h2>
          {evidenceTypes.map((type) => (
            <GlassCard 
              key={type.id} 
              onClick={() => setSelectedType(type.id)}
              className={`p-4 flex items-center gap-4 group transition-all ${selectedType === type.id ? 'bg-indigo-600/10 border-indigo-500/50' : ''}`}
            >
              <div className={`p-2 rounded-lg ${selectedType === type.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 group-hover:text-indigo-500'}`}>
                {type.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${selectedType === type.id ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-white/70'}`}>{type.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-white/30 truncate">{type.description}</p>
              </div>
              <ChevronRight size={14} className={`transition-transform ${selectedType === type.id ? 'translate-x-1 text-indigo-500' : 'text-slate-300 dark:text-white/10'}`} />
            </GlassCard>
          ))}
        </div>

        <div className={`lg:col-span-8 ${!selectedType ? 'hidden lg:flex' : 'flex'} flex-col gap-6`}>
          {!selectedType ? (
            <div className="flex-1 min-h-[400px] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 opacity-40">
              <Plus size={48} className="mb-4 text-slate-300 dark:text-white/20" />
              <p className="text-lg font-medium text-slate-600 dark:text-white/80">Select a type on the left</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
              <GlassCard className={`p-6 md:p-8 space-y-8 ${isLocked ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white/90">{evidenceTypes.find(t => t.id === selectedType)?.label}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Title</label>
                    <input type="text" disabled={isLocked} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Date</label>
                    <input type="date" disabled={isLocked} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Training Level</label>
                    <select disabled={isLocked} value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none">
                      {["1","2","3","4","N/A"].map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Linked SIA</label>
                    <select disabled={isLocked} value={selectedSia} onChange={(e) => setSelectedSia(e.target.value)} className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none">
                      <option value="All">Not specific to an SIA</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">File Attachment (PDF Only)</label>
                  {!fileName ? (
                    <div 
                      onClick={() => !isLocked && fileInputRef.current?.click()}
                      className={`group relative h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${isLocked ? 'border-slate-100 bg-slate-50/50 cursor-default' : 'border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'}`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      <UploadCloud size={24} className={`mb-2 transition-colors ${isLocked ? 'text-slate-300' : 'text-slate-400 dark:text-white/20 group-hover:text-indigo-500'}`} />
                      <p className={`text-xs font-bold uppercase tracking-widest ${isLocked ? 'text-slate-300' : 'text-slate-400 dark:text-white/30 group-hover:text-indigo-600'}`}>Click or drag PDF to upload</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">{fileName}</p>
                          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">PDF Document</p>
                        </div>
                      </div>
                      {!isLocked && (
                        <button onClick={removeFile} className="p-2 hover:bg-rose-100 rounded-lg text-rose-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Notes / Reflection Content</label>
                  <textarea disabled={isLocked} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[160px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm resize-none outline-none" />
                </div>

                {!isLocked && (
                  <div className="pt-6 flex justify-end gap-3">
                    <button 
                      onClick={() => handleSave(false)} 
                      className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                    >
                      <Save size={16} /> Save Draft
                    </button>
                    <button 
                      onClick={() => handleSave(true)} 
                      className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Create Evidence
                    </button>
                  </div>
                )}
                
                {isLocked && (
                  <div className="pt-6 flex justify-center">
                    <button onClick={onBack} className="px-8 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 text-sm font-semibold">Close View</button>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEvidence;
