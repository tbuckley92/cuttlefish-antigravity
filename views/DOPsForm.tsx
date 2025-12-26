
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';

interface DOPsFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
}

const DOPsForm: React.FC<DOPsFormProps> = ({ 
  id,
  sia = "Oculoplastics", 
  level = 1, 
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  onBack,
  onSubmitted,
  onSave
}) => {
  const [formId] = useState(id || Math.random().toString(36).substr(2, 9));
  const [activeSection, setActiveSection] = useState(0);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);

  const isLocked = status === EvidenceStatus.SignedOff;

  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [caseDescription, setCaseDescription] = useState("");
  const [assessorStatus, setAssessorStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [prevAttempts, setPrevAttempts] = useState("");
  const [setting, setSetting] = useState("");
  const [grading, setGrading] = useState<Record<number, string>>({});
  const [overallAssessment, setOverallAssessment] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  const sections = ["Details", "Grading", "Overall"];

  const criteria = [
    "Demonstrates understanding of indications, relevant anatomy, techniques of procedure.",
    "Obtains informed consent.",
    "Demonstrates appropriate preparation pre‑procedure.",
    "Appropriate analgesia.",
    "Technical ability.",
    "Aseptic technique.",
    "Seeks help where appropriate.",
    "Awareness of potential complications and how to avoid them.",
    "Post‑procedure management.",
    "Communication skills.",
    "Consideration to patient / professionalism."
  ];

  const saveToParent = (newStatus: EvidenceStatus = status) => {
    onSave({
      id: formId,
      title: `DOPs: ${sia} - Level ${level}`,
      type: EvidenceType.DOPs,
      sia: sia,
      level: level,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      notes: caseDescription
    });
  };

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
    if (!assessorName || !assessorEmail) {
      alert("Please provide assessor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    saveToParent(EvidenceStatus.Submitted);
    alert("Form emailed to assessor");
    onSubmitted?.();
  };

  const handleSignOffConfirm = (gmc: string) => {
    setStatus(EvidenceStatus.SignedOff);
    saveToParent(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    alert(`DOPs Signed Off by ${assessorName} (GMC: ${gmc})`);
  };

  const isSectionComplete = (idx: number) => {
    if (idx === 0) return caseDescription.length > 5 && assessorStatus && difficulty && prevAttempts && setting;
    if (idx === 1) return criteria.every((_, i) => grading[i]);
    if (idx === 2) return overallAssessment !== "";
    return false;
  };

  const completeness = (sections.filter((_, i) => isSectionComplete(i)).length / sections.length * 100).toFixed(0);

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const newGrading = { ...grading };
    criteria.forEach((_, idx) => { if (!newGrading[idx]) newGrading[idx] = "Meets expectations"; });
    setGrading(newGrading);
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <SignOffDialog isOpen={isSignOffOpen} onClose={() => setIsSignOffOpen(false)} onConfirm={handleSignOffConfirm} formInfo={{ type: "DOPs", traineeName: INITIAL_PROFILE.name, date: new Date().toLocaleDateString(), supervisorName: assessorName || "Assessor" }} />
      
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-2"><ArrowLeft size={16} /> Back to Dashboard</button>
        <GlassCard className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900">DOPs Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{status}</span>
          </div>
          <div className="space-y-6">
            <MetadataField label="Specialty / SIA"><select disabled={isLocked} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"><option>{sia}</option></select></MetadataField>
            <MetadataField label="Assessor"><div className="space-y-2"><input disabled={isLocked} type="text" placeholder="Name" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /><input disabled={isLocked} type="email" placeholder="Email" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div></MetadataField>
            <div className="pt-6 border-t border-slate-100"><div className="flex justify-between items-center mb-4"><span className="text-xs text-slate-400 uppercase font-semibold">Completeness</span><span className="text-xs text-slate-600 font-bold">{completeness}%</span></div></div>
          </div>
        </GlassCard>
      </div>

      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        <div className="flex gap-1 mb-8 overflow-x-auto no-scrollbar">{sections.map((section, idx) => <button key={section} onClick={() => setActiveSection(idx)} className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest relative ${activeSection === idx ? 'text-indigo-600' : 'text-slate-400'}`}>{section}{activeSection === idx && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>}</button>)}</div>
        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6">
          {activeSection === 0 && <GlassCard className="p-6 space-y-6"><div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Case description</label><textarea disabled={isLocked} value={caseDescription} onChange={(e) => setCaseDescription(e.target.value)} className="w-full min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm" /></div><RadioGroup disabled={isLocked} label="Assessor Status" options={["Consultant", "Trainee"]} value={assessorStatus} onChange={setAssessorStatus} /></GlassCard>}
          {activeSection === 1 && criteria.map((c, idx) => <GlassCard key={idx} className="p-4 flex flex-col gap-3"><p className="text-sm font-medium">{c}</p><div className="flex gap-2">{["Concerns", "Meets"].map(opt => <button key={opt} disabled={isLocked} onClick={() => setGrading(prev => ({ ...prev, [idx]: opt }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${grading[idx] === opt ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{opt}</button>)}</div></GlassCard>)}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {!isLocked && <><button onClick={handleSaveDraft} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"><Save size={16} /> SAVE DRAFT</button><button onClick={handleEmailForm} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all flex items-center gap-2"><Mail size={16} /> EMAIL FORM</button><button onClick={() => setIsSignOffOpen(true)} className="h-10 px-4 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2"><ShieldCheck size={16} /> IN PERSON</button></>}
          {isLocked && <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold">Close</button>}
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (<div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">{label}</label>{children}</div>);
const RadioGroup: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, options, value, onChange, disabled }) => (<div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">{label}</label><div className="flex gap-2">{options.map(opt => <button key={opt} disabled={disabled} onClick={() => onChange(opt)} className={`px-3 py-2 rounded-lg text-xs font-medium border flex-1 ${value === opt ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>{opt}</button>)}</div></div>);

export default DOPsForm;
