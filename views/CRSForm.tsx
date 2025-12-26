
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { EvidenceStatus } from '../types';

interface CRSFormProps {
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  onBack: () => void;
  onSubmitted?: () => void;
}

const CRS_TYPES = [
  "Consultation skills",
  "Vision",
  "Fields",
  "Pupil",
  "IOP",
  "Retinoscopy",
  "External eye",
  "78D/90D lens",
  "Slit lamp funduscopy",
  "Slit lamp anterior segment",
  "Direct Ophthalmoscopy",
  "Indirect Ophthalmoscopy",
  "Gonioscopy",
  "Contact lenses",
  "Ocular motility"
];

const CRS_SPECIALTIES = [
  "Cataract Surgery",
  "Community Ophthalmology",
  "Cornea & Ocular Surface",
  "Glaucoma",
  "Medical Retina",
  "Neuro‑ophthalmology",
  "Ocular Motility",
  "Oculoplastics",
  "Paediatric Ophthalmology",
  "Urgent Eye Care",
  "Uveitis",
  "Vitreoretinal Surgery"
];

// Criterion templates for each CRS type
const TEMPLATES: Record<string, string[][]> = {
  "Consultation skills": [
    ["Introduction and start of interview", "Rapport with patient and development of trust", "Listening skills, appropriate eye contact and non‑verbal communication", "Empathy and sensitivity", "Respect for patient"],
    ["History of presenting complaint", "Past ophthalmic history", "Family history", "Past medical history / general health", "Systems enquiry", "Drug history and allergies", "Social history", "Other relevant enquiries pertinent to case", "Assessment of mental state"],
    ["Sensitive and responsive to patient anxieties and concerns", "Aware of the social impact of problems for patient", "Interview sensitive and responsive to age of patient, mental state and any communication problems"],
    ["Appropriate control and direction", "Efficient use of time", "Delivery of information", "Involvement of patient in decisions", "Termination of interview"]
  ],
  "Vision": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Visual acuity testing (Snellen/LogMAR)", "Near vision assessment", "Pin-hole testing", "Colour vision (Ishihara)"]
  ],
  "Fields": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Confrontation testing", "Identification of defects", "Knowledge of automated perimetry (HFA)"]
  ],
  "Pupil": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Light reflex assessment", "Swing-flashlight test (RAPD)", "Near reflex assessment", "Identification of anisocoria"]
  ],
  "IOP": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Goldmann applanation technique", "Fluorescein and local anaesthetic use", "Tonometer calibration check", "Recording of findings"]
  ],
  "Retinoscopy": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Fixation and positioning", "Working distance allowance", "Neutralisation of axis and power", "Accuracy of result"]
  ],
  "External eye": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Eyelid and adnexa assessment", "Ocular surface inspection", "Eversion of upper lid", "Lachrymal system assessment"]
  ],
  "78D/90D lens": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Lens handling and centration", "Slit lamp illumination settings", "Focusing on the optic disc", "Systematic macular and arcade assessment"]
  ],
  "Slit lamp funduscopy": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Dilation check", "Disc assessment (CD ratio, neuroretinal rim)", "Macular assessment", "Peripheral sweep"]
  ],
  "Slit lamp anterior segment": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Knowledge of slit lamp controls", "Corneal assessment", "Anterior chamber depth and cells", "Lens/IOL assessment"]
  ],
  "Direct Ophthalmoscopy": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Red reflex identification", "Focusing technique", "Optic disc visualisation", "Vessel assessment"]
  ],
  "Indirect Ophthalmoscopy": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Headset adjustment", "Lens positioning", "Patient positioning and direction", "Identification of peripheral pathology"]
  ],
  "Gonioscopy": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Lens insertion/Coupling fluid", "Identification of angle structures", "Dynamic/Indentation gonioscopy", "Spaeth/Shaffer grading"]
  ],
  "Contact lenses": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Lens selection", "Insertion technique", "Fit assessment", "Patient instruction/Handling"]
  ],
  "Ocular motility": [
    ["Introduction and explanation", "Rapport with patient"],
    ["Cover/Uncover test", "Alternating cover test", "Assessment of versions/ductions", "Prism cover test (PCT)"]
  ]
};

const COMMON_ATTITUDE = ["Professionalism", "Introduction and explanation of examination", "Rapport with patient"];

const CRSForm: React.FC<CRSFormProps> = ({ 
  sia = "General Ophthalmology", 
  level = 1, 
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  onBack,
  onSubmitted
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [selectedCrsType, setSelectedCrsType] = useState(CRS_TYPES[0]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(CRS_SPECIALTIES[0]);
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [caseDescription, setCaseDescription] = useState("");
  const [assessorStatus, setAssessorStatus] = useState("");
  const [grading, setGrading] = useState<Record<string, string>>({});
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [actionPlan, setActionPlan] = useState("");

  const isLocked = status === EvidenceStatus.SignedOff;

  const currentTemplate = TEMPLATES[selectedCrsType] || [[]];
  const isConsultation = selectedCrsType === "Consultation skills";
  
  const sections = [
    "Details", 
    ...currentTemplate.map((_, i) => isConsultation ? `Section ${i + 1}` : `Grading ${i + 1}`), 
    "Overall"
  ];

  const getSectionTitle = (idx: number) => {
    if (idx === 0) return "Details";
    if (idx === sections.length - 1) return "Overall";
    if (isConsultation) {
      const consultationTitles = [
        "Attitude and Manner",
        "Information gathering",
        "Awareness",
        "Management of consultation and delivery of information"
      ];
      return `Section ${idx}: ${consultationTitles[idx - 1]}`;
    }
    return `Grading Section ${idx}`;
  };

  useEffect(() => {
    if (isLocked) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [isLocked]);

  const handleCrsTypeChange = (newType: string) => {
    if (Object.keys(grading).length > 0 && !confirm("Changing CRS type will reset current grading. Continue?")) {
      return;
    }
    setSelectedCrsType(newType);
    setGrading({});
    setActiveSection(0);
  };

  const handleMarkAllMeets = (sectionIdx: number) => {
    if (isLocked) return;
    const newGrading = { ...grading };
    const currentCriteria = currentTemplate[sectionIdx - 1] || [];
    const baseCriteria = (sectionIdx === 1 && !isConsultation) ? COMMON_ATTITUDE.concat(currentCriteria) : currentCriteria;
    baseCriteria.forEach((c) => {
      if (!newGrading[`${sectionIdx}-${c}`]) {
        newGrading[`${sectionIdx}-${c}`] = "Meets expectations";
      }
    });
    setGrading(newGrading);
  };

  const handleSignOffConfirm = (gmc: string) => {
    setStatus(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    alert(`CRS Signed Off by ${assessorName} (GMC: ${gmc})`);
  };

  const handleEmailForm = () => {
    if (!assessorName || !assessorEmail) {
      alert("Please provide assessor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    alert("Form emailed to assessor");
    onSubmitted?.();
  };

  const isSectionComplete = (idx: number) => {
    if (idx === 0) return caseDescription.length > 5 && assessorStatus !== "";
    if (idx === sections.length - 1) return strengths.length > 0;
    const criteria = currentTemplate[idx - 1] || [];
    const baseCriteria = (idx === 1 && !isConsultation) ? COMMON_ATTITUDE.concat(criteria) : criteria;
    return baseCriteria.every(c => grading[`${idx}-${c}`]);
  };

  const completeness = (sections.filter((_, i) => isSectionComplete(i)).length / sections.length * 100).toFixed(0);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      <SignOffDialog 
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: `CRS - ${selectedCrsType}`,
          traineeName: INITIAL_PROFILE.name,
          date: new Date().toLocaleDateString(),
          supervisorName: assessorName || "Assessor"
        }}
      />

      {/* Left Column: Metadata */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Clinical Rating Scale</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>

          <div className="space-y-6">
            <MetadataField label="CRS Type">
              <select 
                disabled={isLocked}
                value={selectedCrsType}
                onChange={(e) => handleCrsTypeChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
              >
                {CRS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </MetadataField>

            {isConsultation && (
              <MetadataField label="Specialty">
                <select 
                  disabled={isLocked}
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
                >
                  {CRS_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
            )}

            <MetadataField label="Training Level">
              <div className="flex gap-2">
                {["1", "2", "3", "4"].map(l => (
                  <button 
                    key={l}
                    disabled={isLocked}
                    onClick={() => setTrainingLevel(l)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${trainingLevel === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    L{l}
                  </button>
                ))}
              </div>
            </MetadataField>

            <MetadataField label="Assessment Date">
              <input disabled={isLocked} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </MetadataField>

            <MetadataField label="Assessor Details">
              <div className="space-y-2">
                <input disabled={isLocked} type="text" placeholder="Assessor Name" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                <input disabled={isLocked} type="email" placeholder="Assessor Email" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </MetadataField>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 uppercase font-semibold">Completeness</span>
                <span className="text-xs text-slate-600 font-bold">{completeness}%</span>
              </div>
              <div className="flex gap-1">
                {sections.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${isSectionComplete(i) ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
          {sections.map((section, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSection(idx)}
              className={`px-4 py-2 text-[10px] lg:text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeSection === idx ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {section}
              {activeSection === idx && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>}
            </button>
          ))}
        </div>

        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          {activeSection === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 mb-6">Details of Assessment</h3>
              <GlassCard className="p-6 space-y-6">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 mb-4">
                   <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                     You can help your colleague by completing some of the Clinical Rating Scale {selectedCrsType} {isConsultation ? `in ${selectedSpecialty}` : ''}.
                   </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Brief description of case</label>
                  <textarea disabled={isLocked} value={caseDescription} onChange={(e) => setCaseDescription(e.target.value)} placeholder="Describe the clinical encounter..." className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-indigo-500/40" />
                </div>
                <RadioGroup disabled={isLocked} label="Assessor's Status" options={["Consultant", "Trainee", "Other"]} value={assessorStatus} onChange={setAssessorStatus} />
              </GlassCard>
            </div>
          )}

          {activeSection > 0 && activeSection < sections.length - 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg lg:text-xl font-medium text-slate-900">{getSectionTitle(activeSection)}</h3>
                {!isLocked && (
                  <button 
                    onClick={() => handleMarkAllMeets(activeSection)}
                    className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                  >
                    MARK ALL 'MEETS EXPECTATIONS'
                  </button>
                )}
              </div>
              
              {isConsultation && activeSection === 4 && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500 italic">
                    Mode of enquiry: appropriate use of closed, open, directed and probing questions. Clarification and summarising.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {(activeSection === 1 && !isConsultation ? COMMON_ATTITUDE.concat(currentTemplate[0] || []) : currentTemplate[activeSection - 1] || []).map((c, idx) => (
                  <GlassCard key={idx} className="p-4 flex flex-col gap-3">
                    <p className="text-sm text-slate-700 font-medium">{c}</p>
                    <div className="flex flex-wrap gap-2">
                      {["Major concerns", "Minor concerns", "Meets expectations", "n/a"].map(opt => (
                        <button 
                          key={opt}
                          disabled={isLocked}
                          onClick={() => setGrading(prev => ({ ...prev, [`${activeSection}-${c}`]: opt }))}
                          className={`px-3 py-2 rounded-lg text-[10px] font-semibold border transition-all flex-1 min-w-[100px] ${grading[`${activeSection}-${c}`] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {activeSection === sections.length - 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 mb-6">Overall assessment & comments</h3>
              <GlassCard className="p-6 space-y-8">
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Please note any aspects which were especially good</label><textarea disabled={isLocked} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm" /></div>
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Please note any suggestions for improvement and action points</label><textarea disabled={isLocked} value={improvements} onChange={(e) => setImprovements(e.target.value)} className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm" /></div>
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Agreed action plan</label><textarea disabled={isLocked} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm" /></div>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 backdrop-blur-xl lg:bg-transparent p-4 lg:p-0 border-t lg:border-none border-slate-200 mt-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <button 
              disabled={activeSection === 0}
              onClick={() => setActiveSection(s => s - 1)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex gap-1.5">
              {sections.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>)}
            </div>
            <button 
              disabled={activeSection === sections.length - 1}
              onClick={() => setActiveSection(s => s + 1)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-0"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            {isSaving && <span className="text-[10px] text-teal-600 font-bold uppercase animate-pulse">Draft Saved {lastSaved}</span>}
            {!isLocked && (
              <>
                <button onClick={() => alert("Draft saved")} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Save size={16} /> SAVE DRAFT
                </button>
                <button onClick={handleEmailForm} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2">
                  <Mail size={16} /> EMAIL FORM
                </button>
                <button onClick={() => setIsSignOffOpen(true)} className="h-10 px-4 rounded-xl bg-green-600 text-white text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap">
                  <ShieldCheck size={16} /> IN PERSON SIGN OFF
                </button>
              </>
            )}
            {isLocked && <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">{label}</label>{children}</div>
);

const RadioGroup: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, options, value, onChange, disabled }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} disabled={disabled} onClick={() => onChange(opt)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-1 min-w-[80px] ${value === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{opt}</button>
      ))}
    </div>
  </div>
);

export default CRSForm;
