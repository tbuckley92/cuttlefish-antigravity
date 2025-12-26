
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
// Added BookOpen to the imports
import { 
  User, Calendar, MapPin, Briefcase, Mail, Edit2, Plus, 
  ChevronRight, ClipboardCheck, CheckCircle2, X, Trash2,
  FileText, Database, BookOpen, Clipboard
} from '../components/Icons';
import { INITIAL_PROFILE, SPECIALTIES } from '../constants';
import { TrainingGrade, EvidenceType, UserProfile, SIA } from '../types';

interface DashboardProps {
  sias: SIA[];
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
}

const Dashboard: React.FC<DashboardProps> = ({ 
  sias, 
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
  onNavigateToGSAT
}) => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [tempProfile, setTempProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  
  const [isAddingSIA, setIsAddingSIA] = useState(false);
  const [newSiaSpecialty, setNewSiaSpecialty] = useState('');
  const [newSiaLevel, setNewSiaLevel] = useState(1);
  const [newSiaSupervisorName, setNewSiaSupervisorName] = useState('');
  const [newSiaSupervisorEmail, setNewSiaSupervisorEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editingSiaId, setEditingSiaId] = useState<string | null>(null);
  const [editSiaFields, setEditSiaFields] = useState<Partial<SIA>>({});

  const openAddSIA = () => {
    const existingSpecialties = sias.map(s => s.specialty);
    const available = SPECIALTIES.find(s => !existingSpecialties.includes(s));
    setNewSiaSpecialty(available || SPECIALTIES[0]);
    setNewSiaSupervisorName('');
    setNewSiaSupervisorEmail('');
    setIsAddingSIA(true);
    setAddError(null);
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
    setProfile({ ...tempProfile });
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number | string[]) => {
    setTempProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleQuickAddSIA = () => {
    if (sias.find(s => s.specialty === newSiaSpecialty)) {
      setAddError("This specialty is already in your list.");
      return;
    }
    onAddSIA(newSiaSpecialty, newSiaLevel, newSiaSupervisorName, newSiaSupervisorEmail);
    setIsAddingSIA(false);
    setAddError(null);
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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
            <div className="grid grid-cols-1 gap-4">
              <ProfileItem icon={<Briefcase size={16} />} label="FTE" value={isEditing ? <div className="flex items-center gap-1"><input type="number" value={tempProfile.fte} onChange={(e) => handleInputChange('fte', parseInt(e.target.value) || 0)} className="w-16 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span>%</span></div> : `${profile.fte}% Full Time`} />
              <ProfileItem icon={<Calendar size={16} />} label="ARCP Month" value={isEditing ? <input type="text" value={tempProfile.arcpMonth} onChange={(e) => handleInputChange('arcpMonth', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /> : profile.arcpMonth} />
              <ProfileItem icon={<Calendar size={16} />} label="CCT Date" value={isEditing ? <input type="date" value={tempProfile.cctDate} onChange={(e) => handleInputChange('cctDate', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /> : profile.cctDate} />
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-4">Educational Supervisor</p>
              {isEditing ? (
                <div className="space-y-2">
                   <input type="text" value={tempProfile.supervisorName} onChange={(e) => handleInputChange('supervisorName', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-sm" placeholder="Supervisor Name" />
                  <input type="email" value={tempProfile.supervisorEmail} onChange={(e) => handleInputChange('supervisorEmail', e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono" placeholder="Supervisor Email" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{profile.supervisorName.split(' ').map(n => n[0]).join('')}</div>
                    <div><p className="text-sm font-medium text-slate-900">{profile.supervisorName}</p><p className="text-xs text-slate-500">{profile.supervisorEmail}</p></div>
                  </div>
                  
                  {/* GSAT Form Access Button */}
                  <button 
                    onClick={onNavigateToGSAT}
                    className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-xs font-bold hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <BookOpen size={14} /> View GSAT Form <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-slate-900">Current SIAs</h2>
          <div className="flex gap-3">
            <button onClick={openAddSIA} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
              <Plus size={16} /> Add SIA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sias.map(sia => (
            <GlassCard key={sia.id} className="p-6 flex flex-col group relative overflow-hidden">
              {editingSiaId !== sia.id && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => startEditingSIA(sia)} className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all" title="Edit SIA"><Edit2 size={14} /></button>
                  <button onClick={() => onRemoveSIA(sia.id)} className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all" title="Remove SIA"><Trash2 size={14} /></button>
                </div>
              )}
              
              {editingSiaId === sia.id ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center"><h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Edit SIA</h3><div className="flex gap-1"><button onClick={saveSIAEdit} className="p-1.5 text-teal-600 hover:bg-teal-500/10 rounded-full"><CheckCircle2 size={16} /></button><button onClick={cancelSIAEdit} className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-full"><X size={16} /></button></div></div>
                  <div className="space-y-3">
                    <div><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Specialty Domain</label><select value={editSiaFields.specialty} onChange={(e) => setEditSiaFields(prev => ({ ...prev, specialty: e.target.value }))} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none">{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Required Level</label><div className="flex gap-1.5">{[1, 2, 3, 4].map(l => <button key={l} onClick={() => setEditSiaFields(prev => ({ ...prev, level: l }))} className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all border ${editSiaFields.level === l ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}>L{l}</button>)}</div></div>
                    <div className="pt-2 border-t border-slate-100 space-y-2"><label className="text-[10px] font-bold uppercase text-slate-400 block">Supervisor</label><input type="text" value={editSiaFields.supervisorName} onChange={(e) => setEditSiaFields(prev => ({ ...prev, supervisorName: e.target.value }))} placeholder="Name" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none" /><input type="email" value={editSiaFields.supervisorEmail} onChange={(e) => setEditSiaFields(prev => ({ ...prev, supervisorEmail: e.target.value }))} placeholder="Email" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none" /></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 pr-10">
                    <h3 className="text-lg font-medium text-slate-900 leading-tight">{sia.specialty}</h3>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <div className="flex items-center"><span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 text-[10px] font-bold border border-teal-500/20 uppercase tracking-wider">Level {sia.level}</span></div>
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
                     <button onClick={() => onNavigateToEPA(sia.specialty, sia.level, sia.supervisorName, sia.supervisorEmail)} className="w-full mt-2 py-3 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-700 text-sm font-semibold hover:bg-teal-600/20 transition-all flex items-center justify-center gap-2 group">Complete EPA <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></button>
                  </div>
                </>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="text-slate-400">{icon}</div>
    <div className="flex-1 overflow-hidden">
      <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
      <div className="text-slate-700">{value}</div>
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
