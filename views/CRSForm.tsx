
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SupervisorSearch } from '../components/SupervisorSearch';
import { uuidv4 } from '../utils/uuid';
import { sendMagicLinkEmail } from '../utils/emailUtils';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';
import {
  CRS_FORM_TYPES,
  CRS_RATING_OPTIONS,
  CRS_SPECIALTIES,
  CRSFormTypeConfig,
  CRSSection,
  CRSCriterion,
  getSectionLabels,
  getCRSFormTypeNames,
  VISUAL_ACUITY_METHODS,
  COLOUR_VISION_METHODS,
  IOP_TECHNIQUES
} from '../constants/crsFormData';

interface CRSFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  initialCrsType?: string;
  originView?: any;
  originFormParams?: any;
  traineeName?: string;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
  onViewLinkedEvidence?: (evidenceId: string, section?: number) => void;
  allEvidence?: EvidenceItem[];
  isSupervisor?: boolean;
}

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">{label}</label>
    {children}
  </div>
);

const CRSForm: React.FC<CRSFormProps> = ({
  id,
  sia = "General Ophthalmology",
  level = 1,
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  initialCrsType,
  traineeName,
  onBack,
  onSubmitted,
  onSave,
  allEvidence = [],
  isSupervisor = false
}) => {
  const [formId] = useState(id || uuidv4());
  const [activeSection, setActiveSection] = useState(0);
  const [selectedCrsType, setSelectedCrsType] = useState(() => {
    if (!id && initialCrsType && getCRSFormTypeNames().includes(initialCrsType)) {
      return initialCrsType;
    }
    return "Vision";
  });
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [caseDescription, setCaseDescription] = useState("");
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Universal ratings storage - keyed by sectionId + criterionKey
  const [ratings, setRatings] = useState<Record<string, string>>({});
  // Comments storage for "Overall" sections
  const [comments, setComments] = useState<Record<string, string>>({});
  // Method selectors (for Vision, IOP)
  const [methodValues, setMethodValues] = useState<Record<string, string>>({});
  const [methodOtherValues, setMethodOtherValues] = useState<Record<string, string>>({});
  // Specialty (for Consultation skills)
  const [specialty, setSpecialty] = useState("No specialty SIA");

  // Refs for smooth scroll navigation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isLocked = status === EvidenceStatus.SignedOff || (status === EvidenceStatus.Submitted && !isSupervisor);
  const currentFormConfig = CRS_FORM_TYPES[selectedCrsType];
  const sections = currentFormConfig?.sections || [];

  // Smooth scroll to section
  const scrollToSection = useCallback((sectionIndex: number) => {
    const sectionElement = sectionRefs.current[sectionIndex];
    if (sectionElement && scrollContainerRef.current) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionIndex);
    }
  }, []);

  const goToPreviousSection = useCallback(() => {
    if (activeSection > 0) scrollToSection(activeSection - 1);
  }, [activeSection, scrollToSection]);

  const goToNextSection = useCallback(() => {
    if (activeSection < sections.length - 1) scrollToSection(activeSection + 1);
  }, [activeSection, sections.length, scrollToSection]);

  // IntersectionObserver to track visible section
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
      { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [selectedCrsType]);

  // Reset active section when form type changes
  useEffect(() => {
    setActiveSection(0);
    // Initialize method values for forms with selectors
    if (currentFormConfig?.methodSelector) {
      const ms = currentFormConfig.methodSelector;
      if (!methodValues[ms.section]) {
        setMethodValues(prev => ({ ...prev, [ms.section]: ms.options[0] }));
      }
    }
  }, [selectedCrsType]);

  // Load existing data
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.CRS);
      if (savedForm?.crsFormData) {
        const data = savedForm.crsFormData;
        if (data.crsType) setSelectedCrsType(data.crsType);
        if (data.caseDescription) setCaseDescription(data.caseDescription);
        if (data.assessorName) setAssessorName(data.assessorName);
        if (data.assessorEmail) setAssessorEmail(data.assessorEmail);
        if (data.ratings) setRatings(data.ratings);
        if (data.comments) setComments(data.comments);
        if (data.methodValues) setMethodValues(data.methodValues);
        if (data.methodOtherValues) setMethodOtherValues(data.methodOtherValues);
        if (data.specialty) setSpecialty(data.specialty);
        if (savedForm.status) setStatus(savedForm.status);
        if (savedForm.level) setTrainingLevel(savedForm.level.toString());
      }
    }
  }, [id, allEvidence]);

  // Auto-save
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
  }, [isLocked, ratings, comments, methodValues, methodOtherValues, specialty, assessorName, assessorEmail]);

  const saveToParent = async (newStatus: EvidenceStatus = status, gmc?: string, name?: string, email?: string) => {
    const baseData: any = {
      id: formId,
      title: `CRS: ${selectedCrsType} - Level ${trainingLevel}`,
      type: EvidenceType.CRS,
      sia: selectedCrsType || sia,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      supervisorGmc: gmc,
      supervisorName: name || assessorName,
      supervisorEmail: email || assessorEmail,
      date: new Date().toISOString().split('T')[0],
      notes: caseDescription,
      crsFormData: {
        crsType: selectedCrsType,
        caseDescription,
        assessorName: name || assessorName,
        assessorEmail: email || assessorEmail,
        ratings,
        comments,
        methodValues,
        methodOtherValues,
        specialty
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
    if (!assessorName || !assessorEmail) {
      alert("Please provide assessor name and email.");
      return;
    }

    // Save form first to ensure we have an ID
    await saveToParent(EvidenceStatus.Draft);

    const result = await sendMagicLinkEmail({
      evidenceId: formId,
      recipientEmail: assessorEmail,
      formType: 'CRS'
    });

    if (result.success) {
      setStatus(EvidenceStatus.Submitted);
      await saveToParent(EvidenceStatus.Submitted);
      alert(`Magic link sent to ${assessorEmail}. They can complete the form without logging in.`);
      if (onSubmitted) onSubmitted();
    } else {
      alert(`Failed to send email: ${result.error || 'Unknown error'}`);
    }
  };

  const handleSignOffConfirm = async (gmc: string, name: string, email: string, signature: string) => {
    setStatus(EvidenceStatus.SignedOff);
    setAssessorName(name);
    setAssessorEmail(email);
    await saveToParent(EvidenceStatus.SignedOff, gmc, name, email);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleSupervisorSignOff = async () => {
    if (confirm("Are you sure you want to sign off this form as 'Complete'?")) {
      setStatus(EvidenceStatus.SignedOff);
      await saveToParent(EvidenceStatus.SignedOff);
      if (onSubmitted) onSubmitted();
      alert("Form signed off successfully.");
      onBack();
    }
  };

  const handleRatingChange = (sectionId: string, criterionKey: string, value: string) => {
    if (isLocked) return;
    const key = `${sectionId}_${criterionKey}`;
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleCommentChange = (key: string, value: string) => {
    if (isLocked) return;
    setComments(prev => ({ ...prev, [key]: value }));
  };

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const newRatings = { ...ratings };
    sections.forEach(section => {
      if (!section.isOverallSection) {
        section.criteria.forEach(criterion => {
          const key = `${section.id}_${criterion.key}`;
          newRatings[key] = "Meets expectations";
        });
      }
    });
    setRatings(newRatings);
  };

  const isSectionComplete = (sectionIdx: number): boolean => {
    const section = sections[sectionIdx];
    if (!section) return false;

    if (section.isOverallSection) {
      return section.criteria.every(c => comments[c.key]?.trim());
    }

    return section.criteria.every(c => {
      const key = `${section.id}_${c.key}`;
      return !!ratings[key];
    });
  };

  const completeness = Math.round(
    (sections.filter((_, i) => isSectionComplete(i)).length / sections.length) * 100
  );

  // Render a single criterion rating row
  const renderCriterionRow = (section: CRSSection, criterion: CRSCriterion) => {
    const key = `${section.id}_${criterion.key}`;
    const rating = ratings[key] || "";

    return (
      <GlassCard key={criterion.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${rating ? 'ring-2 ring-green-500/30' : ''}`}>
        <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion.label}</p>
        <div className="flex flex-wrap gap-2">
          {CRS_RATING_OPTIONS.map(opt => (
            <button
              key={opt}
              disabled={isLocked}
              onClick={() => handleRatingChange(section.id, criterion.key, opt)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </GlassCard>
    );
  };

  // Render overall/comments section
  const renderOverallSection = (section: CRSSection) => {
    return (
      <div className="space-y-6">
        {section.criteria.map(criterion => (
          <GlassCard key={criterion.key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
            <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
              {criterion.label} <span className="text-red-500">*</span>
            </label>
            <textarea
              disabled={isLocked}
              value={comments[criterion.key] || ""}
              onChange={(e) => handleCommentChange(criterion.key, e.target.value)}
              className="w-full min-h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white/90 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
              placeholder="Enter your comments..."
            />
          </GlassCard>
        ))}
      </div>
    );
  };

  // Render a section with grouped subsections (for Gonioscopy)
  const renderSectionWithSubsections = (section: CRSSection) => {
    const subsections = new Map<string, CRSCriterion[]>();
    const noSubsection: CRSCriterion[] = [];

    section.criteria.forEach(c => {
      if (c.subsection) {
        const list = subsections.get(c.subsection) || [];
        list.push(c);
        subsections.set(c.subsection, list);
      } else {
        noSubsection.push(c);
      }
    });

    return (
      <div className="space-y-6">
        {noSubsection.map(c => renderCriterionRow(section, c))}
        {Array.from(subsections.entries()).map(([subsectionTitle, criteria]) => (
          <div key={subsectionTitle}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-3 mt-6">{subsectionTitle}</h4>
            <div className="space-y-4">
              {criteria.map(c => renderCriterionRow(section, c))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render a full section
  const renderSection = (section: CRSSection, sectionIdx: number) => {
    const hasSubsections = section.criteria.some(c => c.subsection);

    // Method selector for this section
    const methodSelector = currentFormConfig?.methodSelector?.section === section.id ? currentFormConfig.methodSelector : null;

    return (
      <div ref={el => sectionRefs.current[sectionIdx] = el} className="scroll-mt-24" key={section.id}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white/90">
            {section.id}. {section.title}
          </h3>
          {!section.isOverallSection && !isLocked && (
            <button
              onClick={handleMarkAllMeets}
              className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
            >
              MARK ALL AS MEETS EXPECTATIONS
            </button>
          )}
        </div>

        {methodSelector && (
          <GlassCard className="p-5 mb-6">
            <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-3 block">{methodSelector.label}</label>
            <select
              disabled={isLocked}
              value={methodValues[section.id] || methodSelector.options[0]}
              onChange={(e) => setMethodValues(prev => ({ ...prev, [section.id]: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {methodSelector.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {methodValues[section.id] === "Other" && methodSelector.otherLabel && (
              <input
                type="text"
                disabled={isLocked}
                value={methodOtherValues[section.id] || ""}
                onChange={(e) => setMethodOtherValues(prev => ({ ...prev, [section.id]: e.target.value }))}
                placeholder={methodSelector.otherLabel}
                className="mt-3 w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            )}
          </GlassCard>
        )}

        {section.isOverallSection ? (
          renderOverallSection(section)
        ) : hasSubsections ? (
          renderSectionWithSubsections(section)
        ) : (
          <div className="space-y-4">
            {section.criteria.map(c => renderCriterionRow(section, c))}
          </div>
        )}
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
          type: "CRS",
          traineeName: traineeName || 'Trainee',
          supervisorEmail: assessorEmail,
          date: new Date().toLocaleDateString(),
          supervisorName: assessorName || "Assessor"
        }}
      />

      {/* Left Column: Metadata (Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">CRS Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              }`}>
              {status}
            </span>
          </div>

          <div className="space-y-6">
            <MetadataField label="CRS Type">
              <select
                disabled={isLocked}
                value={selectedCrsType}
                onChange={(e) => setSelectedCrsType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getCRSFormTypeNames().map(type => (
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

            {currentFormConfig?.hasSpecialtySelector && (
              <MetadataField label="Specialty">
                <select
                  disabled={isLocked}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {CRS_SPECIALTIES.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </MetadataField>
            )}

            <MetadataField label="Assessor">
              {!isLocked ? (
                <SupervisorSearch
                  onSelect={(supervisor) => {
                    setAssessorName(supervisor.name);
                    setAssessorEmail(supervisor.email);
                  }}
                  currentDeanery="London"
                  initialName={assessorName}
                  initialEmail={assessorEmail}
                  placeholder="Search assessor by name or email..."
                  disabled={isLocked}
                />
              ) : (
                <div className="space-y-2">
                  <input disabled type="text" placeholder="Assessor Name" value={assessorName} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 outline-none" />
                  <input disabled type="email" placeholder="Assessor Email" value={assessorEmail} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white/90 outline-none" />
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
                    disabled={activeSection >= sections.length - 1}
                    className="epa-nav-chevron p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next section"
                  >
                    <ChevronRight size={16} className="text-slate-500 dark:text-white/50 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {sections.map((section, idx) => {
                  const isActive = activeSection === idx;
                  return (
                    <button
                      key={section.id}
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
                        {section.id}
                      </div>
                      <span className="text-xs font-medium truncate">{section.title}</span>
                    </button>
                  );
                })}
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

      {/* Right Column: Section Content with Continuous Scroll */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden relative">
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-2">
          <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40 mb-4">
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="epa-scroll-container flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-16 relative"
        >
          <div className="epa-section-content">
            <div className="space-y-8">
              {sections.map((section, idx) => renderSection(section, idx))}
            </div>
          </div>
        </div>

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
              {sections.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={`epa-section-dot w-2 h-2 rounded-full transition-all ${activeSection === i ? 'bg-indigo-500 scale-125' : 'bg-slate-300 dark:bg-white/10 hover:bg-slate-400 dark:hover:bg-white/20'}`}
                />
              ))}
            </div>
            <button
              disabled={activeSection >= sections.length - 1}
              onClick={goToNextSection}
              className="epa-nav-chevron flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30"
            >
              <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
            </button>
          </div>

          {/* Row 2: Actions */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/30">
              {isSaving ? (
                <><Clock size={14} className="animate-pulse" /> Saving...</>
              ) : showSaveMessage ? (
                <><CheckCircle2 size={14} className="text-green-500" /> Saved!</>
              ) : (
                <><Clock size={14} /> {lastSaved}</>
              )}
            </div>

            <div className="flex gap-2">
              {!isLocked && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                  >
                    <Save size={14} /> SAVE DRAFT
                  </button>
                  {isSupervisor ? (
                    <button
                      onClick={handleSupervisorSignOff}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      <ShieldCheck size={14} /> Sign Off
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleEmailForm}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        <Mail size={14} /> EMAIL FORM
                      </button>
                      <button
                        onClick={() => setIsSignOffOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                      >
                        <ShieldCheck size={14} /> SIGN OFF NOW
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRSForm;
