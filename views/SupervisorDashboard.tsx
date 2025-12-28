import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  User, Mail, Calendar, Briefcase, ChevronRight, 
  FileText, ClipboardCheck, Activity, BookOpen, Users,
  CheckCircle2, Clock, AlertCircle, ShieldCheck, Eye, ArrowLeft, Lock
} from '../components/Icons';
import { SupervisorProfile, TraineeSummary, UserRole, EvidenceType, EvidenceStatus, ARCPOutcome, ARCPReviewType, EvidenceItem } from '../types';
import { ARCP_OUTCOMES } from '../constants';
import { getAllTraineeSummaries, getTraineeSummary } from '../mockData';

interface SupervisorDashboardProps {
  supervisor: SupervisorProfile;
  onViewTraineeProgress: (traineeId: string) => void;
  onViewTraineeEvidence: (traineeId: string) => void;
  onViewARCPComponent: (traineeId: string, component: string) => void;
  onUpdateARCPOutcome: (traineeId: string, outcome: ARCPOutcome) => void;
}

const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  supervisor,
  onViewTraineeProgress,
  onViewTraineeEvidence,
  onViewARCPComponent,
  onUpdateARCPOutcome
}) => {
  const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, ARCPOutcome>>({});
  const [confirmingOutcome, setConfirmingOutcome] = useState<string | null>(null);
  const [reviewTypes, setReviewTypes] = useState<Record<string, ARCPReviewType>>({});
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Get ALL trainees in deanery (for display in list)
  const allTraineesInDeanery = useMemo(() => {
    const allSummaries = getAllTraineeSummaries();
    
    if (supervisor.role === UserRole.ARCPPanelMember) {
      // ARCP Panel Members see all trainees in their deanery
      return allSummaries.filter(summary => 
        summary.profile.deanery === supervisor.deanery || 
        summary.profile.deanery === 'Thames Valley Deanery'
      );
    } else {
      // Educational Supervisors see all trainees in their deanery (or all if no deanery specified)
      // This includes both accessible and non-accessible trainees
      return allSummaries.filter(summary => 
        summary.profile.deanery === supervisor.deanery || 
        summary.profile.deanery === 'Thames Valley Deanery' ||
        !supervisor.deanery // If no deanery specified, show all
      );
    }
  }, [supervisor]);

  // Check if a trainee is accessible (supervisor is Educational Supervisor)
  const isTraineeAccessible = (summary: TraineeSummary): boolean => {
    if (supervisor.role === UserRole.ARCPPanelMember) {
      // ARCP Panel Members can access all trainees in their deanery
      return true;
    } else {
      // Educational Supervisors can only access trainees where they are the Educational Supervisor
      return summary.profile.supervisorEmail === supervisor.email;
    }
  };

  // Sort trainees so accessible ones appear first
  const sortedTrainees = useMemo(() => {
    return [...allTraineesInDeanery].sort((a, b) => {
      const aAccessible = isTraineeAccessible(a);
      const bAccessible = isTraineeAccessible(b);
      // Accessible trainees first (true comes before false)
      if (aAccessible === bAccessible) return 0;
      return aAccessible ? -1 : 1;
    });
  }, [allTraineesInDeanery, supervisor]);

  const handleOutcomeChange = (traineeId: string, outcome: ARCPOutcome) => {
    setSelectedOutcomes(prev => ({ ...prev, [traineeId]: outcome }));
  };

  const handleConfirmOutcome = (traineeId: string) => {
    const outcome = selectedOutcomes[traineeId];
    if (outcome) {
      setConfirmingOutcome(traineeId);
    }
  };

  const handleConfirmOutcomeFinal = (traineeId: string) => {
    const outcome = selectedOutcomes[traineeId];
    if (outcome) {
      onUpdateARCPOutcome(traineeId, outcome);
      setConfirmingOutcome(null);
    }
  };

  const getARCPPrepStatus = (summary: TraineeSummary) => {
    const prepItem = summary.allEvidence.find(e => e.type === EvidenceType.ARCPPrep);
    if (!prepItem) return { status: 'NOT YET STARTED', color: 'text-slate-400', bgColor: 'bg-slate-100' };
    if (prepItem.status === EvidenceStatus.SignedOff) return { status: 'COMPLETE', color: 'text-green-600', bgColor: 'bg-green-50' };
    return { status: 'IN PROGRESS', color: 'text-amber-600', bgColor: 'bg-amber-50' };
  };

  const getComponentStatus = (summary: TraineeSummary, component: string) => {
    switch (component) {
      case 'FormR':
        const formR = summary.allEvidence.find(e => e.title.toLowerCase().includes('form r'));
        return formR?.status === EvidenceStatus.SignedOff ? 'COMPLETE' : 'PENDING';
      case 'Eyelogbook':
        const logbook = summary.allEvidence.find(e => e.type === EvidenceType.Logbook);
        return logbook?.status === EvidenceStatus.SignedOff ? 'COMPLETE' : 'PENDING';
      case 'PDP':
        return summary.profile.pdpGoals && summary.profile.pdpGoals.length > 0 ? 'COMPLETE' : 'PENDING';
      case 'EPAs':
        const epas = summary.allEvidence.filter(e => e.type === EvidenceType.EPA);
        if (epas.length === 0) return 'NOT STARTED';
        if (epas.some(e => e.status === EvidenceStatus.SignedOff)) return 'COMPLETE';
        if (epas.some(e => e.status === EvidenceStatus.Submitted)) return 'IN PROGRESS';
        return 'DRAFT';
      case 'GSAT':
        const gsat = summary.allEvidence.find(e => e.type === EvidenceType.GSAT);
        if (!gsat) return 'NOT STARTED';
        return gsat.status === EvidenceStatus.SignedOff ? 'COMPLETE' : gsat.status === EvidenceStatus.Submitted ? 'IN PROGRESS' : 'DRAFT';
      case 'MSF':
        const msf = summary.allEvidence.find(e => e.type === EvidenceType.MSF);
        if (!msf) return 'NOT STARTED';
        return msf.status === EvidenceStatus.SignedOff ? 'COMPLETE' : 'IN PROGRESS';
      case 'ESR':
        return 'NOT YET DEFINED';
      default:
        return 'UNKNOWN';
    }
  };

  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getComponentDates = (summary: TraineeSummary, component: string): { current: string | null; last: string | null } => {
    let relevantEvidence: EvidenceItem[] = [];
    
    switch (component) {
      case 'FormR':
        relevantEvidence = summary.allEvidence
          .filter(e => e.title.toLowerCase().includes('form r'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'Eyelogbook':
        relevantEvidence = summary.allEvidence
          .filter(e => e.type === EvidenceType.Logbook)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'PDP':
        // For PDP, use pdpGoals dates
        const sortedGoals = (summary.profile.pdpGoals || [])
          .filter(g => g.targetDate)
          .sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
        return {
          current: sortedGoals[0]?.targetDate || null,
          last: sortedGoals[1]?.targetDate || null
        };
      case 'GSAT':
        relevantEvidence = summary.allEvidence
          .filter(e => e.type === EvidenceType.GSAT)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'MSF':
        relevantEvidence = summary.allEvidence
          .filter(e => e.type === EvidenceType.MSF)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'ESR':
        // ESR is not yet defined, but we still return empty dates to show the date lines
        return { current: null, last: null };
      default:
        return { current: null, last: null };
    }
    
    return {
      current: relevantEvidence[0]?.date || null,
      last: relevantEvidence[1]?.date || null
    };
  };

  // Render trainee detail card (reused from existing card view)
  const renderTraineeDetailCard = (summary: TraineeSummary) => {
    const prepStatus = getARCPPrepStatus(summary);
    const selectedOutcome = selectedOutcomes[summary.profile.id!] || summary.profile.arcpOutcome;
    const isConfirming = confirmingOutcome === summary.profile.id;
    const currentReviewType = reviewTypes[summary.profile.id!] || ARCPReviewType.FullARCP;

    return (
      <GlassCard className="p-6">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedTraineeId(null);
              setViewMode('list');
            }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Trainee List
          </button>
        </div>

        {/* Review Type Toggle */}
        <div className="mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Review Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setReviewTypes(prev => ({ ...prev, [summary.profile.id!]: ARCPReviewType.InterimReview }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentReviewType === ARCPReviewType.InterimReview
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Interim Review
              </button>
              <button
                onClick={() => setReviewTypes(prev => ({ ...prev, [summary.profile.id!]: ARCPReviewType.FullARCP }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentReviewType === ARCPReviewType.FullARCP
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Full ARCP
              </button>
            </div>
          </div>
        </div>

        {/* Trainee Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{summary.profile.name}</h3>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-medium border border-indigo-500/20">
                    {summary.profile.grade}
                  </span>
                  <span className="text-slate-500 text-sm">ARCP: {summary.profile.arcpMonth}</span>
                  <span className="text-slate-500 text-sm">CCT: {summary.profile.cctDate}</span>
                </div>
                <div className="text-slate-500 text-sm">
                  Current Educational Supervisor: {summary.profile.supervisorName}
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${prepStatus.bgColor} ${prepStatus.color}`}>
              {prepStatus.status}
            </div>
          </div>
        </div>

        {/* ARCP Prep Summary */}
        <div className="mb-6 pb-6 border-b border-slate-200">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">ARCP Prep Components</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { key: 'FormR', label: 'Form R', icon: <FileText size={14} /> },
              { key: 'Eyelogbook', label: 'Eyelogbook', icon: <ClipboardCheck size={14} /> },
              { key: 'PDP', label: 'PDP', icon: <BookOpen size={14} /> },
              { key: 'GSAT', label: 'GSAT', icon: <ClipboardCheck size={14} /> },
              { key: 'MSF', label: 'MSF', icon: <Users size={14} /> }
            ].map(comp => {
              const status = getComponentStatus(summary, comp.key);
              const isComplete = status === 'COMPLETE';
              const isPending = status === 'PENDING' || status === 'NOT STARTED' || status === 'NOT YET DEFINED';
              const dates = getComponentDates(summary, comp.key);
              
              return (
                <button
                  key={comp.key}
                  onClick={() => onViewARCPComponent(summary.profile.id!, comp.key)}
                  disabled={isPending}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isComplete
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      : isPending
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {comp.icon}
                    <span className="text-xs font-bold">{comp.label}</span>
                  </div>
                  <span className="text-[10px] font-medium mb-2 block">{status}</span>
                  <div className="text-[10px] text-slate-600 mt-1 space-y-0.5">
                    <div>Date of current: {dates.current ? (formatDate(dates.current) || dates.current) : '–'}</div>
                    <div>Date of last: {dates.last ? (formatDate(dates.last) || dates.last) : '–'}</div>
                  </div>
                </button>
              );
            })}
            {/* ESR */}
            {(() => {
              const esrStatus = getComponentStatus(summary, 'ESR');
              const esrDates = getComponentDates(summary, 'ESR');
              return (
                <button
                  onClick={() => onViewARCPComponent(summary.profile.id!, 'ESR')}
                  disabled={true}
                  className="p-3 rounded-xl border text-left transition-all bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} />
                    <span className="text-xs font-bold">ESR</span>
                  </div>
                  <span className="text-[10px] font-medium mb-2 block">{esrStatus}</span>
                  <div className="text-[10px] text-slate-600 mt-1 space-y-0.5">
                    <div>Date of current: {esrDates.current ? (formatDate(esrDates.current) || esrDates.current) : '–'}</div>
                    <div>Date of last: {esrDates.last ? (formatDate(esrDates.last) || esrDates.last) : '–'}</div>
                  </div>
                </button>
              );
            })()}
          </div>

          {/* Individual EPAs/SIAs */}
          <div className="mt-4">
            <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">EPAs/SIAs</h5>
            {summary.sias.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.sias.map(sia => {
                  const matchingEpas = summary.allEvidence.filter(e => 
                    e.type === EvidenceType.EPA && 
                    e.level === sia.level && 
                    (sia.level <= 2 ? true : e.sia === sia.specialty)
                  );

                  let currentStatus: EvidenceStatus | 'Not Yet Started' = 'Not Yet Started';
                  if (matchingEpas.some(e => e.status === EvidenceStatus.SignedOff)) currentStatus = EvidenceStatus.SignedOff;
                  else if (matchingEpas.some(e => e.status === EvidenceStatus.Submitted)) currentStatus = EvidenceStatus.Submitted;
                  else if (matchingEpas.some(e => e.status === EvidenceStatus.Draft)) currentStatus = EvidenceStatus.Draft;

                  const statusColors = {
                    [EvidenceStatus.SignedOff]: 'bg-green-50 border-green-200 text-green-700',
                    [EvidenceStatus.Submitted]: 'bg-amber-50 border-amber-200 text-amber-700',
                    [EvidenceStatus.Draft]: 'bg-sky-50 border-sky-200 text-sky-700',
                    'Not Yet Started': 'bg-slate-50 border-slate-200 text-slate-400'
                  };

                  return (
                    <div
                      key={sia.id}
                      className={`p-3 rounded-xl border ${statusColors[currentStatus]}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{sia.specialty}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/50">
                          Level {sia.level}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium">{currentStatus}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-400 text-xs">
                No EPAs/SIAs found
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => onViewTraineeProgress(summary.profile.id!)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-xs font-bold hover:bg-indigo-600/20 transition-all"
          >
            <Activity size={14} /> View Progress Table
          </button>
          <button
            onClick={() => onViewTraineeEvidence(summary.profile.id!)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-700 text-xs font-bold hover:bg-teal-600/20 transition-all"
          >
            <FileText size={14} /> View Evidence Table
          </button>
        </div>

        {/* ARCP Outcome Section */}
        <div className="pt-6 border-t border-slate-200">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">ARCP Outcome</h4>
          
          {!isConfirming ? (
            <>
              <select
                value={selectedOutcome || ''}
                onChange={(e) => handleOutcomeChange(summary.profile.id!, e.target.value as ARCPOutcome)}
                className="w-full mb-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50"
              >
                <option value="">Select ARCP Outcome</option>
                {Object.values(ARCPOutcome).map(outcome => (
                  <option key={outcome} value={outcome}>{outcome}</option>
                ))}
              </select>

              {selectedOutcome && (
                <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {ARCP_OUTCOMES[selectedOutcome]}
                  </p>
                </div>
              )}

              <button
                onClick={() => handleConfirmOutcome(summary.profile.id!)}
                disabled={!selectedOutcome}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> CONFIRM OUTCOME
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-2">Confirm ARCP Outcome</p>
                <p className="text-sm text-amber-800">
                  <strong>{selectedOutcome}:</strong> {ARCP_OUTCOMES[selectedOutcome!]}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmOutcomeFinal(summary.profile.id!)}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmingOutcome(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {summary.profile.arcpOutcome && !selectedOutcomes[summary.profile.id!] && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-medium text-green-800">
                Current Outcome: <strong>{summary.profile.arcpOutcome}</strong>
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left Panel - Supervisor Info */}
      <div className="lg:col-span-4">
        <GlassCard className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 mb-4 p-1 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center">
                <User size={40} className="text-slate-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{supervisor.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                supervisor.role === UserRole.ARCPPanelMember
                  ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
              }`}>
                {supervisor.role === UserRole.ARCPPanelMember ? 'ARCP Panel Member' : 'Educational Supervisor'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 text-sm">
              <div className="text-slate-400 mt-0.5"><Mail size={18} /></div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold mb-1">EMAIL</p>
                <div className="text-slate-900 font-medium text-lg tracking-tight font-mono text-sm">{supervisor.email}</div>
              </div>
            </div>

            {supervisor.role === UserRole.ARCPPanelMember && supervisor.deanery && (
              <div className="flex items-start gap-4 text-sm">
                <div className="text-slate-400 mt-0.5"><Briefcase size={18} /></div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[#94a3b8] text-[11px] uppercase tracking-widest font-bold mb-1">DEANERY</p>
                  <div className="text-slate-900 font-medium text-lg tracking-tight">{supervisor.deanery}</div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 dark:border-white/5">
              <p className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-bold mb-2">TRAINEES IN DEANERY</p>
              <p className="text-2xl font-bold text-slate-900">{allTraineesInDeanery.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right Panel - Trainee List or Detail View */}
      <div className="lg:col-span-8">
        {viewMode === 'list' ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-slate-900">Trainee Profiles</h2>
              <p className="text-sm text-slate-500 mt-1">
                {supervisor.role === UserRole.ARCPPanelMember 
                  ? 'All trainees in your deanery'
                  : 'All trainees in your deanery'}
              </p>
            </div>

            <div className="space-y-2">
              {sortedTrainees.map(summary => {
                const isAccessible = isTraineeAccessible(summary);
                
                return (
                  <GlassCard
                    key={summary.profile.id}
                    className={`p-4 transition-all ${
                      isAccessible
                        ? 'hover:shadow-lg cursor-pointer hover:border-indigo-300'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (isAccessible) {
                        setSelectedTraineeId(summary.profile.id!);
                        setViewMode('detail');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{summary.profile.name}</h3>
                            {!isAccessible && (
                              <Lock size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-medium border border-indigo-500/20">
                              {summary.profile.grade}
                            </span>
                            <span>CCT: {summary.profile.cctDate}</span>
                            <span>ARCP: {summary.profile.arcpMonth}</span>
                            <span>Deanery: {summary.profile.deanery || 'Thames Valley Deanery'}</span>
                            <span>Educational Supervisor: {summary.profile.supervisorName}</span>
                          </div>
                        </div>
                      </div>
                      {!isAccessible && (
                        <div className="ml-4 flex items-center gap-2 text-slate-400">
                          <Lock size={20} />
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}

              {allTraineesInDeanery.length === 0 && (
                <GlassCard className="p-12 text-center">
                  <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No trainees found</p>
                  <p className="text-sm text-slate-400 mt-2">
                    {supervisor.role === UserRole.ARCPPanelMember
                      ? 'No trainees in your deanery'
                      : 'No trainees in your deanery'}
                  </p>
                </GlassCard>
              )}
            </div>
          </>
        ) : (
          <>
            {selectedTraineeId && (() => {
              const summary = getTraineeSummary(selectedTraineeId);
              if (!summary) {
                return (
                  <GlassCard className="p-12 text-center">
                    <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Trainee not found</p>
                  </GlassCard>
                );
              }
              return renderTraineeDetailCard(summary);
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;

