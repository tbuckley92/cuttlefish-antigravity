
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, 
  Clock, AlertCircle, FileText, BookOpen, Users, 
  ClipboardCheck, Activity, Trash2, X, Info, ExternalLink, ShieldCheck,
  UploadCloud, Calendar, Save, Eye
} from '../components/Icons';
import { EvidenceItem, EvidenceType, EvidenceStatus, SIA } from '../types';

interface ARCPPrepProps {
  sias: SIA[];
  allEvidence: EvidenceItem[];
  onBack: () => void;
  onNavigateGSAT: () => void;
  onNavigateMSF: () => void;
  onUpsertEvidence: (item: Partial<EvidenceItem>) => void;
}

const ARCPPrep: React.FC<ARCPPrepProps> = ({ sias, allEvidence, onBack, onNavigateGSAT, onNavigateMSF, onUpsertEvidence }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Track the ID of the persistent ARCP Prep evidence item
  const existingPrepRecord = useMemo(() => 
    allEvidence.find(e => e.type === EvidenceType.ARCPPrep),
    [allEvidence]
  );
  
  const [prepId] = useState(existingPrepRecord?.id || Math.random().toString(36).substr(2, 9));
  const [lastSaved, setLastSaved] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Dialog State for Form R
  const [isFormRDialogOpen, setIsFormRDialogOpen] = useState(false);
  const [formRDate, setFormRDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRFileName, setFormRFileName] = useState('');
  const [formRFileUrl, setFormRFileUrl] = useState('');
  const formRFileInputRef = useRef<HTMLInputElement>(null);

  // Dialog State for Eyelogbook
  const [isLogbookDialogOpen, setIsLogbookDialogOpen] = useState(false);
  const [logbookDate, setLogbookDate] = useState(new Date().toISOString().split('T')[0]);
  const [logbookFileName, setLogbookFileName] = useState('');
  const [logbookFileUrl, setLogbookFileUrl] = useState('');
  const logbookFileInputRef = useRef<HTMLInputElement>(null);

  const saveStatus = (status: EvidenceStatus = EvidenceStatus.Draft) => {
    setIsSaving(true);
    onUpsertEvidence({
      id: prepId,
      title: "ARCP Portfolio Compilation",
      type: EvidenceType.ARCPPrep,
      status: status,
      date: new Date().toISOString().split('T')[0],
      notes: `User reached step ${step} of ${totalSteps}.`
    });
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  // Auto-save every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveStatus(EvidenceStatus.Draft);
    }, 15000);
    return () => clearInterval(interval);
  }, [step]);

  const handleBack = () => {
    saveStatus(EvidenceStatus.Draft);
    onBack();
  };

  const handleFinish = () => {
    saveStatus(EvidenceStatus.SignedOff);
    onBack();
  };

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // Find existing artifacts in allEvidence
  const existingFormR = useMemo(() => 
    allEvidence.find(e => e.title.toLowerCase().includes("form r")),
    [allEvidence]
  );

  const existingLogbook = useMemo(() => 
    allEvidence.find(e => e.type === EvidenceType.Logbook),
    [allEvidence]
  );

  // Dynamic Artifact Statuses for Part 1
  const artifactStatuses = useMemo(() => {
    const isComplete = (type?: EvidenceType, titleSearch?: string) => {
      return allEvidence.some(e => 
        (type && e.type === type && e.status === EvidenceStatus.SignedOff) ||
        (titleSearch && e.title.toLowerCase().includes(titleSearch.toLowerCase()) && e.status === EvidenceStatus.SignedOff)
      );
    };

    return {
      formR: isComplete(undefined, "Form R") ? "COMPLETE" : "Action Required",
      eyeLogbook: isComplete(EvidenceType.Logbook) ? "COMPLETE" : "Action Required",
      pdp: "Pending" // PDP is listed as integration coming soon in PRD
    };
  }, [allEvidence]);

  // Handlers for Form R
  const handleOpenFormR = () => {
    if (existingFormR) {
      setFormRDate(existingFormR.date);
      setFormRFileName(existingFormR.fileName || '');
      setFormRFileUrl(existingFormR.fileUrl || '');
    } else {
      setFormRDate(new Date().toISOString().split('T')[0]);
      setFormRFileName('');
      setFormRFileUrl('');
    }
    setIsFormRDialogOpen(true);
  };

  const handleFormRSubmit = () => {
    if (!formRDate || !formRFileName) {
      alert("Please select a date and upload a PDF.");
      return;
    }
    onUpsertEvidence({
      id: existingFormR?.id,
      title: "Form R",
      type: EvidenceType.Additional,
      date: formRDate,
      fileName: formRFileName,
      fileUrl: formRFileUrl,
      fileType: 'application/pdf',
      status: EvidenceStatus.SignedOff
    });
    setIsFormRDialogOpen(false);
  };

  const handleViewPDF = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = formRFileUrl || existingFormR?.fileUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      const fileName = formRFileName || existingFormR?.fileName;
      if (fileName) alert(`Opening document: ${fileName}\n(This file exists but no object URL was generated in this session)`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'formr' | 'logbook') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      if (type === 'formr') {
        setFormRFileName(file.name);
        setFormRFileUrl(objectUrl);
      } else {
        setLogbookFileName(file.name);
        setLogbookFileUrl(objectUrl);
      }
    }
  };

  // Handlers for Logbook
  const handleOpenLogbook = () => {
    if (existingLogbook) {
      setLogbookDate(existingLogbook.date);
      setLogbookFileName(existingLogbook.fileName || '');
      setLogbookFileUrl(existingLogbook.fileUrl || '');
    } else {
      setLogbookDate(new Date().toISOString().split('T')[0]);
      setLogbookFileName('');
      setLogbookFileUrl('');
    }
    setIsLogbookDialogOpen(true);
  };

  const handleLogbookSubmit = () => {
    if (!logbookDate || !logbookFileName) {
      alert("Please select a date and upload your logbook PDF.");
      return;
    }
    onUpsertEvidence({
      id: existingLogbook?.id,
      title: "Eye Logbook Summary",
      type: EvidenceType.Logbook,
      date: logbookDate,
      fileName: logbookFileName,
      fileUrl: logbookFileUrl,
      fileType: 'application/pdf',
      status: EvidenceStatus.SignedOff
    });
    setIsLogbookDialogOpen(false);
  };

  const handleViewLogbookPDF = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = logbookFileUrl || existingLogbook?.fileUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      const fileName = logbookFileName || existingLogbook?.fileName;
      if (fileName) alert(`Opening document: ${fileName}\n(This file exists but no object URL was generated in this session)`);
    }
  };

  // Step 3: GSAT Status
  const gsatStatus = useMemo(() => {
    const gsatRecords = allEvidence.filter(e => e.type === EvidenceType.GSAT);
    if (gsatRecords.length === 0) return 'Not started';
    if (gsatRecords.some(e => e.status === EvidenceStatus.SignedOff)) return 'Completed';
    return 'In progress';
  }, [allEvidence]);

  // Step 4: MSF Status
  const msfStatus = useMemo(() => {
    const msfRecords = allEvidence.filter(e => e.type === EvidenceType.MSF);
    if (msfRecords.length === 0) return 'Not started';
    if (msfRecords.some(e => e.status === EvidenceStatus.SignedOff)) return 'Completed';
    return 'In progress';
  }, [allEvidence]);

  const renderProgress = () => (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Part {step} of {totalSteps}
        </span>
        {lastSaved && (
          <span className="text-[8px] font-bold text-teal-600 uppercase tracking-tight">Saved {lastSaved}</span>
        )}
      </div>
    </div>
  );

  const renderPart1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90">Mandatory Artifacts</h2>
        <p className="text-sm text-slate-500 mt-1">Review core compliance documentation.</p>
      </div>
      <div className="grid gap-4">
        <ArtifactRow 
          icon={<FileText className="text-blue-500" />} 
          title="Form R" 
          description="Self-declaration of professional practice." 
          status={artifactStatuses.formR}
          onClick={handleOpenFormR}
          hasFile={!!(formRFileUrl || existingFormR?.fileUrl || formRFileName || existingFormR?.fileName)}
          onView={handleViewPDF}
        />
        <ArtifactRow 
          icon={<ClipboardCheck className="text-teal-500" />} 
          title="Eyelogbook" 
          description="Full surgical logbook summary." 
          status={artifactStatuses.eyeLogbook}
          onClick={handleOpenLogbook}
          hasFile={!!(logbookFileUrl || existingLogbook?.fileUrl || logbookFileName || existingLogbook?.fileName)}
          onView={handleViewLogbookPDF}
        />
        <ArtifactRow 
          icon={<Activity className="text-indigo-500" />} 
          title="PDP" 
          description="Personal Development Plan integration (Coming Soon)." 
          status={artifactStatuses.pdp} 
        />
      </div>
    </div>
  );

  const renderPart2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90">Current EPAs & SIAs</h2>
        <p className="text-sm text-slate-500 mt-1">Imported from your dashboard with real-time completion states.</p>
      </div>
      <div className="grid gap-4">
        {sias.length > 0 ? sias.map(sia => {
          const matchingEpas = allEvidence.filter(e => 
            e.type === EvidenceType.EPA && 
            e.level === sia.level && 
            (sia.level <= 2 ? true : e.sia === sia.specialty)
          );

          let currentStatus: EvidenceStatus | 'Not Started' = 'Not Started';
          if (matchingEpas.some(e => e.status === EvidenceStatus.SignedOff)) currentStatus = EvidenceStatus.SignedOff;
          else if (matchingEpas.some(e => e.status === EvidenceStatus.Submitted)) currentStatus = EvidenceStatus.Submitted;
          else if (matchingEpas.some(e => e.status === EvidenceStatus.Draft)) currentStatus = EvidenceStatus.Draft;

          return (
            <div key={sia.id} className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{sia.specialty}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Level {sia.level}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">Active</span>
                {currentStatus !== 'Not Started' && (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5
                    ${currentStatus === EvidenceStatus.SignedOff ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 
                      currentStatus === EvidenceStatus.Submitted ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : 
                      'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}
                  `}>
                    {currentStatus === EvidenceStatus.SignedOff ? <ShieldCheck size={10} /> : currentStatus === EvidenceStatus.Submitted ? <Clock size={10} /> : <FileText size={10} />}
                    {currentStatus}
                  </span>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center text-center">
            <AlertCircle size={32} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">No active EPAs found on your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPart3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90">GSAT Matrix</h2>
        <p className="text-sm text-slate-500 mt-1">Generic Skills Assessment Tool status.</p>
      </div>
      <GlassCard className="p-8 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${gsatStatus === 'Completed' ? 'bg-green-100 text-green-600' : gsatStatus === 'In progress' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
          <BookOpen size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{gsatStatus}</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">Ensure all 6 non-patient management domains are evidenced for your current level.</p>
        <button onClick={onNavigateGSAT} className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2">
          {gsatStatus === 'Not started' ? 'Start GSAT' : 'Update GSAT'} <ChevronRight size={14} />
        </button>
      </GlassCard>
    </div>
  );

  const renderPart4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90">Multi-Source Feedback</h2>
        <p className="text-sm text-slate-500 mt-1">MSF completion and respondent mix.</p>
      </div>
      <GlassCard className="p-8 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${msfStatus === 'Completed' ? 'bg-green-100 text-green-600' : msfStatus === 'In progress' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
          <Users size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{msfStatus}</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">Check that your minimum respondent count and mix has been met for this rotation.</p>
        <button onClick={onNavigateMSF} className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2">
          {msfStatus === 'Not started' ? 'Launch MSF' : 'Check MSF Progress'} <ChevronRight size={14} />
        </button>
      </GlassCard>
    </div>
  );

  const renderPart5 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90">ES Report (ESR)</h2>
        <p className="text-sm text-slate-500 mt-1">Final supervisor sign-off for the ARCP panel.</p>
      </div>
      <GlassCard className="p-12 flex flex-col items-center text-center border-amber-500/20 bg-amber-500/[0.02]">
        <AlertCircle size={48} className="text-amber-500 mb-6" />
        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-500 uppercase tracking-tight">Not yet defined</h3>
        <p className="text-sm text-amber-800 dark:text-amber-800/60 mt-4 max-w-sm leading-relaxed font-medium">
          The Educational Supervisor Report schema is pending final curriculum board approval. You will be notified when this form becomes available for completion.
        </p>
        <div className="mt-10 px-8 py-3 rounded-xl bg-slate-200 dark:bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest cursor-not-allowed">
          Generate ESR
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Form R Dialog */}
      {isFormRDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
            <GlassCard className="p-8 bg-white/100 dark:bg-slate-900 shadow-2xl border-none rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Form R</h2>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1 uppercase tracking-[0.2em] font-black">Professional Declaration</p>
                </div>
                <button onClick={() => setIsFormRDialogOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-black mb-3 block">Completion Date</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                    <input 
                      type="date" 
                      value={formRDate}
                      onChange={(e) => setFormRDate(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-black block">Document Upload (PDF)</label>
                    {(formRFileUrl || existingFormR?.fileUrl) && (
                      <button 
                        onClick={() => handleViewPDF()}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Eye size={12} /> View Current
                      </button>
                    )}
                  </div>
                  <div 
                    onClick={() => formRFileInputRef.current?.click()}
                    className={`h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer ${formRFileName ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-50/20'}`}
                  >
                    <input type="file" ref={formRFileInputRef} accept=".pdf" onChange={(e) => handleFileChange(e, 'formr')} className="hidden" />
                    {formRFileName ? (
                      <div className="text-center animate-in zoom-in-95">
                        <CheckCircle2 size={32} className="text-indigo-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formRFileName}</p>
                        <p className="text-[10px] text-indigo-500 font-bold mt-1 uppercase tracking-widest">Click to replace</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="mb-3 text-slate-300 dark:text-white/20" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Click or drag to upload</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={handleFormRSubmit}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> {existingFormR ? 'Update Form R' : 'Submit Form R'}
                  </button>
                  <button 
                    onClick={() => setIsFormRDialogOpen(false)}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Eyelogbook Dialog */}
      {isLogbookDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
            <GlassCard className="p-8 bg-white/100 dark:bg-slate-900 shadow-2xl border-none rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Eyelogbook</h2>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1 uppercase tracking-[0.2em] font-black">Surgical Logbook Summary</p>
                </div>
                <button onClick={() => setIsLogbookDialogOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-black mb-3 block">Extraction Date</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" />
                    <input 
                      type="date" 
                      value={logbookDate}
                      onChange={(e) => setLogbookDate(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-teal-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-black block">Logbook PDF Export</label>
                    {(logbookFileUrl || existingLogbook?.fileUrl) && (
                      <button 
                        onClick={() => handleViewLogbookPDF()}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        <Eye size={12} /> View Current
                      </button>
                    )}
                  </div>
                  <div 
                    onClick={() => logbookFileInputRef.current?.click()}
                    className={`h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer ${logbookFileName ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10' : 'border-slate-200 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-50/20'}`}
                  >
                    <input type="file" ref={logbookFileInputRef} accept=".pdf" onChange={(e) => handleFileChange(e, 'logbook')} className="hidden" />
                    {logbookFileName ? (
                      <div className="text-center animate-in zoom-in-95">
                        <CheckCircle2 size={32} className="text-teal-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{logbookFileName}</p>
                        <p className="text-[10px] text-teal-500 font-bold mt-1 uppercase tracking-widest">Click to replace</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="mb-3 text-slate-300 dark:text-white/20" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Click or drag to upload</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={handleLogbookSubmit}
                    className="w-full py-4 rounded-2xl bg-teal-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-600/30 hover:bg-teal-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> {existingLogbook ? 'Update Eyelogbook' : 'Submit Eyelogbook'}
                  </button>
                  <button 
                    onClick={() => setIsLogbookDialogOpen(false)}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-12">
        <button onClick={handleBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">ARCP Preparation Flow</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">Evidence Compilation Guide</p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="min-h-[500px]">
        {renderProgress()}
        
        {/* Compact Navigation Bar relocated to here */}
        <div className="flex justify-between items-center mb-12 -mt-4">
          <button 
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-0"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => saveStatus(EvidenceStatus.Draft)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 hover:border-indigo-100 transition-all"
            >
              <Save size={14} /> Save Draft
            </button>
            {step < totalSteps ? (
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 transition-all uppercase tracking-widest"
              >
                Next Part <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                className="px-8 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl hover:bg-black transition-all uppercase tracking-widest"
              >
                Finish Review
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-hidden">
          {step === 1 && renderPart1()}
          {step === 2 && renderPart2()}
          {step === 3 && renderPart3()}
          {step === 4 && renderPart4()}
          {step === 5 && renderPart5()}
        </div>
      </div>
    </div>
  );
};

const ArtifactRow: React.FC<{ icon: React.ReactNode, title: string, description: string, status?: string, hasFile?: boolean, onClick?: () => void, onView?: (e: React.MouseEvent) => void }> = ({ icon, title, description, status = "Action Required", hasFile = false, onClick, onView }) => {
  const isComplete = status === "COMPLETE" || status === "Completed";
  const isPending = status === "Pending";

  return (
    <div 
      onClick={onClick}
      className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-5 group hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xl shadow-inner transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h4>
        <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
      </div>
      <div className="text-right">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1 justify-end
          ${isComplete ? 'text-green-600 bg-green-50' : isPending ? 'text-slate-400 bg-slate-100' : 'text-indigo-600 bg-indigo-50'}
        `}>
          {isComplete && <ShieldCheck size={10} />}
          {status}
        </span>
        <div className="flex justify-end mt-2">
          {/* Always show View/Edit on hover if a file or completion state exists */}
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasFile && onView && (
              <button 
                onClick={onView}
                className="flex items-center gap-1 text-[10px] text-teal-600 font-black uppercase tracking-tight hover:text-teal-700"
              >
                <Eye size={12} /> View
              </button>
            )}
            {!isPending && (
              <button 
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="flex items-center gap-1 text-[10px] text-indigo-500 font-black uppercase tracking-tight"
              >
                Edit
              </button>
            )}
            {isPending && <ChevronRight size={14} className="text-slate-300" />}
          </div>
          {!isComplete && !hasFile && !isPending && (
            <div className="group-hover:hidden">
              <ChevronRight size={14} className="text-slate-300 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARCPPrep;
