
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, FileText, Database, Award, BookOpen, AlertCircle, 
  Search, Users, ClipboardCheck, Plus, CheckCircle2, Calendar,
  UploadCloud, Save, ChevronRight, X, Heart
} from '../components/Icons';
// Import EvidenceType from types and SPECIALTIES from constants
import { SPECIALTIES } from '../constants';
import { EvidenceType } from '../types';

interface AddEvidenceProps {
  sia?: string;
  level?: number;
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

const AddEvidence: React.FC<AddEvidenceProps> = ({ sia, level, onBack, onCreated }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSia, setSelectedSia] = useState(sia || 'All');
  const [selectedLevel, setSelectedLevel] = useState(level?.toString() || '1');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');

  // Autosave simulation
  useEffect(() => {
    if (!selectedType) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedType]);

  const handleCreate = () => {
    if (!title || !date) return;
    // Integration logic would go here
    onCreated();
  };

  const currentTypeInfo = evidenceTypes.find(t => t.id === selectedType);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-white/40">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white/90">Add Evidence</h1>
            {selectedType && (
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-0.5">Adding: {currentTypeInfo?.label}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Type Selector */}
        <div className={`lg:col-span-4 space-y-3 ${selectedType ? 'hidden lg:block' : 'block'}`}>
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
              <p className="text-sm text-slate-400 dark:text-white/40 mt-1 max-w-xs">Each category has specialized fields to help you capture clinical performance correctly.</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
              <GlassCard className="p-6 md:p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white/90">General Details</h3>
                  <button onClick={() => setSelectedType(null)} className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Evidence Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Ptosis clinic reflection or Case 1045 audit"
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Date</label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Level</label>
                    <select 
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40"
                    >
                      {["1","2","3","4","N/A"].map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Linked Specialty Domain (SIA)</label>
                    <select 
                      value={selectedSia}
                      onChange={(e) => setSelectedSia(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/40"
                    >
                      <option value="All">Not specific to an SIA</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Type Specific Fields Placeholder */}
                <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-6">{currentTypeInfo?.label} Specifics</h3>
                  {selectedType === 'Reflection' && (
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Reflection Content</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What happened? What did you learn? What will you do differently?"
                        className="w-full min-h-[160px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm resize-none outline-none focus:border-indigo-500/40"
                      />
                    </div>
                  )}
                  {selectedType !== 'Reflection' && (
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Notes & Description</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add your notes here..."
                        className="w-full min-h-[120px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm resize-none outline-none focus:border-indigo-500/40"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-white/10">
                   <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-4 block">Attachments & Documents</label>
                   <div className="border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <UploadCloud size={32} className="text-slate-300 dark:text-white/20 mb-2" />
                    <p className="text-xs text-slate-500 dark:text-white/40">Drop files here or click to browse</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1">PDF, JPG, PNG up to 10MB</p>
                   </div>
                </div>

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
                      <CheckCircle2 size={16} /> Create Evidence
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEvidence;
