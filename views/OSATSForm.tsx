
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { INITIAL_PROFILE } from '../constants';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';

interface OSATSFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  initialOsatsType?: string; // Pre-select OSATS type when launching from EPA
  originView?: any; // View enum type
  originFormParams?: any; // FormParams type
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
  onViewLinkedEvidence?: (evidenceId: string, section?: number) => void;
  allEvidence?: EvidenceItem[];
}

const OSATS_TYPES = [
  "OSATS - Custom",
  "OSATS Microsurgical skills",
  "OSATS Cataract Surgery",
  "OSATS Lid Surgery",
  "OSATS Operating microscope",
  "OSATS Lateral canthotomy / cantholysis",
  "OSATS Interpret biometry",
  "OSATS Intravitreal injection",
  "OSATS Extraocular Muscle Surgery",
  "OSATS Complex cataract surgery"
];

const OSATS_SECTIONS = [
  "A. Case Description",
  "B. Surgical competencies",
  "C. Communication",
  "D. Supervisor comments"
];

const OSATS_SPECIALTIES = [
  "Cataract Surgery",
  "Community Ophthalmology",
  "Cornea & Ocular Surface",
  "Glaucoma",
  "Medical Retina",
  "Neuro-ophthalmology",
  "Ocular Motility",
  "Oculoplastics",
  "Paediatric Ophthalmology",
  "Urgent Eye Care",
  "Uveitis",
  "Vitreoretinal Surgery"
];

const OSATS_RATING_OPTIONS = [
  "Major concerns",
  "Minor concerns",
  "Meets expectations",
  "n/a"
];

const PROCEDURE_PERFORMED_ON_OPTIONS = [
  "Patient",
  "Wet Lab",
  "Simulator"
];

const SECTION_B_COMPETENCIES = [
  {
    key: "safeSurgery",
    label: "1. Safe surgery"
  },
  {
    key: "respectForTissue",
    label: "2. Respect for tissue"
  },
  {
    key: "instrumentHandling",
    label: "3. Instrument handling"
  },
  {
    key: "knowledgeAndUseOfInstrumentsAndEquipment",
    label: "4. Knowledge and use of instruments and equipment"
  },
  {
    key: "flowOfOperationAndForwardPlanning",
    label: "5. Flow of operation and forward planning"
  },
  {
    key: "knowledgeOfSpecificProcedure",
    label: "6. Knowledge of specific procedure"
  },
  {
    key: "useOfOperatingMicroscope",
    label: "7. Use of operating microscope"
  },
  {
    key: "managementOfLaboratorySpecimens",
    label: "8. Management of laboratory specimens"
  }
];

const OPERATING_MICROSCOPE_SECTION_B_COMPETENCIES = [
  {
    key: "preparationOfOperatingMicroscope",
    label: "1. Preparation of operating microscope"
  },
  {
    key: "knowledgeOfControls",
    label: "2. Knowledge of controls"
  },
  {
    key: "personalSettings",
    label: "3. Personal settings"
  },
  {
    key: "useOfControls",
    label: "4. Use of controls"
  },
  {
    key: "asepsis",
    label: "5. Asepsis"
  },
  {
    key: "troubleshooting",
    label: "6. Troubleshooting"
  },
  {
    key: "chair",
    label: "7. Chair"
  }
];

const INTERPRET_BIOMETRY_SECTION_B_COMPETENCIES = [
  {
    key: "discussesRefractiveAimWithPatient",
    label: "1. Discusses refractive aim with patient"
  },
  {
    key: "understandsAndCanApplyDifferentialAConstant",
    label: "2. Understands and can apply differential A constant according to use of optical AL or A-scan"
  },
  {
    key: "assessesReliabilityOfBiometry",
    label: "3. Assesses the reliability of the biometry"
  },
  {
    key: "choosesAppropriateFormula",
    label: "4. Chooses an appropriate formula to calculate the power of the lens to be implanted"
  },
  {
    key: "givesCorrectAdviceToContactLensWearers",
    label: "5. Gives correct advice to contact lens wearers about the time interval between last use and biometry"
  },
  {
    key: "usesAppropriateSettingsOnBiometryInstrument",
    label: "6. Uses appropriate settings on the biometry instrument; use appropriate formulae for patients who have had prior refractive laser procedures / silicone oil in the eye etc"
  },
  {
    key: "understandsIndicationsForRepeatingBiometry",
    label: "7. Understands the indications for repeating biometry according to Royal College Guidelines"
  }
];

const SECTION_C_COMPETENCIES = [
  {
    key: "communicationWithPatient",
    label: "1. Communication with patient"
  },
  {
    key: "communicationWithNursingAndOtherMedicalStaff",
    label: "2. Communication with nursing and other medical staff (Teamwork)"
  }
];

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">{label}</label>
    {children}
  </div>
);

const OSATSForm: React.FC<OSATSFormProps> = ({
  id,
  sia = "Cataract Surgery",
  level = 1,
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  initialOsatsType,
  onBack,
  onSubmitted,
  onSave,
  allEvidence = []
}) => {
  const [formId] = useState(id || Math.random().toString(36).substr(2, 9));
  const [activeSection, setActiveSection] = useState(0);
  // Use initialOsatsType when creating new (no id), otherwise default to "OSATS - Custom"
  const [selectedOsatsType, setSelectedOsatsType] = useState(() => {
    if (!id && initialOsatsType && OSATS_TYPES.includes(initialOsatsType)) {
      return initialOsatsType;
    }
    return OSATS_TYPES[0]; // Default to "OSATS - Custom"
  });
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [supervisorName, setSupervisorName] = useState(initialAssessorName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialAssessorEmail);
  const [specialty, setSpecialty] = useState(sia || OSATS_SPECIALTIES[0]);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Section A: Case Description
  const [caseDescription, setCaseDescription] = useState("");
  const [operativeDetails, setOperativeDetails] = useState("");
  const [numberOfProcedures, setNumberOfProcedures] = useState("");
  const [procedurePerformedOn, setProcedurePerformedOn] = useState(PROCEDURE_PERFORMED_ON_OPTIONS[0]);

  // Section B: Surgical competencies
  const [sectionBRatings, setSectionBRatings] = useState<Record<string, string>>({});
  const [sectionBComments, setSectionBComments] = useState<Record<string, string>>({});

  // Section C: Communication
  const [sectionCRatings, setSectionCRatings] = useState<Record<string, string>>({});
  const [sectionCComments, setSectionCComments] = useState<Record<string, string>>({});

  // Section D: Supervisor comments
  const [aspectsEspeciallyGood, setAspectsEspeciallyGood] = useState("");
  const [suggestionsForImprovement, setSuggestionsForImprovement] = useState("");
  const [agreedActionPlan, setAgreedActionPlan] = useState("");

  const isLocked = status === EvidenceStatus.SignedOff || status === EvidenceStatus.Submitted;

  // Reset activeSection when form loads or type changes
  useEffect(() => {
    setActiveSection(0);
  }, [selectedOsatsType]);

  // Auto-save functionality
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
  }, [isLocked, caseDescription, operativeDetails, numberOfProcedures, procedurePerformedOn, sectionBRatings, sectionBComments, sectionCRatings, sectionCComments, aspectsEspeciallyGood, suggestionsForImprovement, agreedActionPlan, specialty, supervisorName, supervisorEmail, trainingLevel]);

  // Load existing data if editing
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.OSATs);
      if (savedForm?.osatsFormData) {
        const data = savedForm.osatsFormData;

        // Load OSATS type and specialty
        if (data.osatsType) setSelectedOsatsType(data.osatsType);
        if (data.specialty) setSpecialty(data.specialty);
        if (data.supervisorName) setSupervisorName(data.supervisorName);
        if (data.supervisorEmail) setSupervisorEmail(data.supervisorEmail);

        // Load Section A
        if (data.sectionA) {
          if (data.sectionA.caseDescription) setCaseDescription(data.sectionA.caseDescription);
          if (data.sectionA.operativeDetails) setOperativeDetails(data.sectionA.operativeDetails);
          if (data.sectionA.numberOfProcedures) setNumberOfProcedures(data.sectionA.numberOfProcedures);
          if (data.sectionA.procedurePerformedOn) setProcedurePerformedOn(data.sectionA.procedurePerformedOn);
        }

        // Load Section B
        if (data.sectionB) {
          if (data.sectionB.ratings) setSectionBRatings(data.sectionB.ratings);
          if (data.sectionB.comments) setSectionBComments(data.sectionB.comments);
        }

        // Load Section C
        if (data.sectionC) {
          if (data.sectionC.ratings) setSectionCRatings(data.sectionC.ratings);
          if (data.sectionC.comments) setSectionCComments(data.sectionC.comments);
        }

        // Load Section D
        if (data.sectionD) {
          if (data.sectionD.aspectsEspeciallyGood) setAspectsEspeciallyGood(data.sectionD.aspectsEspeciallyGood);
          if (data.sectionD.suggestionsForImprovement) setSuggestionsForImprovement(data.sectionD.suggestionsForImprovement);
          if (data.sectionD.agreedActionPlan) setAgreedActionPlan(data.sectionD.agreedActionPlan);
        }

        // Load status and level
        if (savedForm.status) setStatus(savedForm.status);
        if (savedForm.level) setTrainingLevel(savedForm.level.toString());
      }
    }
  }, [id, allEvidence]);

  const saveToParent = (newStatus: EvidenceStatus = status) => {
    const baseData: any = {
      id: formId,
      title: `${selectedOsatsType}: ${specialty} - Level ${trainingLevel}`,
      type: EvidenceType.OSATs,
      sia: specialty,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      notes: caseDescription, // General notes field
      osatsFormData: {
        osatsType: selectedOsatsType,
        specialty,
        supervisorName,
        supervisorEmail,
        sectionA: {
          caseDescription,
          operativeDetails,
          numberOfProcedures,
          procedurePerformedOn
        },
        sectionB: {
          ratings: sectionBRatings,
          comments: sectionBComments
        },
        sectionC: {
          ratings: sectionCRatings,
          comments: sectionCComments
        },
        sectionD: {
          aspectsEspeciallyGood,
          suggestionsForImprovement,
          agreedActionPlan
        }
      }
    };
    onSave(baseData);
  };

  const handleSaveDraft = () => {
    setStatus(EvidenceStatus.Draft);
    saveToParent(EvidenceStatus.Draft);
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 2000);
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

  const handleSignOffConfirm = () => {
    setStatus(EvidenceStatus.SignedOff);
    saveToParent(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleRatingChange = (section: 'B' | 'C', key: string, value: string) => {
    if (isLocked) return;
    if (section === 'B') {
      setSectionBRatings(prev => ({ ...prev, [key]: value }));
      // Clear comments if rating is not "Major concerns" or "Minor concerns"
      if (value !== "Major concerns" && value !== "Minor concerns") {
        setSectionBComments(prev => {
          const newComments = { ...prev };
          delete newComments[key];
          return newComments;
        });
      }
    } else {
      setSectionCRatings(prev => ({ ...prev, [key]: value }));
      // Clear comments if rating is not "Major concerns" or "Minor concerns"
      if (value !== "Major concerns" && value !== "Minor concerns") {
        setSectionCComments(prev => {
          const newComments = { ...prev };
          delete newComments[key];
          return newComments;
        });
      }
    }
  };

  const handleCommentChange = (section: 'B' | 'C', key: string, value: string) => {
    if (isLocked) return;
    if (section === 'B') {
      setSectionBComments(prev => ({ ...prev, [key]: value }));
    } else {
      setSectionCComments(prev => ({ ...prev, [key]: value }));
    }
  };

  // Get current Section B competencies based on OSATS type
  const getCurrentSectionBCompetencies = () => {
    if (selectedOsatsType === "OSATS Operating microscope") {
      return OPERATING_MICROSCOPE_SECTION_B_COMPETENCIES;
    }
    if (selectedOsatsType === "OSATS Interpret biometry") {
      return INTERPRET_BIOMETRY_SECTION_B_COMPETENCIES;
    }
    return SECTION_B_COMPETENCIES;
  };

  const handleMarkAllMeets = (section: 'B' | 'C') => {
    if (isLocked) return;
    const allMeets = "Meets expectations";

    if (section === 'B') {
      // Mark all Section B competencies
      const newSectionB = { ...sectionBRatings };
      getCurrentSectionBCompetencies().forEach(competency => {
        newSectionB[competency.key] = allMeets;
      });
      setSectionBRatings(newSectionB);
      // Clear all comments
      setSectionBComments({});
    } else {
      // Mark all Section C competencies
      const newSectionC = { ...sectionCRatings };
      SECTION_C_COMPETENCIES.forEach(competency => {
        newSectionC[competency.key] = allMeets;
      });
      setSectionCRatings(newSectionC);
      // Clear all comments
      setSectionCComments({});
    }
  };

  const isSectionComplete = (sectionIdx: number): boolean => {
    if (sectionIdx === 0) {
      // Section A - case description and operative details should have content
      return caseDescription.trim().length > 0 && operativeDetails.trim().length > 0;
    } else if (sectionIdx === 1) {
      // Section B - all competencies need ratings (varies by OSATS type)
      return getCurrentSectionBCompetencies().every(competency => sectionBRatings[competency.key]);
    } else if (sectionIdx === 2) {
      // Section C - all 2 competencies need ratings
      return SECTION_C_COMPETENCIES.every(competency => sectionCRatings[competency.key]);
    } else {
      // Section D - all 3 fields are mandatory
      return aspectsEspeciallyGood.trim().length > 0 &&
        suggestionsForImprovement.trim().length > 0 &&
        agreedActionPlan.trim().length > 0;
    }
  };

  const completeness = Math.round(
    (OSATS_SECTIONS.filter((_, i) => isSectionComplete(i)).length / OSATS_SECTIONS.length) * 100
  );

  // Render Section A
  const renderSectionA = () => {
    return (
      <div className="space-y-6">
        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Case Description
          </label>
          <textarea
            disabled={isLocked}
            value={caseDescription}
            onChange={(e) => setCaseDescription(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter the case description..."
          />
        </GlassCard>

        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Operative details
          </label>
          <textarea
            disabled={isLocked}
            value={operativeDetails}
            onChange={(e) => setOperativeDetails(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter operative details..."
          />
        </GlassCard>

        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
                Number of complete procedures of this type done by this trainee to date:
              </label>
              <input
                disabled={isLocked}
                type="number"
                value={numberOfProcedures}
                onChange={(e) => setNumberOfProcedures(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter number of procedures"
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
                Procedure performed on:
              </label>
              <select
                disabled={isLocked}
                value={procedurePerformedOn}
                onChange={(e) => setProcedurePerformedOn(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {PROCEDURE_PERFORMED_ON_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  // Render Section B
  const renderSectionB = () => {
    const currentCompetencies = getCurrentSectionBCompetencies();
    return (
      <div className="space-y-6">
        {currentCompetencies.map((competency) => {
          const rating = sectionBRatings[competency.key] || "";
          const comment = sectionBComments[competency.key] || "";
          const showCommentBox = rating === "Major concerns" || rating === "Minor concerns";
          const isFilled = rating || comment.trim();

          return (
            <GlassCard key={competency.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{competency.label}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {OSATS_RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', competency.key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {showCommentBox && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2 block">
                    Comments {rating === "Minor concerns" ? "(required for Minor concerns)" : "(required for Major concerns)"}
                  </label>
                  <textarea
                    disabled={isLocked}
                    value={comment}
                    onChange={(e) => handleCommentChange('B', competency.key, e.target.value)}
                    className="w-full min-h-[80px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                    placeholder="Enter comments..."
                  />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  };

  // Render Section C
  const renderSectionC = () => {
    return (
      <div className="space-y-6">
        {SECTION_C_COMPETENCIES.map((competency) => {
          const rating = sectionCRatings[competency.key] || "";
          const comment = sectionCComments[competency.key] || "";
          const showCommentBox = rating === "Major concerns" || rating === "Minor concerns";
          const isFilled = rating || comment.trim();

          return (
            <GlassCard key={competency.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{competency.label}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {OSATS_RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', competency.key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {showCommentBox && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2 block">
                    Comments {rating === "Minor concerns" ? "(required for Minor concerns)" : "(required for Major concerns)"}
                  </label>
                  <textarea
                    disabled={isLocked}
                    value={comment}
                    onChange={(e) => handleCommentChange('C', competency.key, e.target.value)}
                    className="w-full min-h-[80px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                    placeholder="Enter comments..."
                  />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  };

  // Render Section D
  const renderSectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Please note any aspects which were especially good: <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={aspectsEspeciallyGood}
            onChange={(e) => setAspectsEspeciallyGood(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter aspects which were especially good..."
          />
        </GlassCard>

        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Suggestions for improvement and action points: <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={suggestionsForImprovement}
            onChange={(e) => setSuggestionsForImprovement(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter suggestions for improvement and action points..."
          />
        </GlassCard>

        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={agreedActionPlan}
            onChange={(e) => setAgreedActionPlan(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter agreed action plan..."
          />
        </GlassCard>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <SignOffDialog
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: "OSATS",
          traineeName: INITIAL_PROFILE.name,
          date: new Date().toLocaleDateString(),
          supervisorName: supervisorName || "Supervisor"
        }}
      />

      {/* Left Column: Metadata (Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 overflow-y-auto pr-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">OSATS Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              }`}>
              {status}
            </span>
          </div>

          <div className="space-y-6">
            <MetadataField label="OSATS Type">
              <select
                disabled={isLocked}
                value={selectedOsatsType}
                onChange={(e) => setSelectedOsatsType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {OSATS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </MetadataField>

            <MetadataField label="Level">
              <select
                disabled={isLocked}
                value={trainingLevel}
                onChange={(e) => setTrainingLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </MetadataField>

            <MetadataField label="Specialty">
              <select
                disabled={isLocked}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {OSATS_SPECIALTIES.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </MetadataField>

            <MetadataField label="Supervisor Name">
              <input
                disabled={isLocked}
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter supervisor name"
              />
            </MetadataField>

            <MetadataField label="Supervisor Email">
              <input
                disabled={isLocked}
                type="email"
                value={supervisorEmail}
                onChange={(e) => setSupervisorEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter supervisor email"
              />
            </MetadataField>

            {/* Progress Bar */}
            <div className="pt-6 border-t border-slate-200 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-wider font-semibold">Progress</span>
                <span className="text-xs text-slate-600 dark:text-white/60">
                  {OSATS_SECTIONS.length} Sections
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {OSATS_SECTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-colors ${isSectionComplete(i)
                        ? 'bg-green-500'
                        : activeSection === i
                          ? 'bg-indigo-500'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Mobile Metadata Summary */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">OSATS Assessment</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{specialty} - Level {trainingLevel}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' :
                status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' :
                  'bg-indigo-100 text-indigo-700'
              }`}>
              {status}
            </span>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${isMetadataExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isMetadataExpanded && (
          <div className="mt-2 p-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">OSATS Type</label>
              <select
                disabled={isLocked}
                value={selectedOsatsType}
                onChange={(e) => setSelectedOsatsType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {OSATS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Level</label>
              <select
                disabled={isLocked}
                value={trainingLevel}
                onChange={(e) => setTrainingLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Specialty</label>
              <select
                disabled={isLocked}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {OSATS_SPECIALTIES.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Supervisor Name</label>
              <input
                disabled={isLocked}
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="Enter supervisor name"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Supervisor Email</label>
              <input
                disabled={isLocked}
                type="email"
                value={supervisorEmail}
                onChange={(e) => setSupervisorEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="Enter supervisor email"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Section Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        {/* Section Titles at Top */}
        <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
          {OSATS_SECTIONS.map((section, idx) => (
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

        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {!isLocked && (activeSection === 1 || activeSection === 2) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => handleMarkAllMeets(activeSection === 1 ? 'B' : 'C')}
                  className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                >
                  MARK ALL AS MEETS EXPECTATIONS
                </button>
              </div>
            )}

            <div className="space-y-4">
              {activeSection === 0 && renderSectionA()}
              {activeSection === 1 && renderSectionB()}
              {activeSection === 2 && renderSectionC()}
              {activeSection === 3 && renderSectionD()}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 mt-0 lg:mt-6 flex flex-col gap-4 shadow-2xl lg:shadow-none">

          {/* Row 1: Navigation */}
          <div className="flex justify-between items-center w-full">
            <button
              disabled={activeSection === 0}
              onClick={() => setActiveSection(s => s - 1)}
              className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
            </button>

            <div className="flex gap-1">
              {OSATS_SECTIONS.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveSection(idx)}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${activeSection === idx
                      ? 'bg-indigo-600 w-6'
                      : isSectionComplete(idx)
                        ? 'bg-indigo-300 dark:bg-indigo-600'
                        : 'bg-slate-300 dark:bg-white/10'
                    }`}
                ></div>
              ))}
            </div>
            <button
              disabled={activeSection === OSATS_SECTIONS.length - 1}
              onClick={() => setActiveSection(s => s + 1)}
              className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
            </button>
          </div>

          {/* Row 2: Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
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
          </div>

          {/* Save Status */}
          {(isSaving || showSaveMessage) && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-white/40">
              {isSaving ? (
                <>
                  <Clock size={12} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span>Draft saved {lastSaved}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OSATSForm;
