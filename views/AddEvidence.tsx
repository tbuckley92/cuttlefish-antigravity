
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, FileText, Database, Award, BookOpen, AlertCircle, 
  Search, Users, ClipboardCheck, Plus, CheckCircle2,
  UploadCloud, Save, ChevronRight, X, Heart, Trash2, Clock, ShieldCheck
} from '../components/Icons';
import { SPECIALTIES } from '../constants';
import { EvidenceItem, EvidenceStatus } from '../types';

interface AddEvidenceProps {
  sia?: string;
  level?: number;
  initialType?: string;
  editingEvidence?: EvidenceItem;
  onBack: () => void;
  onCreated: () => void;
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
  const isSubmitted = editingEvidence?.status === EvidenceStatus.Submitted;
  const isSignedOff = editingEvidence?.status === EvidenceStatus.SignedOff;

  const [selectedType, setSelectedType] = useState<string | null>(() => {
    if (editingEvidence) {
      return evidenceTypes.find(t => t.label === editingEvidence.type)?.id || null;
    }
    return initialType || null;
  });
  
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [title, setTitle] = useState(editingEvidence?.title || '');
  const [date, setDate] = useState(editingEvidence?.date || new Date().toISOString().split('T')[0]);
  const [selectedSia, setSelectedSia] = useState(editingEvidence?.sia || sia || 'All');
  const [selectedLevel, setSelectedLevel] = useState(editingEvidence?.level?.toString() || level?.toString() || '1');
  const [notes, setNotes] = useState(editingEvidence?.notes || '');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Autosave simulation - only if not locked
  useEffect(() => {
    if (!selectedType || isLocked) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedType, isLocked]);

  const handleCreate = () => {
    if (!title || !date || isLocked) return;
    onCreated();
  };

  const handleRetract = () => {
    if (window.confirm("Are you sure you want to retract this submission? Your supervisor will no longer be able to sign it off until you re-submit.")) {
      // Logic to move back to Draft status would go here
      onBack();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && !isLocked) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentTypeInfo = evidenceTypes.find(t => t.id === selectedType);
  const isLogbook = selectedType === 'Logbook';

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
                  {currentTypeInfo?.label}
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
        
        {isSubmitted && (
          <button 
            onClick={handleRetract}
            className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Retract Submission
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Type Selector (Disabled when editing or locked) */}
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

        {/* Right Column: Form */}
        <div className={`lg:col-span-8 ${!selectedType ? 'hidden lg:flex' : 'flex'} flex-col gap-6`}>
          {!selectedType ? (
            <div className="flex-1 min-h-[400px] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 opacity-40">
              <Plus size={48} className="mb-4 text-slate-300 dark:text-white/20" />
              <p className="text-lg font-medium text-slate-600 dark:text-white/80">Select a type on the left</p>
              <p className="text-sm text-slate-400 dark:text-white/40 mt-1 max-w-xs">Capture reflections, audits, and other evidence types with specialized entries.</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
              <GlassCard className={`p-6 md:p-8 space-y-8 ${isLocked ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white/90">{currentTypeInfo?.label}</h3>
                  {!isLocked && (
                    <button onClick={() => !editingEvidence && setSelectedType(null)} className={`lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 ${editingEvidence ? 'hidden' : ''}`}>
                      <X size={18} />
                    </button>
                  )}
                </div>

                {isLocked && (
                  <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                    <AlertCircle size={18} className="text-indigo-500" />
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">This record is <b>locked</b>. {isSignedOff ? "It has been signed off and cannot be modified." : "It has been submitted for sign-off. Retract to make changes."}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Title</label>
                    <input 
                      type="text" 
                      disabled={isLocked}
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isLogbook ? "e.g. Surgical Logbook Summary 2024" : "e.g. Clinic reflection or Case 1045 audit"}
                      className={`w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40 ${isLocked ? 'cursor-default opacity-70' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Date</label>
                    <input 
                      type="date" 
                      disabled={isLocked}
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40 ${isLocked ? 'cursor-default opacity-70' : ''}`}
                    />
                  </div>
                  {!isLogbook && (
                    <>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Training Level</label>
                        <select 
                          disabled={isLocked}
                          value={selectedLevel}
                          onChange={(e) => setSelectedLevel(e.target.value)}
                          className={`w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40 ${isLocked ? 'cursor-default opacity-70' : ''}`}
                        >
                          {["1","2","3","4","N/A"].map(l => <option key={l} value={l}>Level {l}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Linked SIA</label>
                        <select 
                          disabled={isLocked}
                          value={selectedSia}
                          onChange={(e) => setSelectedSia(e.target.value)}
                          className={`w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40 ${isLocked ? 'cursor-default opacity-70' : ''}`}
                        >
                          <option value="All">Not specific to an SIA</option>
                          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {!isLogbook && (
                  <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Notes / Reflection Content</label>
                    <textarea 
                      disabled={isLocked}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={selectedType === 'Reflection' ? "What happened? What did you learn? What will you do differently?" : "Add your notes here..."}
                      className={`w-full min-h-[160px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm resize-none outline-none focus:border-indigo-500/40 ${isLocked ? 'cursor-default opacity-70' : ''}`}
                    />
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                   <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-4 block">
                     {isLogbook ? "EyeLogbook Summary PDF" : "Attachments"}
                   </label>
                   
                   <input 
                     type="file" 
                     ref={fileInputRef}
                     onChange={handleFileChange}
                     accept={isLogbook ? ".pdf" : "*"}
                     className="hidden"
                   />

                   <div 
                     onClick={() => !isLocked && fileInputRef.current?.click()}
                     className={`border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center transition-colors relative overflow-hidden ${isLocked ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer'}`}
                   >
                    {attachedFile || isLocked ? (
                      <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <FileText size={24} />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{attachedFile ? attachedFile.name : "evidence_document.pdf"}</p>
                        <p className="text-[10px] text-slate-400">{attachedFile ? (attachedFile.size / 1024 / 1024).toFixed(2) + " MB" : "1.2 MB"}</p>
                        {!isLocked && (
                          <button 
                            onClick={removeFile}
                            className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={12} /> Remove File
                          </button>
                        )}
                        {isLocked && (
                          <button 
                            className="mt-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-200 transition-colors"
                          >
                            Download File
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="text-slate-300 dark:text-white/20 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-white/40">
                          {isLogbook ? "Upload EyeLogbook PDF Summary" : "Drop files here or click to browse"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1">
                          {isLogbook ? "PDF only up to 10MB" : "PDF, JPG, PNG up to 10MB"}
                        </p>
                      </>
                    )}
                   </div>
                </div>

                {!isLocked && (
                  <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-white/20'}`}></div>
                      <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest font-semibold">Autosaved {lastSaved}</span>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                        <Save size={16} /> Save Draft
                      </button>
                      <button 
                        onClick={handleCreate}
                        disabled={!title || !date}
                        className="flex-1 md:flex-none px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> {editingEvidence ? 'Update Record' : (isLogbook ? "Create Record" : "Create Evidence")}
                      </button>
                    </div>
                  </div>
                )}
                
                {isLocked && (
                  <div className="pt-6 flex justify-center">
                    <button 
                      onClick={onBack}
                      className="px-8 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 text-sm font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      Close View
                    </button>
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
