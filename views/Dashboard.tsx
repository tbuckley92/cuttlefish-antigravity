
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
// Added missing Activity icon to the imports below
import { 
  User, Calendar, MapPin, Briefcase, Mail, Edit2, Plus, 
  ChevronRight, ClipboardCheck, CheckCircle2, X, Trash2,
  FileText, Database, BookOpen, Clipboard, ShieldCheck, AlertCircle, Save,
  ExternalLink, Activity, Clock
} from '../components/Icons';
import { INITIAL_PROFILE, SPECIALTIES } from '../constants';
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
  onNavigateToARCPPrep
}) => {
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  
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
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

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

  const handleInlineTitleEdit = (id: string, newTitle: string) => {
    onUpdateProfile({
      ...profile,
      pdpGoals: profile.pdpGoals.map(g => g.id === id ? { ...g, title: newTitle } : g)
    });
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
                  className="w-full py-3.5 rounded-xl border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add another goal
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
            <GlassCard className="p-8 bg-white/100 dark:bg-slate-900 shadow-2xl border-none rounded-[2rem]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Current EPA</h2>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest font-black">Record training requirements</p>
                </div>
                <button onClick={() => setIsAddingSIA(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
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
            </GlassCard>
          </div>
        </div>
      )}

      {/* Profile Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <GlassCard className="p-8 relative group">
          <div className="absolute top-6 right-6 flex gap-2">
            {!isEditing ? (
              <button onClick={startEditing} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400 opacity-0 group-hover:opacity-100"><Edit2 size={16} /></button>
            ) : (
              <div className="flex gap-1">
                <button onClick={saveEditing} className="p-2 bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 rounded-full transition-colors" title="Save Changes"><CheckCircle2 size={16} /></button>
                <button onClick={cancelEditing} className="p-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded-full transition-colors" title="Cancel"><X size={16} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 mb-4 p-1 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center">
                <User size={40} className="text-slate-400" />
              </div>
            </div>
            
            {isEditing ? (
              <div className="w-full space-y-3">
                <input type="text" value={tempProfile.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-center text-lg font-semibold text-slate-900 outline-none focus:border-indigo-500/50" placeholder="Full Name" />
                <div className="flex gap-2 justify-center">
                   <select value={tempProfile.grade} onChange={(e) => handleInputChange('grade', e.target.value as TrainingGrade)} className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium text-indigo-600 outline-none">
                    {Object.values(TrainingGrade).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                  <input type="text" value={tempProfile.location} onChange={(e) => handleInputChange('location', e.target.value)} className="w-32 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-center text-xs text-slate-500 outline-none" placeholder="Location" />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{profile.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-medium border border-indigo-500/20">{profile.grade}</span>
                  <span className="text-slate-300 text-sm">•</span>
                  <span className="text-slate-500 text-sm">{profile.location}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <ProfileItem icon={<Briefcase size={18} />} label="FTE" value={isEditing ? <div className="flex items-center gap-1"><input type="number" value={tempProfile.fte} onChange={(e) => handleInputChange('fte', parseInt(e.target.value) || 0)} className="w-16 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span>%</span></div> : `${profile.fte}% Full Time`} />
              <ProfileItem icon={<Calendar size={18} />} label="ARCP MONTH" value={isEditing ? <input type="text" value={tempProfile.arcpMonth} onChange={(e) => handleInputChange('arcpMonth', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /> : profile.arcpMonth} />
              <ProfileItem icon={<Calendar size={18} />} label="CCT DATE" value={isEditing ? <input type="date" value={tempProfile.cctDate} onChange={(e) => handleInputChange('cctDate', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /> : profile.cctDate} />
              
              {/* PDP Section in Sidebar */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold">PDP</p>
                  <button 
                    onClick={openPDPModal}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-indigo-600 transition-colors flex items-center gap-1 text-[10px] font-bold"
                  >
                    <Plus size={12} /> ADD/EDIT PDP
                  </button>
                </div>
                <div className="space-y-2">
                  {profile.pdpGoals.length > 0 ? (
                    profile.pdpGoals.map(goal => (
                      <div key={goal.id} className="relative group/goal p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        {editingTitleId === goal.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              autoFocus
                              type="text" 
                              value={goal.title}
                              onBlur={() => setEditingTitleId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingTitleId(null)}
                              onChange={(e) => handleInlineTitleEdit(goal.id, e.target.value)}
                              className="w-full bg-white dark:bg-white/5 border border-indigo-500 rounded px-2 py-1 text-sm outline-none"
                            />
                            <button onClick={() => setEditingTitleId(null)} className="text-teal-600"><CheckCircle2 size={14} /></button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between group/title">
                              <span 
                                onClick={() => setEditingTitleId(goal.id)}
                                className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate cursor-text hover:text-indigo-600 transition-colors block flex-1"
                              >
                                {goal.title || 'Untitled Goal'}
                              </span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              goal.status === 'COMPLETE'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}>
                              {goal.status || 'IN PROGRESS'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <button 
                      onClick={openPDPModal}
                      className="text-xs text-slate-400 italic hover:text-indigo-600 transition-colors"
                    >
                      No goals set. Click to add.
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/5">
              <p className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-bold mb-4">EDUCATIONAL SUPERVISOR</p>
              {isEditing ? (
                <div className="space-y-2">
                   <input type="text" value={tempProfile.supervisorName} onChange={(e) => handleInputChange('supervisorName', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-sm" placeholder="Supervisor Name" />
                  <input type="email" value={tempProfile.supervisorEmail} onChange={(e) => handleInputChange('supervisorEmail', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono" placeholder="Supervisor Email" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black tracking-widest text-slate-500 uppercase">
                      {profile.supervisorName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{profile.supervisorName}</p>
                      <p className="text-xs text-slate-500">{profile.supervisorEmail}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col gap-2">
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
  <div className="flex items-start gap-4 text-sm">
    <div className="text-slate-400 mt-0.5">{icon}</div>
    <div className="flex-1 overflow-hidden">
      <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold mb-1">{label}</p>
      <div className="text-slate-900 font-medium text-lg tracking-tight">{value}</div>
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
