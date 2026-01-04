
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
// Added missing Activity icon to the imports below
import { 
  User, Calendar, MapPin, Briefcase, Mail, Edit2, Plus, 
  ChevronRight, ClipboardCheck, CheckCircle2, X, Trash2,
  FileText, Database, BookOpen, Clipboard, ShieldCheck, AlertCircle, Save,
  ExternalLink, Activity, Clock
} from '../components/Icons';
import { INITIAL_PROFILE, SPECIALTIES, DEANERIES } from '../constants';
import { TrainingGrade, EvidenceType, UserProfile, SIA, PDPGoal, EvidenceItem, EvidenceStatus } from '../types';

interface DashboardProps {
  sias: SIA[];
  allEvidence: EvidenceItem[];
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onRemoveSIA: (id: string) => void;
  onUpdateSIA: (id: string, updatedData: Partial<SIA>) => void;
  onAddSIA: (specialty: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToEPA: (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToDOPs: (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToOSATS: (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToCBD: (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToCRS: (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => void;
  onNavigateToEvidence: () => void;
  onNavigateToRecordForm: () => void;
  onNavigateToAddEvidence: (sia?: string, level?: number, type?: string) => void;
  onNavigateToGSAT: () => void;
  onNavigateToARCPPrep: () => void;
  isResident?: boolean; // true if user is a Resident (requires ES fields), false for Supervisors
}

const Dashboard: React.FC<DashboardProps> = ({ 
  sias, 
  allEvidence,
  profile,
  onUpdateProfile,
  onRemoveSIA, 
  onUpdateSIA, 
  onAddSIA, 
  onNavigateToEPA, 
  onNavigateToDOPs, 
  onNavigateToOSATS, 
  onNavigateToCBD,
  onNavigateToCRS,
  onNavigateToEvidence, 
  onNavigateToRecordForm,
  onNavigateToAddEvidence,
  onNavigateToGSAT,
  onNavigateToARCPPrep,
  isResident = true
}) => {
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [esValidationError, setEsValidationError] = useState<string | null>(null);
  
  // Educational Supervisor editing state
  const [isEditingSupervisor, setIsEditingSupervisor] = useState(false);
  const [tempSupervisor, setTempSupervisor] = useState({
    supervisorName: '',
    supervisorEmail: '',
    supervisorGmc: ''
  });
  
  // Update tempProfile when profile prop changes
  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);
  
  // Dialog State
  const [isAddingSIA, setIsAddingSIA] = useState(false);
  const [newSiaSpecialty, setNewSiaSpecialty] = useState('');
  const [newSiaLevel, setNewSiaLevel] = useState(1);
  const [newSiaSupervisorName, setNewSiaSupervisorName] = useState(INITIAL_PROFILE.supervisorName);
  const [newSiaSupervisorEmail, setNewSiaSupervisorEmail] = useState(INITIAL_PROFILE.supervisorEmail);

  // PDP Modal State
  const [isPDPModalOpen, setIsPDPModalOpen] = useState(false);
  const [tempPDPGoals, setTempPDPGoals] = useState<PDPGoal[]>([]);

  // Exam Results editing state
  const [isEditingExams, setIsEditingExams] = useState(false);
  const [tempExamResults, setTempExamResults] = useState({
    frcophthPart1: false,
    frcophthPart2Written: false,
    frcophthPart2Viva: false,
    refractionCertificate: false
  });

  // Inline editing state for SIA
  const [editingSiaId, setEditingSiaId] = useState<string | null>(null);
  const [editSiaFields, setEditSiaFields] = useState<Partial<SIA>>({});

  // ARCP Prep status logic
  const arcpPrepStatus = useMemo(() => {
    const item = allEvidence.find(e => e.type === EvidenceType.ARCPPrep);
    if (!item) return "NOT YET STARTED";
    if (item.status === EvidenceStatus.SignedOff) return "COMPLETE";
    return "IN PROGRESS";
  }, [allEvidence]);

  const handleOpenAddDialog = (level: number) => {
    setNewSiaLevel(level);
    if (level === 1 || level === 2) {
      setNewSiaSpecialty("No specialty SIA");
    } else {
      const existingSpecialties = sias.filter(s => s.level >= 3).map(s => s.specialty);
      const available = SPECIALTIES.find(s => !existingSpecialties.includes(s));
      setNewSiaSpecialty(available || SPECIALTIES[0]);
    }
    setNewSiaSupervisorName(profile.supervisorName);
    setNewSiaSupervisorEmail(profile.supervisorEmail);
    setIsAddingSIA(true);
  };

  const handleConfirmAddSIA = () => {
    if (!newSiaSupervisorName || !newSiaSupervisorEmail) {
      alert("Please provide supervisor details.");
      return;
    }
    onAddSIA(newSiaSpecialty, newSiaLevel, newSiaSupervisorName, newSiaSupervisorEmail);
    setIsAddingSIA(false);
  };

  const startEditingSIA = (sia: SIA) => {
    setEditingSiaId(sia.id);
    setEditSiaFields({
      specialty: sia.specialty,
      level: sia.level,
      supervisorName: sia.supervisorName || '',
      supervisorEmail: sia.supervisorEmail || ''
    });
  };

  const saveSIAEdit = () => {
    if (editingSiaId) {
      onUpdateSIA(editingSiaId, editSiaFields);
      setEditingSiaId(null);
    }
  };

  const cancelSIAEdit = () => {
    setEditingSiaId(null);
  };

  const startEditing = () => {
    setTempProfile({ ...profile });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEditing = () => {
    onUpdateProfile({ ...tempProfile });
    setIsEditing(false);
  };

  // Educational Supervisor editing handlers
  const openSupervisorEditing = () => {
    setTempSupervisor({
      supervisorName: profile.supervisorName || '',
      supervisorEmail: profile.supervisorEmail || '',
      supervisorGmc: profile.supervisorGmc || ''
    });
    setEsValidationError(null);
    setIsEditingSupervisor(true);
  };

  const closeSupervisorEditing = () => {
    setIsEditingSupervisor(false);
    setEsValidationError(null);
  };

  const handleSaveSupervisor = () => {
    // Validate ES fields for Residents
    if (isResident) {
      const esName = (tempSupervisor.supervisorName || '').trim();
      const esEmail = (tempSupervisor.supervisorEmail || '').trim();
      const esGmc = (tempSupervisor.supervisorGmc || '').trim();
      if (!esName || !esEmail || !esGmc) {
        setEsValidationError('Educational Supervisor Name, Email, and GMC are required for Residents.');
        return;
      }
    }
    setEsValidationError(null);
    onUpdateProfile({
      ...profile,
      supervisorName: tempSupervisor.supervisorName,
      supervisorEmail: tempSupervisor.supervisorEmail,
      supervisorGmc: tempSupervisor.supervisorGmc
    });
    setIsEditingSupervisor(false);
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };

  // PDP Modal Logic
  const openPDPModal = () => {
    setTempPDPGoals(profile.pdpGoals.length > 0 ? [...profile.pdpGoals] : [{
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      actions: '',
      targetDate: '',
      successCriteria: '',
      status: 'IN PROGRESS'
    }]);
    setIsPDPModalOpen(true);
  };

  const closePDPModal = () => {
    setIsPDPModalOpen(false);
  };

  const handleAddGoal = () => {
    if (tempPDPGoals.length >= 2) {
      return; // Limit to max 2 PDPs
    }
    setTempPDPGoals([
      ...tempPDPGoals,
      {
        id: Math.random().toString(36).substr(2, 9),
        title: '',
        actions: '',
        targetDate: '',
        successCriteria: ''
      }
    ]);
  };

  const handleUpdateGoal = (id: string, field: keyof PDPGoal, value: string | 'IN PROGRESS' | 'COMPLETE') => {
    setTempPDPGoals(tempPDPGoals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleFinishPDP = () => {
    const validGoals = tempPDPGoals.filter(g => g.title.trim() !== '');
    onUpdateProfile({ ...profile, pdpGoals: validGoals });
    setIsPDPModalOpen(false);
  };

  // Exam Results editing handlers
  const openExamEditing = () => {
    setTempExamResults({
      frcophthPart1: profile.frcophthPart1 ?? false,
      frcophthPart2Written: profile.frcophthPart2Written ?? false,
      frcophthPart2Viva: profile.frcophthPart2Viva ?? false,
      refractionCertificate: profile.refractionCertificate ?? false
    });
    setIsEditingExams(true);
  };

  const closeExamEditing = () => {
    setIsEditingExams(false);
  };

  const handleSaveExams = () => {
    onUpdateProfile({
      ...profile,
      frcophthPart1: tempExamResults.frcophthPart1,
      frcophthPart2Written: tempExamResults.frcophthPart2Written,
      frcophthPart2Viva: tempExamResults.frcophthPart2Viva,
      refractionCertificate: tempExamResults.refractionCertificate
    });
    setIsEditingExams(false);
  };

  const handleToggleExam = (examKey: keyof typeof tempExamResults) => {
    setTempExamResults(prev => ({ ...prev, [examKey]: !prev[examKey] }));
  };


  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* PDP Modal - Styled to match EPA modal exactly */}
      {isPDPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
            <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden p-8 border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
              {/* Header - Matches EPA Modal */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Development Plan</h2>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest font-black">Plan and track your training goals</p>
                </div>
                <button onClick={closePDPModal} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-8 overflow-y-auto flex-1 custom-scrollbar pr-2 mb-6">
                <div className="space-y-12">
                  {tempPDPGoals.map((goal, idx) => (
                    <div key={goal.id} className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5 first:border-none first:pt-0">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Goal {idx + 1} Entry</h3>
                        <button 
                          onClick={() => setTempPDPGoals(tempPDPGoals.filter(g => g.id !== goal.id))}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5 text-sm">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Brief title</label>
                          <input 
                            type="text" 
                            value={goal.title}
                            onChange={(e) => handleUpdateGoal(goal.id, 'title', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Agreed action(s) or goal(s)</label>
                          <textarea 
                            value={goal.actions}
                            onChange={(e) => handleUpdateGoal(goal.id, 'actions', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 h-24 resize-none outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Target date</label>
                            <input 
                              type="date" 
                              value={goal.targetDate}
                              onChange={(e) => handleUpdateGoal(goal.id, 'targetDate', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Trainee appraisal of progress toward PDP goal</label>
                          <textarea 
                            value={goal.successCriteria}
                            onChange={(e) => handleUpdateGoal(goal.id, 'successCriteria', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 h-24 resize-none outline-none focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Status</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateGoal(goal.id, 'status', 'IN PROGRESS')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                                (goal.status || 'IN PROGRESS') === 'IN PROGRESS'
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-white/60'
                              }`}
                            >
                              IN PROGRESS
                            </button>
                            <button
                              onClick={() => handleUpdateGoal(goal.id, 'status', 'COMPLETE')}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                                goal.status === 'COMPLETE'
                                  ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-white/60'
                              }`}
                            >
                              COMPLETE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer - Unified colors with EPA modal */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleAddGoal}
                  disabled={tempPDPGoals.length >= 2}
                  className="w-full py-3.5 rounded-xl border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> Add another goal {tempPDPGoals.length >= 2 && '(Max 2)'}
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={closePDPModal}
                    className="py-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleFinishPDP}
                    className="py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
                  >
                    Finish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add SIA Dialog Overlay */}
      {isAddingSIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-white dark:bg-slate-900 shadow-2xl rounded-[2rem]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Current EPA</h2>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest font-black">Record training requirements</p>
                </div>
                <button onClick={() => setIsAddingSIA(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Training Level</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(l => (
                      <button 
                        key={l}
                        onClick={() => {
                          setNewSiaLevel(l);
                          if (l === 1 || l === 2) setNewSiaSpecialty("No specialty SIA");
                          else if (newSiaSpecialty === "No specialty SIA") setNewSiaSpecialty(SPECIALTIES[0]);
                        }}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${newSiaLevel === l ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        Level {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Specialty Domain</label>
                  {newSiaLevel <= 2 ? (
                    <div className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-400 font-medium cursor-not-allowed">
                      No specialty SIA
                    </div>
                  ) : (
                    <select 
                      value={newSiaSpecialty}
                      onChange={(e) => setNewSiaSpecialty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
                    >
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Assigned Supervisor</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Supervisor Name"
                      value={newSiaSupervisorName}
                      onChange={(e) => setNewSiaSupervisorName(e.target.value)}
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50"
                    />
                    <input 
                      type="email" 
                      placeholder="Supervisor Email"
                      value={newSiaSupervisorEmail}
                      onChange={(e) => setNewSiaSupervisorEmail(e.target.value)}
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleConfirmAddSIA}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <GlassCard className="p-6 relative group">
          <div className="absolute top-6 right-6 flex gap-2">
            {!isEditing ? (
              <button onClick={startEditing} className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors flex-shrink-0"><Edit2 size={16} /></button>
            ) : (
              <div className="flex gap-1">
                <button onClick={saveEditing} className="p-2 bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 rounded-full transition-colors" title="Save Changes"><CheckCircle2 size={16} /></button>
                <button onClick={cancelEditing} className="p-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded-full transition-colors" title="Cancel"><X size={16} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start mb-4">
            {isEditing ? (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400 flex-shrink-0" />
                  <input type="text" value={tempProfile.name} onChange={(e) => handleInputChange('name', e.target.value)} className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500/50" placeholder="Full Name" />
                </div>
                <div className="flex gap-2">
                   <select value={tempProfile.grade} onChange={(e) => handleInputChange('grade', e.target.value as TrainingGrade)} className="bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 text-xs font-medium text-indigo-600 outline-none">
                    {Object.values(TrainingGrade).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                  <select value={tempProfile.deanery || tempProfile.location || ''} onChange={(e) => handleInputChange('deanery', e.target.value)} className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 text-xs text-slate-500 outline-none">
                    <option value="">Select deanery...</option>
                    {DEANERIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-slate-400 flex-shrink-0" />
                  <h1 className="text-lg font-semibold tracking-tight text-slate-900">{profile.name}</h1>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-medium border border-indigo-500/20">{profile.grade}</span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-slate-500 text-xs">{profile.deanery || profile.location}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-[11px]">
            <div className="grid grid-cols-1 gap-[11px]">
              <ProfileItem icon={<Briefcase size={13} />} label="FTE" value={isEditing ? <div className="flex items-center gap-1"><input type="number" value={tempProfile.fte} onChange={(e) => handleInputChange('fte', parseInt(e.target.value) || 0)} className="w-16 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[13px]" /><span className="text-[13px]">%</span></div> : `${profile.fte}% Full Time`} />
              <ProfileItem icon={<Calendar size={13} />} label="ARCP MONTH" value={isEditing ? <input type="text" value={tempProfile.arcpMonth} onChange={(e) => handleInputChange('arcpMonth', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[13px]" /> : profile.arcpMonth} />
              <ProfileItem icon={<Calendar size={13} />} label="CCT DATE" value={isEditing ? <input type="date" value={tempProfile.cctDate} onChange={(e) => handleInputChange('cctDate', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[13px]" /> : profile.cctDate} />
              <ProfileItem icon={<Calendar size={13} />} label="NEXT ARCP DATE" value={isEditing && isResident ? <input type="date" value={tempProfile.arcpDate || ''} onChange={(e) => handleInputChange('arcpDate', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[13px]" /> : (profile.arcpDate || '—')} />

              {/* Exam Results Section in Sidebar */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold">EXAM RESULTS</p>
                  <button 
                    onClick={isEditingExams ? closeExamEditing : openExamEditing}
                    className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors flex-shrink-0"
                    title={isEditingExams ? "Cancel editing" : "Edit exams"}
                  >
                    {isEditingExams ? <X size={12} /> : <Edit2 size={12} />}
                  </button>
                </div>
                {isEditingExams ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempExamResults.frcophthPart1}
                          onChange={() => handleToggleExam('frcophthPart1')}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 1</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempExamResults.frcophthPart2Written}
                          onChange={() => handleToggleExam('frcophthPart2Written')}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 2 Written</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempExamResults.frcophthPart2Viva}
                          onChange={() => handleToggleExam('frcophthPart2Viva')}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 2 Viva</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempExamResults.refractionCertificate}
                          onChange={() => handleToggleExam('refractionCertificate')}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">Refraction Certificate</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={closeExamEditing}
                        className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveExams}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {profile.frcophthPart1 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 1</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                          PASS
                        </span>
                      </div>
                    )}
                    {profile.frcophthPart2Written && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 2 Written</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                          PASS
                        </span>
                      </div>
                    )}
                    {profile.frcophthPart2Viva && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">FRCOphth Part 2 Viva</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                          PASS
                        </span>
                      </div>
                    )}
                    {profile.refractionCertificate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">Refraction Certificate</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                          PASS
                        </span>
                      </div>
                    )}
                    {!profile.frcophthPart1 && !profile.frcophthPart2Written && !profile.frcophthPart2Viva && !profile.refractionCertificate && (
                      <span className="text-[10px] text-slate-400 italic">No exams passed yet</span>
                    )}
                  </div>
                )}
              </div>

              {/* PDP Section in Sidebar */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold">PDP</p>
                  <div className="flex items-center gap-1.5 flex-1">
                    {profile.pdpGoals.length > 0 ? (
                      profile.pdpGoals.map((goal) => {
                        const goalStatus = goal.status || 'IN PROGRESS';
                        return (
                          <span 
                            key={goal.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              goalStatus === 'COMPLETE'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {goalStatus}
                          </span>
                        );
                      })
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        NOT SET
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={openPDPModal}
                    className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors flex-shrink-0"
                    title="Edit PDP"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-bold">EDUCATIONAL SUPERVISOR</p>
                <button 
                  onClick={isEditingSupervisor ? closeSupervisorEditing : openSupervisorEditing}
                  className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors flex-shrink-0"
                  title={isEditingSupervisor ? "Cancel editing" : "Edit supervisor"}
                >
                  {isEditingSupervisor ? <X size={12} /> : <Edit2 size={12} />}
                </button>
              </div>
              {esValidationError && isEditingSupervisor && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs">
                  {esValidationError}
                </div>
              )}
              {isEditingSupervisor ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={tempSupervisor.supervisorName} 
                      onChange={(e) => setTempSupervisor(prev => ({ ...prev, supervisorName: e.target.value }))} 
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-sm" 
                      placeholder="Supervisor Name *" 
                    />
                    <input 
                      type="email" 
                      value={tempSupervisor.supervisorEmail} 
                      onChange={(e) => setTempSupervisor(prev => ({ ...prev, supervisorEmail: e.target.value }))} 
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono" 
                      placeholder="Supervisor Email *" 
                    />
                    <input 
                      type="text" 
                      value={tempSupervisor.supervisorGmc} 
                      onChange={(e) => setTempSupervisor(prev => ({ ...prev, supervisorGmc: e.target.value }))} 
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-sm" 
                      placeholder="Supervisor GMC *" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closeSupervisorEditing}
                      className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSupervisor}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black tracking-widest text-slate-500 uppercase flex-shrink-0">
                      {profile.supervisorName ? profile.supervisorName.split(' ').map(n => n[0]).join('') : '–'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{profile.supervisorName || '–'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{profile.supervisorEmail || '–'}</p>
                      {profile.supervisorGmc && <p className="text-[11px] text-slate-400 font-mono">GMC: {profile.supervisorGmc}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-col gap-2">
                    <button 
                      onClick={onNavigateToGSAT}
                      className="w-full py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-xs font-bold hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                    >
                      <BookOpen size={14} /> View GSAT Form <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className="flex flex-col gap-1.5">
                      <button 
                        onClick={onNavigateToARCPPrep}
                        className="w-full py-3 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-700 text-xs font-bold hover:bg-teal-600/20 transition-all flex items-center justify-center gap-2 group"
                      >
                        <Activity size={14} /> ARCP Prep <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          arcpPrepStatus === "COMPLETE" ? "bg-emerald-500" : 
                          arcpPrepStatus === "IN PROGRESS" ? "bg-amber-400 animate-pulse" : 
                          "bg-slate-300"
                        }`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          arcpPrepStatus === "COMPLETE" ? "text-emerald-600" : 
                          arcpPrepStatus === "IN PROGRESS" ? "text-amber-600" : 
                          "text-slate-400"
                        }`}>
                          {arcpPrepStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* EPAs List */}
      <div className="lg:col-span-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-medium text-slate-900">Current EPAs</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleOpenAddDialog(1)} 
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus size={14} /> Add L1
            </button>
            <button 
              onClick={() => handleOpenAddDialog(2)} 
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus size={14} /> Add L2
            </button>
            <button 
              onClick={() => handleOpenAddDialog(3)} 
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-wider"
            >
              <Plus size={16} /> Add SIA L3/L4
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sias.map(sia => {
            // Calculate completion status for this SIA entry
            const matchingEpas = allEvidence.filter(e => 
              e.type === EvidenceType.EPA && 
              e.level === sia.level && 
              (sia.level <= 2 ? true : e.sia === sia.specialty)
            );

            let currentStatus: EvidenceStatus | 'Not Yet Started' = 'Not Yet Started';
            if (matchingEpas.some(e => e.status === EvidenceStatus.SignedOff)) currentStatus = EvidenceStatus.SignedOff;
            else if (matchingEpas.some(e => e.status === EvidenceStatus.Submitted)) currentStatus = EvidenceStatus.Submitted;
            else if (matchingEpas.some(e => e.status === EvidenceStatus.Draft)) currentStatus = EvidenceStatus.Draft;

            return (
              <GlassCard key={sia.id} className="p-6 flex flex-col group relative overflow-hidden">
                {editingSiaId !== sia.id && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => startEditingSIA(sia)} className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all" title="Edit SIA"><Edit2 size={14} /></button>
                    <button onClick={() => onRemoveSIA(sia.id)} className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-50/10 transition-all" title="Remove SIA"><Trash2 size={14} /></button>
                  </div>
                )}
                
                {editingSiaId === sia.id ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center"><h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Edit Entry</h3><div className="flex gap-1"><button onClick={saveSIAEdit} className="p-1.5 text-teal-600 hover:bg-teal-500/10 rounded-full"><CheckCircle2 size={16} /></button><button onClick={cancelSIAEdit} className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-full"><X size={16} /></button></div></div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Specialty Domain</label>
                        <select 
                          disabled={editSiaFields.level === 1 || editSiaFields.level === 2}
                          value={editSiaFields.specialty} 
                          onChange={(e) => setEditSiaFields(prev => ({ ...prev, specialty: e.target.value }))} 
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none disabled:opacity-50"
                        >
                          <option value="No specialty SIA">No specialty SIA</option>
                          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Required Level</label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map(l => (
                            <button 
                              key={l} 
                              onClick={() => {
                                const newFields: Partial<SIA> = { level: l };
                                if (l === 1 || l === 2) newFields.specialty = "No specialty SIA";
                                else if (editSiaFields.specialty === "No specialty SIA") newFields.specialty = SPECIALTIES[0];
                                setEditSiaFields(prev => ({ ...prev, ...newFields }));
                              }} 
                              className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all border ${editSiaFields.level === l ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                              L{l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">Supervisor</label>
                        <input type="text" value={editSiaFields.supervisorName} onChange={(e) => setEditSiaFields(prev => ({ ...prev, supervisorName: e.target.value }))} placeholder="Name" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none" />
                        <input type="email" value={editSiaFields.supervisorEmail} onChange={(e) => setEditSiaFields(prev => ({ ...prev, supervisorEmail: e.target.value }))} placeholder="Email" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none font-mono" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 pr-10">
                      <h3 className="text-lg font-medium text-slate-900 leading-tight">{sia.specialty}</h3>
                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center"><span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-wider">Level {sia.level}</span></div>
                        <p className="text-xs text-slate-500">Assigned to: {sia.supervisorName || sia.supervisorInitials || '–'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <EvidenceChip type={EvidenceType.CbD} icon={<Clipboard size={14} className="opacity-40" />} onClick={() => onNavigateToCBD(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} />
                      <EvidenceChip type={EvidenceType.DOPs} icon={<ClipboardCheck size={14} className="opacity-40" />} onClick={() => onNavigateToDOPs(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} />
                      <EvidenceChip type={EvidenceType.OSATs} icon={<ClipboardCheck size={14} className="opacity-40" />} onClick={() => onNavigateToOSATS(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} />
                      <EvidenceChip type={EvidenceType.Reflection} icon={<ClipboardCheck size={14} className="opacity-40" />} onClick={() => onNavigateToAddEvidence(sia.specialty, sia.level, 'Reflection')} />
                      <EvidenceChip type={EvidenceType.CRS} icon={<ClipboardCheck size={14} className="opacity-40" />} onClick={() => onNavigateToCRS(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} />
                      <EvidenceChip type={EvidenceType.Other} icon={<ClipboardCheck size={14} className="opacity-40" />} onClick={() => onNavigateToAddEvidence(sia.specialty, sia.level)} />
                    </div>
                    <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Current Status</span>
                           <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] ${
                             currentStatus === EvidenceStatus.SignedOff ? 'text-green-600' :
                             currentStatus === EvidenceStatus.Submitted ? 'text-blue-600' :
                             currentStatus === EvidenceStatus.Draft ? 'text-amber-600' :
                             'text-slate-300'
                           }`}>
                             {currentStatus === EvidenceStatus.SignedOff ? <ShieldCheck size={10} /> : 
                              currentStatus === EvidenceStatus.Submitted ? <Activity size={10} /> :
                              currentStatus === EvidenceStatus.Draft ? <Clock size={10} /> : null}
                             {currentStatus}
                           </span>
                         </div>
                         <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-700 ${
                             currentStatus === EvidenceStatus.SignedOff ? 'bg-green-500 w-full' :
                             currentStatus === EvidenceStatus.Submitted ? 'bg-blue-500 w-2/3' :
                             currentStatus === EvidenceStatus.Draft ? 'bg-amber-400 w-1/3' :
                             'bg-slate-200 w-0'
                           }`}></div>
                         </div>
                       </div>
                       <button onClick={() => onNavigateToEPA(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} className="w-full mt-1 py-3 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-700 text-sm font-semibold hover:bg-teal-600/20 transition-all flex items-center justify-center gap-2 group">Complete EPA <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></button>
                    </div>
                  </>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProfileItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 text-[13px]">
    <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
    <div className="flex-1 overflow-hidden min-w-0">
      <p className="text-[#94a3b8] text-[9px] uppercase tracking-widest font-bold mb-0">{label}</p>
      <div className="text-slate-900 font-medium text-[13px] tracking-tight">{value}</div>
    </div>
  </div>
);

const EvidenceChip: React.FC<{ type: string, icon: React.ReactNode, onClick?: () => void }> = ({ type, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:border-slate-200 transition-all flex flex-col items-center gap-1">
    {icon}
    {type}
  </button>
);

export default Dashboard;
