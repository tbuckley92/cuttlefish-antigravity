
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, User,
  Link as LinkIcon, Edit2, ClipboardCheck, CheckCircle2,
  Clock, AlertCircle, Trash2, Plus, ChevronRight as ChevronDown,
  FileText, X, ShieldCheck, Mail, Save, Eye
} from '../components/Icons';
import { uuidv4 } from '../utils/uuid';
import { SignOffDialog } from '../components/SignOffDialog';
import { CURRICULUM_DATA, INITIAL_EVIDENCE, INITIAL_PROFILE } from '../constants';
import { CurriculumRequirement, EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

interface GSATFormProps {
  id?: string;
  initialLevel?: number;
  traineeName?: string;
  initialSection?: number;
  autoScrollToIdx?: number;
  initialStatus?: EvidenceStatus;
  originView?: any; // View enum type
  originFormParams?: any; // FormParams type
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
  onLinkRequested: (reqIndex: number, domain: string, sectionIndex: number) => void;
  onRemoveLink: (reqKey: string, evId: string) => void;
  onViewLinkedEvidence?: (evidenceId: string) => void;
  linkedEvidenceData: Record<string, string[]>; // "domain-reqIndex" -> evidenceIds
  allEvidence?: EvidenceItem[];
  initialSupervisorName?: string;
  initialSupervisorEmail?: string;
  isSupervisor?: boolean;
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
  id,
  initialLevel = 1,
  traineeName,
  initialSection = 0,
  autoScrollToIdx,
  initialStatus = EvidenceStatus.Draft,
  originView,
  originFormParams,
  onBack,
  onSubmitted,
  onSave,
  onLinkRequested,
  onRemoveLink,
  onViewLinkedEvidence,
  linkedEvidenceData,
  allEvidence = [],
  initialSupervisorName,
  initialSupervisorEmail,
  isSupervisor = false
}) => {
  const [formId] = useState(id || uuidv4());
  const [activeSection, setActiveSection] = useState(initialSection);
  const [level, setLevel] = useState(initialLevel);
  const [comments, setComments] = useState<Record<string, string>>({}); // "domain-idx" -> text
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);

  // Supervisor info is auto-filled from profile
  const supervisorName = initialSupervisorName || "";
  const supervisorEmail = initialSupervisorEmail || "";

  const currentDomain = domains[activeSection];
  const domainRequirements = CURRICULUM_DATA.filter(r =>
    r.domain === "Non-patient Management" &&
    r.level === level &&
    r.specialty === currentDomain
  );

  const isLocked = status === EvidenceStatus.SignedOff || (status === EvidenceStatus.Submitted && !isSupervisor) || !!originView;

  // Handle saving data to parent
  const saveToParent = async (newStatus: EvidenceStatus = status, gmc?: string, name?: string, email?: string) => {
    await onSave({
      id: formId,
      title: `GSAT Matrix Level ${level}`,
      type: EvidenceType.GSAT,
      level: level,
      status: newStatus,
      supervisorGmc: gmc,
      supervisorName: name || supervisorName,
      supervisorEmail: email || supervisorEmail,
      date: new Date().toISOString().split('T')[0],
      notes: `GSAT Assessment covering multiple domains. Overall completeness: ${completeness}%`,
      gsatFormData: {
        comments,
        linkedEvidence: linkedEvidenceData || {}
      }
    });
  };

  // Autosave logic
  useEffect(() => {
    if (isLocked) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      saveToParent();
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [isLocked, level, comments, linkedEvidenceData]);

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

  const handleSaveDraft = () => {
    setIsSaving(true);
    saveToParent(EvidenceStatus.Draft);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }, 600);
  };

  const handleEmailForm = async () => {
    setStatus(EvidenceStatus.Submitted);
    await saveToParent(EvidenceStatus.Submitted);
    alert(`GSAT Form emailed to ${supervisorName}`);
    if (onSubmitted) onSubmitted();
  };

  const handleSupervisorSignOff = async () => {
    if (confirm("Are you sure you want to sign off this form as 'Complete'?")) {
      setStatus(EvidenceStatus.SignedOff);
      await saveToParent(EvidenceStatus.SignedOff);
      if (onSubmitted) onSubmitted();
      alert("Form signed off successfully.");
      if (onBack) onBack();
    }
  };

  const handleSignOffConfirm = async (gmc: string, name: string, email: string, signature: string) => {
    setStatus(EvidenceStatus.SignedOff);
    await saveToParent(EvidenceStatus.SignedOff, gmc, name, email);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleCommentChange = (idx: number, text: string) => {
    if (isLocked) return;
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

      <SignOffDialog
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: "GSAT",
          traineeName: traineeName || 'Trainee',
          supervisorEmail: supervisorEmail,
          date: new Date().toLocaleDateString(),
          supervisorName: supervisorName || "Supervisor"
        }}
      />

      {/* Mobile Metadata Summary */}
      <div className="lg:hidden mb-2">
        {originView ? (
          <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-4">
            <ArrowLeft size={14} /> BACK TO FORM
          </button>
        ) : (
          <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <GlassCard className="p-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">GSAT Assessment</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Level {level} • {completeness}% Complete</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {status}
                </span>
              </div>
            </div>
            <div className={`transition-transform duration-300 ${isMetadataExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>

          {isMetadataExpanded && (
            <div className="pt-4 mt-3 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              <MetadataField label="Training Level">
                <select
                  disabled={isLocked}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Date">
                <input disabled={isLocked} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none" />
              </MetadataField>
              <MetadataField label="Educational Supervisor">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-900">{supervisorName || "Awaiting selection"}</p>
                  {supervisorEmail && <p className="text-[10px] text-slate-500">{supervisorEmail}</p>}
                </div>
              </MetadataField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Left Column: Metadata (Desktop Only) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 overflow-y-auto pr-2">
        {originView ? (
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            <ArrowLeft size={16} /> BACK TO FORM
          </button>
        ) : (
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        )}

        <GlassCard className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900">GSAT Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>
          <div className="space-y-6">
            <MetadataField label="Training Level">
              <select
                disabled={isLocked}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
              {!isLocked && <p className="mt-2 text-[10px] text-slate-400 italic">Changing level reloads all outcomes below.</p>}
            </MetadataField>

            <MetadataField label="Assessment Date">
              <input disabled={isLocked} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50" />
            </MetadataField>

            <MetadataField label="Educational Supervisor">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {supervisorName ? supervisorName.split(' ').map(n => n[0]).join('') : <User size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supervisorName || "Awaiting selection"}</p>
                    {supervisorEmail && <p className="text-xs text-slate-500">{supervisorEmail}</p>}
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

            {!isLocked && (
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">Autosaved {lastSaved}</span>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="pt-6 flex flex-col items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                <ShieldCheck className="text-green-500" size={24} />
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Signed Off</p>
                <p className="text-[10px] text-green-600 text-center">Validated by ES: {supervisorName}</p>
              </div>
            )}
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
                const commentValue = comments[`${currentDomain}-${idx}`] || '';
                const isFilled = commentValue.trim() || linkedIds.length > 0;

                return (
                  <GlassCard key={idx} id={`gsat-outcome-${idx}`} className={`p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
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
                          disabled={isLocked}
                          value={comments[`${currentDomain}-${idx}`] || ''}
                          onChange={(e) => handleCommentChange(idx, e.target.value)}
                          placeholder="Provide evidence of your competence in this area..."
                          className={`w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Supporting Evidence</label>
                          {!isLocked && (
                            <button
                              onClick={() => onLinkRequested(idx, currentDomain, activeSection)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-all font-sans"
                            >
                              <Plus size={14} /> Link Record
                            </button>
                          )}
                        </div>

                        {linkedIds.length > 0 ? (
                          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm font-sans">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Type</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">SIA</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-20 text-center">Level</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Date</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Status</th>
                                  {!isLocked && (
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-16 text-center">Actions</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {linkedIds.map(evId => {
                                  const ev = allEvidence.find(e => e.id === evId);
                                  if (!ev) return null;

                                  return (
                                    <tr
                                      key={evId}
                                      className="group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                                      onClick={() => onViewLinkedEvidence?.(evId)}
                                    >
                                      <td className="px-4 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${getLinkedEvidenceTypeColors(ev.type)}`}>
                                          {ev.type}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                                            {ev.title}
                                          </span>
                                          {ev.fileName && (
                                            <div className="flex items-center justify-center w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" title={`Attached: ${ev.fileName}`}>
                                              <FileText size={8} />
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-[10px] text-slate-500 dark:text-white/50">
                                        {ev.sia || '–'}
                                      </td>
                                      <td className="px-4 py-2 text-[10px] text-slate-500 dark:text-white/50 text-center">
                                        {ev.level || '–'}
                                      </td>
                                      <td className="px-4 py-2 text-[10px] text-slate-500 dark:text-white/50 font-mono">
                                        {ev.date}
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${getLinkedEvidenceStatusColors(ev.status)}`}>
                                          {getLinkedEvidenceStatusIcon(ev.status)}
                                          {ev.status}
                                        </span>
                                      </td>
                                      {!isLocked && (
                                        <td className="px-4 py-2">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onViewLinkedEvidence?.(evId);
                                              }}
                                              className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                              title="View evidence"
                                            >
                                              <Eye size={14} />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveLink(reqKey, evId);
                                              }}
                                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                              title="Remove link"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-slate-400 mt-2">No evidence linked yet.</p>
                        )}
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

        {/* Bottom Action Area */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 mt-0 lg:mt-8 flex flex-col gap-4 shadow-2xl lg:shadow-none">

          {/* Row 1: Domain Navigation */}
          <div className="flex justify-between items-center w-full">
            <button
              disabled={activeSection === 0}
              onClick={() => setActiveSection(s => s - 1)}
              className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
            </button>

            <div className="flex gap-1.5 items-center">
              {domains.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${activeSection === i ? 'bg-indigo-500 scale-125' : 'bg-slate-200 dark:bg-white/10'}`}></div>
              ))}
            </div>

            <button
              disabled={activeSection === domains.length - 1}
              onClick={() => setActiveSection(s => s + 1)}
              className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
            </button>
          </div>

          {/* Row 2: Form Actions */}
          <div className="flex items-center justify-end gap-2 lg:gap-3">
            {showSaveMessage && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300 mr-auto">
                Draft saved {lastSaved}
              </span>
            )}

            {!isLocked && !isSupervisor && (
              <>
                <button
                  key="save-draft"
                  onClick={handleSaveDraft}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 text-[10px] lg:text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> <span>SAVE DRAFT</span>
                </button>

                <button
                  key="email-form"
                  onClick={handleEmailForm}
                  className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
                >
                  <Mail size={16} /> <span>EMAIL FORM</span>
                </button>

                <button
                  key="sign-off"
                  onClick={() => setIsSignOffOpen(true)}
                  className="h-10 px-4 rounded-xl bg-green-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <ShieldCheck size={16} /> <span>IN PERSON SIGN OFF</span>
                </button>
              </>
            )}

            {isSupervisor && status === EvidenceStatus.Submitted && (
              <button
                onClick={handleSupervisorSignOff}
                className="h-10 px-6 rounded-xl bg-green-600 text-white text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <ShieldCheck size={18} /> <span>SIGN OFF</span>
              </button>
            )}

            {isLocked && (
              <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-1.5 block">{label}</label>
    {children}
  </div>
);

// Helper functions for linked evidence table styling
const getLinkedEvidenceTypeColors = (type: EvidenceType) => {
  switch (type) {
    case EvidenceType.CbD: return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30';
    case EvidenceType.DOPs: return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30';
    case EvidenceType.OSATs: return 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/20 dark:border-orange-500/30';
    case EvidenceType.CRS: return 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30';
    case EvidenceType.EPA: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
    case EvidenceType.GSAT: return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30';
    default: return 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/20';
  }
};

const getLinkedEvidenceStatusColors = (status: EvidenceStatus) => {
  switch (status) {
    case EvidenceStatus.SignedOff: return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
    case EvidenceStatus.Submitted: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    case EvidenceStatus.Draft: return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40 border border-slate-200 dark:border-white/10';
    default: return 'bg-white/5 text-white/40';
  }
};

const getLinkedEvidenceStatusIcon = (status: EvidenceStatus) => {
  switch (status) {
    case EvidenceStatus.SignedOff: return <ShieldCheck size={10} />;
    case EvidenceStatus.Submitted: return <Clock size={10} />;
    case EvidenceStatus.Draft: return <FileText size={10} />;
    default: return null;
  }
};

export default GSATForm;
