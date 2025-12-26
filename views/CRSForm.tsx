
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SPECIALTIES, INITIAL_PROFILE } from '../constants';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';

interface CRSFormProps {
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

const CRS_TYPES = ["Consultation skills", "Vision", "Fields", "Pupil", "IOP", "Retinoscopy", "External eye", "78D/90D lens", "Slit lamp funduscopy", "Slit lamp anterior segment", "Direct Ophthalmoscopy", "Indirect Ophthalmoscopy", "Gonioscopy", "Contact lenses", "Ocular motility"];

const CRSForm: React.FC<CRSFormProps> = ({ 
  id,
  sia = "General Ophthalmology", 
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
  const [selectedCrsType, setSelectedCrsType] = useState(CRS_TYPES[0]);
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [caseDescription, setCaseDescription] = useState("");

  const isLocked = status === EvidenceStatus.SignedOff;

  const saveToParent = (newStatus: EvidenceStatus = status) => {
    onSave({
      id: formId,
      title: `CRS: ${selectedCrsType} - Level ${trainingLevel}`,
      type: EvidenceType.CRS,
      sia: sia,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      notes: caseDescription
    });
  };

  const handleSaveDraft = () => {
    saveToParent(EvidenceStatus.Draft);
    alert("Draft saved to Evidence table.");
  };

  const handleEmailForm = () => {
    setStatus(EvidenceStatus.Submitted);
    saveToParent(EvidenceStatus.Submitted);
    alert("Form emailed to assessor");
    onSubmitted?.();
  };

  const handleSignOffConfirm = (gmc: string) => {
    setStatus(EvidenceStatus.SignedOff);
    saveToParent(EvidenceStatus.SignedOff);
    setIsSignOffOpen(false);
    alert(`CRS Signed Off (GMC: ${gmc})`);
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <SignOffDialog isOpen={isSignOffOpen} onClose={() => setIsSignOffOpen(false)} onConfirm={handleSignOffConfirm} formInfo={{ type: `CRS - ${selectedCrsType}`, traineeName: INITIAL_PROFILE.name, date: new Date().toLocaleDateString(), supervisorName: assessorName || "Assessor" }} />
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-2"><ArrowLeft size={16} /> Back</button>
        <GlassCard className="p-8"><h2 className="text-xl font-semibold text-slate-900">CRS Assessment</h2><div className="space-y-6 pt-6"><MetadataField label="CRS Type"><select value={selectedCrsType} onChange={(e) => setSelectedCrsType(e.target.value)} disabled={isLocked} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">{CRS_TYPES.map(t => <option key={t}>{t}</option>)}</select></MetadataField></div></GlassCard>
      </div>
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        <GlassCard className="p-6 space-y-6"><div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Brief description</label><textarea disabled={isLocked} value={caseDescription} onChange={(e) => setCaseDescription(e.target.value)} className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm" /></div></GlassCard>
        <div className="mt-6 flex justify-end gap-3">
          {!isLocked && <><button onClick={handleSaveDraft} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"><Save size={16} /> SAVE DRAFT</button><button onClick={handleEmailForm} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all flex items-center gap-2"><Mail size={16} /> EMAIL FORM</button><button onClick={() => setIsSignOffOpen(true)} className="h-10 px-4 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2"><ShieldCheck size={16} /> IN PERSON</button></>}
          {isLocked && <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>}
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (<div><label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">{label}</label>{children}</div>);

export default CRSForm;
