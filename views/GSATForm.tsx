
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, User, 
  Link as LinkIcon, Edit2, ClipboardCheck, CheckCircle2, 
  Clock, AlertCircle, Trash2, Plus, ChevronRight as ChevronDown,
  FileText, X
} from '../components/Icons';
import { CURRICULUM_DATA, INITIAL_EVIDENCE, INITIAL_PROFILE } from '../constants';
import { CurriculumRequirement, EvidenceItem } from '../types';

interface GSATFormProps {
  initialLevel?: number;
  initialSection?: number;
  autoScrollToIdx?: number;
  onBack: () => void;
  onLinkRequested: (reqIndex: number, domain: string, sectionIndex: number) => void;
  onRemoveLink: (reqKey: string, evId: string) => void;
  linkedEvidenceData: Record<string, string[]>; // "domain-reqIndex" -> evidenceIds
}

const domains = [
  "Research and Scholarship",
  "Education and Training",
  "Safeguarding and Holistic Patient Care",
  "Patient Safety and Quality Improvement",
  "Leadership and Team Working",
  "Health Promotion"
];

const GSATForm: React.FC<GSATFormProps> = ({ 
  initialLevel = 1, 
  initialSection = 0,
  autoScrollToIdx,
  onBack, 
  onLinkRequested,
  onRemoveLink,
  linkedEvidenceData 
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [level, setLevel] = useState(initialLevel);
  const [comments, setComments] = useState<Record<string, string>>({}); // "domain-idx" -> text
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Supervisor info is auto-filled from profile as per PRD
  const supervisorName = INITIAL_PROFILE.supervisorName;
  const supervisorEmail = INITIAL_PROFILE.supervisorEmail;

  const currentDomain = domains[activeSection];
  const domainRequirements = CURRICULUM_DATA.filter(r => 
    r.domain === "Non-patient Management" && 
    r.level === level && 
    r.specialty === currentDomain
  );

  // Autosave simulation
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

  // Handle auto-scrolling to linked outcome on return
  useEffect(() => {
    if (autoScrollToIdx !== undefined) {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`gsat-outcome-${autoScrollToIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          el.classList.add('ring-2', 'ring-indigo-500/50');
          setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 2000);
        }
      }, 400);
      return () => clearTimeout(scrollTimer);
    }
  }, [autoScrollToIdx, activeSection]);

  const handleCommentChange = (idx: number, text: string) => {
    setComments(prev => ({ ...prev, [`${currentDomain}-${idx}`]: text }));
  };

  const isRequirementComplete = (domain: string, idx: number) => {
    const key = `GSAT-${domain}-${idx}`;
    return (comments[`${domain}-${idx}`] && comments[`${domain}-${idx}`].length > 5) || (linkedEvidenceData[key] && linkedEvidenceData[key].length > 0);
  };

  const isSectionComplete = (idx: number) => {
    const domain = domains[idx];
    const requirements = CURRICULUM_DATA.filter(r => 
      r.domain === "Non-patient Management" && 
      r.level === level && 
      r.specialty === domain
    );
    if (requirements.length === 0) return true; // Mark complete if no requirements for this level
    return requirements.every((_, i) => isRequirementComplete(domain, i));
  };

  const completeness = (domains.filter((_, i) => isSectionComplete(i)).length / domains.length * 100).toFixed(0);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      {/* Mobile Metadata Summary */}
      <div className="lg:hidden mb-2">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <GlassCard className="p-4">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">GSAT Assessment</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Level {level} • {completeness}% Complete</p>
            </div>
            <div className={`transition-transform duration-300 ${isMetadataExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
          
          {isMetadataExpanded && (
            <div className="pt-4 mt-3 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              <MetadataField label="Training Level">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Date">
                <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none" />
              </MetadataField>
              <MetadataField label="Educational Supervisor">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-900">{supervisorName}</p>
                  <p className="text-[10px] text-slate-500">{supervisorEmail}</p>
                </div>
              </MetadataField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Left Column: Metadata (Desktop Only) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">GSAT Sign-off</h2>
          <div className="space-y-6">
            <MetadataField label="Training Level">
              <select 
                value={level} 
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
              <p className="mt-2 text-[10px] text-slate-400 italic">Changing level reloads all outcomes below.</p>
            </MetadataField>

            <MetadataField label="Assessment Date">
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50" />
            </MetadataField>

            <MetadataField label="Educational Supervisor">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {supervisorName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supervisorName}</p>
                    <p className="text-xs text-slate-500">{supervisorEmail}</p>
                  </div>
                </div>
              </div>
            </MetadataField>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Overall Progress</span>
                <span className="text-xs text-slate-600 font-bold">{completeness}%</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {domains.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full ${isSectionComplete(i) ? 'bg-teal-500 shadow-sm' : 'bg-slate-200'}`}></div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Autosaved {lastSaved}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">Submit for Sign-off</button>
              <button className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Save Draft</button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Domains */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
          {domains.map((domain, idx) => (
            <button
              key={domain}
              onClick={() => setActiveSection(idx)}
              className={`
                px-4 py-2 text-[10px] lg:text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap
                ${activeSection === idx ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              {domain.split(' ').slice(0, 2).join(' ')}...
              {activeSection === idx && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-slate-900">{currentDomain}</h3>
              <p className="text-sm text-slate-500 mt-1">Review learning outcomes for Level {level}</p>
            </div>

            <div className="space-y-4">
              {domainRequirements.map((req, idx) => {
                const reqKey = `GSAT-${currentDomain}-${idx}`;
                const linkedIds = linkedEvidenceData[reqKey] || [];
                
                return (
                  <GlassCard key={idx} id={`gsat-outcome-${idx}`} className="p-6 transition-all duration-300">
                    <div className="flex gap-4 items-start mb-6">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                        {idx + 1}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700 font-medium">{req.requirement}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Trainee Reflection</label>
                        <textarea 
                          value={comments[`${currentDomain}-${idx}`] || ''}
                          onChange={(e) => handleCommentChange(idx, e.target.value)}
                          placeholder="Provide evidence of your competence in this area..."
                          className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 outline-none focus:border-indigo-500/40 transition-all resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Supporting Evidence</label>
                        <div className="flex flex-wrap gap-2">
                          {linkedIds.map(evId => {
                            const ev = INITIAL_EVIDENCE.find(e => e.id === evId);
                            return (
                              <div key={evId} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-medium text-indigo-600">
                                <LinkIcon size={10} />
                                <span className="max-w-[150px] truncate">{ev?.title || "Evidence Record"}</span>
                                <button 
                                  onClick={() => onRemoveLink(reqKey, evId)}
                                  className="p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => onLinkRequested(idx, currentDomain, activeSection)} 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all"
                          >
                            <Plus size={14} /> Link Record
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {domainRequirements.length === 0 && (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center text-center">
                  <AlertCircle size={32} className="text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No outcomes defined for Level {level}</p>
                  <p className="text-xs text-slate-400 mt-1">This domain may not be required until a higher training grade.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 mt-0 lg:mt-6 flex justify-between items-center shadow-2xl lg:shadow-none">
          <button 
            disabled={activeSection === 0}
            onClick={() => setActiveSection(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-0"
          >
            <ChevronLeft size={18} /> Previous Domain
          </button>

          <div className="flex gap-2">
            {domains.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${activeSection === i ? 'bg-indigo-500 scale-125' : 'bg-slate-200'}`}></div>
            ))}
          </div>

          {activeSection === domains.length - 1 ? (
             <button className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20">
                Finish & Submit
             </button>
          ) : (
            <button 
              onClick={() => setActiveSection(s => s + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
            >
              Next Domain <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default GSATForm;
