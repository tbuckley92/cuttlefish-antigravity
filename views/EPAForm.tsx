
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, User, 
  Link as LinkIcon, Edit2, ClipboardCheck, CheckCircle2, 
  Clock, AlertCircle, Trash2, Plus
} from '../components/Icons';
import { CURRICULUM_DATA, INITIAL_EVIDENCE, SPECIALTIES } from '../constants';
import { CurriculumRequirement, EvidenceItem } from '../types';

interface EPAFormProps {
  sia?: string;
  level?: number;
  initialSupervisorName?: string;
  initialSupervisorEmail?: string;
  onBack: () => void;
  onLinkRequested: (reqIndex: number) => void;
  linkedEvidenceData: Record<number, string[]>;
}

const EPAForm: React.FC<EPAFormProps> = ({ 
  sia = "Oculoplastics", 
  level = 2, 
  initialSupervisorName = "",
  initialSupervisorEmail = "",
  onBack, 
  onLinkRequested,
  linkedEvidenceData 
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [supervisorName, setSupervisorName] = useState(initialSupervisorName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialSupervisorEmail);

  const sections = [
    "Curriculum Requirements",
    "Outpatients",
    "Theatre",
    "Other Mandatory"
  ];

  // Update internal state if props change (e.g. when navigating between different SIAs)
  useEffect(() => {
    setSupervisorName(initialSupervisorName);
    setSupervisorEmail(initialSupervisorEmail);
  }, [initialSupervisorName, initialSupervisorEmail]);

  // Filter requirements from mock CSV data
  const requirements = CURRICULUM_DATA.filter(r => r.specialty === sia && r.level === level);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleCommentChange = (idx: number, text: string) => {
    setComments(prev => ({ ...prev, [idx]: text }));
  };

  const isSectionComplete = (idx: number) => {
    if (idx === 0) {
      return requirements.every((_, i) => (comments[i] && comments[i].length > 5) || (linkedEvidenceData[i] && linkedEvidenceData[i].length > 0));
    }
    return false; // For mock purposes
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 h-[calc(100vh-100px)] overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      {/* Left Column: Form Metadata */}
      <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 transition-colors mb-2"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90 mb-6">EPA Sign-off</h2>
          
          <div className="space-y-6">
            <MetadataField label="Specialty / SIA">
              <select className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors">
                {SPECIALTIES.map(s => <option key={s} value={s} selected={s === sia}>{s}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Level">
              <select className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors">
                {[1,2,3,4].map(l => <option key={l} value={l} selected={l === level}>Level {l}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Assessment Date">
              <div className="relative">
                <input 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors" 
                />
              </div>
            </MetadataField>

            <MetadataField label="Supervisor">
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Supervisor Name"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors" 
                />
                <input 
                  type="email" 
                  placeholder="Supervisor Email"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors" 
                />
              </div>
            </MetadataField>

            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-wider font-semibold">Completeness</span>
                <span className="text-xs text-slate-600 dark:text-white/60">25%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`h-1 rounded-full ${i === 0 && isSectionComplete(0) ? 'bg-teal-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-white/20'}`}></div>
                <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Saved {lastSaved}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                Submit for Sign-off
              </button>
              <button className="w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                Save Draft
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Section Content */}
      <div className="lg:col-span-8 flex flex-col overflow-hidden">
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {sections.map((section, idx) => (
            <button
              key={section}
              onClick={() => setActiveSection(idx)}
              className={`
                px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap
                ${activeSection === idx ? 'text-indigo-600 dark:text-white' : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50'}
              `}
            >
              {section}
              {activeSection === idx && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {activeSection === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h3 className="text-xl font-medium text-slate-900 dark:text-white/90">Curriculum Requirements</h3>
                <p className="text-sm text-slate-500 dark:text-white/40 mt-1">{sia} - Level {level}</p>
              </div>

              <div className="space-y-4">
                {requirements.map((req, idx) => (
                  <GlassCard key={idx} className="p-6">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-white/80 mb-6">{req.requirement}</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Trainee Comments</label>
                        <textarea 
                          value={comments[idx] || ''}
                          onChange={(e) => handleCommentChange(idx, e.target.value)}
                          placeholder="Reflect on your performance..."
                          className="w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold block">Linked Evidence</label>
                        <div className="flex flex-wrap gap-2">
                          {(linkedEvidenceData[idx] || []).map(evId => {
                            const ev = INITIAL_EVIDENCE.find(e => e.id === evId);
                            return (
                              <div key={evId} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 text-xs text-indigo-600 dark:text-indigo-300 shadow-sm">
                                <LinkIcon size={12} />
                                {ev?.title || evId}
                                <button className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-400 dark:text-white/40"><Trash2 size={10} /></button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => onLinkRequested(idx)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                          >
                            <Plus size={14} /> Link Evidence
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {activeSection > 0 && (
            <div className="p-20 flex flex-col items-center justify-center text-center opacity-40">
              <ClipboardCheck size={48} className="mb-4 text-slate-400 dark:text-white" />
              <p className="text-lg font-medium text-slate-600 dark:text-white">Requirements TBC</p>
              <p className="text-sm text-slate-400 dark:text-white/60">These sections will be populated based on additional curriculum data.</p>
            </div>
          )}
        </div>

        <div className="pt-6 flex justify-between items-center border-t border-slate-200 dark:border-white/10 mt-6 bg-slate-50/80 dark:bg-[#0d1117]/80 backdrop-blur-md">
          <button 
            disabled={activeSection === 0}
            onClick={() => setActiveSection(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
          >
            <ChevronLeft size={18} /> Previous Section
          </button>

          <div className="flex gap-1.5">
            {sections.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>
            ))}
          </div>

          <button 
            disabled={activeSection === sections.length - 1}
            onClick={() => setActiveSection(s => s + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
          >
            Next Section <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">{label}</label>
    {children}
  </div>
);

export default EPAForm;
