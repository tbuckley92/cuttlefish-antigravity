import React, { useState, useEffect, useMemo } from 'react';
import { SignOffsPanel } from './SignOffsPanel';
import { GlassCard } from '../components/GlassCard';
import {
  User, Mail, Calendar, Briefcase, ChevronRight,
  FileText, ClipboardCheck, Activity, BookOpen, Users,
  CheckCircle2, Clock, AlertCircle, ShieldCheck, Eye, ArrowLeft, Lock,
  Inbox, Filter, Settings, Search, LayoutDashboard, X, Bell
} from '../components/Icons';
import { SupervisorProfile, TraineeSummary, UserRole, EvidenceType, EvidenceStatus, ARCPOutcome, ARCPReviewType, EvidenceItem, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { getAllTraineeSummaries } from '../mockData'; // Fallback
import { EditRequestDialog } from '../components/EditRequestDialog';

interface SupervisorDashboardProps {
  supervisor: SupervisorProfile;
  activeTab?: 'dashboard' | 'signoffs'; // Prop from App
  onViewTraineeProgress: (traineeId: string) => void;
  onViewTraineeEvidence: (traineeId: string) => void;
  onViewARCPComponent: (traineeId: string, component: string) => void;
  onUpdateARCPOutcome: (traineeId: string, outcome: ARCPOutcome) => void;
  onViewInbox?: () => void;
  onUpdateProfile?: (profile: Partial<SupervisorProfile>) => Promise<void>;
  onViewEvidenceItem?: (item: EvidenceItem) => void;
}

const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  supervisor,
  activeTab = 'dashboard',
  onViewTraineeProgress,
  onViewTraineeEvidence,
  onViewARCPComponent,
  onUpdateARCPOutcome,
  onViewInbox,
  onUpdateProfile,
  onViewEvidenceItem
}) => {
  // const [activeTab, setActiveTab] = useState<'dashboard' | 'signoffs'>('dashboard'); // Removed internal state
  const [trainees, setTrainees] = useState<TraineeSummary[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState<Record<string, boolean>>({});

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: supervisor.name || '',
    gmcNumber: supervisor.gmcNumber || '',
    rcophthNumber: supervisor.rcophthNumber || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Edit Request Dialog State
  const [editRequestDialog, setEditRequestDialog] = useState<{
    request: any;
    evidence: EvidenceItem | null;
    traineeName: string;
  } | null>(null);
  const [allEvidence, setAllEvidence] = useState<EvidenceItem[]>([]);

  // Initialize form when supervisor changes
  useEffect(() => {
    setEditForm({
      name: supervisor.name || '',
      gmcNumber: supervisor.gmcNumber || '',
      rcophthNumber: supervisor.rcophthNumber || ''
    });
  }, [supervisor]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          ...supervisor,
          name: editForm.name,
          gmcNumber: editForm.gmcNumber,
          rcophthNumber: editForm.rcophthNumber
        });
      }

      // Also update Supabase if configured
      if (isSupabaseConfigured && supabase && supervisor.id) {
        const { error } = await supabase
          .from('user_profile')
          .update({
            name: editForm.name,
            gmc_number: editForm.gmcNumber,
            rcophth_number: editForm.rcophthNumber
          })
          .eq('user_id', supervisor.id);

        if (error) throw error;
      }

      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Edit Request Approval
  const handleApproveEditRequest = async () => {
    if (!editRequestDialog || !supabase || !isSupabaseConfigured) return;

    try {
      const { request, evidence } = editRequestDialog;

      // 1. Update edit_requests table to 'approved'
      const { error: updateError } = await supabase
        .from('edit_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: supervisor.id
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Update evidence status back to Draft
      if (evidence) {
        const { error: evidenceError } = await supabase
          .from('evidence')
          .update({ status: EvidenceStatus.Draft })
          .eq('id', evidence.id);

        if (evidenceError) throw evidenceError;
      }

      // 3. Send notification to trainee
      await supabase
        .from('notifications')
        .insert({
          user_id: request.trainee_id,
          role_context: 'trainee',
          type: 'edit_request_approved',
          title: 'Edit Request Approved',
          body: `Your edit request for "${evidence?.title}" has been approved. The form is now unlocked.`,
          reference_id: evidence?.id,
          reference_type: 'evidence',
          is_read: false
        });

      alert('Edit request approved successfully!');
      setEditRequestDialog(null);
    } catch (error) {
      console.error('Error approving edit request:', error);
      alert('Failed to approve edit request');
    }
  };

  // Handle Edit Request Denial
  const handleDenyEditRequest = async () => {
    if (!editRequestDialog || !supabase || !isSupabaseConfigured) return;

    try {
      const { request, evidence } = editRequestDialog;

      // 1. Update edit_requests table to 'denied'
      const { error: updateError } = await supabase
        .from('edit_requests')
        .update({
          status: 'denied',
          resolved_at: new Date().toISOString(),
          resolved_by: supervisor.id
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Send notification to trainee
      await supabase
        .from('notifications')
        .insert({
          user_id: request.trainee_id,
          role_context: 'trainee',
          type: 'edit_request_denied',
          title: 'Edit Request Denied',
          body: `Your edit request for "${evidence?.title}" has been denied. The form remains locked.`,
          reference_id: evidence?.id,
          reference_type: 'evidence',
          is_read: false
        });

      alert('Edit request denied');
      setEditRequestDialog(null);
    } catch (error) {
      console.error('Error denying edit request:', error);
      alert('Failed to deny edit request');
    }
  };

  // Fetch real trainees from Supabase
  useEffect(() => {
    const fetchTrainees = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          // Fetch all profiles
          // In a real app with thousands of users, we'd filter server-side
          // But for this mockup/pilot, fetching all and filtering in memory is okay
          // or better: fetch where supervisor_email or supervisor_id matches

          let query = supabase.from('user_profile').select('*');

          // Optimization: If not superuser/admin, maybe try to filter?
          // Currently the schema uses 'supervisor_email' or 'supervisor_id' column on trainee
          // Let's fetch all for now to be safe and replicate current logic

          const { data: allProfiles, error } = await query;

          if (error) throw error;

          if (allProfiles) {
            // Map to TraineeSummary (needs basic evidence stats too ideally, but for now we mock the evidence summary or fetch lightweight)
            // For the dashboard, we need: Name, Grade, FTE, Dates, Phaco Stats, Exam results

            const summaries: TraineeSummary[] = allProfiles
              .filter(p => p.role !== UserRole.EducationalSupervisor && p.role !== UserRole.Admin) // Basic filter
              .map(p => ({
                profile: {
                  id: p.user_id,
                  name: p.name,
                  email: p.email,
                  role: UserRole.Trainee,
                  deanery: p.deanery,
                  gmcNumber: p.gmc_number,
                  grade: p.grade,
                  supervisorName: p.supervisor_name,
                  supervisorEmail: p.supervisor_email,
                  supervisorGmc: p.supervisor_gmc,
                  arcpMonth: p.arcp_month,
                  cctDate: p.cct_date,
                  fte: p.fte,
                  arcpDate: p.arcp_date,
                  arcpOutcome: p.arcp_outcome,
                  frcophthPart1: p.frcophth_part1,
                  frcophthPart2Written: p.frcophth_part2_written,
                  sias: p.sias ? (Array.isArray(p.sias) ? p.sias : JSON.parse(p.sias)) : [],
                  phacoTotal: p.phaco_total || 0,
                  phacoPerformed: p.phaco_performed || 0,
                  phacoSupervised: p.phaco_supervised || 0,
                  phacoAssisted: p.phaco_assisted || 0,
                  phacoPcrCount: p.phaco_pcr_count || 0,
                  phacoPcrRate: p.phaco_pcr_rate || 0,
                  // Default values for required fields missing in Supabase select
                  location: p.location || 'Unknown',
                  predictedSIAs: [],
                  pdpGoals: []
                } as UserProfile,
                // We don't fetch all evidence here to keep it light
                // We'll just put empty array and fetch on demand if needed, 
                // OR if we really need pending counts, we need a separate query
                allEvidence: [],
                sias: p.sias ? (Array.isArray(p.sias) ? p.sias : JSON.parse(p.sias)) : []
              }));

            setTrainees(summaries);
          }
        } catch (err) {
          console.error("Error fetching trainees:", err);
          setTrainees(getAllTraineeSummaries()); // Fallback
        }
      } else {
        setTrainees(getAllTraineeSummaries());
      }
      setIsLoading(false);
    };

    fetchTrainees();
  }, [supervisor]);



  // Filter trainees relevant to this supervisor
  const myTrainees = useMemo(() => {
    return trainees.filter(t => {
      // 1. Direct match by email
      if (t.profile.supervisorEmail === supervisor.email) return true;
      // 2. Or name match
      if (t.profile.supervisorName === supervisor.name) return true;
      // 3. Or if I am ARCP Panel, show my deanery
      if (supervisor.role === UserRole.ARCPPanelMember && t.profile.deanery === supervisor.deanery) return true;

      return false;
    });
  }, [trainees, supervisor]);

  const otherDeaneryTrainees = useMemo(() => {
    // Just for demo, show others as "inactive" or "other connections" if we want
    return [];
  }, [trainees, myTrainees]);

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 p-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">

          {/* LEFT SIDEBAR (Col span 3) */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Profile Card */}
            <GlassCard className="p-5 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 leading-tight">{supervisor.name}</h2>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1"
                  >
                    Edit Profile <Settings size={10} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Deanery connections:</p>
                  <p className="text-sm font-medium text-slate-700">{supervisor.deanery || 'Not Set'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GMC No.</p>
                    <p className="text-xs font-mono font-medium text-slate-700">{supervisor.gmcNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">RCOphth No.</p>
                    <p className="text-xs font-mono font-medium text-slate-700">{supervisor.rcophthNumber || '—'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Roles:</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Supervisor
                    </span>
                    {(supervisor.role === UserRole.ARCPPanelMember || supervisor.role === UserRole.Admin) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        ARCP Panel
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Decorative bg blob */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
            </GlassCard>

            {/* Mini Inbox */}
            <GlassCard className="p-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Inbox size={16} /> Inbox
                  </h3>
                  <p className="text-[10px] text-slate-500">Trainee notifications</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>



              <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto">
                <NotificationList
                  supervisor={supervisor}
                  onAction={onViewInbox}
                  onShowEditRequest={async (notification) => {
                    // Fetch the edit request and evidence
                    if (!supabase || !isSupabaseConfigured) return;

                    try {
                      // Get edit request
                      const { data: requestData } = await supabase
                        .from('edit_requests')
                        .select('*')
                        .eq('id', notification.reference_id)
                        .single();

                      if (!requestData) {
                        alert('Edit request not found');
                        return;
                      }

                      // Get evidence
                      const { data: evidenceData } = await supabase
                        .from('evidence')
                        .select('*')
                        .eq('id', requestData.evidence_id)
                        .single();

                      // Get trainee name
                      const { data: traineeData } = await supabase
                        .from('user_profile')
                        .select('name')
                        .eq('user_id', requestData.trainee_id)
                        .single();

                      setEditRequestDialog({
                        request: requestData,
                        evidence: evidenceData as EvidenceItem,
                        traineeName: traineeData?.name || 'Trainee'
                      });
                    } catch (error) {
                      console.error('Error loading edit request:', error);
                      alert('Failed to load edit request');
                    }
                  }}
                  onViewEvidence={onViewEvidenceItem}
                />
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/30">
                <button
                  onClick={onViewInbox}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                >
                  View Inbox
                </button>
              </div>
            </GlassCard>
          </div>

          {/* MAIN CONTENT (Col span 9) */}
          <div className="col-span-12 lg:col-span-9 space-y-6">

            {/* Header Tabs Removed - Now in App Header */}

            {/* Active Trainees Section */}
            {activeTab === 'dashboard' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Educational supervisor for:
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{myTrainees.length}</span>
                  </h2>
                  <div className="flex gap-2">
                    <button className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 shadow-sm transition-colors">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-12 text-slate-400">Loading trainees...</div>
                  ) : myTrainees.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                      No trainees found assigned to you.
                    </div>
                  ) : (
                    myTrainees.map(trainee => (
                      <TraineeCard
                        key={trainee.profile.id}
                        trainee={trainee}
                        onView={onViewTraineeEvidence}
                        onLogbook={() => onViewARCPComponent(trainee.profile.id!, 'Logbook')}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <SignOffsPanel
                supervisor={supervisor}
                onViewEvidence={(e) => {
                  if (onViewEvidenceItem) {
                    onViewEvidenceItem(e);
                  } else if (e.traineeId) {
                    // Fallback to list view if item view not available
                    onViewTraineeEvidence(e.traineeId);
                  }
                }}
                onShowEditRequest={async (requestId) => {
                  // Fetch edit request, evidence, and trainee data
                  if (!supabase || !isSupabaseConfigured) return;

                  try {
                    const { data: requestData } = await supabase
                      .from('edit_requests')
                      .select('*')
                      .eq('id', requestId)
                      .single();

                    if (!requestData) {
                      alert('Edit request not found');
                      return;
                    }

                    const { data: evidenceData } = await supabase
                      .from('evidence')
                      .select('*')
                      .eq('id', requestData.evidence_id)
                      .single();

                    const { data: traineeData } = await supabase
                      .from('user_profile')
                      .select('name')
                      .eq('user_id', requestData.trainee_id)
                      .single();

                    setEditRequestDialog({
                      request: requestData,
                      evidence: evidenceData as EvidenceItem,
                      traineeName: traineeData?.name || 'Trainee'
                    });
                  } catch (error) {
                    console.error('Error loading edit request:', error);
                    alert('Failed to load edit request');
                  }
                }}
              />
            )}



          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {
        isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-md p-6 bg-white shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="e.g. Dr. James Wright"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GMC Number</label>
                    <input
                      type="text"
                      value={editForm.gmcNumber}
                      onChange={(e) => setEditForm({ ...editForm, gmcNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                      placeholder="1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">RCOphth Number</label>
                    <input
                      type="text"
                      value={editForm.rcophthNumber}
                      onChange={(e) => setEditForm({ ...editForm, rcophthNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                      placeholder="OPT-123"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        )
      }

      {/* Edit Request Dialog */}
      {editRequestDialog && (
        <EditRequestDialog
          request={editRequestDialog.request}
          evidence={editRequestDialog.evidence!}
          traineeName={editRequestDialog.traineeName}
          onApprove={handleApproveEditRequest}
          onDeny={handleDenyEditRequest}
          onClose={() => setEditRequestDialog(null)}
        />
      )}
    </>);
};

export default SupervisorDashboard;

// Internal Notification List Component to keep main component clean
const NotificationList: React.FC<{
  supervisor: SupervisorProfile;
  onAction?: () => void;
  onShowEditRequest?: (notification: any) => void;
  onViewEvidence?: (item: EvidenceItem) => void;
}> = ({ supervisor, onAction, onShowEditRequest, onViewEvidence }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isSupabaseConfigured || !supabase || !supervisor.id) return;

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', supervisor.id)
          .eq('role_context', 'supervisor')
          // .eq('is_read', false) // Removed to show all recent
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes would be ideal here if enabled
  }, [supervisor.id]);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }

    // Route based on notification type
    if (notification.type === 'edit_request') {
      // Show edit request dialog
      if (onShowEditRequest) {
        onShowEditRequest(notification);
      }
    } else if (notification.reference_type === 'evidence' && notification.reference_id) {
      // Navigate to evidence form
      if (onViewEvidence && isSupabaseConfigured && supabase) {
        try {
          const { data: evidenceData } = await supabase
            .from('evidence')
            .select('*')
            .eq('id', notification.reference_id)
            .single();

          if (evidenceData && onViewEvidence) {
            onViewEvidence(evidenceData as EvidenceItem);
          }
        } catch (error) {
          console.error('Error loading evidence:', error);
        }
      }
    } else {
      // Default: trigger parent action (View Inbox)
      if (onAction) onAction();
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-[10px] text-slate-400">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 flex flex-col items-center justify-center h-full">
        <Bell size={20} className="text-slate-200 mb-2" />
        <span className="text-xs">No new notifications</span>
      </div>
    );
  }

  return (
    <div className="p-1 space-y-1">
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => handleNotificationClick(n)}
          className={`relative p-3 rounded-lg cursor-pointer transition-all border-l-4 group
            ${!n.is_read
              ? 'bg-blue-50/40 border-blue-500' // Unread: Blue tint + Blue border
              : 'hover:bg-slate-50 border-transparent text-slate-500' // Read: Standard hover + Transparent border
            }
          `}
        >
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${!n.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
              {n.type === 'form_submission' ? <ClipboardCheck size={14} /> : <Mail size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-xs truncate pr-2 ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {n.title}
                </p>
                {/* Optional: Add time here if we want right-aligned time */}
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-[10px] line-clamp-1 ${!n.is_read ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  {n.body}
                </p>
                <p className={`text-[10px] shrink-0 whitespace-nowrap ml-2 ${!n.is_read ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

const TraineeCard: React.FC<{
  trainee: TraineeSummary;
  onView: (id: string) => void;
  onLogbook: () => void;
}> = ({ trainee, onView, onLogbook }) => {
  const p = trainee.profile;

  return (
    <GlassCard className="p-0 overflow-hidden group hover:border-indigo-300 transition-all duration-300">
      <div className="grid grid-cols-1 md:grid-cols-12">

        {/* 1. Main Info Block */}
        <div className="md:col-span-8 p-5 md:border-r border-slate-100">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              {p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 rounded-md uppercase">
                  {p.grade}
                </span>
              </div>
              <p className="text-xs text-slate-500">{p.deanery || 'Thames Valley Deanery'}</p>
            </div>
            <div className="ml-auto">
              {/* Optional: Indicator or status */}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">FTE</p>
              <p className="text-sm font-medium text-slate-700">{p.fte ? `${p.fte}% Full Time` : '100% Full Time'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ARCP MONTH</p>
              <p className="text-sm font-medium text-slate-700">{p.arcpMonth || 'February'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">CCT DATE</p>
              <p className="text-sm font-medium text-slate-700">{p.cctDate || '2028-02-01'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">NEXT ARCP DATE</p>
              <p className="text-sm font-medium text-slate-700">{p.arcpDate || '2026-01-19'}</p>
            </div>
          </div>

          {/* Grid for Extended Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Column 1: Exam Results */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">EXAM RESULTS</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">FRCOphth Part 1</span>
                  {p.frcophthPart1 ? (
                    <span className="px-1.5 py-px bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">PASS</span>
                  ) : <span className="text-slate-400">—</span>}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">FRCOphth Part 2 Written</span>
                  {p.frcophthPart2Written ? (
                    <span className="px-1.5 py-px bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">PASS</span>
                  ) : <span className="text-slate-400">—</span>}
                </div>
              </div>
            </div>

            {/* Column 2: Pending Forms / Quick Actions */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">FORMS PENDING SIGN OFF</p>
              {/* Mock Pending Forms List or Count */}
              <div className="space-y-2">
                <div className="text-xs text-slate-500 italic">No forms pending review</div>
                {/* Example of pending item:
                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                    <span>Cataract Surgery (Level 2)</span>
                                </div>
                                */}
              </div>


            </div>
          </div>
        </div>

        {/* 2. Stats / Highlights Block */}
        <div className="md:col-span-4 bg-slate-50/50 p-5 flex flex-col h-full">
          {/* Top: Current ARCP Status */}
          <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">CURRENT ARCP</span>
              <span className="text-[10px] text-slate-400">{p.arcpDate ? new Date(p.arcpDate).toLocaleDateString() : ''}</span>
            </div>
            <div className="text-sm font-bold text-slate-800">{p.arcpInterimFull || 'Full ARCP'}</div>

            {/* EPAs Highlights */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">EPAs</p>
              <div className="space-y-1">
                {p.sias && p.sias.length > 0 ? p.sias.slice(0, 2).map((s, i) => (
                  <div key={i} className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                    <span>Level {s.level}: {s.specialty}</span>
                  </div>
                )) : <div className="text-[10px] text-slate-400 italic">No Active EPAs</div>}
              </div>
            </div>
          </div>

          {/* Bottom: Cataract Stats */}
          <div className="mt-auto bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group/stats">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Activity size={10} /> Cataract Cases (P/PS)
              </div>
            </div>

            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{p.phacoPerformed}</span>
              <span className="text-[10px] text-slate-500 mb-1.5">Phacoemulsification with IOL</span>
            </div>

            <div className="mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PCR RATE</p>
              <p className={`text-lg font-bold ${(p.phacoPcrRate || 0) > 2.0 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                {p.phacoPcrRate ? p.phacoPcrRate.toFixed(2) : '0.00'}%
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">ROLE BREAKDOWNS</p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Performed</span>
                <span className="font-bold text-slate-800">
                  {p.phacoPerformed} <span className="font-normal text-slate-400">({p.phacoTotal ? Math.round((p.phacoPerformed / p.phacoTotal) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Supervised</span>
                <span className="font-bold text-slate-800">
                  {p.phacoSupervised} <span className="font-normal text-slate-400">({p.phacoTotal ? Math.round((p.phacoSupervised / p.phacoTotal) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Assisted</span>
                <span className="font-bold text-slate-800">
                  {p.phacoAssisted} <span className="font-normal text-slate-400">({p.phacoTotal ? Math.round((p.phacoAssisted / p.phacoTotal) * 100) : 0}%)</span>
                </span>
              </div>
            </div>

            <button
              onClick={onLogbook}
              className="mt-3 w-full py-1.5 rounded border border-emerald-500/30 bg-emerald-50/50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
            >
              <Eye size={10} /> Eyelogbook
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
