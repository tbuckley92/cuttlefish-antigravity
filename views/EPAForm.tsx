
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, User, 
  Link as LinkIcon, Edit2, ClipboardCheck, CheckCircle2, 
  Clock, AlertCircle, Trash2, Plus, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, X, Eye
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { CURRICULUM_DATA, INITIAL_EVIDENCE, SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { EPA_SPECIALTY_DATA } from '../constants/epaSpecialtyData';
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
  originView?: any; // View enum type
  originFormParams?: any; // FormParams type
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
  onLinkRequested: (reqIndex: number | string, sectionIndex: number) => void;
  onRemoveLink: (reqKey: string, evId: string) => void;
  onViewLinkedEvidence?: (evidenceId: string, section?: number) => void;
  linkedEvidenceData: Record<string, string[]>;
  allEvidence?: EvidenceItem[];
}

const ALL_SPECIALTIES = ["No attached SIA", ...SPECIALTIES];

const LEVEL_1_SECTIONS = [
  "A. Learning outcomes",
  "B. Mandatory CRS Forms",
  "C. Mandatory outpatient requirements",
  "D. Mandatory OSATS",
  "E. Mandatory requirements in Theatre",
  "F. Ancillary evidence & Entrustment"
];

const LEVEL_2_SECTIONS = [
  "A. Learning outcomes",
  "B. Mandatory CRS Forms",
  "C. Mandatory outpatient requirements",
  "D. Mandatory OSATS",
  "E. Mandatory requirements in Theatre",
  "F. Ancillary evidence & Entrustment"
];

const LEVEL_3_SECTIONS = [
  "A. Learning outcomes",
  "B. Mandatory CRS Forms",
  "C. Mandatory outpatient requirements",
  "D. Mandatory OSATS",
  "E. Mandatory requirements in Theatre",
  "F. Ancillary evidence & Entrustment"
];

const LEVEL_1_LEARNING_OUTCOMES = [
  "PM1.6 - Communicate and deliver feedback to referrers and patients to support integrated care.",
  "PM1.5 - Understand the role of a Community Ophthalmology Service.",
  "PM1.4 - Work effectively with patients and the multi-professional team.",
  "PM1.3 - Justify the diagnoses and plan with reference to basic and clinical science.",
  "PM1.2 - Independently formulate and initiate a management plan for low complexity cases.",
  "PM1.1 - Independently perform a patient assessment and investigations sufficient to identify, describe and interpret clinical findings to arrive at differential diagnoses."
];

const LEVEL_1_CRITERIA = {
  sectionB: [
    "CRS Consultation skills",
    "CRS Vision",
    "CRS Fields",
    "CRS External eye",
    "CRS Pupil",
    "CRS Ocular Motility",
    "CRS IOP",
    "CRS Slit lamp",
    "CRS Direct ophthalmoscopy",
    "CRS 78D/90D",
    "CRS Contact lens",
    "CRS Gonioscopy"
  ],
  sectionC: [
    "Corneal scrape",
    "Use an exophthalmometer",
    "Assess lacrimal function",
    "Punctal plug insertion",
    "Interpretation of automated visual fields"
  ],
  sectionD: [
    "OSATS Microsurgical skills",
    "OSATS Cataract Surgery",
    "OSATS Lid Surgery"
  ],
  sectionE: [
    "Operating microscope"
  ],
  sectionF: [
    "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
    "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
    "Review of record keeping and letters:",
    "Case-based Discussions (CbDs)",
    "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA"
  ]
};

const LEVEL_2_LEARNING_OUTCOMES = [
  "PM2.4 - Understand the environmental impact of eye health.",
  "PM2.3 - Be aware of common public health issues and requirements specific to ophthalmology.",
  "PM2.2 - Refine the differential diagnoses and management plan by application of clinical knowledge.",
  "PM2.1 - Independently manage patients at an appropriate work-rate, employing the most appropriate clinical examination equipment and investigation modalities."
];

// Level 3 and Level 4 data is now loaded from CSV via constants/epaSpecialtyData.ts

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
  originView,
  originFormParams,
  onBack, 
  onSubmitted,
  onSave,
  onLinkRequested,
  onRemoveLink,
  onViewLinkedEvidence,
  linkedEvidenceData,
  allEvidence = []
}) => {
  // #region agent log
  // Log the actual props object to see what React is passing
  const propsObj = {id, sia, level, initialSupervisorName, initialSupervisorEmail, initialSection, autoScrollToIdx, initialStatus, originView, originFormParams, onBack, onSubmitted, onSave, onLinkRequested, onRemoveLink, onViewLinkedEvidence, linkedEvidenceData, allEvidence};
  const receivedProps = {
    hasOnViewLinkedEvidence: !!onViewLinkedEvidence,
    onViewLinkedEvidenceType: typeof onViewLinkedEvidence,
    onViewLinkedEvidenceValue: onViewLinkedEvidence ? 'defined' : 'undefined',
    allPropsReceived: Object.keys(propsObj),
    onViewLinkedEvidenceInProps: 'onViewLinkedEvidence' in propsObj,
    onViewLinkedEvidenceValueInProps: propsObj.onViewLinkedEvidence ? 'defined' : 'undefined'
  };
  console.log('EPAForm.tsx: Props received, onViewLinkedEvidence:', onViewLinkedEvidence, 'in props:', 'onViewLinkedEvidence' in propsObj, 'propsObj.onViewLinkedEvidence:', propsObj.onViewLinkedEvidence);
  fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EPAForm.tsx:189',message:'EPAForm props received',data:receivedProps,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e)=>{console.error('Log fetch failed:',e);});
  // #endregion
  const [formId] = useState(id || Math.random().toString(36).substr(2, 9));
  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedLevel, setSelectedLevel] = useState(level);
  const [selectedSia, setSelectedSia] = useState(sia);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState<Record<string, string>>({});
  const [entrustment, setEntrustment] = useState("");
  const [aspectsEspeciallyGood, setAspectsEspeciallyGood] = useState("");
  const [additionalEvidenceNeeded, setAdditionalEvidenceNeeded] = useState("");
  const [traineeNarrative, setTraineeNarrative] = useState("");
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [supervisorName, setSupervisorName] = useState(initialSupervisorName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialSupervisorEmail);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);

  // Lock based on status only (Submitted or SignedOff/Complete)
  const isLocked = status === EvidenceStatus.SignedOff || status === EvidenceStatus.Submitted;
  
  // When viewing linked evidence (has originFormParams), force read-only mode
  const isReadOnly = isLocked || !!originFormParams;

  // Determine back button text based on origin
  const backButtonText = originFormParams ? 'Back to Form' : originView ? 'Back to Evidence' : 'Back';

  // Level 1, 2 & 3/4 logic: auto-set subspecialty and disable
  useEffect(() => {
    if (selectedLevel === 1 || selectedLevel === 2) {
      setSelectedSia("No attached SIA");
    } else if (selectedLevel === 3 || selectedLevel === 4) {
      // For Level 3/4, set to first available specialty in the data, or keep current if valid
      const availableSpecialties = EPA_SPECIALTY_DATA[selectedLevel] ? Object.keys(EPA_SPECIALTY_DATA[selectedLevel]) : [];
      if (availableSpecialties.length > 0) {
        // Use case-insensitive matching to prevent accidental reset due to minor casing differences (e.g. "Neuro-Ophthalmology" vs "Neuro-ophthalmology")
        const currentSiaLower = selectedSia.toLowerCase();
        const matchingSpecialty = availableSpecialties.find(s => s.toLowerCase() === currentSiaLower);
        
        if (matchingSpecialty) {
          // If match exists but casing is different, update to the correct casing from data
          if (matchingSpecialty !== selectedSia) {
            setSelectedSia(matchingSpecialty);
          }
        } else {
          // No match at all, default to first available
          setSelectedSia(availableSpecialties[0]);
        }
      }
    }
  }, [selectedLevel]);

  // Reset activeSection when level changes
  useEffect(() => {
    setActiveSection(0);
  }, [selectedLevel]);

  // Update activeSection when initialSection changes (e.g., when returning from linking evidence)
  useEffect(() => {
    if (initialSection !== undefined) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Handle auto-scrolling to linked criterion on return
  useEffect(() => {
    if (autoScrollToIdx !== undefined && activeSection !== undefined) {
      const scrollTimer = setTimeout(() => {
        // Try to find the criterion element by its key
        const sectionKey = activeSection === 0 ? 'A' : activeSection === 1 ? 'B' : activeSection === 2 ? 'C' : activeSection === 3 ? 'D' : activeSection === 4 ? 'E' : 'F';
        const levelPrefix = selectedLevel === 1 ? 'L1' : selectedLevel === 2 ? 'L2' : selectedLevel === 3 ? 'L3' : selectedLevel === 4 ? 'L4' : '';
        const reqKey = `EPA-${levelPrefix}-${sectionKey}-${autoScrollToIdx}`;
        const el = document.getElementById(`epa-criterion-${reqKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          el.classList.add('ring-2', 'ring-indigo-500/50');
          setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 2000);
        }
      }, 400);
      return () => clearTimeout(scrollTimer);
    }
  }, [autoScrollToIdx, activeSection, selectedLevel]);

  // Load saved form data when editing (filtered by level)
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.EPA);
      if (savedForm?.epaFormData) {
        const levelPrefix = selectedLevel === 1 ? 'EPA-L1-' : selectedLevel === 2 ? 'EPA-L2-' : selectedLevel === 3 ? 'EPA-L3-' : selectedLevel === 4 ? 'EPA-L4-' : '';
        
        // Load grading filtered by level
        const levelGrading: Record<string, string> = {};
        if (savedForm.epaFormData.grading && levelPrefix) {
          Object.keys(savedForm.epaFormData.grading).forEach(key => {
            if (key.startsWith(levelPrefix)) {
              levelGrading[key] = savedForm.epaFormData.grading[key];
            }
          });
        }
        setGrading(levelGrading);
        
        // Load comments filtered by level
        const levelComments: Record<string, string> = {};
        if (savedForm.epaFormData.comments && levelPrefix) {
          Object.keys(savedForm.epaFormData.comments).forEach(key => {
            if (key.startsWith(levelPrefix)) {
              levelComments[key] = savedForm.epaFormData.comments[key];
            }
          });
        }
        setComments(levelComments);
        
        // Load other fields
        if (savedForm.epaFormData.entrustment) {
          setEntrustment(savedForm.epaFormData.entrustment);
        }
        if (savedForm.epaFormData.aspectsEspeciallyGood) {
          setAspectsEspeciallyGood(savedForm.epaFormData.aspectsEspeciallyGood);
        }
        if (savedForm.epaFormData.additionalEvidenceNeeded) {
          setAdditionalEvidenceNeeded(savedForm.epaFormData.additionalEvidenceNeeded);
        }
        // Preserve current traineeNarrative if it has content and saved is empty/undefined
        // Only update if saved has a value or current is empty
        if (savedForm.epaFormData.traineeNarrative !== undefined) {
          setTraineeNarrative(prev => {
            // If current has content and saved is empty, preserve current
            if (prev && !savedForm.epaFormData.traineeNarrative) {
              return prev;
            }
            // Otherwise use saved value
            return savedForm.epaFormData.traineeNarrative || "";
          });
        }
        if (savedForm.epaFormData.supervisorName) {
          setSupervisorName(savedForm.epaFormData.supervisorName);
        }
        if (savedForm.epaFormData.supervisorEmail) {
          setSupervisorEmail(savedForm.epaFormData.supervisorEmail);
        }
        if (savedForm.status) {
          setStatus(savedForm.status);
        }
      }
    }
  }, [id, selectedLevel, allEvidence]);

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
        aspectsEspeciallyGood: (selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3) ? aspectsEspeciallyGood : undefined,
        additionalEvidenceNeeded: (selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3) ? additionalEvidenceNeeded : undefined,
        traineeNarrative
      }
    });
  };

  useEffect(() => {
    if (isReadOnly) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      saveToParent();
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [isReadOnly, selectedLevel, selectedSia, supervisorName, entrustment, comments, grading, aspectsEspeciallyGood, additionalEvidenceNeeded, linkedEvidenceData, traineeNarrative]);

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
    if (isReadOnly) return;
    setComments(prev => ({ ...prev, [key]: text }));
  };

  const handleGradingChange = (key: string, value: string) => {
    if (isReadOnly) return;
    setGrading(prev => ({ ...prev, [key]: value }));
  };

  const handleMarkAllMeets = () => {
    if (isReadOnly) return;
    const newGrading = { ...grading };
    
    if (selectedLevel === 1) {
      const sectionKey = activeSection === 1 ? 'B' : activeSection === 2 ? 'C' : activeSection === 3 ? 'D' : activeSection === 4 ? 'E' : 'F';
      let criteria: string[] = [];
      if (activeSection === 1) criteria = LEVEL_1_CRITERIA.sectionB;
      else if (activeSection === 2) criteria = LEVEL_1_CRITERIA.sectionC;
      else if (activeSection === 3) criteria = LEVEL_1_CRITERIA.sectionD;
      else if (activeSection === 4) criteria = LEVEL_1_CRITERIA.sectionE;
      else if (activeSection === 5) criteria = LEVEL_1_CRITERIA.sectionF;
      criteria.forEach((_, idx) => {
        newGrading[`EPA-L1-${sectionKey}-${idx}`] = "Yes it does (YES)";
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
        newGrading[`EPA-L2-${sectionKey}-${idx}`] = "Yes it does (YES)";
      });
    } else if (selectedLevel === 3 || selectedLevel === 4) {
      const sectionKey = activeSection === 1 ? 'B' : activeSection === 2 ? 'C' : activeSection === 3 ? 'D' : activeSection === 4 ? 'E' : 'F';
      const specialtyData = getSpecialtyData();
      if (specialtyData) {
        let criteria: string[] = [];
        if (activeSection === 1) criteria = specialtyData.criteria.sectionB;
        else if (activeSection === 2) criteria = specialtyData.criteria.sectionC;
        else if (activeSection === 3) criteria = specialtyData.criteria.sectionD;
        else if (activeSection === 4) criteria = specialtyData.criteria.sectionE;
        else if (activeSection === 5) criteria = specialtyData.criteria.sectionF;
        const levelPrefix = selectedLevel === 3 ? 'L3' : 'L4';
        criteria.forEach((_, idx) => {
          newGrading[`EPA-${levelPrefix}-${sectionKey}-${idx}`] = "Yes it does (YES)";
        });
      }
    } else {
      const criteria = CURRICULUM_DATA.filter(r => (selectedSia === "No attached SIA" ? r.specialty === "Oculoplastics" : r.specialty === selectedSia) && r.level === selectedLevel);
      criteria.forEach((_, idx) => {
        newGrading[`EPA-GEN-${idx}`] = "Meets expectations";
      });
    }
    
    setGrading(newGrading);
  };

  const handleViewEvidence = (evId: string) => {
    const ev = allEvidence.find(e => e.id === evId);
    if (ev) {
      // If onViewLinkedEvidence is available, navigate directly to the evidence view
      if (onViewLinkedEvidence) {
        onViewLinkedEvidence(evId);
      } else {
        // Fallback to dialog if onViewLinkedEvidence is not available
        setViewingEvidence(ev);
        setIsEvidenceDialogOpen(true);
      }
    }
  };

  const renderCriterion = (req: string, idx: number, sectionKey: string, showCommentForAll: boolean = false) => {
    const levelPrefix = selectedLevel === 1 ? 'L1' : selectedLevel === 2 ? 'L2' : selectedLevel === 3 ? 'L3' : selectedLevel === 4 ? 'L4' : '';
    const reqKey = `EPA-${levelPrefix}-${sectionKey}-${idx}`;
    const linkedIds = linkedEvidenceData[reqKey] || [];
    const isLevel1Or2Or3Or4 = selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3 || selectedLevel === 4;
    const gradingOptions = isLevel1Or2Or3Or4 ? LEVEL_2_GRADING_OPTIONS : ["Major concerns", "Minor concerns", "Meets expectations"];
    const currentGrading = grading[reqKey] || "";
    const showCommentBox = isLevel1Or2Or3Or4 && (showCommentForAll || currentGrading === "I have reservations about whether evidence meets standards (RESERVATION)" || currentGrading === "No it does not (NO)" || currentGrading === "There is no evidence (NO EVIDENCE)");

    return (
      <GlassCard 
        id={`epa-criterion-${reqKey}`}
        key={reqKey} 
        className={`p-5 lg:p-6 transition-all duration-300 ${isReadOnly ? 'bg-slate-50/50' : ''}`}
      >
        <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{req}</p>
        
        {isLevel1Or2Or3Or4 && (
          <p className="text-xs text-slate-500 dark:text-white/40 mb-4">Does this evidence meet standards?</p>
        )}
        
        {/* Grading Radios */}
        <div className="flex flex-wrap gap-2 mb-6">
          {gradingOptions.map(opt => (
            <button
              key={opt}
              disabled={isReadOnly}
              onClick={() => handleGradingChange(reqKey, opt)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${currentGrading === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(showCommentBox || !isLevel1Or2Or3Or4) && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
                {isLevel1Or2Or3Or4 ? "Comments" : "Comments (Optional)"}
              </label>
              <textarea 
                disabled={isReadOnly}
                value={comments[reqKey] || ''}
                onChange={(e) => handleCommentChange(reqKey, e.target.value.slice(0, 1000))}
                placeholder={isLevel1Or2Or3Or4 ? "Enter comments..." : "Add clinical observations or context..."}
                className={`w-full min-h-[60px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isReadOnly ? 'cursor-default' : ''}`}
              />
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold block">Linked Evidence</label>
              {!isReadOnly && (
                <button 
                  onClick={() => onLinkRequested(reqKey, activeSection)} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all"
                >
                  <Plus size={14} /> Link Evidence
                </button>
              )}
            </div>
            
            {linkedIds.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Type</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">SIA</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-20 text-center">Level</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Date</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Status</th>
                      {!isReadOnly && (
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
                          onClick={() => {
                            if (onViewLinkedEvidence) {
                              onViewLinkedEvidence(evId);
                            }
                          }}
                          className="group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-2">
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight
                              ${getLinkedEvidenceTypeColors(ev.type)}
                            `}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white">
                                {ev.title}
                              </span>
                              {ev.fileName && (
                                <div className="flex items-center justify-center w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" title={`Attached: ${ev.fileName}`}>
                                  <FileText size={8} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50">
                            {ev.sia || '–'}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 text-center">
                            {ev.level || '–'}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 font-mono">
                            {ev.date}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium
                              ${getLinkedEvidenceStatusColors(ev.status)}
                            `}>
                              {getLinkedEvidenceStatusIcon(ev.status)}
                              {ev.status}
                            </span>
                          </td>
                          {!isReadOnly && (
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center">
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
            ) : !isReadOnly && (
              <p className="text-[10px] italic text-slate-400 dark:text-white/20 mt-3">No evidence linked yet.</p>
            )}
          </div>
        </div>
      </GlassCard>
    );
  };

  // Helper function to get specialty data for Level 3/4
  const getSpecialtyData = () => {
    if (selectedLevel === 3 || selectedLevel === 4) {
      return EPA_SPECIALTY_DATA[selectedLevel]?.[selectedSia] || null;
    }
    return null;
  };

  // Get available specialties for Level 3/4
  const getAvailableSpecialties = () => {
    if (selectedLevel === 3 || selectedLevel === 4) {
      const specialties = EPA_SPECIALTY_DATA[selectedLevel] ? Object.keys(EPA_SPECIALTY_DATA[selectedLevel]) : [];
      return specialties.length > 0 ? specialties : ALL_SPECIALTIES;
    }
    return ALL_SPECIALTIES;
  };

  const renderLearningOutcomes = () => {
    let outcomes: string[] = [];
    
    if (selectedLevel === 1) {
      outcomes = LEVEL_1_LEARNING_OUTCOMES;
    } else if (selectedLevel === 2) {
      outcomes = LEVEL_2_LEARNING_OUTCOMES;
    } else {
      const specialtyData = getSpecialtyData();
      if (specialtyData) {
        outcomes = specialtyData.learningOutcomes;
      }
    }
    
    const levelPrefix = selectedLevel === 1 ? 'L1' : selectedLevel === 2 ? 'L2' : selectedLevel === 3 ? 'L3' : 'L4';
    const narrativeKey = `EPA-${levelPrefix}-A-NARRATIVE`;
    const linkedNarrativeIds = linkedEvidenceData[narrativeKey] || [];
    
    return (
      <div className="space-y-4">
        {outcomes.length > 0 ? (
          outcomes.map((outcome, idx) => (
            <GlassCard key={idx} className={`p-5 lg:p-6 transition-all duration-300 ${isReadOnly ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90">{outcome}</p>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-5 lg:p-6">
            <p className="text-sm text-slate-500 italic">No learning outcomes defined for this level and specialty.</p>
          </GlassCard>
        )}
        
        {/* Trainee Narrative Section */}
        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isReadOnly ? 'bg-slate-50/50' : ''}`}>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white/90 mb-4 uppercase tracking-widest">
            Trainee Narrative
          </h4>
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
            <p className="text-xs text-slate-600 dark:text-white/70 italic">
              Comment on how the above learning outcomes have been achieved, and link supportive relevant evidence not linked in the subsequent sections.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">
              Trainee Narrative <span className="text-red-500">*</span>
            </label>
            <textarea 
              disabled={isReadOnly}
              required
              value={traineeNarrative}
              onChange={(e) => setTraineeNarrative(e.target.value)}
              placeholder="Enter your narrative..."
              className={`w-full min-h-[120px] bg-slate-50 dark:bg-white/[0.03] border ${!traineeNarrative ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isReadOnly ? 'cursor-default' : ''}`}
            />
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold block">Linked Evidence</label>
              {!isReadOnly && (
                <button 
                  onClick={() => onLinkRequested(narrativeKey, 0)} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all"
                >
                  <Plus size={14} /> Link Evidence
                </button>
              )}
            </div>
            
            {linkedNarrativeIds.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Type</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">SIA</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-20 text-center">Level</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Date</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24">Status</th>
                      {!isReadOnly && (
                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-16 text-center">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedNarrativeIds.map(evId => {
                      const ev = allEvidence.find(e => e.id === evId);
                      if (!ev) return null;
                      
                      return (
                        <tr 
                          key={evId}
                          onClick={() => {
                            if (onViewLinkedEvidence) {
                              onViewLinkedEvidence(evId);
                            }
                          }}
                          className="group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-2">
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight
                              ${getLinkedEvidenceTypeColors(ev.type)}
                            `}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white">
                                {ev.title}
                              </span>
                              {ev.fileName && (
                                <div className="flex items-center justify-center w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" title={`Attached: ${ev.fileName}`}>
                                  <FileText size={8} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50">
                            {ev.sia || '–'}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 text-center">
                            {ev.level || '–'}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-white/50 font-mono">
                            {ev.date}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium
                              ${getLinkedEvidenceStatusColors(ev.status)}
                            `}>
                              {getLinkedEvidenceStatusIcon(ev.status)}
                              {ev.status}
                            </span>
                          </td>
                          {!isReadOnly && (
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Eye icon clicked for evidence:', evId);
                                    console.log('onViewLinkedEvidence type:', typeof onViewLinkedEvidence);
                                    console.log('onViewLinkedEvidence value:', onViewLinkedEvidence);
                                    try {
                                      if (onViewLinkedEvidence && typeof onViewLinkedEvidence === 'function') {
                                        console.log('Calling onViewLinkedEvidence with:', evId);
                                        onViewLinkedEvidence(evId);
                                      } else {
                                        console.error('onViewLinkedEvidence is not a function! Type:', typeof onViewLinkedEvidence, 'Value:', onViewLinkedEvidence);
                                        alert('Unable to view evidence: navigation handler not available.');
                                      }
                                    } catch (error) {
                                      console.error('Error viewing evidence:', error);
                                      alert('An error occurred while trying to view the evidence: ' + error.message);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                  title="View evidence"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveLink(narrativeKey, evId);
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
            ) : !isReadOnly && (
              <p className="text-[10px] italic text-slate-400 dark:text-white/20 mt-3">No evidence linked yet.</p>
            )}
          </div>
        </GlassCard>
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
        <button 
          onClick={onBack} 
          className={`flex items-center gap-2 text-xs mb-4 ${originView ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-white/40'}`}
        >
          <ArrowLeft size={14} /> {backButtonText}
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
                  disabled={isReadOnly} 
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                >
                  {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Specialty / SIA">
                <select 
                  disabled={isReadOnly || selectedLevel === 1 || selectedLevel === 2} 
                  value={selectedSia}
                  onChange={(e) => setSelectedSia(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-50"
                >
                  {(selectedLevel === 3 || selectedLevel === 4 ? getAvailableSpecialties() : ALL_SPECIALTIES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Date">
                <input disabled={isReadOnly} type="date" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
              </MetadataField>
              <MetadataField label="Supervisor">
                <div className="space-y-2">
                  <input disabled={isReadOnly} type="text" placeholder="Name" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                  <input disabled={isReadOnly} type="email" placeholder="Email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
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
          className={`flex items-center gap-2 text-sm transition-colors mb-2 ${originView ? 'font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300' : 'text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70'}`}
        >
          <ArrowLeft size={16} /> {backButtonText}
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
                disabled={isReadOnly} 
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Subspecialty">
              <select 
                disabled={isReadOnly || selectedLevel === 1 || selectedLevel === 2} 
                value={selectedSia}
                onChange={(e) => setSelectedSia(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
              >
                {(selectedLevel === 3 || selectedLevel === 4 ? getAvailableSpecialties() : ALL_SPECIALTIES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {(selectedLevel === 1 || selectedLevel === 2) && (
                <p className="mt-1.5 text-[10px] text-slate-400 italic">Level {selectedLevel} assessments are generic/core.</p>
              )}
            </MetadataField>
            
            <MetadataField label="Assessment Date">
              <input disabled={isReadOnly} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
            </MetadataField>
            
            <MetadataField label="Supervisor">
              <div className="space-y-2">
                <input disabled={isReadOnly} type="text" placeholder="Supervisor Name" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                <input disabled={isReadOnly} type="email" placeholder="Supervisor Email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
            </MetadataField>

            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 uppercase font-semibold">Progress</span>
                <span className="text-xs text-slate-600">
                  {selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3 || selectedLevel === 4 ? '6 Sections' : 'EPA Details'}
                </span>
              </div>
              <div className={`grid gap-2 ${selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3 ? 'grid-cols-6' : 'grid-cols-1'}`}>
                {selectedLevel === 1 ? LEVEL_1_SECTIONS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                )) : selectedLevel === 2 ? LEVEL_2_SECTIONS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                )) : selectedLevel === 3 ? LEVEL_3_SECTIONS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                )) : (
                  <div className="h-1 col-span-3 rounded-full bg-indigo-500"></div>
                )}
              </div>
            </div>

            {isReadOnly && (
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
        {(selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3) && (
          <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
            {(selectedLevel === 1 ? LEVEL_1_SECTIONS : selectedLevel === 2 ? LEVEL_2_SECTIONS : LEVEL_3_SECTIONS).map((section, idx) => (
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
                {selectedLevel === 1 ? LEVEL_1_SECTIONS[activeSection] : selectedLevel === 2 ? LEVEL_2_SECTIONS[activeSection] : selectedLevel === 3 || selectedLevel === 4 ? LEVEL_3_SECTIONS[activeSection] : `EPA Level ${selectedLevel} Requirements`}
              </h3>
              {!isReadOnly && (selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3 || selectedLevel === 4) && (activeSection === 1 || activeSection === 2 || activeSection === 3 || activeSection === 4) && (
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
                  {activeSection === 0 && renderLearningOutcomes()}
                  {activeSection === 1 && LEVEL_1_CRITERIA.sectionB.map((req, idx) => renderCriterion(req, idx, 'B'))}
                  {activeSection === 2 && (
                    <>
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-white/70 italic">
                          The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                        </p>
                      </div>
                      {LEVEL_1_CRITERIA.sectionC.map((req, idx) => renderCriterion(req, idx, 'C'))}
                    </>
                  )}
                  {activeSection === 3 && LEVEL_1_CRITERIA.sectionD.map((req, idx) => renderCriterion(req, idx, 'D'))}
                  {activeSection === 4 && (
                    <>
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                        <p className="text-xs text-slate-600 dark:text-white/70 italic">
                          The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                        </p>
                      </div>
                      {LEVEL_1_CRITERIA.sectionE.map((req, idx) => renderCriterion(req, idx, 'E'))}
                    </>
                  )}
                  {activeSection === 5 && (
                    <>
                      <div className="space-y-4 mb-8">
                        {LEVEL_1_CRITERIA.sectionF.map((req, idx) => renderCriterion(req, idx, 'F', true))}
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
                                disabled={isReadOnly}
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
                              disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
                              disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
              ) : selectedLevel === 3 || selectedLevel === 4 ? (
                <>
                  {activeSection === 0 && renderLearningOutcomes()}
                  {activeSection === 1 && (() => {
                    const specialtyData = getSpecialtyData();
                    if (!specialtyData) return null;
                    const criteria = specialtyData.criteria.sectionB;
                    if (criteria.length === 0) {
                      return (
                        <GlassCard className="p-6">
                          <p className="text-sm text-slate-500 italic">No requirements for this section.</p>
                        </GlassCard>
                      );
                    }
                    return criteria.map((req, idx) => renderCriterion(req, idx, 'B'));
                  })()}
                  {activeSection === 2 && (() => {
                    const specialtyData = getSpecialtyData();
                    if (!specialtyData) return null;
                    const criteria = specialtyData.criteria.sectionC;
                    const hasBlurb = specialtyData.sectionBlurbs.sectionC;
                    if (criteria.length === 0) {
                      return (
                        <GlassCard className="p-6">
                          <p className="text-sm text-slate-500 italic">No requirements for this section.</p>
                        </GlassCard>
                      );
                    }
                    return (
                      <>
                        {hasBlurb && (
                          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                            <p className="text-xs text-slate-600 dark:text-white/70 italic">
                              The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                            </p>
                          </div>
                        )}
                        {criteria.map((req, idx) => renderCriterion(req, idx, 'C', specialtyData.showCommentsAlways.sectionC))}
                      </>
                    );
                  })()}
                  {activeSection === 3 && (() => {
                    const specialtyData = getSpecialtyData();
                    if (!specialtyData) return null;
                    const criteria = specialtyData.criteria.sectionD;
                    if (criteria.length === 0) {
                      return (
                        <GlassCard className="p-6">
                          <p className="text-sm text-slate-500 italic">No requirements for this section.</p>
                        </GlassCard>
                      );
                    }
                    return criteria.map((req, idx) => renderCriterion(req, idx, 'D', specialtyData.showCommentsAlways.sectionD));
                  })()}
                  {activeSection === 4 && (() => {
                    const specialtyData = getSpecialtyData();
                    if (!specialtyData) return null;
                    const criteria = specialtyData.criteria.sectionE;
                    const hasBlurb = specialtyData.sectionBlurbs.sectionE;
                    if (criteria.length === 0) {
                      return (
                        <GlassCard className="p-6">
                          <p className="text-sm text-slate-500 italic">No requirements for this section.</p>
                        </GlassCard>
                      );
                    }
                    return (
                      <>
                        {hasBlurb && (
                          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-xl">
                            <p className="text-xs text-slate-600 dark:text-white/70 italic">
                              The following may be evidenced via longitudinal observation of the supervisor and / or the trainee can supplement this with use of a formal evidence tool such as DOPS, CBD or a Reflection.
                            </p>
                          </div>
                        )}
                        {criteria.map((req, idx) => renderCriterion(req, idx, 'E', specialtyData.showCommentsAlways.sectionE))}
                      </>
                    );
                  })()}
                  {activeSection === 5 && (
                    <>
                      <div className="space-y-4 mb-8">
                        {(() => {
                          const specialtyData = getSpecialtyData();
                          if (!specialtyData) return null;
                          const criteria = specialtyData.criteria.sectionF;
                          if (criteria.length === 0) {
                            return (
                              <GlassCard className="p-6">
                                <p className="text-sm text-slate-500 italic">No requirements for this section.</p>
                              </GlassCard>
                            );
                          }
                          return criteria.map((req, idx) => renderCriterion(req, idx, 'F', specialtyData.showCommentsAlways.sectionF));
                        })()}
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
                                disabled={isReadOnly}
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
                              disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
          
          {/* Row 1: Navigation (Only for Level 1, 2, and 3) */}
          {(selectedLevel === 1 || selectedLevel === 2 || selectedLevel === 3) && (
            <div className="flex justify-between items-center w-full">
              <button 
                disabled={activeSection === 0}
                onClick={() => setActiveSection(s => s - 1)}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
              >
                <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
              </button>
              <div className="flex gap-1.5">
                {(selectedLevel === 1 ? LEVEL_1_SECTIONS : selectedLevel === 2 ? LEVEL_2_SECTIONS : selectedLevel === 3 || selectedLevel === 4 ? LEVEL_3_SECTIONS : []).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>
                ))}
              </div>
              <button 
                disabled={activeSection === (selectedLevel === 1 ? LEVEL_1_SECTIONS.length : selectedLevel === 2 ? LEVEL_2_SECTIONS.length : selectedLevel === 3 || selectedLevel === 4 ? LEVEL_3_SECTIONS.length : 0) - 1}
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
            
            {!isReadOnly && (
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
            
            {isReadOnly && (
              <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Summary Dialog */}
      {isEvidenceDialogOpen && viewingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <GlassCard className="p-6 bg-white/100 dark:bg-slate-900 shadow-2xl border-none rounded-[2rem]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {viewingEvidence.title}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight
                      ${getLinkedEvidenceTypeColors(viewingEvidence.type)}
                    `}>
                      {viewingEvidence.type}
                    </span>
                    <span className={`
                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                      ${getLinkedEvidenceStatusColors(viewingEvidence.status)}
                    `}>
                      {getLinkedEvidenceStatusIcon(viewingEvidence.status)}
                      {viewingEvidence.status}
                    </span>
                    {viewingEvidence.sia && (
                      <span className="text-xs text-slate-500 dark:text-white/50">
                        SIA: {viewingEvidence.sia}
                      </span>
                    )}
                    {viewingEvidence.level && (
                      <span className="text-xs text-slate-500 dark:text-white/50">
                        Level: {viewingEvidence.level}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-white/50 font-mono">
                      {viewingEvidence.date}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsEvidenceDialogOpen(false);
                    setViewingEvidence(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Show form-specific summary based on type */}
                {viewingEvidence.type === EvidenceType.EPA && viewingEvidence.epaFormData && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      EPA Form Summary
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 space-y-2 text-sm">
                      <p><span className="font-medium">Level:</span> {viewingEvidence.level || 'N/A'}</p>
                      <p><span className="font-medium">SIA:</span> {viewingEvidence.sia || 'N/A'}</p>
                      {viewingEvidence.epaFormData.entrustment && (
                        <p><span className="font-medium">Entrustment:</span> {viewingEvidence.epaFormData.entrustment}</p>
                      )}
                      {viewingEvidence.epaFormData.traineeNarrative && (
                        <div>
                          <p className="font-medium mb-1">Trainee Narrative:</p>
                          <p className="text-slate-600 dark:text-white/70 text-xs">{viewingEvidence.epaFormData.traineeNarrative}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingEvidence.type === EvidenceType.CRS && viewingEvidence.crsFormData && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      CRS Form Summary
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {viewingEvidence.crsFormData.type || 'N/A'}</p>
                      <p><span className="font-medium">Level:</span> {viewingEvidence.level || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {viewingEvidence.type === EvidenceType.CbD && viewingEvidence.cbdFormData && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      CBD Form Summary
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 space-y-2 text-sm">
                      {viewingEvidence.cbdFormData.clinicalScenario && (
                        <div>
                          <p className="font-medium mb-1">Clinical Scenario:</p>
                          <p className="text-slate-600 dark:text-white/70 text-xs">{viewingEvidence.cbdFormData.clinicalScenario}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingEvidence.type === EvidenceType.DOPs && viewingEvidence.dopsFormData && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      DOPS Form Summary
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {viewingEvidence.dopsFormData.dopsType || 'N/A'}</p>
                      {viewingEvidence.dopsFormData.sectionA?.descriptionOfProcedure && (
                        <div>
                          <p className="font-medium mb-1">Procedure Description:</p>
                          <p className="text-slate-600 dark:text-white/70 text-xs">{viewingEvidence.dopsFormData.sectionA.descriptionOfProcedure}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingEvidence.type === EvidenceType.OSATs && viewingEvidence.osatsFormData && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      OSATS Form Summary
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {viewingEvidence.osatsFormData.osatsType || 'N/A'}</p>
                      {viewingEvidence.osatsFormData.sectionA?.caseDescription && (
                        <div>
                          <p className="font-medium mb-1">Case Description:</p>
                          <p className="text-slate-600 dark:text-white/70 text-xs">{viewingEvidence.osatsFormData.sectionA.caseDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Generic fallback for other types */}
                {!viewingEvidence.epaFormData && !viewingEvidence.crsFormData && !viewingEvidence.cbdFormData && !viewingEvidence.dopsFormData && !viewingEvidence.osatsFormData && (
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 text-sm text-slate-600 dark:text-white/70">
                    <p>No additional details available for this evidence type.</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => {
                      setIsEvidenceDialogOpen(false);
                      setViewingEvidence(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

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

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default EPAForm;
