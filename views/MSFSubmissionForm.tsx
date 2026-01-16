
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, Users, Mail, Plus, Trash2, Send,
  Clock, CheckCircle2, AlertCircle, X, ChevronRight,
  ExternalLink, ShieldCheck, Info, BarChart2
} from '../components/Icons';
import { uuidv4 } from '../utils/uuid';
import { MSFRespondent, EvidenceItem, EvidenceStatus, EvidenceType } from '../types';
import { supabase } from '../utils/supabaseClient';

interface MSFSubmissionFormProps {
  evidence?: EvidenceItem;
  onBack: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
  onViewResponse: (respondentId: string) => void;
}

const ROLES = [
  'Consultant',
  'Trainee/Fellow',
  'Senior nurse, theatre',
  'Senior nurse, OPD',
  'Outpatient staff',
  'Medical secretary'
] as const;

type MSFRole = typeof ROLES[number];

const ROLE_MINIMUMS: Record<MSFRole, number> = {
  'Consultant': 2,
  'Trainee/Fellow': 2,
  'Senior nurse, theatre': 1,
  'Senior nurse, OPD': 1,
  'Outpatient staff': 1,
  'Medical secretary': 1
};

export const MSFSubmissionForm: React.FC<MSFSubmissionFormProps> = ({
  evidence,
  onBack,
  onSave,
  onViewResponse
}) => {
  const [respondents, setRespondents] = useState<MSFRespondent[]>(() => {
    if (evidence?.msfRespondents) return [...evidence.msfRespondents];
    return Array.from({ length: 11 }, () => ({
      id: uuidv4(),
      name: '',
      email: '',
      role: 'Consultant',
      status: 'Awaiting response',
      inviteSent: false
    }));
  });

  const [title, setTitle] = useState(evidence?.title || `MSF - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [status, setStatus] = useState<EvidenceStatus>(evidence?.status || EvidenceStatus.Draft);
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [supervisorDetails, setSupervisorDetails] = useState<{
    id?: string;
    name: string;
    email: string;
    gmc: string;
    items?: any;
    isLoading: boolean;
  }>({ name: '', email: '', gmc: '', isLoading: true });

  useEffect(() => {
    const fetchSupervisor = async () => {
      if (!supabase) return;
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          const { data: traineeProfile } = await supabase
            .from('user_profile')
            .select('educational_supervisor_id, name')
            .eq('user_id', session.session.user.id)
            .single();

          if (traineeProfile?.educational_supervisor_id) {
            // Try to fetch supervisor details
            const { data: supervisorProfile } = await supabase
              .from('user_profile')
              .select('name, email, gmc_number')
              .eq('user_id', traineeProfile.educational_supervisor_id)
              .single();

            setSupervisorDetails({
              id: traineeProfile.educational_supervisor_id,
              name: supervisorProfile?.name || 'Unknown Supervisor',
              email: supervisorProfile?.email || '',
              gmc: supervisorProfile?.gmc_number || '',
              isLoading: false
            });
          } else {
            setSupervisorDetails(prev => ({ ...prev, isLoading: false }));
          }
        }
      } catch (err) {
        console.error('Error fetching supervisor:', err);
        setSupervisorDetails(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchSupervisor();
  }, []);

  useEffect(() => {
    if (status === EvidenceStatus.SignedOff) return;
    const timer = setInterval(async () => {
      setIsSaving(true);
      try {
        // Actually save respondent data to database
        await onSave({ msfRespondents: respondents, title, status, type: EvidenceType.MSF });
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [status, respondents, title, onSave]);

  const handleUpdateRespondent = (id: string, field: keyof MSFRespondent, value: any) => {
    if (status === EvidenceStatus.SignedOff) return;
    setRespondents(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    if (status === EvidenceStatus.SignedOff || respondents.length >= 30) return;
    setRespondents(prev => [...prev, {
      id: uuidv4(),
      name: '',
      email: '',
      role: 'Consultant',
      status: 'Awaiting response',
      inviteSent: false
    }]);
  };

  const removeRow = (id: string) => {
    if (status === EvidenceStatus.SignedOff) return;
    const r = respondents.find(res => res.id === id);
    if (r?.status === 'Completed') return;
    setRespondents(prev => prev.filter(res => res.id !== id));
  };

  const sendInvite = async (id: string) => {
    const respondent = respondents.find(r => r.id === id);
    if (!respondent || !respondent.name || !respondent.email) {
      alert('Please fill in both name and email before sending invite');
      return;
    }

    if (!evidence?.id) {
      alert('Evidence must be saved before sending invites');
      return;
    }

    try {
      // Update local state first
      const updatedRespondents = respondents.map(r =>
        r.id === id ? { ...r, inviteSent: true, status: 'Awaiting response' as const } : r
      );
      setRespondents(updatedRespondents);

      // Call Supabase edge function to create and send magic link
      const { data, error } = await supabase!.functions.invoke('create-magic-link', {
        body: {
          evidence_id: evidence.id,
          recipient_email: respondent.email,
          recipient_gmc: null,
          form_type: 'MSF_RESPONSE'
        }
      });

      if (error) {
        console.error('Error creating magic link:', error);
        alert(`Failed to send invite to ${respondent.name}: ${error.message}`);
        setRespondents(prev => prev.map(r =>
          r.id === id ? { ...r, inviteSent: false, status: 'Awaiting response' } : r
        ));
        return;
      }

      // Save updated respondent data to database immediately (keep status unchanged)
      await onSave({ msfRespondents: updatedRespondents, status, title, type: EvidenceType.MSF });
      console.log('Magic link created and data saved successfully:', data);
    } catch (err: any) {
      console.error('Unexpected error sending invite:', err);
      alert(`Unexpected error: ${err.message}`);
      setRespondents(prev => prev.map(r =>
        r.id === id ? { ...r, inviteSent: false, status: 'Awaiting response' } : r
      ));
    }
  };

  const remindRespondent = (id: string) => {
    setRespondents(prev => prev.map(r =>
      r.id === id ? { ...r, lastReminded: new Date().toLocaleTimeString() } : r
    ));
  };

  const bulkSend = async () => {
    const validRespondents = respondents.filter(r => r.name && r.email && !r.inviteSent);
    if (validRespondents.length === 0) {
      alert('No valid respondents to send invites to');
      return;
    }

    if (!evidence?.id) {
      alert('Evidence must be saved before sending invites');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let updatedRespondents = [...respondents];

    for (const respondent of validRespondents) {
      try {
        const { data, error } = await supabase!.functions.invoke('create-magic-link', {
          body: {
            evidence_id: evidence.id,
            recipient_email: respondent.email,
            recipient_gmc: null,
            form_type: 'MSF_RESPONSE'
          }
        });

        if (error) {
          console.error(`Error sending invite to ${respondent.name}:`, error);
          failCount++;
        } else {
          console.log(`Magic link sent to ${respondent.name}`);
          successCount++;
          updatedRespondents = updatedRespondents.map(r =>
            r.id === respondent.id ? { ...r, inviteSent: true, status: 'Awaiting response' as const } : r
          );
          setRespondents(updatedRespondents);
        }
      } catch (err: any) {
        console.error(`Unexpected error sending to ${respondent.name}:`, err);
        failCount++;
      }
    }

    // Save all updates to database (keep status unchanged)
    if (successCount > 0) {
      await onSave({ msfRespondents: updatedRespondents, status, title, type: EvidenceType.MSF });
    }

    if (failCount > 0) {
      alert(`Sent ${successCount} invitations successfully. ${failCount} failed.`);
    } else {
      alert(`MSF invitations sent successfully to ${successCount} respondents`);
    }
  };

  const handleSubmitForReview = async () => {
    const completedResponses = respondents.filter(r => r.status === 'Completed').length;

    // Warn if less than minimum responses
    if (completedResponses < 11) {
      const proceed = window.confirm(
        `You only have ${completedResponses} completed responses. The recommended minimum is 11. Do you still want to submit for supervisor review?`
      );
      if (!proceed) return;
    }

    if (!window.confirm("Are you sure you want to submit this MSF for supervisor review? You won't be able to send more invites after this.")) {
      return;
    }

    // 1. Validation 
    // We expect supervisorDetails to be pre-loaded from the useEffect
    // We still allow submission even if supervisor is missing (handled by optional chaining), 
    // but the ID is crucial for robust routing.

    setStatus(EvidenceStatus.Submitted);

    // 2. Save evidence
    // User requested to rely on text parameters, so we do not save supervisorId
    await onSave({
      status: EvidenceStatus.Submitted,
      msfRespondents: respondents,
      title,
      type: EvidenceType.MSF,
      supervisorName: supervisorDetails.name || undefined,
      supervisorEmail: supervisorDetails.email || undefined,
      supervisorGmc: supervisorDetails.gmc || undefined
    });

    // 3. Notify Supervisor
    if (evidence?.id && supabase && supervisorDetails.id) {
      // ... notification logic continues below ...
      try {
        const { data: session } = await supabase.auth.getSession();
        const notificationId = uuidv4();
        const notificationTitle = 'MSF Submitted for Review';

        // Fetch trainee name again just to be sure
        const { data: traineeProfile } = await supabase
          .from('user_profile')
          .select('name')
          .eq('user_id', session?.session?.user.id)
          .single();

        const notificationBody = `${traineeProfile?.name || 'A trainee'} has submitted their Multi-Source Feedback for your review.`;

        // Create in-app notification
        await supabase.from('notifications').insert({
          id: notificationId,
          user_id: supervisorDetails.id,
          role_context: 'supervisor',
          type: 'msf_submitted',
          title: notificationTitle,
          body: notificationBody,
          reference_id: evidence.id,
          created_at: new Date().toISOString()
        });

        // Send email notification
        await supabase.functions.invoke('send-notification-email', {
          body: {
            notification_id: notificationId,
            user_id: supervisorDetails.id,
            type: 'msf_submitted',
            title: notificationTitle,
            body: notificationBody
          }
        });

        console.log('Supervisor notified successfully');

      } catch (err) {
        console.error('Error notifying supervisor:', err);
      }
    } else {
      console.warn('No supervisor found for trainee - notification not sent');
    }

    alert('MSF submitted for supervisor review. Your supervisor will be notified.');
  };

  const completedCount = respondents.filter(r => r.status === 'Completed').length;
  const isLocked = status === EvidenceStatus.SignedOff;

  // Validation mix logic
  const roleCounts = respondents.reduce((acc, curr) => {
    const role = curr.role as MSFRole;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<MSFRole, number>);

  const missingRoles = ROLES.filter(role => (roleCounts[role] || 0) < ROLE_MINIMUMS[role]);

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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' :
                status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        {status === EvidenceStatus.Draft && (
          <button
            onClick={handleSubmitForReview}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={14} /> Submit for Review
          </button>
        )}
      </div>

      {missingRoles.length > 0 && !isLocked && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <Info className="text-indigo-500 shrink-0" size={20} />
          <div>
            <p className="text-sm text-indigo-900 font-semibold">Recommended Respondent Mix</p>
            <p className="text-xs text-indigo-700 mt-1">
              You currently have gaps in your required mix. Consider adding: {missingRoles.map(r => `${r} (min ${ROLE_MINIMUMS[r as MSFRole]})`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6 space-y-6">
            {/* Assigned Supervisor Card */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Assigned Supervisor</label>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                {supervisorDetails.isLoading ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-2/3 bg-slate-200 dark:bg-white/10 rounded"></div>
                      <div className="h-2 w-1/2 bg-slate-200 dark:bg-white/10 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {supervisorDetails.name ? supervisorDetails.name.split(' ').map(n => n[0]).join('').substring(0, 2) : <Users size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {supervisorDetails.name || "No Supervisor Assigned"}
                      </p>
                      {supervisorDetails.email && (
                        <p className="text-xs text-slate-500 dark:text-white/60">{supervisorDetails.email}</p>
                      )}
                      {!supervisorDetails.id && (
                        <p className="text-[10px] text-amber-500 mt-1">Please contact admin to assign an Educational Supervisor.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 pt-4 border-t border-slate-100 dark:border-white/5">Progress Overview</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">Record Title</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">Responses Received</span>
                  <span className="text-sm font-bold text-indigo-700">{completedCount} / 11</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${Math.min((completedCount / 11) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Simple Donut Chart Representation */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart2 size={16} className="text-slate-400" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Respondent Mix Summary</span>
                </div>
                <div className="space-y-2">
                  {ROLES.map(role => (
                    <div key={role} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-white/60">{role}</span>
                      <span className={`font-bold ${roleCounts[role] >= ROLE_MINIMUMS[role] ? 'text-teal-600' : 'text-slate-400'}`}>
                        {roleCounts[role] || 0} (min {ROLE_MINIMUMS[role]})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!isLocked && (
                <div className="flex items-center gap-2 pt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-white/20'}`}></div>
                  <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Autosaved {lastSaved}</span>
                </div>
              )}

              {isLocked && (
                <div className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-2xl border border-green-100">
                  <ShieldCheck className="text-green-500" size={24} />
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Signed Off</p>
                </div>
              )}
            </div>

            {!isLocked && (
              <button
                onClick={bulkSend}
                disabled={respondents.filter(r => r.name && r.email && !r.inviteSent).length === 0}
                className="w-full py-4 rounded-xl bg-indigo-600 text-white text-xs font-black tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} /> BATCH SEND
              </button>
            )}

            {isLocked && (
              <button
                onClick={onBack}
                className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold transition-all"
              >
                Close View
              </button>
            )}
          </GlassCard>

          <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex flex-col gap-4">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-xs text-amber-900 font-bold uppercase tracking-tight">Guidance & Mix</p>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              The trainee identifies 11-15 people who can be approached to give feedback. The recommended combination of assessors, where applicable, should include:
            </p>
            <ul className="text-[11px] text-amber-800 space-y-1.5 ml-1">
              <li className="flex items-start gap-2">• <span>2 consultant clinical supervisors</span></li>
              <li className="flex items-start gap-2">• <span>2 other trainees</span></li>
              <li className="flex items-start gap-2">• <span>1 senior nurse in the operating theatre (if performing surgery)</span></li>
              <li className="flex items-start gap-2">• <span>1 senior nurse in the out-patient department</span></li>
              <li className="flex items-start gap-2">• <span>1 other member of the out-patient staff (nurse/optometrist/orthoptist)</span></li>
              <li className="flex items-start gap-2">• <span>1 medical secretary who has been dealing with the trainee’s work</span></li>
            </ul>
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
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/5">Role</th>
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
                          disabled={r.inviteSent || isLocked}
                          value={r.name}
                          onChange={(e) => handleUpdateRespondent(r.id, 'name', e.target.value)}
                          placeholder="Full Name"
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          disabled={r.inviteSent || isLocked}
                          value={r.email}
                          onChange={(e) => handleUpdateRespondent(r.id, 'email', e.target.value)}
                          placeholder="email@nhs.net"
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 outline-none font-mono text-[11px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={r.inviteSent || isLocked}
                          value={r.role}
                          onChange={(e) => handleUpdateRespondent(r.id, 'role', e.target.value)}
                          className="bg-transparent text-xs text-slate-600 dark:text-white/60 outline-none w-full truncate"
                        >
                          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {r.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {r.status === 'Completed' ? 'Completed' : (r.inviteSent ? 'Awaiting' : 'Draft')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!r.inviteSent && !isLocked ? (
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
                              {r.status === 'Awaiting response' && !isLocked && (
                                <button
                                  onClick={() => remindRespondent(r.id)}
                                  className="text-[10px] font-black tracking-widest text-indigo-600 hover:bg-indigo-500/10 px-2 py-1 rounded transition-all"
                                  title={r.lastReminded ? `Reminded at ${r.lastReminded}` : 'Send Reminder'}
                                >
                                  REMIND
                                </button>
                              )}
                              {r.status === 'Awaiting response' && !isLocked && (
                                <button
                                  onClick={() => onViewResponse(r.id)}
                                  className="p-1.5 text-teal-600 hover:bg-teal-500/10 rounded-lg transition-colors"
                                  title="Simulate Response"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              )}
                              {r.status === 'Completed' && (
                                <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Responded</span>
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

            {!isLocked && respondents.length < 30 && (
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
