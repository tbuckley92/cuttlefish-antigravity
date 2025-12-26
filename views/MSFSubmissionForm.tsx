
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, Users, Mail, Plus, Trash2, Send, 
  Clock, CheckCircle2, AlertCircle, X, ChevronRight,
  ExternalLink
} from '../components/Icons';
import { MSFRespondent, EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

interface MSFSubmissionFormProps {
  evidence?: EvidenceItem;
  onBack: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => void;
  onViewResponse: (respondentId: string) => void;
}

const ROLES = ['Doctor', 'Nurse', 'AHP', 'Non-clinical'] as const;

export const MSFSubmissionForm: React.FC<MSFSubmissionFormProps> = ({ 
  evidence, 
  onBack, 
  onSave,
  onViewResponse
}) => {
  const [respondents, setRespondents] = useState<MSFRespondent[]>(() => {
    if (evidence?.msfRespondents) return [...evidence.msfRespondents];
    return Array.from({ length: 11 }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      email: '',
      role: 'Doctor',
      status: 'Awaiting response',
      inviteSent: false
    }));
  });

  const [title, setTitle] = useState(evidence?.title || `MSF - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [status, setStatus] = useState<EvidenceStatus>(evidence?.status || EvidenceStatus.Draft);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateRespondent = (id: string, field: keyof MSFRespondent, value: any) => {
    setRespondents(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    if (respondents.length >= 30) return;
    setRespondents(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      email: '',
      role: 'Doctor',
      status: 'Awaiting response',
      inviteSent: false
    }]);
  };

  const removeRow = (id: string) => {
    const r = respondents.find(res => res.id === id);
    if (r?.status === 'Completed') return;
    setRespondents(prev => prev.filter(res => res.id !== id));
  };

  const sendInvite = (id: string) => {
    setRespondents(prev => prev.map(r => 
      r.id === id ? { ...r, inviteSent: true, status: 'Awaiting response' } : r
    ));
    if (status === EvidenceStatus.Draft) {
      setStatus(EvidenceStatus.Active);
    }
  };

  const remindRespondent = (id: string) => {
    setRespondents(prev => prev.map(r => 
      r.id === id ? { ...r, lastReminded: new Date().toLocaleTimeString() } : r
    ));
  };

  const bulkSend = () => {
    const validRespondents = respondents.filter(r => r.name && r.email && !r.inviteSent);
    if (validRespondents.length === 0) return;

    setRespondents(prev => prev.map(r => 
      (r.name && r.email && !r.inviteSent) ? { ...r, inviteSent: true } : r
    ));
    setStatus(EvidenceStatus.Active);
    alert(`MSF invitations sent to ${validRespondents.length} respondents`);
  };

  const handleCloseMSF = () => {
    if (window.confirm("Are you sure you want to close this MSF? You won't be able to send more invites.")) {
      setStatus(EvidenceStatus.Closed);
      onSave({ status: EvidenceStatus.Closed, msfRespondents: respondents });
    }
  };

  const completedCount = respondents.filter(r => r.status === 'Completed').length;
  const isClosed = status === EvidenceStatus.Closed;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-white/40">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white/90">MSF Submission</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Multi-Source Feedback</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                status === EvidenceStatus.Closed ? 'bg-slate-200 text-slate-600' : 
                status === EvidenceStatus.Active ? 'bg-teal-100 text-teal-700' : 
                'bg-indigo-100 text-indigo-700'
              }`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        {status === EvidenceStatus.Active && (
          <button 
            onClick={handleCloseMSF}
            className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={14} /> Close MSF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Record Info</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">Title</label>
                <input 
                  type="text" 
                  disabled={isClosed}
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">Responses</span>
                  <span className="text-sm font-bold text-indigo-700">{completedCount} / {respondents.filter(r => r.inviteSent).length || 0}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${(completedCount / (respondents.filter(r => r.inviteSent).length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-white/20'}`}></div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Autosaved {lastSaved}</span>
              </div>
            </div>

            {!isClosed && (
              <button 
                onClick={bulkSend}
                disabled={respondents.filter(r => r.name && r.email && !r.inviteSent).length === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} /> SEND MSF
              </button>
            )}
          </GlassCard>

          <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-700 leading-relaxed">
              <b>Anonymity:</b> Trainees can see who has responded but cannot see individual scores linked to a name until the MSF is finalised and released by the supervisor.
            </p>
          </div>
        </div>

        {/* Right Column: Respondents Table */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-white/70">MSF Respondents</h3>
              <span className="text-[10px] font-black tracking-widest text-slate-400">{respondents.length} / 30</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/4">Name</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/4">Email</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/6">Role</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/6">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {respondents.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          disabled={r.inviteSent || isClosed}
                          value={r.name}
                          onChange={(e) => handleUpdateRespondent(r.id, 'name', e.target.value)}
                          placeholder="Full Name"
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="email" 
                          disabled={r.inviteSent || isClosed}
                          value={r.email}
                          onChange={(e) => handleUpdateRespondent(r.id, 'email', e.target.value)}
                          placeholder="email@nhs.net"
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 outline-none font-mono text-[11px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          disabled={r.inviteSent || isClosed}
                          value={r.role}
                          onChange={(e) => handleUpdateRespondent(r.id, 'role', e.target.value)}
                          className="bg-transparent text-xs text-slate-600 dark:text-white/60 outline-none"
                        >
                          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!r.inviteSent && !isClosed ? (
                            <>
                              <button 
                                onClick={() => sendInvite(r.id)}
                                disabled={!r.name || !r.email}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-20"
                                title="Send Invite"
                              >
                                <Send size={14} />
                              </button>
                              <button 
                                onClick={() => removeRow(r.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Remove Row"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              {r.status === 'Awaiting response' && !isClosed && (
                                <button 
                                  onClick={() => remindRespondent(r.id)}
                                  className="text-[10px] font-black tracking-widest text-indigo-600 hover:bg-indigo-500/10 px-2 py-1 rounded transition-all"
                                  title={r.lastReminded ? `Reminded at ${r.lastReminded}` : 'Send Reminder'}
                                >
                                  REMIND
                                </button>
                              )}
                              {r.status === 'Awaiting response' && !isClosed && (
                                <button 
                                  onClick={() => onViewResponse(r.id)}
                                  className="p-1.5 text-teal-600 hover:bg-teal-500/10 rounded-lg transition-colors"
                                  title="Simulate Response"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              )}
                              {r.status === 'Completed' && (
                                <span className="text-[10px] font-black tracking-widest text-slate-300">SENT</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isClosed && respondents.length < 30 && (
              <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <button 
                  onClick={addRow}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add respondent
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
