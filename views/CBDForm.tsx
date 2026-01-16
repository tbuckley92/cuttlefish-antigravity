
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SupervisorSearch } from '../components/SupervisorSearch';
import { INITIAL_PROFILE } from '../constants';

import { uuidv4 } from '../utils/uuid';
import { sendMagicLinkEmail } from '../utils/emailUtils';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';

interface CBDFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  traineeName?: string;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
  allEvidence?: EvidenceItem[];
  isSupervisor?: boolean;
}

const CBD_SECTIONS = [
  "A. Clinical Scenario",
  "B. Multidimensional assessment",
  "C. Supervisor comments"
];

const CBD_SPECIALTIES = [
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

const CBD_RATING_OPTIONS = [
  "Major concerns",
  "Minor concerns",
  "Meets expectations",
  "n/a"
];

const SECTION_B_COMPETENCIES = [
  {
    key: "medicalRecordKeeping",
    label: "1. Medical Record Keeping"
  },
  {
    key: "clinicalAssessment",
    label: "2. Clinical Assessment"
  },
  {
    key: "investigationAndReferrals",
    label: "3. Investigation and Referrals"
  },
  {
    key: "diagnosisAndTreatment",
    label: "4. Diagnosis and Treatment"
  },
  {
    key: "followUpAndFuturePlanning",
    label: "5. Follow-up and Future Planning"
  },
  {
    key: "professionalism",
    label: "6. Professionalism"
  },
  {
    key: "clinicalJudgement",
    label: "7. Clinical Judgement"
  },
  {
    key: "recognitionAndReflectionOfPersonalLimits",
    label: "8. Recognition and Reflection of Personal Limits"
  },
  {
    key: "involvementAndLeadershipOfMultiDisciplinaryTeam",
    label: "9. Involvement and Leadership of the Multi-disciplinary Team"
  },
  {
    key: "awarenessOfGuidelinesProtocolsAndEvidence",
    label: "10. Awareness of Guidelines, Protocols and Evidence"
  },
  {
    key: "evaluationOfPublishedDevelopments",
    label: "11. Evaluation of Published Developments"
  }
];

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">{label}</label>
    {children}
  </div>
);

const CBDForm: React.FC<CBDFormProps> = ({
  id,
  sia = "Cataract Surgery",
  level = 1,
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  traineeName,
  onBack,
  onSubmitted,
  onSave,
  allEvidence = [],
  isSupervisor = false
}) => {
  const [formId] = useState(id || uuidv4());
  const [activeSection, setActiveSection] = useState(0);
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [supervisorName, setSupervisorName] = useState(initialAssessorName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialAssessorEmail);
  const [specialty, setSpecialty] = useState(sia || CBD_SPECIALTIES[0]);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Section A: Clinical Scenario
  const [clinicalScenario, setClinicalScenario] = useState("");
  const [clinicalDiscussion, setClinicalDiscussion] = useState("");

  // Section B: Multidimensional assessment
  const [sectionBRatings, setSectionBRatings] = useState<Record<string, string>>({});
  const [sectionBComments, setSectionBComments] = useState<Record<string, string>>({});

  // Section C: Supervisor comments
  const [aspectsEspeciallyGood, setAspectsEspeciallyGood] = useState("");
  const [suggestionsForImprovement, setSuggestionsForImprovement] = useState("");
  const [agreedActionPlan, setAgreedActionPlan] = useState("");

  // Refs for smooth scroll navigation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth scroll to section
  const scrollToSection = useCallback((sectionIndex: number) => {
    const sectionElement = sectionRefs.current[sectionIndex];
    if (sectionElement && scrollContainerRef.current) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionIndex);
    }
  }, []);

  // Navigate to previous section
  const goToPreviousSection = useCallback(() => {
    if (activeSection > 0) {
      scrollToSection(activeSection - 1);
    }
  }, [activeSection, scrollToSection]);

  // Navigate to next section
  const goToNextSection = useCallback(() => {
    if (activeSection < CBD_SECTIONS.length - 1) {
      scrollToSection(activeSection + 1);
    }
  }, [activeSection, scrollToSection]);

  // IntersectionObserver to track which section is currently visible
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionIdx = sectionRefs.current.findIndex(ref => ref === entry.target);
            if (sectionIdx !== -1 && sectionIdx !== activeSection) {
              setActiveSection(sectionIdx);
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const isLocked = status === EvidenceStatus.SignedOff || (status === EvidenceStatus.Submitted && !isSupervisor);

  // Reset activeSection when form loads
  useEffect(() => {
    setActiveSection(0);
  }, []);

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
  }, [isLocked, clinicalScenario, clinicalDiscussion, sectionBRatings, sectionBComments, aspectsEspeciallyGood, suggestionsForImprovement, agreedActionPlan, specialty, supervisorName, supervisorEmail, trainingLevel]);

  // Load existing data if editing
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.CbD);
      if (savedForm?.cbdFormData) {
        const data = savedForm.cbdFormData;

        // Load specialty and supervisor info
        if (data.specialty) setSpecialty(data.specialty);
        if (data.supervisorName) setSupervisorName(data.supervisorName);
        if (data.supervisorEmail) setSupervisorEmail(data.supervisorEmail);

        // Load Section A
        if (data.sectionA) {
          if (data.sectionA.clinicalScenario) setClinicalScenario(data.sectionA.clinicalScenario);
          if (data.sectionA.clinicalDiscussion) setClinicalDiscussion(data.sectionA.clinicalDiscussion);
        }

        // Load Section B
        if (data.sectionB) {
          if (data.sectionB.ratings) setSectionBRatings(data.sectionB.ratings);
          if (data.sectionB.comments) setSectionBComments(data.sectionB.comments);
        }

        // Load Section C
        if (data.sectionC) {
          if (data.sectionC.aspectsEspeciallyGood) setAspectsEspeciallyGood(data.sectionC.aspectsEspeciallyGood);
          if (data.sectionC.suggestionsForImprovement) setSuggestionsForImprovement(data.sectionC.suggestionsForImprovement);
          if (data.sectionC.agreedActionPlan) setAgreedActionPlan(data.sectionC.agreedActionPlan);
        }

        // Load status and level
        if (savedForm.status) setStatus(savedForm.status);
        if (savedForm.level) setTrainingLevel(savedForm.level.toString());
      }
    }
  }, [id, allEvidence]);

  const saveToParent = async (newStatus: EvidenceStatus = status, gmc?: string, name?: string, email?: string) => {
    const baseData: any = {
      id: formId,
      title: `CBD: ${specialty} - Level ${trainingLevel}`,
      type: EvidenceType.CbD,
      sia: specialty,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      supervisorGmc: gmc,
      supervisorName: name || supervisorName,
      supervisorEmail: email || supervisorEmail,
      date: new Date().toISOString().split('T')[0],
      notes: clinicalScenario, // General notes field
      cbdFormData: {
        specialty,
        supervisorName,
        supervisorEmail,
        sectionA: {
          clinicalScenario,
          clinicalDiscussion
        },
        sectionB: {
          ratings: sectionBRatings,
          comments: sectionBComments
        },
        sectionC: {
          aspectsEspeciallyGood,
          suggestionsForImprovement,
          agreedActionPlan
        }
      }
    };
    await onSave(baseData);
  };

  const handleSaveDraft = () => {
    setStatus(EvidenceStatus.Draft);
    saveToParent(EvidenceStatus.Draft);
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 2000);
  };

  const handleEmailForm = async () => {
    if (!supervisorName || !supervisorEmail) {
      alert("Please provide supervisor name and email.");
      return;
    }
    await saveToParent(status);
    const result = await sendMagicLinkEmail({
      evidenceId: formId,
      recipientEmail: supervisorEmail,
      formType: 'CBD'
    });
    if (result.success) {
      setStatus(EvidenceStatus.Submitted);
      await saveToParent(EvidenceStatus.Submitted);
      alert(`Magic link sent to ${supervisorEmail}. They can complete the form without logging in.`);
      if (onSubmitted) onSubmitted();
    } else {
      alert(`Failed to send email: ${result.error || 'Unknown error'}`);
    }
  };

  const handleSignOffConfirm = async (gmc: string, name: string, email: string, signature: string) => {
    setStatus(EvidenceStatus.SignedOff);
    setSupervisorName(name);
    setSupervisorEmail(email);
    await saveToParent(EvidenceStatus.SignedOff, gmc, name, email);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleSupervisorSignOff = () => {
    // Open the SignOffDialog instead of using confirm()
    setIsSignOffOpen(true);
  };

  const handleRatingChange = (key: string, value: string) => {
    if (isLocked) return;
    setSectionBRatings(prev => ({ ...prev, [key]: value }));
    // Clear comments if rating is not "Major concerns" or "Minor concerns"
    if (value !== "Major concerns" && value !== "Minor concerns") {
      setSectionBComments(prev => {
        const newComments = { ...prev };
        delete newComments[key];
        return newComments;
      });
    }
  };

  const handleCommentChange = (key: string, value: string) => {
    if (isLocked) return;
    setSectionBComments(prev => ({ ...prev, [key]: value }));
  };

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const allMeets = "Meets expectations";

    // Mark all Section B competencies
    const newSectionB = { ...sectionBRatings };
    SECTION_B_COMPETENCIES.forEach(competency => {
      newSectionB[competency.key] = allMeets;
    });
    setSectionBRatings(newSectionB);

    // Clear all comments since they're all "Meets expectations"
    setSectionBComments({});
  };

  const isSectionComplete = (sectionIdx: number): boolean => {
    if (sectionIdx === 0) {
      // Section A - both fields should have content
      return clinicalScenario.trim().length > 0 && clinicalDiscussion.trim().length > 0;
    } else if (sectionIdx === 1) {
      // Section B - all 11 competencies need ratings
      return SECTION_B_COMPETENCIES.every(competency => sectionBRatings[competency.key]);
    } else {
      // Section C - all 3 fields are mandatory
      return aspectsEspeciallyGood.trim().length > 0 &&
        suggestionsForImprovement.trim().length > 0 &&
        agreedActionPlan.trim().length > 0;
    }
  };

  const completeness = Math.round(
    (CBD_SECTIONS.filter((_, i) => isSectionComplete(i)).length / CBD_SECTIONS.length) * 100
  );

  // Render Section A
  const renderSectionA = () => {
    return (
      <div className="space-y-6">
        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Clinical Scenario
          </label>
          <textarea
            disabled={isLocked}
            value={clinicalScenario}
            onChange={(e) => setClinicalScenario(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter the clinical scenario..."
          />
        </GlassCard>

        <GlassCard className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Clinical Discussion
          </label>
          <textarea
            disabled={isLocked}
            value={clinicalDiscussion}
            onChange={(e) => setClinicalDiscussion(e.target.value)}
            className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            placeholder="Enter the clinical discussion..."
          />
        </GlassCard>
      </div>
    );
  };

  // Render Section B
  const renderSectionB = () => {
    return (
      <div className="space-y-6">
        {SECTION_B_COMPETENCIES.map((competency) => {
          const rating = sectionBRatings[competency.key] || "";
          const comment = sectionBComments[competency.key] || "";
          const showCommentBox = rating === "Major concerns" || rating === "Minor concerns";
          const isFilled = rating || comment.trim();

          return (
            <GlassCard key={competency.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{competency.label}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {CBD_RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange(competency.key, opt)}
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
                    onChange={(e) => handleCommentChange(competency.key, e.target.value)}
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
          type: "CBD",
          traineeName: traineeName || 'Trainee',
          supervisorEmail: supervisorEmail,
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
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">CBD Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              }`}>
              {status}
            </span>
          </div>

          <div className="space-y-6">
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
                {CBD_SPECIALTIES.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </MetadataField>

            <MetadataField label="Supervisor">
              {!isLocked ? (
                <SupervisorSearch
                  onSelect={(supervisor) => {
                    setSupervisorName(supervisor.name);
                    setSupervisorEmail(supervisor.email);
                  }}
                  currentDeanery={INITIAL_PROFILE.deanery}
                  initialName={supervisorName}
                  initialEmail={supervisorEmail}
                  placeholder="Search supervisor by name or email..."
                  disabled={isLocked}
                />
              ) : (
                <div className="space-y-2">
                  <input disabled type="text" placeholder="Supervisor Name" value={supervisorName} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 outline-none" />
                  <input disabled type="email" placeholder="Supervisor Email" value={supervisorEmail} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 outline-none" />
                </div>
              )}
            </MetadataField>


            {/* Section Navigation Sidebar */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Sections</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPreviousSection}
                    disabled={activeSection === 0}
                    className="epa-nav-chevron p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous section"
                  >
                    <ChevronLeft size={16} className="text-slate-500 dark:text-white/50 rotate-90" />
                  </button>
                  <button
                    onClick={goToNextSection}
                    disabled={activeSection >= CBD_SECTIONS.length - 1}
                    className="epa-nav-chevron p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next section"
                  >
                    <ChevronRight size={16} className="text-slate-500 dark:text-white/50 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {CBD_SECTIONS.map((section, idx) => {
                  const isActive = activeSection === idx;
                  const sectionLetter = section.split('.')[0];

                  return (
                    <button
                      key={section}
                      onClick={() => scrollToSection(idx)}
                      className={`epa-section-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left group ${isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white/60'
                        }`}
                    >
                      <div className={`epa-section-dot w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 group-hover:bg-slate-200 dark:group-hover:bg-white/10'
                        }`}>
                        {sectionLetter}
                      </div>
                      <span className="text-xs font-medium truncate">
                        {section.split('. ')[1] || section}
                      </span>
                    </button>
                  );
                })}
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
              <p className="text-sm font-semibold text-slate-900 dark:text-white">CBD Assessment</p>
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
                {CBD_SPECIALTIES.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Supervisor</label>
              {!isLocked ? (
                <SupervisorSearch
                  onSelect={(supervisor) => {
                    setSupervisorName(supervisor.name);
                    setSupervisorEmail(supervisor.email);
                  }}
                  currentDeanery={INITIAL_PROFILE.deanery}
                  initialName={supervisorName}
                  initialEmail={supervisorEmail}
                  placeholder="Search supervisor..."
                  disabled={isLocked}
                />
              ) : (
                <div className="space-y-2">
                  <input disabled type="text" placeholder="Name" value={supervisorName} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                  <input disabled type="email" placeholder="Email" value={supervisorEmail} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Section Content with Continuous Scroll */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden relative">
        {/* Content Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="epa-scroll-container flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-16 relative"
        >
          <div className="epa-section-content">
            <div className="space-y-8">
              {/* Section A: Clinical Scenario */}
              <div ref={el => sectionRefs.current[0] = el} className="scroll-mt-24">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white/90 mb-4">A. {CBD_SECTIONS[0].split('. ')[1]}</h3>
                {renderSectionA()}
              </div>

              {/* Section B: Multidimensional Assessment */}
              <div ref={el => sectionRefs.current[1] = el} className="scroll-mt-24">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white/90">B. {CBD_SECTIONS[1].split('. ')[1]}</h3>
                  {!isLocked && (
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL AS MEETS EXPECTATIONS
                    </button>
                  )}
                </div>
                {renderSectionB()}
              </div>

              {/* Section C: Supervisor Comments */}
              <div ref={el => sectionRefs.current[2] = el} className="scroll-mt-24">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white/90 mb-4">C. {CBD_SECTIONS[2].split('. ')[1]}</h3>
                {renderSectionC()}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Fade Overlay */}
        <div className="epa-fade-overlay hidden lg:block"></div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 mt-0 lg:mt-6 flex flex-col gap-4 shadow-2xl lg:shadow-none">

          {/* Row 1: Navigation */}
          <div className="flex justify-between items-center w-full">
            <button
              disabled={activeSection === 0}
              onClick={goToPreviousSection}
              className="epa-nav-chevron flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
            </button>

            <div className="flex gap-1.5">
              {CBD_SECTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={`epa-section-dot w-2 h-2 rounded-full transition-all ${activeSection === i ? 'bg-indigo-500 scale-125' : 'bg-slate-300 dark:bg-white/10 hover:bg-slate-400 dark:hover:bg-white/20'}`}
                />
              ))}
            </div>
            <button
              disabled={activeSection >= CBD_SECTIONS.length - 1}
              onClick={goToNextSection}
              className="epa-nav-chevron flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30"
            >
              <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
            </button>
          </div>

          {/* Row 2: Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
            {!isLocked && !isSupervisor && (
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
                  <ShieldCheck size={16} /> <span>SIGN OFF NOW</span>
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

export default CBDForm;
