
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, User, 
  Link as LinkIcon, Edit2, ClipboardCheck, CheckCircle2, 
  Clock, AlertCircle, Trash2, Plus, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, X
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { CURRICULUM_DATA, INITIAL_EVIDENCE, SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { CurriculumRequirement, EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

interface EPAFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialSupervisorName?: string;
  initialSupervisorEmail?: string;
  initialSection?: number;
  autoScrollToIdx?: number;
  initialStatus?: EvidenceStatus;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
  onLinkRequested: (reqIndex: number | string, sectionIndex: number) => void;
  onRemoveLink: (reqKey: string, evId: string) => void;
  linkedEvidenceData: Record<string, string[]>;
  allEvidence?: EvidenceItem[];
}

const ALL_SPECIALTIES = ["No attached SIA", ...SPECIALTIES];

const LEVEL_1_SECTIONS = [
  "A. Clinical Skills",
  "B. Theatre Requirements",
  "C. Mandatory & Entrustment"
];

const LEVEL_2_SECTIONS = [
  "A. Learning outcomes",
  "B. Mandatory CRS Forms",
  "C. Mandatory outpatient requirements",
  "D. Mandatory OSATS",
  "E. Mandatory requirements in Theatre",
  "F. Ancillary evidence & Entrustment"
];

const LEVEL_1_CRITERIA = {
  sectionA: [
    "CRS1 Consultation skills",
    "CRS2 Assess vision",
    "CRS3 Assess visual fields",
    "CRS5 External eye examination",
    "CRS6 Assess pupils",
    "CRS7 Assess ocular motility",
    "CRS8 Assess intra‑ocular pressure",
    "CRS9 Slit lamp examination",
    "CRS10a Fundus assessment – direct ophthalmoscope",
    "CRS10b Fundus examination using slit‑lamp condensing lenses (e.g. 90D, 78D or equivalent)",
    "CRS10c Fundus assessment – diagnostic contact lens",
    "CRS08an Gonioscopy",
    "Corneal scrapes",
    "Use an exophthalmometer",
    "Assess lacrimal function",
    "Punctal plug insertion",
    "Interpretation of automated visual fields",
    "Removal of sutures"
  ],
  sectionB: [
    "OSATS Micro‑surgical skills",
    "OSATS Cataract surgery",
    "OSATS Lid surgery",
    "Operating microscope",
    "Removal of sutures (theatre context)"
  ],
  sectionC: [
    "Longitudinal observation by consultant assessor in theatre and simulation setting",
    "Review of record keeping and letters",
    "Case‑based discussions (CbDs)",
    "Confirmation that one or more MARs have been reviewed"
  ]
};

const LEVEL_2_LEARNING_OUTCOMES = [
  "PM2.4 - Understand the environmental impact of eye health.",
  "PM2.3 - Be aware of common public health issues and requirements specific to ophthalmology.",
  "PM2.2 - Refine the differential diagnoses and management plan by application of clinical knowledge.",
  "PM2.1 - Independently manage patients at an appropriate work-rate, employing the most appropriate clinical examination equipment and investigation modalities."
];

const LEVEL_2_CRITERIA = {
  sectionB: [
    "CRS Consultation skills",
    "CRS Indirect ophthalmoscopy",
    "CRS Retinoscopy"
  ],
  sectionC: [
    "Insertion of bandage contact lens",
    "Remove of corneal foreign body",
    "Laser to lens capsule",
    "Laser for raised IOP",
    "Laser retinopexy",
    "Interpret biometry",
    "Interpret orthoptic assessment",
    "Interpret FFA"
  ],
  sectionD: [
    "OSATS Microsurgical skills",
    "OSATS Cataract Surgery",
    "OSATS Lid Surgery"
  ],
  sectionE: [
    "Lateral canthotomy / cantholysis",
    "Interpret biometry"
  ],
  sectionF: [
    "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
    "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
    "Review of record keeping and letters:",
    "Case-based Discussions (CbDs)",
    "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA"
  ]
};

const ENTRUSTMENT_LEVELS = [
  "Observing",
  "Needs Direct Supervision",
  "Needs Indirect Supervision",
  "Competent to this level"
];

const LEVEL_2_GRADING_OPTIONS = [
  "Yes it does (YES)",
  "I have reservations about whether evidence meets standards (RESERVATION)",
  "No it does not (NO)",
  "There is no evidence (NO EVIDENCE)"
];

const EPAForm: React.FC<EPAFormProps> = ({ 
  id,
  sia = "No attached SIA", 
  level = 1, 
  initialSupervisorName = "",
  initialSupervisorEmail = "",
  initialSection = 0,
  autoScrollToIdx,
  initialStatus = EvidenceStatus.Draft,
  onBack, 
  onSubmitted,
  onSave,
  onLinkRequested,
  onRemoveLink,
  linkedEvidenceData,
  allEvidence = []
}) => {
  const [formId] = useState(id || Math.random().toString(36).substr(2, 9));
  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedLevel, setSelectedLevel] = useState(level);
  const [selectedSia, setSelectedSia] = useState(sia);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState<Record<string, string>>({});
  const [entrustment, setEntrustment] = useState("");
  const [aspectsEspeciallyGood, setAspectsEspeciallyGood] = useState("");
  const [additionalEvidenceNeeded, setAdditionalEvidenceNeeded] = useState("");
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [supervisorName, setSupervisorName] = useState(initialSupervisorName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialSupervisorEmail);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);

  const isLocked = status === EvidenceStatus.SignedOff;

  // Level 1 & 2 logic: auto-set subspecialty and disable
  useEffect(() => {
    if (selectedLevel === 1 || selectedLevel === 2) {
      setSelectedSia("No attached SIA");
    }
  }, [selectedLevel]);

  // Reset activeSection when level changes
  useEffect(() => {
    setActiveSection(0);
  }, [selectedLevel]);

  // Handle saving data to parent
  const saveToParent = (newStatus: EvidenceStatus = status) => {
    onSave({
      id: formId,
      title: `EPA Level ${selectedLevel}: ${selectedSia === 'No attached SIA' ? 'General' : selectedSia}`,
      type: EvidenceType.EPA,
      sia: selectedSia,
      level: selectedLevel,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      notes: `EPA Assessment with ${supervisorName}. Overall Judgement: ${entrustment || 'N/A'}`,
      epaFormData: {
        comments,
        grading,
        entrustment,
        supervisorName,
        supervisorEmail,
        linkedEvidence: linkedEvidenceData || {},
        aspectsEspeciallyGood: selectedLevel === 2 ? aspectsEspeciallyGood : undefined,
        additionalEvidenceNeeded: selectedLevel === 2 ? additionalEvidenceNeeded : undefined
      }
    });
  };

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
  }, [isLocked, selectedLevel, selectedSia, supervisorName, entrustment, comments, grading, aspectsEspeciallyGood, additionalEvidenceNeeded, linkedEvidenceData]);

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

  const handleEmailForm = () => {
    if (!supervisorName || !supervisorEmail) {
      alert("Please provide supervisor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    saveToParent(EvidenceStatus.Submitted);
    alert("Form emailed to supervisor");
    onSubmitted?.();
  };

  const handleSignOffConfirm = (gmc: string) => {
    setStatus(EvidenceStatus.SignedOff);
    saveToParent(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    alert(`EPA Marked Complete by ${supervisorName} (GMC: ${gmc})`);
  };

  const handleCommentChange = (key: string, text: string) => {
    if (isLocked) return;
    setComments(prev => ({ ...prev, [key]: text }));
  };

  const handleGradingChange = (key: string, value: string) => {
    if (isLocked) return;
    setGrading(prev => ({ ...prev, [key]: value }));
  };

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const newGrading = { ...grading };
    
    if (selectedLevel === 1) {
      const sectionKey = activeSection === 0 ? 'A' : activeSection === 1 ? 'B' : 'C';
      const criteria = activeSection === 0 ? LEVEL_1_CRITERIA.sectionA : activeSection === 1 ? LEVEL_1_CRITERIA.sectionB : LEVEL_1_CRITERIA.sectionC;
      criteria.forEach((_, idx) => {
        newGrading[`EPA-${sectionKey}-${idx}`] = "Meets expectations";
      });
    } else if (selectedLevel === 2) {
      const sectionKey = activeSection === 1 ? 'B' : activeSection === 2 ? 'C' : activeSection === 3 ? 'D' : activeSection === 4 ? 'E' : 'F';
      let criteria: string[] = [];
      if (activeSection === 1) criteria = LEVEL_2_CRITERIA.sectionB;
      else if (activeSection === 2) criteria = LEVEL_2_CRITERIA.sectionC;
      else if (activeSection === 3) criteria = LEVEL_2_CRITERIA.sectionD;
      else if (activeSection === 4) criteria = LEVEL_2_CRITERIA.sectionE;
      else if (activeSection === 5) criteria = LEVEL_2_CRITERIA.sectionF;
      criteria.forEach((_, idx) => {
        newGrading[`EPA-${sectionKey}-${idx}`] = "Yes it does (YES)";
      });
    } else {
      const criteria = CURRICULUM_DATA.filter(r => (selectedSia === "No attached SIA" ? r.specialty === "Oculoplastics" : r.specialty === selectedSia) && r.level === selectedLevel);
      criteria.forEach((_, idx) => {
        newGrading[`EPA-GEN-${idx}`] = "Meets expectations";
      });
    }
    
    setGrading(newGrading);
  };

  const renderCriterion = (req: string, idx: number, sectionKey: string, showCommentForAll: boolean = false) => {
    const reqKey = `EPA-${sectionKey}-${idx}`;
    const linkedIds = linkedEvidenceData[reqKey] || [];
    const isLevel2 = selectedLevel === 2;
    const gradingOptions = isLevel2 ? LEVEL_2_GRADING_OPTIONS : ["Major concerns", "Minor concerns", "Meets expectations"];
    const currentGrading = grading[reqKey] || "";
    const showCommentBox = isLevel2 && (showCommentForAll || currentGrading === "I have reservations about whether evidence meets standards (RESERVATION)" || currentGrading === "No it does not (NO)" || currentGrading === "There is no evidence (NO EVIDENCE)");

    return (
      <GlassCard key={reqKey} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
        <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{req}</p>
        
        {isLevel2 && (
          <p className="text-xs text-slate-500 dark:text-white/40 mb-4">Does this evidence meet standards?</p>
        )}
        
        {/* Grading Radios */}
        <div className="flex flex-wrap gap-2 mb-6">
          {gradingOptions.map(opt => (
            <button
              key={opt}
              disabled={isLocked}
              onClick={() => handleGradingChange(reqKey, opt)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${currentGrading === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(showCommentBox || !isLevel2) && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                {isLevel2 ? "Comments" : "Comments (Optional)"}
              </label>
              <textarea 
                disabled={isLocked}
                value={comments[reqKey] || ''}
                onChange={(e) => handleCommentChange(reqKey, e.target.value.slice(0, 1000))}
                placeholder={isLevel2 ? "Enter comments..." : "Add clinical observations or context..."}
                className={`w-full min-h-[60px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
              />
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold block">Linked Evidence</label>
              {!isLocked && (
                <button 
                  onClick={() => onLinkRequested(reqKey, activeSection)} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all"
                >
                  <Plus size={14} /> Link Evidence
                </button>
              )}
            </div>
            
            {linkedIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {linkedIds.map(evId => {
                  const ev = allEvidence.find(e => e.id === evId);
                  return (
                    <div key={evId} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-indigo-50/5 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 text-xs text-indigo-600 dark:text-indigo-300">
                      <LinkIcon size={12} />
                      <span className="max-w-[120px] truncate">{ev?.title || evId}</span>
                      {!isLocked && (
                        <button 
                          onClick={() => onRemoveLink(reqKey, evId)}
                          className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !isLocked && (
              <p className="text-[10px] italic text-slate-400 dark:text-white/20">No evidence linked yet.</p>
            )}
          </div>
        </div>
      </GlassCard>
    );
  };

  const renderLearningOutcomes = () => {
    return (
      <div className="space-y-4">
        {LEVEL_2_LEARNING_OUTCOMES.map((outcome, idx) => (
          <GlassCard key={idx} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white/90">{outcome}</p>
          </GlassCard>
        ))}
      </div>
    );
  };

  const completeness = "0"; // Placeholder for simplified demo

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      <SignOffDialog 
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: `EPA Level ${selectedLevel}`,
          traineeName: INITIAL_PROFILE.name,
          date: new Date().toLocaleDateString(),
          supervisorName: supervisorName || "Supervisor"
        }}
      />

      {/* Mobile Metadata Summary & Editor */}
      <div className="lg:hidden mb-2">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40 mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <GlassCard className="p-4">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedSia}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Level {selectedLevel} • {completeness}% Complete</p>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {status}
                </span>
              </div>
            </div>
            <div className={`transition-transform duration-300 ${isMetadataExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
          
          {isMetadataExpanded && (
            <div className="pt-4 mt-3 border-t border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
              <MetadataField label="Level">
                <select 
                  disabled={isLocked} 
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                >
                  {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Specialty / SIA">
                <select 
                  disabled={isLocked || selectedLevel === 1 || selectedLevel === 2} 
                  value={selectedSia}
                  onChange={(e) => setSelectedSia(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-50"
                >
                  {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Date">
                <input disabled={isLocked} type="date" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
              </MetadataField>
              <MetadataField label="Supervisor">
                <div className="space-y-2">
                  <input disabled={isLocked} type="text" placeholder="Name" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                  <input disabled={isLocked} type="email" placeholder="Email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                </div>
              </MetadataField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Left Column: Metadata (Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 transition-colors mb-2"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90">EPA Final Record</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>
          <div className="space-y-6">
            <MetadataField label="EPA Level">
              <select 
                disabled={isLocked} 
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Subspecialty">
              <select 
                disabled={isLocked || selectedLevel === 1 || selectedLevel === 2} 
                value={selectedSia}
                onChange={(e) => setSelectedSia(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
              >
                {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {(selectedLevel === 1 || selectedLevel === 2) && (
                <p className="mt-1.5 text-[10px] text-slate-400 italic">Level {selectedLevel} assessments are generic/core.</p>
              )}
            </MetadataField>
            
            <MetadataField label="Assessment Date">
              <input disabled={isLocked} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
            </MetadataField>
            
            <MetadataField label="Supervisor">
              <div className="space-y-2">
                <input disabled={isLocked} type="text" placeholder="Supervisor Name" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                <input disabled={isLocked} type="email" placeholder="Supervisor Email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
            </MetadataField>

            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 uppercase font-semibold">Progress</span>
                <span className="text-xs text-slate-600">
                  {selectedLevel === 1 ? '3 Sections' : selectedLevel === 2 ? '6 Sections' : 'EPA Details'}
                </span>
              </div>
              <div className={`grid gap-2 ${selectedLevel === 1 ? 'grid-cols-3' : selectedLevel === 2 ? 'grid-cols-6' : 'grid-cols-1'}`}>
                {selectedLevel === 1 ? LEVEL_1_SECTIONS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                )) : selectedLevel === 2 ? LEVEL_2_SECTIONS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                )) : (
                  <div className="h-1 col-span-3 rounded-full bg-indigo-500"></div>
                )}
              </div>
            </div>

            {isLocked && (
              <div className="pt-6 flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-2xl">
                <ShieldCheck className="text-green-500" size={24} />
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">COMPLETE</p>
                <p className="text-[10px] text-green-600 dark:text-green-500 text-center">Validated by {supervisorName}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Section Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        {(selectedLevel === 1 || selectedLevel === 2) && (
          <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
            {(selectedLevel === 1 ? LEVEL_1_SECTIONS : LEVEL_2_SECTIONS).map((section, idx) => (
              <button
                key={section}
                onClick={() => setActiveSection(idx)}
                className={`
                  px-4 py-2 text-[10px] lg:text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap
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
        )}

        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 dark:text-white/90">
                {selectedLevel === 1 ? LEVEL_1_SECTIONS[activeSection] : selectedLevel === 2 ? LEVEL_2_SECTIONS[activeSection] : `EPA Level ${selectedLevel} Requirements`}
              </h3>
              {!isLocked && selectedLevel === 1 && activeSection !== 2 && (
                <button 
                  onClick={handleMarkAllMeets}
                  className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                >
                  MARK ALL 'MEETS EXPECTATIONS'
                </button>
              )}
              {!isLocked && selectedLevel === 2 && (activeSection === 1 || activeSection === 2 || activeSection === 3 || activeSection === 4) && (
                <button 
                  onClick={handleMarkAllMeets}
                  className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                >
                  MARK ALL AS YES
                </button>
              )}
            </div>

            <div className="space-y-4">
              {selectedLevel === 1 ? (
                <>
                  {activeSection === 0 && LEVEL_1_CRITERIA.sectionA.map((req, idx) => renderCriterion(req, idx, 'A'))}
                  {activeSection === 1 && LEVEL_1_CRITERIA.sectionB.map((req, idx) => renderCriterion(req, idx, 'B'))}
                  {activeSection === 2 && (
                    <>
                      <div className="space-y-4 mb-8">
                        {LEVEL_1_CRITERIA.sectionC.map((req, idx) => renderCriterion(req, idx, 'C'))}
                      </div>

                      <GlassCard className="p-6 border-indigo-500/20 bg-indigo-500/[0.02]">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white/90 mb-4 uppercase tracking-widest">
                          Overall judgement of entrustment
                        </h4>
                        <p className="text-xs text-slate-500 mb-6">Please select the level of entrustment for this trainee at this stage of their training.</p>
                        <div className="space-y-3">
                          {ENTRUSTMENT_LEVELS.map(lvl => (
                            <label 
                              key={lvl}
                              className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${entrustment === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'}`}
                            >
                              <input 
                                type="radio" 
                                name="entrustment" 
                                className="hidden" 
                                disabled={isLocked}
                                checked={entrustment === lvl}
                                onChange={() => setEntrustment(lvl)}
                              />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${entrustment === lvl ? 'border-white' : 'border-slate-300 dark:border-white/20'}`}>
                                {entrustment === lvl && <div className="w-2.5 h-2.5 rounded-full bg-white animate-in zoom-in-50"></div>}
                              </div>
                              <span className="text-sm font-semibold">{lvl}</span>
                            </label>
                          ))}
                        </div>
                      </GlassCard>
                    </>
                  )}
                </>
              ) : selectedLevel === 2 ? (
                <>
                  {activeSection === 0 && renderLearningOutcomes()}
                  {activeSection === 1 && LEVEL_2_CRITERIA.sectionB.map((req, idx) => renderCriterion(req, idx, 'B'))}
                  {activeSection === 2 && (
                    <>
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-white/70 italic">
                          The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                        </p>
                      </div>
                      {LEVEL_2_CRITERIA.sectionC.map((req, idx) => renderCriterion(req, idx, 'C'))}
                    </>
                  )}
                  {activeSection === 3 && LEVEL_2_CRITERIA.sectionD.map((req, idx) => renderCriterion(req, idx, 'D'))}
                  {activeSection === 4 && (
                    <>
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-white/70 italic">
                          The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                        </p>
                      </div>
                      {LEVEL_2_CRITERIA.sectionE.map((req, idx) => renderCriterion(req, idx, 'E'))}
                    </>
                  )}
                  {activeSection === 5 && (
                    <>
                      <div className="space-y-4 mb-8">
                        {LEVEL_2_CRITERIA.sectionF.map((req, idx) => renderCriterion(req, idx, 'F', true))}
                      </div>

                      <GlassCard className="p-6 border-indigo-500/20 bg-indigo-500/[0.02]">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white/90 mb-4 uppercase tracking-widest">
                          Section F: Entrustment
                        </h4>
                        <p className="text-xs text-slate-500 mb-6">Based on my observations and the evidence indicated I consider that the overall level of entrustment for this trainee is</p>
                        <div className="space-y-3 mb-6">
                          {ENTRUSTMENT_LEVELS.map(lvl => (
                            <label 
                              key={lvl}
                              className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${entrustment === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50'}`}
                            >
                              <input 
                                type="radio" 
                                name="entrustment" 
                                className="hidden" 
                                disabled={isLocked}
                                checked={entrustment === lvl}
                                onChange={() => setEntrustment(lvl)}
                              />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${entrustment === lvl ? 'border-white' : 'border-slate-300 dark:border-white/20'}`}>
                                {entrustment === lvl && <div className="w-2.5 h-2.5 rounded-full bg-white animate-in zoom-in-50"></div>}
                              </div>
                              <span className="text-sm font-semibold">{lvl}</span>
                            </label>
                          ))}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
                              Please note any aspects which were especially good: <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              disabled={isLocked}
                              value={aspectsEspeciallyGood}
                              onChange={(e) => setAspectsEspeciallyGood(e.target.value)}
                              className="w-full min-h-[100px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                              placeholder="Enter aspects which were especially good..."
                            />
                          </div>

                          {entrustment !== "Competent to this level" && entrustment !== "" && (
                            <div>
                              <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
                                Please indicate what additional evidence is needed to reach that level of entrustment if you are unable to recommend the appropriate level of entrustment due to limited evidence:
                              </label>
                              <textarea
                                disabled={isLocked}
                                value={additionalEvidenceNeeded}
                                onChange={(e) => setAdditionalEvidenceNeeded(e.target.value)}
                                className="w-full min-h-[100px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                                placeholder="Enter additional evidence needed..."
                              />
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </>
                  )}
                </>
              ) : (
                CURRICULUM_DATA
                  .filter(r => (selectedSia === "No attached SIA" ? r.specialty === "Oculoplastics" : r.specialty === selectedSia) && r.level === selectedLevel)
                  .map((req, idx) => renderCriterion(req.requirement, idx, 'GEN'))
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 mt-0 lg:mt-6 flex flex-col gap-4 shadow-2xl lg:shadow-none">
          
          {/* Row 1: Navigation (Only for Level 1 and 2) */}
          {(selectedLevel === 1 || selectedLevel === 2) && (
            <div className="flex justify-between items-center w-full">
              <button 
                disabled={activeSection === 0}
                onClick={() => setActiveSection(s => s - 1)}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
              >
                <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
              </button>
              <div className="flex gap-1.5">
                {(selectedLevel === 1 ? LEVEL_1_SECTIONS : LEVEL_2_SECTIONS).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>
                ))}
              </div>
              <button 
                disabled={activeSection === (selectedLevel === 1 ? LEVEL_1_SECTIONS.length : LEVEL_2_SECTIONS.length) - 1}
                onClick={() => setActiveSection(s => s + 1)}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
              >
                <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Row 2: Form Actions */}
          <div className="flex items-center justify-end gap-2 lg:gap-3">
            {showSaveMessage && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300 mr-auto">
                Draft saved {lastSaved}
              </span>
            )}
            
            {!isLocked && (
              <>
                <button 
                  onClick={handleSaveDraft}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 text-[10px] lg:text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> <span>SAVE DRAFT</span>
                </button>
                
                <button 
                  onClick={handleEmailForm}
                  className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
                >
                  <Mail size={16} /> <span>EMAIL FORM</span>
                </button>
                
                <button 
                  onClick={() => setIsSignOffOpen(true)}
                  className="h-10 px-4 rounded-xl bg-green-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <ShieldCheck size={16} /> <span>IN PERSON SIGN OFF</span>
                </button>
              </>
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

export default EPAForm;
