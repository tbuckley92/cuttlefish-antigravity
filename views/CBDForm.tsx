
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Clipboard, Mail, ShieldCheck, Save
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { EvidenceStatus } from '../types';

interface CBDFormProps {
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  onBack: () => void;
  onSubmitted?: () => void;
}

const CBDForm: React.FC<CBDFormProps> = ({ 
  sia = "Cataract Surgery", 
  level = 1, 
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  onBack,
  onSubmitted
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);

  // Use EvidenceStatus.SignedOff instead of EvidenceStatus.Complete
  const isLocked = status === EvidenceStatus.SignedOff;

  // Form State
  const [selectedSia, setSelectedSia] = useState(sia);
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [clinicalScenario, setClinicalScenario] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const [grading, setGrading] = useState<Record<number, string>>({});
  const [overallAssessment, setOverallAssessment] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [actionPlan, setActionPlan] = useState("");

  const sections = ["Details", "Specifics (Grading)", "Overall"];

  const criteria = [
    "Medical Record Keeping",
    "Clinical Assessment",
    "Investigation and Referrals",
    "Diagnosis and Treatment",
    "Follow‑up and Future Planning",
    "Professionalism",
    "Clinical Judgment",
    "Recognition and Reflection of Personal Limits",
    "Involvement and Leadership of the Multi‑disciplinary Team",
    "Awareness of Guidelines, Protocols and Evidence",
    "Evaluation of Published Developments"
  ];

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const newGrading = { ...grading };
    criteria.forEach((_, idx) => {
      if (!newGrading[idx]) {
        newGrading[idx] = "Meets expectations";
      }
    });
    setGrading(newGrading);
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

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }, 600);
  };

  const isSectionComplete = (idx: number) => {
    if (idx === 0) return clinicalScenario.length > 5 && diagnosis.length > 2 && difficulty !== "";
    if (idx === 1) return criteria.every((_, i) => grading[i]);
    if (idx === 2) return overallAssessment !== "";
    return false;
  };

  const completeness = (sections.filter((_, i) => isSectionComplete(i)).length / sections.length * 100).toFixed(0);

  const handleEmailForm = () => {
    if (!assessorName || !assessorEmail) {
      alert("Please provide assessor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    alert("Form emailed to assessor");
    onSubmitted?.();
  };

  const handleSignOffConfirm = (gmc: string, signature: string) => {
    // Use EvidenceStatus.SignedOff instead of EvidenceStatus.Complete
    setStatus(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    alert(`CBD Signed Off by ${assessorName} (GMC: ${gmc})`);
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      <SignOffDialog 
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: "CBD",
          traineeName: INITIAL_PROFILE.name,
          date: new Date().toLocaleDateString(),
          supervisorName: assessorName || "Assessor"
        }}
      />

      {/* Mobile Metadata Summary */}
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
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">CBD: {selectedSia}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Level {trainingLevel} • {completeness}% Complete</p>
                {/* Use EvidenceStatus.SignedOff instead of EvidenceStatus.Complete */}
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
              <MetadataField label="Specialty Domain">
                <select disabled={isLocked} value={selectedSia} onChange={(e) => setSelectedSia(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
              <div className="grid grid-cols-2 gap-3">
                <MetadataField label="Level">
                  <select disabled={isLocked} value={trainingLevel} onChange={(e) => setTrainingLevel(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </MetadataField>
                <MetadataField label="Date">
                  <input disabled={isLocked} type="date" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                </MetadataField>
              </div>
              <MetadataField label="Assessor">
                <div className="space-y-2">
                  <input disabled={isLocked} type="text" placeholder="Name" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                  <input disabled={isLocked} type="email" placeholder="Email" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                </div>
              </MetadataField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Left Column: Metadata (Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 transition-colors mb-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90 flex items-center gap-2">
              <Clipboard className="text-indigo-600" size={24} /> CBD Assessment
            </h2>
            {/* Use EvidenceStatus.SignedOff instead of EvidenceStatus.Complete */}
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>
          <div className="space-y-6">
            <MetadataField label="Specialty Domain">
              <select disabled={isLocked} value={selectedSia} onChange={(e) => setSelectedSia(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50">
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </MetadataField>
            <MetadataField label="Level">
              <select disabled={isLocked} value={trainingLevel} onChange={(e) => setTrainingLevel(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50">
                {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </MetadataField>
            <MetadataField label="Assessment Date">
              <input disabled={isLocked} type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50" />
            </MetadataField>
            <MetadataField label="Supervisor / Assessor">
              <div className="space-y-2">
                <input disabled={isLocked} type="text" placeholder="Assessor Name" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50" />
                <input disabled={isLocked} type="email" placeholder="Assessor Email" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50" />
              </div>
            </MetadataField>
            <div className="pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4"><span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-wider font-semibold">Completeness</span><span className="text-xs text-slate-600 dark:text-white/60">{completeness}%</span></div>
              <div className="grid grid-cols-3 gap-2">{sections.map((_, i) => <div key={i} className={`h-1 rounded-full ${isSectionComplete(i) ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`}></div>)}</div>
            </div>

            {isLocked && (
              <div className="pt-6 flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-2xl">
                <ShieldCheck className="text-green-500" size={24} />
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Signed Off</p>
                <p className="text-[10px] text-green-600 dark:text-green-500 text-center">Validated by {assessorName}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
          {sections.map((section, idx) => (
            <button key={section} onClick={() => setActiveSection(idx)} className={`px-4 py-2 text-[10px] lg:text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeSection === idx ? 'text-indigo-600 dark:text-white' : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50'}`}>
              {section}{activeSection === idx && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>}
            </button>
          ))}
        </div>

        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          {activeSection === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 dark:text-white/90 mb-6">Details of CBD</h3>
              <GlassCard className="p-4 lg:p-6 space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Clinical Scenario</label>
                  <textarea disabled={isLocked} value={clinicalScenario} onChange={(e) => setClinicalScenario(e.target.value)} placeholder="Provide context of the case..." className="w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Diagnosis</label>
                  <input disabled={isLocked} type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Final diagnosis or differential..." className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40" />
                </div>
                <RadioGroup disabled={isLocked} label="Overall difficulty of case" options={["Simple", "Intermediate", "Difficult"]} value={difficulty} onChange={setDifficulty} />
              </GlassCard>
            </div>
          )}

          {activeSection === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg lg:text-xl font-medium text-slate-900 dark:text-white/90">Specifics (Grading)</h3>
                {!isLocked && (
                  <button 
                    onClick={handleMarkAllMeets} 
                    className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm"
                  >
                    MARK ALL 'MEETS EXPECTATIONS'
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {criteria.map((c, idx) => (
                  <GlassCard key={idx} className="p-4 flex flex-col gap-3">
                    <p className="text-xs lg:text-sm text-slate-700 dark:text-white/80 font-medium">{c}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Major concerns", "Minor concerns", "Meets expectations", "n/a"].map(opt => (
                        <button 
                          key={opt} 
                          disabled={isLocked}
                          onClick={() => setGrading(prev => ({ ...prev, [idx]: opt }))} 
                          className={`px-2 py-1.5 rounded text-[9px] lg:text-[10px] font-medium border transition-all flex-1 min-w-[70px] ${grading[idx] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40'}`}
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

          {activeSection === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg lg:text-xl font-medium text-slate-900 dark:text-white/90 mb-6">Overall assessment & comments</h3>
              <GlassCard className="p-4 lg:p-6 space-y-8">
                <RadioGroup disabled={isLocked} label="Overall assessment of this case‑based discussion" options={["Major concerns", "Minor concerns", "Meets expectations"]} value={overallAssessment} onChange={setOverallAssessment} />
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Aspects which were especially good</label><textarea disabled={isLocked} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="w-full min-h-[80px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm" /></div>
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Suggestions for improvement and action points</label><textarea disabled={isLocked} value={improvements} onChange={(e) => setImprovements(e.target.value)} className="w-full min-h-[80px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm" /></div>
                <div><label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Agreed action plan</label><textarea disabled={isLocked} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} className="w-full min-h-[80px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm" /></div>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 flex justify-between items-center shadow-2xl lg:shadow-none">
          <div className="flex items-center gap-2">
            <button disabled={activeSection === 0} onClick={() => setActiveSection(s => s - 1)} className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 transition-colors disabled:opacity-0"><ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span></button>
            <div className="flex gap-1.5">{sections.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSection === i ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>)}</div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            {showSaveMessage && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300">
                Draft saved {lastSaved}
              </span>
            )}
            
            {!isLocked && (
              <>
                <button 
                  onClick={handleSaveDraft}
                  className="px-3 lg:px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 text-xs lg:text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> <span className="hidden sm:inline">SAVE DRAFT</span>
                </button>
                
                {status !== EvidenceStatus.Submitted && (
                  <button 
                    onClick={handleEmailForm}
                    className="px-4 lg:px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs lg:text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
                  >
                    <Mail size={16} /> <span>EMAIL FORM</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsSignOffOpen(true)}
                  className="px-3 lg:px-4 py-2 rounded-xl bg-green-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <ShieldCheck size={16} /> <span>IN PERSON SIGN OFF</span>
                </button>
              </>
            )}
            {isLocked && (
              <button onClick={onBack} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>
            )}
            
            {activeSection < sections.length - 1 && (
              <button onClick={() => setActiveSection(s => s + 1)} className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 transition-colors"><span className="hidden lg:inline">Next</span> <ChevronRight size={18} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-1.5 block">{label}</label>{children}</div>
);

const RadioGroup: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, options, value, onChange, disabled }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-3 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} disabled={disabled} onClick={() => onChange(opt)} className={`px-3 py-2 rounded-lg text-[10px] lg:text-xs font-medium border transition-all flex-1 min-w-[80px] ${value === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/40'}`}>{opt}</button>
      ))}
    </div>
  </div>
);

export default CBDForm;
