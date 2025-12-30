
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

interface MARFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
  allEvidence?: EvidenceItem[];
}

const MAR_SECTIONS = [
  "A. Clinical Skills",
  "B. Professionalism and Patient Care",
  "C. Compliments, Complaints, Probity",
  "D. Summary"
];

const MAR_SPECIALTIES = [
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

const MAR_RATING_OPTIONS = [
  "Below expectations for level of training",
  "Meets expectations for level of training",
  "N/A"
];

const SECTION_A_COMPETENCIES = [
  {
    key: "efficiency",
    label: "Efficiency: seeing patients promptly, prioritising sensibly"
  },
  {
    key: "clinicalSkills",
    label: "Clinical skills, history taking and examination"
  },
  {
    key: "proceduralSkills",
    label: "Procedural skills (if applicable)"
  },
  {
    key: "diagnosticSkills",
    label: "Diagnostic skills, investigation and management of patients"
  }
];

const SECTION_B_COMPETENCIES = [
  {
    key: "clarityAccuracyDetail",
    label: "Clarity, accuracy, detail (and legibility) of notes/letters/summaries"
  },
  {
    key: "recognisingNeedForSeniorHelp",
    label: "Recognising the need (and urgency) for senior help"
  },
  {
    key: "displayOfCareAndCompassion",
    label: "Display of care and compassion"
  }
];

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">{label}</label>
    {children}
  </div>
);

const MARForm: React.FC<MARFormProps> = ({ 
  id,
  sia = "General Ophthalmology", 
  level = 1, 
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  onBack,
  onSubmitted,
  onSave,
  allEvidence = []
}) => {
  const [formId] = useState(id || Math.random().toString(36).substr(2, 9));
  const [activeSection, setActiveSection] = useState(0);
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [specialty, setSpecialty] = useState(MAR_SPECIALTIES[0]);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Section A: Clinical Skills
  const [sectionARatings, setSectionARatings] = useState<Record<string, string>>({});
  const [sectionAComments, setSectionAComments] = useState<Record<string, string>>({});

  // Section B: Professionalism and Patient Care
  const [sectionBRatings, setSectionBRatings] = useState<Record<string, string>>({});
  const [sectionBComments, setSectionBComments] = useState<Record<string, string>>({});

  // Section C: Compliments, Complaints, Probity
  const [complimentsComplaints, setComplimentsComplaints] = useState({ notApplicable: false, text: "" });
  const [healthIssues, setHealthIssues] = useState({ notApplicable: false, text: "" });
  const [probityConcerns, setProbityConcerns] = useState({ hasConcerns: false, outcomeNotApplicable: false, outcome: "" });

  // Section D: Summary
  const [overallPerformanceAtExpectedLevel, setOverallPerformanceAtExpectedLevel] = useState<boolean | null>(null);
  const [suggestionsForImprovement, setSuggestionsForImprovement] = useState("");

  const isLocked = status === EvidenceStatus.SignedOff;

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
  }, [isLocked, sectionARatings, sectionAComments, sectionBRatings, sectionBComments, complimentsComplaints, healthIssues, probityConcerns, overallPerformanceAtExpectedLevel, suggestionsForImprovement, specialty, assessorName, assessorEmail, trainingLevel]);

  // Load existing data if editing
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.MAR);
      if (savedForm?.marFormData) {
        const data = savedForm.marFormData;
        
        // Load specialty
        if (data.specialty) setSpecialty(data.specialty);
        
        // Load Section A
        if (data.sectionA) {
          const aRatings: Record<string, string> = {};
          const aComments: Record<string, string> = {};
          if (data.sectionA.efficiency) {
            aRatings["efficiency"] = data.sectionA.efficiency.rating || "";
            aComments["efficiency"] = data.sectionA.efficiency.comments || "";
          }
          if (data.sectionA.clinicalSkills) {
            aRatings["clinicalSkills"] = data.sectionA.clinicalSkills.rating || "";
            aComments["clinicalSkills"] = data.sectionA.clinicalSkills.comments || "";
          }
          if (data.sectionA.proceduralSkills) {
            aRatings["proceduralSkills"] = data.sectionA.proceduralSkills.rating || "";
            aComments["proceduralSkills"] = data.sectionA.proceduralSkills.comments || "";
          }
          if (data.sectionA.diagnosticSkills) {
            aRatings["diagnosticSkills"] = data.sectionA.diagnosticSkills.rating || "";
            aComments["diagnosticSkills"] = data.sectionA.diagnosticSkills.comments || "";
          }
          setSectionARatings(aRatings);
          setSectionAComments(aComments);
        }
        
        // Load Section B
        if (data.sectionB) {
          const bRatings: Record<string, string> = {};
          const bComments: Record<string, string> = {};
          if (data.sectionB.clarityAccuracyDetail) {
            bRatings["clarityAccuracyDetail"] = data.sectionB.clarityAccuracyDetail.rating || "";
            bComments["clarityAccuracyDetail"] = data.sectionB.clarityAccuracyDetail.comments || "";
          }
          if (data.sectionB.recognisingNeedForSeniorHelp) {
            bRatings["recognisingNeedForSeniorHelp"] = data.sectionB.recognisingNeedForSeniorHelp.rating || "";
            bComments["recognisingNeedForSeniorHelp"] = data.sectionB.recognisingNeedForSeniorHelp.comments || "";
          }
          if (data.sectionB.displayOfCareAndCompassion) {
            bRatings["displayOfCareAndCompassion"] = data.sectionB.displayOfCareAndCompassion.rating || "";
            bComments["displayOfCareAndCompassion"] = data.sectionB.displayOfCareAndCompassion.comments || "";
          }
          setSectionBRatings(bRatings);
          setSectionBComments(bComments);
        }
        
        // Load Section C
        if (data.sectionC) {
          if (data.sectionC.complimentsComplaints) {
            setComplimentsComplaints(data.sectionC.complimentsComplaints);
          }
          if (data.sectionC.healthIssues) {
            setHealthIssues(data.sectionC.healthIssues);
          }
          if (data.sectionC.probityConcerns) {
            setProbityConcerns(data.sectionC.probityConcerns);
          }
        }
        
        // Load Section D
        if (data.sectionD) {
          if (data.sectionD.overallPerformanceAtExpectedLevel !== undefined) {
            setOverallPerformanceAtExpectedLevel(data.sectionD.overallPerformanceAtExpectedLevel);
          }
          if (data.sectionD.suggestionsForImprovement) {
            setSuggestionsForImprovement(data.sectionD.suggestionsForImprovement);
          }
        }
        
        // Load status and level
        if (savedForm.status) setStatus(savedForm.status);
        if (savedForm.level) setTrainingLevel(savedForm.level.toString());
      }
    }
  }, [id, allEvidence]);

  const saveToParent = (newStatus: EvidenceStatus = status) => {
    const baseData: Partial<EvidenceItem> = {
      id: formId,
      title: `MAR: ${specialty} - Level ${trainingLevel}`,
      type: EvidenceType.MAR,
      sia: sia,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      marFormData: {
        specialty,
        sectionA: {
          efficiency: {
            rating: sectionARatings["efficiency"] || "",
            comments: sectionAComments["efficiency"] || ""
          },
          clinicalSkills: {
            rating: sectionARatings["clinicalSkills"] || "",
            comments: sectionAComments["clinicalSkills"] || ""
          },
          proceduralSkills: {
            rating: sectionARatings["proceduralSkills"] || "",
            comments: sectionAComments["proceduralSkills"] || ""
          },
          diagnosticSkills: {
            rating: sectionARatings["diagnosticSkills"] || "",
            comments: sectionAComments["diagnosticSkills"] || ""
          }
        },
        sectionB: {
          clarityAccuracyDetail: {
            rating: sectionBRatings["clarityAccuracyDetail"] || "",
            comments: sectionBComments["clarityAccuracyDetail"] || ""
          },
          recognisingNeedForSeniorHelp: {
            rating: sectionBRatings["recognisingNeedForSeniorHelp"] || "",
            comments: sectionBComments["recognisingNeedForSeniorHelp"] || ""
          },
          displayOfCareAndCompassion: {
            rating: sectionBRatings["displayOfCareAndCompassion"] || "",
            comments: sectionBComments["displayOfCareAndCompassion"] || ""
          }
        },
        sectionC: {
          complimentsComplaints: {
            notApplicable: complimentsComplaints.notApplicable,
            text: complimentsComplaints.text
          },
          healthIssues: {
            notApplicable: healthIssues.notApplicable,
            text: healthIssues.text
          },
          probityConcerns: {
            hasConcerns: probityConcerns.hasConcerns,
            sharedWithTrainee: probityConcerns.outcomeNotApplicable ? "notApplicable" : "",
            outcome: probityConcerns.outcome
          }
        },
        sectionD: {
          overallPerformanceAtExpectedLevel: overallPerformanceAtExpectedLevel || false,
          suggestionsForImprovement: suggestionsForImprovement
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
    if (!assessorName || !assessorEmail) {
      alert("Please provide assessor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    saveToParent(EvidenceStatus.Submitted);
    alert("Form emailed to assessor");
    onSubmitted?.();
  };

  const handleSignOffConfirm = () => {
    setStatus(EvidenceStatus.SignedOff);
    saveToParent(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleRatingChange = (section: 'A' | 'B', key: string, value: string) => {
    if (isLocked) return;
    if (section === 'A') {
      setSectionARatings(prev => ({ ...prev, [key]: value }));
    } else {
      setSectionBRatings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleCommentsChange = (section: 'A' | 'B', key: string, value: string) => {
    if (isLocked) return;
    if (section === 'A') {
      setSectionAComments(prev => ({ ...prev, [key]: value }));
    } else {
      setSectionBComments(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const allMeets = "Meets expectations for level of training";
    
    // Mark all Section A competencies
    const newSectionA = { ...sectionARatings };
    SECTION_A_COMPETENCIES.forEach(competency => {
      newSectionA[competency.key] = allMeets;
    });
    setSectionARatings(newSectionA);

    // Mark all Section B competencies
    const newSectionB = { ...sectionBRatings };
    SECTION_B_COMPETENCIES.forEach(competency => {
      newSectionB[competency.key] = allMeets;
    });
    setSectionBRatings(newSectionB);
  };

  const isSectionComplete = (sectionIdx: number): boolean => {
    if (sectionIdx === 0) {
      // Section A - all 4 competencies need ratings
      return sectionARatings["efficiency"] && 
             sectionARatings["clinicalSkills"] && 
             sectionARatings["proceduralSkills"] && 
             sectionARatings["diagnosticSkills"];
    } else if (sectionIdx === 1) {
      // Section B - all 3 competencies need ratings
      return sectionBRatings["clarityAccuracyDetail"] && 
             sectionBRatings["recognisingNeedForSeniorHelp"] && 
             sectionBRatings["displayOfCareAndCompassion"];
    } else if (sectionIdx === 2) {
      // Section C - no mandatory fields, always complete
      return true;
    } else {
      // Section D - overallPerformanceAtExpectedLevel must be set
      return overallPerformanceAtExpectedLevel !== null;
    }
  };

  const completeness = Math.round(
    (MAR_SECTIONS.filter((_, i) => isSectionComplete(i)).length / MAR_SECTIONS.length) * 100
  );

  // Render Section A
  const renderSectionA = () => {
    return (
      <div className="space-y-6">
        {SECTION_A_COMPETENCIES.map((competency) => {
          const rating = sectionARatings[competency.key] || "";
          const comments = sectionAComments[competency.key] || "";
          
          return (
            <GlassCard key={competency.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{competency.label}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {MAR_RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', competency.key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      rating === opt 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2 block">Comments:</label>
              <textarea
                disabled={isLocked}
                value={comments}
                onChange={(e) => handleCommentsChange('A', competency.key, e.target.value)}
                placeholder="Add comments..."
                className={`w-full min-h-[80px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
              />
            </GlassCard>
          );
        })}
      </div>
    );
  };

  // Render Section B
  const renderSectionB = () => {
    return (
      <div className="space-y-6">
        {SECTION_B_COMPETENCIES.map((competency) => {
          const rating = sectionBRatings[competency.key] || "";
          const comments = sectionBComments[competency.key] || "";
          
          return (
            <GlassCard key={competency.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{competency.label}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {MAR_RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', competency.key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      rating === opt 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2 block">Comments:</label>
              <textarea
                disabled={isLocked}
                value={comments}
                onChange={(e) => handleCommentsChange('B', competency.key, e.target.value)}
                placeholder="Add comments..."
                className={`w-full min-h-[80px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
              />
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
        {/* Compliments/Complaints */}
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            If applicable, please cite any compliments, comments, or concerns from patients or staff:
          </label>
          <div className="flex items-center gap-3 mb-3">
            <button
              disabled={isLocked}
              onClick={() => setComplimentsComplaints(prev => ({ ...prev, notApplicable: !prev.notApplicable, text: prev.notApplicable ? prev.text : "" }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                complimentsComplaints.notApplicable
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              Not applicable
            </button>
          </div>
          <textarea
            disabled={isLocked || complimentsComplaints.notApplicable}
            value={complimentsComplaints.text}
            onChange={(e) => setComplimentsComplaints(prev => ({ ...prev, text: e.target.value }))}
            placeholder={complimentsComplaints.notApplicable ? "Not applicable" : "Add details..."}
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked || complimentsComplaints.notApplicable ? 'cursor-default opacity-50' : ''}`}
          />
        </GlassCard>

        {/* Health Issues */}
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            If applicable please cite anything that has affected the trainee's ability to work e.g. health issue:
          </label>
          <div className="flex items-center gap-3 mb-3">
            <button
              disabled={isLocked}
              onClick={() => setHealthIssues(prev => ({ ...prev, notApplicable: !prev.notApplicable, text: prev.notApplicable ? prev.text : "" }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                healthIssues.notApplicable
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              Not applicable
            </button>
          </div>
          <textarea
            disabled={isLocked || healthIssues.notApplicable}
            value={healthIssues.text}
            onChange={(e) => setHealthIssues(prev => ({ ...prev, text: e.target.value }))}
            placeholder={healthIssues.notApplicable ? "Not applicable" : "Add details..."}
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked || healthIssues.notApplicable ? 'cursor-default opacity-50' : ''}`}
          />
        </GlassCard>

        {/* Probity Concerns */}
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Do you have any concerns regarding the trainee's probity:
          </label>
          <div className="flex items-center gap-3 mb-4">
            <button
              disabled={isLocked}
              onClick={() => setProbityConcerns(prev => ({ ...prev, hasConcerns: false, outcomeNotApplicable: false, outcome: "" }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                !probityConcerns.hasConcerns
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              No concerns
            </button>
            <button
              disabled={isLocked}
              onClick={() => setProbityConcerns(prev => ({ ...prev, hasConcerns: true }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                probityConcerns.hasConcerns
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              Yes, I have some concerns
            </button>
          </div>
          
          {probityConcerns.hasConcerns && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2 block">
                  If yes, have you shared them, or any other concerns with the trainee? What was the outcome:
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    disabled={isLocked}
                    onClick={() => setProbityConcerns(prev => ({ ...prev, outcomeNotApplicable: !prev.outcomeNotApplicable, outcome: prev.outcomeNotApplicable ? prev.outcome : "" }))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      probityConcerns.outcomeNotApplicable
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                    }`}
                  >
                    Not applicable
                  </button>
                </div>
                <textarea
                  disabled={isLocked || probityConcerns.outcomeNotApplicable}
                  value={probityConcerns.outcome}
                  onChange={(e) => setProbityConcerns(prev => ({ ...prev, outcome: e.target.value }))}
                  placeholder={probityConcerns.outcomeNotApplicable ? "Not applicable" : "Add details..."}
                  className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked || probityConcerns.outcomeNotApplicable ? 'cursor-default opacity-50' : ''}`}
                />
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    );
  };

  // Render Section D
  const renderSectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Is the trainee's overall performance in this SIA at the level expected for their stage of training?
          </label>
          <div className="flex items-center gap-3 mb-6">
            <button
              disabled={isLocked}
              onClick={() => setOverallPerformanceAtExpectedLevel(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider border transition-all ${
                overallPerformanceAtExpectedLevel === true
                  ? 'bg-green-600 border-green-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              Yes
            </button>
            <button
              disabled={isLocked}
              onClick={() => setOverallPerformanceAtExpectedLevel(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider border transition-all ${
                overallPerformanceAtExpectedLevel === false
                  ? 'bg-red-600 border-red-600 text-white shadow-md' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
              }`}
            >
              No
            </button>
          </div>

          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points:
          </label>
          <textarea
            disabled={isLocked}
            value={suggestionsForImprovement}
            onChange={(e) => setSuggestionsForImprovement(e.target.value)}
            placeholder="Add suggestions..."
            className={`w-full min-h-[150px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
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
          type: `MAR - ${specialty}`,
          traineeName: INITIAL_PROFILE.name,
          date: new Date().toLocaleDateString(),
          supervisorName: assessorName || "Assessor"
        }}
      />

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
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90">MAR Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>
          <div className="space-y-6">
            <MetadataField label="Level">
              <select 
                value={trainingLevel} 
                onChange={(e) => setTrainingLevel(e.target.value)} 
                disabled={isLocked} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Specialty SIA">
              <select 
                value={specialty} 
                onChange={(e) => setSpecialty(e.target.value)} 
                disabled={isLocked} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {MAR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Assessor">
              <div className="space-y-2">
                <input
                  type="text"
                  value={assessorName}
                  onChange={(e) => setAssessorName(e.target.value)}
                  disabled={isLocked}
                  placeholder="Assessor Name"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="email"
                  value={assessorEmail}
                  onChange={(e) => setAssessorEmail(e.target.value)}
                  disabled={isLocked}
                  placeholder="Assessor Email"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>
            </MetadataField>

            {/* Progress Bar */}
            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 uppercase font-semibold">Progress</span>
                <span className="text-xs text-slate-600 dark:text-white/60">
                  {MAR_SECTIONS.length} Sections
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MAR_SECTIONS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-colors ${
                      isSectionComplete(i) 
                        ? 'bg-green-500' 
                        : activeSection === i 
                          ? 'bg-indigo-500' 
                          : 'bg-slate-200 dark:bg-white/10'
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            {isLocked && (
              <div className="pt-6 flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-2xl">
                <ShieldCheck className="text-green-500" size={24} />
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">COMPLETE</p>
                <p className="text-[10px] text-green-600 dark:text-green-500 text-center">Validated by {assessorName || "Assessor"}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Mobile Metadata Summary */}
      <div className="lg:hidden mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40 mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <GlassCard className="p-4">
          <button 
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
            className="w-full flex justify-between items-center"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">MAR Assessment</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Level {trainingLevel} • {completeness}% Complete</p>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {status}
                </span>
              </div>
            </div>
            <div className={`transition-transform duration-300 ${isMetadataExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </button>
          
          {isMetadataExpanded && (
            <div className="pt-4 mt-3 border-t border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
              <MetadataField label="Level">
                <select 
                  value={trainingLevel} 
                  onChange={(e) => setTrainingLevel(e.target.value)} 
                  disabled={isLocked} 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                >
                  {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Specialty SIA">
                <select 
                  value={specialty} 
                  onChange={(e) => setSpecialty(e.target.value)} 
                  disabled={isLocked} 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                >
                  {MAR_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
              <MetadataField label="Assessor">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={assessorName}
                    onChange={(e) => setAssessorName(e.target.value)}
                    disabled={isLocked}
                    placeholder="Assessor Name"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="email"
                    value={assessorEmail}
                    onChange={(e) => setAssessorEmail(e.target.value)}
                    disabled={isLocked}
                    placeholder="Assessor Email"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </MetadataField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Right Column: Section Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        {/* Section Titles at Top */}
        <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
          {MAR_SECTIONS.map((section, idx) => (
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 dark:text-white/90">
                {MAR_SECTIONS[activeSection]}
              </h3>
              {!isLocked && (activeSection === 0 || activeSection === 1) && (
                <button 
                  onClick={handleMarkAllMeets}
                  className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                >
                  MARK ALL AS MEETS EXPECTATIONS
                </button>
              )}
            </div>

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
              className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
            </button>
            <div className="flex gap-1.5">
              {MAR_SECTIONS.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    activeSection === i 
                      ? 'bg-indigo-500' 
                      : isSectionComplete(i)
                        ? 'bg-green-500'
                        : 'bg-slate-300 dark:bg-white/10'
                  }`}
                ></div>
              ))}
            </div>
            <button 
              disabled={activeSection === MAR_SECTIONS.length - 1}
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
                  <span>Saved at {lastSaved}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MARForm;

