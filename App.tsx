
import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import MyEvidence from './views/MyEvidence';
import EPAForm from './views/EPAForm';
import GSATForm from './views/GSATForm';
import DOPsForm from './views/DOPsForm';
import OSATSForm from './views/OSATSForm';
import CBDForm from './views/CBDForm';
import CRSForm from './views/CRSForm';
import Progress from './views/Progress';
import AddEvidence from './views/AddEvidence';
import RecordForm from './views/RecordForm';
import PlaceholderForm from './views/PlaceholderForm';
import ARCPPrep from './views/ARCPPrep';
import SupervisorDashboard from './views/SupervisorDashboard';
import { MSFSubmissionForm } from './views/MSFSubmissionForm';
import { MSFResponseForm } from './views/MSFResponseForm';
import { LayoutDashboard, Database, Plus, FileText, Activity, Users } from './components/Icons';
import { INITIAL_SIAS, INITIAL_EVIDENCE, INITIAL_PROFILE } from './constants';
import { SIA, EvidenceItem, EvidenceType, EvidenceStatus, UserProfile, UserRole, SupervisorProfile, ARCPOutcome } from './types';
import { MOCK_SUPERVISORS, getTraineeSummary } from './mockData';
import { Footer } from './components/Footer';

enum View {
  Dashboard = 'dashboard',
  Evidence = 'evidence',
  Progress = 'progress',
  EPAForm = 'epa-form',
  GSATForm = 'gsat-form',
  DOPsForm = 'dops-form',
  OSATSForm = 'osats-form',
  CBDForm = 'cbd-form',
  CRSForm = 'crs-form',
  AddEvidence = 'add-evidence',
  RecordForm = 'record-form',
  MARForm = 'mar-form',
  MSFForm = 'msf-form',
  MSFSubmission = 'msf-submission',
  MSFResponse = 'msf-response',
  ARCPPrep = 'arcp-prep',
  SupervisorDashboard = 'supervisor-dashboard'
}

interface FormParams {
  sia: string;
  level: number;
  supervisorName?: string;
  supervisorEmail?: string;
  type?: string;
  id?: string; // Existing ID if editing
}

interface ReturnTarget {
  originView: View;
  section: number;
  index?: number;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedFormParams, setSelectedFormParams] = useState<FormParams | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem | null>(null);
  const [sias, setSias] = useState<SIA[]>(INITIAL_SIAS);
  const [allEvidence, setAllEvidence] = useState<EvidenceItem[]>(INITIAL_EVIDENCE);
  
  // Profile state with localStorage persistence
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedProfile = localStorage.getItem('ophthaPortfolio_profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch {
        return INITIAL_PROFILE;
      }
    }
    return INITIAL_PROFILE;
  });

  // Persist profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ophthaPortfolio_profile', JSON.stringify(profile));
  }, [profile]);

  // Selection mode for linking evidence
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [linkingReqIdx, setLinkingReqIdx] = useState<string | null>(null); 
  const [linkedEvidence, setLinkedEvidence] = useState<Record<string, string[]>>({});
  
  // Persistence state for returning to the correct outcome in a form
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);

  // Respondent simulation state
  const [activeRespondentId, setActiveRespondentId] = useState<string | null>(null);

  // Role and supervisor state
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.Trainee);
  const [currentSupervisor, setCurrentSupervisor] = useState<SupervisorProfile | null>(null);
  const [viewingTraineeId, setViewingTraineeId] = useState<string | null>(null);

  // Helper function to find existing evidence by type, level, and optionally sia
  const findExistingEvidence = (type: EvidenceType, level: number, sia?: string): EvidenceItem | undefined => {
    return allEvidence.find(e => {
      if (e.type !== type || e.level !== level) return false;
      // For GSAT, don't check sia (it's not applicable)
      if (type === EvidenceType.GSAT) return true;
      // For other types, match sia if provided
      if (sia !== undefined) {
        return e.sia === sia;
      }
      return true;
    });
  };

  const handleUpsertEvidence = (item: Partial<EvidenceItem> & { id?: string }) => {
    setAllEvidence(prev => {
      const exists = prev.find(e => e.id === item.id);
      if (exists) {
        return prev.map(e => e.id === item.id ? { ...e, ...item } as EvidenceItem : e);
      } else {
        const newItem: EvidenceItem = {
          id: item.id || Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString().split('T')[0],
          status: EvidenceStatus.Draft,
          title: 'Untitled Evidence',
          type: EvidenceType.Other,
          ...item
        } as EvidenceItem;
        return [newItem, ...prev];
      }
    });
  };

  const handleNavigateToEPA = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setReturnTarget(null);
    // Find existing EPA for this SIA and level
    const existing = findExistingEvidence(EvidenceType.EPA, level, sia);
    setSelectedFormParams({ 
      sia, 
      level, 
      supervisorName, 
      supervisorEmail,
      id: existing?.id 
    });
    setCurrentView(View.EPAForm);
  };

  const handleNavigateToDOPs = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    // Find existing DOPs for this SIA and level
    const existing = findExistingEvidence(EvidenceType.DOPs, level, sia);
    setSelectedFormParams({ 
      sia, 
      level, 
      supervisorName, 
      supervisorEmail,
      id: existing?.id 
    });
    setCurrentView(View.DOPsForm);
  };

  const handleNavigateToOSATS = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    // Find existing OSATs for this SIA and level
    const existing = findExistingEvidence(EvidenceType.OSATs, level, sia);
    setSelectedFormParams({ 
      sia, 
      level, 
      supervisorName, 
      supervisorEmail,
      id: existing?.id 
    });
    setCurrentView(View.OSATSForm);
  };

  const handleNavigateToCBD = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    // Find existing CbD for this SIA and level
    const existing = findExistingEvidence(EvidenceType.CbD, level, sia);
    setSelectedFormParams({ 
      sia, 
      level, 
      supervisorName, 
      supervisorEmail,
      id: existing?.id 
    });
    setCurrentView(View.CBDForm);
  };

  const handleNavigateToCRS = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    // Find existing CRS for this SIA and level
    const existing = findExistingEvidence(EvidenceType.CRS, level, sia);
    setSelectedFormParams({ 
      sia, 
      level, 
      supervisorName, 
      supervisorEmail,
      id: existing?.id 
    });
    setCurrentView(View.CRSForm);
  };

  const handleNavigateToAddEvidence = (sia?: string, level?: number, type?: string) => {
    setEditingEvidence(null);
    if (sia && level) {
      setSelectedFormParams({ sia, level, type });
    } else {
      setSelectedFormParams(null);
    }
    setCurrentView(View.AddEvidence);
  };

  const handleEditEvidence = (item: EvidenceItem) => {
    setEditingEvidence(item);
    if (item.type === EvidenceType.MSF) {
      setCurrentView(View.MSFSubmission);
    } else if (item.type === EvidenceType.EPA) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id });
      setCurrentView(View.EPAForm);
    } else if (item.type === EvidenceType.DOPs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id });
      setCurrentView(View.DOPsForm);
    } else if (item.type === EvidenceType.OSATs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id });
      setCurrentView(View.OSATSForm);
    } else if (item.type === EvidenceType.CbD) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id });
      setCurrentView(View.CBDForm);
    } else if (item.type === EvidenceType.CRS) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id });
      setCurrentView(View.CRSForm);
    } else if (item.type === EvidenceType.GSAT) {
      setSelectedFormParams({ sia: '', level: item.level || 1, id: item.id });
      setCurrentView(View.GSATForm);
    } else {
      setCurrentView(View.AddEvidence);
    }
  };

  const handleNavigateToMSF = () => {
    const existingActiveMSF = allEvidence.find(e => 
      e.type === EvidenceType.MSF && 
      (e.status === EvidenceStatus.Draft || e.status === EvidenceStatus.Submitted)
    );

    if (existingActiveMSF) {
      alert("You already have an MSF in progress – only one MSF can be active at a time.");
      setEditingEvidence(existingActiveMSF);
      setCurrentView(View.MSFSubmission);
    } else {
      const newMSF: EvidenceItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: EvidenceType.MSF,
        title: `MSF - ${INITIAL_PROFILE.name} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        date: new Date().toISOString().split('T')[0],
        status: EvidenceStatus.Draft,
        msfRespondents: Array.from({ length: 11 }, () => ({
          id: Math.random().toString(36).substr(2, 9),
          name: '',
          email: '',
          role: 'Consultant',
          status: 'Awaiting response',
          inviteSent: false
        }))
      };
      setAllEvidence(prev => [newMSF, ...prev]);
      setEditingEvidence(newMSF);
      setCurrentView(View.MSFSubmission);
    }
  };

  const handleRemoveSIA = (id: string) => {
    setSias(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSIA = (id: string, updatedData: Partial<SIA>) => {
    setSias(prev => prev.map(sia => {
      if (sia.id === id) {
        const newData = { ...sia, ...updatedData };
        if (updatedData.supervisorName !== undefined) {
          newData.supervisorInitials = updatedData.supervisorName
            ? updatedData.supervisorName.split(' ').map(n => n[0]).join('').toUpperCase()
            : '–';
        }
        return newData;
      }
      return sia;
    }));
  };

  const handleAddSIA = (specialty: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    const initials = supervisorName 
      ? supervisorName.split(' ').map(n => n[0]).join('').toUpperCase()
      : '–';
      
    const newSia: SIA = {
      id: Math.random().toString(36).substr(2, 9),
      specialty,
      level,
      supervisorName,
      supervisorEmail,
      supervisorInitials: initials
    };
    setSias(prev => [...prev, newSia]);
  };

  const handleLinkRequested = (reqIndex: number | string, origin: View, domain?: string, sectionIndex?: number) => {
    let linkKey = '';
    if (domain) {
      linkKey = `GSAT-${domain}-${reqIndex}`;
    } else {
      linkKey = typeof reqIndex === 'string' && reqIndex.startsWith('EPA-') 
        ? reqIndex 
        : `EPA-${reqIndex}`;
    }
    
    setLinkingReqIdx(linkKey);
    setReturnTarget({ 
      originView: origin,
      section: sectionIndex ?? 0, 
      index: typeof reqIndex === 'number' ? reqIndex : undefined 
    });
    setIsSelectionMode(true);
    setCurrentView(View.Evidence);
  };

  const handleConfirmSelection = (ids: string[]) => {
    if (linkingReqIdx !== null) {
      setLinkedEvidence(prev => ({
        ...prev,
        [linkingReqIdx]: ids
      }));
    }
    setIsSelectionMode(false);
    if (returnTarget) {
      setCurrentView(returnTarget.originView);
    } else {
      setCurrentView(View.Dashboard);
    }
    setLinkingReqIdx(null);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    if (returnTarget) {
      setCurrentView(returnTarget.originView);
    } else {
      setCurrentView(View.Dashboard);
    }
    setLinkingReqIdx(null);
  };

  const handleRemoveLinkedEvidence = (reqKey: string, evId: string) => {
    setLinkedEvidence(prev => ({
      ...prev,
      [reqKey]: (prev[reqKey] || []).filter(id => id !== evId)
    }));
  };

  const handleDeleteEvidence = (id: string) => {
    setAllEvidence(prev => prev.filter(e => e.id !== id));
  };

  const handleFormSubmitted = () => {
    setCurrentView(View.Evidence);
  };

  const handleNavigateToSupervisorDashboard = () => {
    // Set supervisor role and navigate to supervisor dashboard
    const defaultSupervisor = MOCK_SUPERVISORS[0];
    setCurrentSupervisor(defaultSupervisor);
    setCurrentRole(defaultSupervisor.role);
    setViewingTraineeId(null);
    setCurrentView(View.SupervisorDashboard);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.Dashboard:
        return (
          <Dashboard 
            sias={sias} 
            allEvidence={allEvidence}
            profile={profile}
            onUpdateProfile={setProfile}
            onRemoveSIA={handleRemoveSIA} 
            onUpdateSIA={handleUpdateSIA} 
            onAddSIA={handleAddSIA} 
            onNavigateToEPA={handleNavigateToEPA} 
            onNavigateToDOPs={handleNavigateToDOPs} 
            onNavigateToOSATS={handleNavigateToOSATS} 
            onNavigateToCBD={handleNavigateToCBD}
            onNavigateToCRS={handleNavigateToCRS}
            onNavigateToEvidence={() => setCurrentView(View.Evidence)} 
            onNavigateToRecordForm={() => setCurrentView(View.RecordForm)}
            onNavigateToAddEvidence={handleNavigateToAddEvidence}
            onNavigateToGSAT={() => {
              setReturnTarget(null);
              // Find existing GSAT for level 1 (default)
              const existing = findExistingEvidence(EvidenceType.GSAT, 1);
              setSelectedFormParams({ 
                sia: '', 
                level: 1, 
                id: existing?.id 
              });
              setCurrentView(View.GSATForm);
            }}
            onNavigateToARCPPrep={() => setCurrentView(View.ARCPPrep)}
          />
        );
      case View.Evidence:
        const evidenceData = viewingTraineeId 
          ? getTraineeSummary(viewingTraineeId)?.allEvidence || []
          : allEvidence;
        const evidenceProfile = viewingTraineeId
          ? getTraineeSummary(viewingTraineeId)?.profile || profile
          : profile;
        return (
          <MyEvidence 
            allEvidence={evidenceData}
            profile={evidenceProfile}
            selectionMode={isSelectionMode} 
            onConfirmSelection={handleConfirmSelection} 
            onCancel={handleCancelSelection}
            onEditEvidence={viewingTraineeId ? undefined : handleEditEvidence}
            onDeleteEvidence={viewingTraineeId ? undefined : handleDeleteEvidence}
            isSupervisorView={!!viewingTraineeId}
            onBack={viewingTraineeId ? () => {
              setViewingTraineeId(null);
              setCurrentView(View.SupervisorDashboard);
            } : undefined}
          />
        );
      case View.Progress:
        const progressEvidence = viewingTraineeId 
          ? getTraineeSummary(viewingTraineeId)?.allEvidence || []
          : allEvidence;
        const progressTraineeName = viewingTraineeId
          ? getTraineeSummary(viewingTraineeId)?.profile.name
          : undefined;
        const progressProfile = viewingTraineeId
          ? getTraineeSummary(viewingTraineeId)?.profile
          : profile;
        return (
          <Progress 
            allEvidence={progressEvidence}
            traineeName={progressTraineeName}
            isSupervisorView={!!viewingTraineeId}
            onBack={viewingTraineeId ? () => {
              setViewingTraineeId(null);
              setCurrentView(View.SupervisorDashboard);
            } : undefined}
            profile={progressProfile}
            onUpdateProfile={viewingTraineeId ? undefined : setProfile}
          />
        );
      case View.AddEvidence:
        return (
          <AddEvidence 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialType={selectedFormParams?.type}
            editingEvidence={editingEvidence || undefined}
            onBack={() => {
              setEditingEvidence(null);
              setCurrentView(View.Evidence);
            }} 
            onCreated={(item) => {
              handleUpsertEvidence(item);
              setEditingEvidence(null);
              setCurrentView(View.Evidence);
            }} 
          />
        );
      case View.MSFSubmission:
        return (
          <MSFSubmissionForm 
            evidence={editingEvidence || undefined}
            onBack={() => {
              setEditingEvidence(null);
              setCurrentView(View.Evidence);
            }}
            onSave={(data) => {
               if (editingEvidence) handleUpsertEvidence({ ...data, id: editingEvidence.id });
            }}
            onViewResponse={(id) => {
              setActiveRespondentId(id);
              setCurrentView(View.MSFResponse);
            }}
          />
        );
      case View.MSFResponse:
        return (
          <MSFResponseForm 
            traineeName={INITIAL_PROFILE.name}
            onBack={() => setCurrentView(View.MSFSubmission)}
            onSubmitted={() => {
              if (editingEvidence && activeRespondentId) {
                const updatedRespondents = editingEvidence.msfRespondents?.map(r => 
                  r.id === activeRespondentId ? { ...r, status: 'Completed' } as any : r
                );
                handleUpsertEvidence({ id: editingEvidence.id, msfRespondents: updatedRespondents });
              }
              alert("Thank you! Your response has been submitted.");
              setCurrentView(View.MSFSubmission);
            }}
          />
        );
      case View.RecordForm:
        return <RecordForm onBack={() => setCurrentView(View.Dashboard)} onSelectForm={(type) => {
          setReturnTarget(null);
          if (type === 'EPA') setCurrentView(View.EPAForm);
          else if (type === 'GSAT') {
            // Find existing GSAT for level 1 (default)
            const existing = findExistingEvidence(EvidenceType.GSAT, 1);
            setSelectedFormParams({ 
              sia: '', 
              level: 1, 
              id: existing?.id 
            });
            setCurrentView(View.GSATForm);
          }
          else if (type === 'DOPs') setCurrentView(View.DOPsForm);
          else if (type === 'OSATs') setCurrentView(View.OSATSForm);
          else if (type === 'CBD') setCurrentView(View.CBDForm);
          else if (type === 'CRS') setCurrentView(View.CRSForm);
          else if (type === 'MAR') setCurrentView(View.MARForm);
          else if (type === 'MSF') handleNavigateToMSF();
        }} />;
      case View.EPAForm:
        return (
          <EPAForm 
            id={selectedFormParams?.id}
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialSupervisorName={selectedFormParams?.supervisorName} 
            initialSupervisorEmail={selectedFormParams?.supervisorEmail} 
            onBack={() => setCurrentView(View.RecordForm)} 
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, section) => handleLinkRequested(idx, View.EPAForm, undefined, section)} 
            linkedEvidenceData={linkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
          />
        );
      case View.GSATForm:
        return (
          <GSATForm 
            id={selectedFormParams?.id}
            initialLevel={selectedFormParams?.level || 1} 
            onBack={() => setCurrentView(View.RecordForm)} 
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, domain, section) => handleLinkRequested(idx, View.GSATForm, domain, section)} 
            linkedEvidenceData={linkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
          />
        );
      case View.DOPsForm:
        return <DOPsForm id={selectedFormParams?.id} sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.RecordForm)} onSubmitted={handleFormSubmitted} onSave={handleUpsertEvidence} />;
      case View.OSATSForm:
        return <OSATSForm id={selectedFormParams?.id} sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.RecordForm)} onSubmitted={handleFormSubmitted} onSave={handleUpsertEvidence} />;
      case View.CBDForm:
        return <CBDForm id={selectedFormParams?.id} sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.RecordForm)} onSubmitted={handleFormSubmitted} onSave={handleUpsertEvidence} />;
      case View.CRSForm:
        return <CRSForm id={selectedFormParams?.id} sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.RecordForm)} onSubmitted={handleFormSubmitted} onSave={handleUpsertEvidence} />;
      case View.MARForm:
        return <PlaceholderForm title="MAR Form" subtitle="Management of Acute Referral - Content TBC" onBack={() => setCurrentView(View.RecordForm)} />;
      case View.ARCPPrep:
        return (
          <ARCPPrep 
            sias={sias} 
            allEvidence={allEvidence}
            profile={profile}
            onBack={() => setCurrentView(View.Dashboard)}
            onNavigateGSAT={() => setCurrentView(View.GSATForm)}
            onNavigateMSF={handleNavigateToMSF}
            onUpsertEvidence={handleUpsertEvidence}
          />
        );
      case View.SupervisorDashboard:
        if (!currentSupervisor) {
          // Default to first supervisor for demo
          const defaultSupervisor = MOCK_SUPERVISORS[0];
          setCurrentSupervisor(defaultSupervisor);
          setCurrentRole(defaultSupervisor.role);
        }
        return currentSupervisor ? (
          <SupervisorDashboard
            supervisor={currentSupervisor}
            onViewTraineeProgress={(traineeId) => {
              setViewingTraineeId(traineeId);
              setCurrentView(View.Progress);
            }}
            onViewTraineeEvidence={(traineeId) => {
              setViewingTraineeId(traineeId);
              setCurrentView(View.Evidence);
            }}
            onViewARCPComponent={(traineeId, component) => {
              // Navigate to ARCP Prep for the specific trainee
              setViewingTraineeId(traineeId);
              // For now, just show a message - could navigate to ARCPPrep with trainee context
              alert(`Viewing ${component} for trainee ${traineeId}`);
            }}
            onUpdateARCPOutcome={(traineeId, outcome) => {
              // Update the trainee's ARCP outcome in mock data
              // In a real app, this would update the database
              const summary = getTraineeSummary(traineeId);
              if (summary) {
                summary.profile.arcpOutcome = outcome;
                alert(`ARCP Outcome ${outcome} confirmed for ${summary.profile.name}`);
              }
            }}
          />
        ) : null;
      default:
        return <Dashboard sias={sias} allEvidence={allEvidence} profile={profile} onUpdateProfile={setProfile} onRemoveSIA={handleRemoveSIA} onUpdateSIA={handleUpdateSIA} onAddSIA={handleAddSIA} onNavigateToEPA={handleNavigateToEPA} onNavigateToDOPs={handleNavigateToDOPs} onNavigateToOSATS={handleNavigateToOSATS} onNavigateToCBD={handleNavigateToCBD} onNavigateToCRS={handleNavigateToCRS} onNavigateToEvidence={() => setCurrentView(View.Evidence)} onNavigateToRecordForm={() => setCurrentView(View.RecordForm)} onNavigateToAddEvidence={handleNavigateToAddEvidence} onNavigateToGSAT={() => {
          setReturnTarget(null);
          // Find existing GSAT for level 1 (default)
          const existing = findExistingEvidence(EvidenceType.GSAT, 1);
          setSelectedFormParams({ 
            sia: '', 
            level: 1, 
            id: existing?.id 
          });
          setCurrentView(View.GSATForm);
        }} onNavigateToARCPPrep={() => setCurrentView(View.ARCPPrep)} />;
    }
  };

  const isFormViewActive = [View.EPAForm, View.GSATForm, View.DOPsForm, View.OSATSForm, View.CBDForm, View.CRSForm, View.MARForm, View.MSFForm].includes(currentView);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-[#f8fafc] text-slate-900">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/[0.03] blur-[120px] rounded-full"></div>
      </div>

      {!isSelectionMode && (
        <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-slate-200 px-6">
          <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
              if (currentRole === UserRole.Trainee) {
                setCurrentView(View.Dashboard);
              } else {
                setViewingTraineeId(null);
                setCurrentView(View.SupervisorDashboard);
              }
            }}>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">OphthaPortfolio</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              {currentRole === UserRole.Trainee ? (
                <>
                  <NavTab 
                    active={currentView === View.Dashboard} 
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.Dashboard);
                    }} 
                    icon={<LayoutDashboard size={16} />} 
                    label="DASHBOARD" 
                  />
                  <NavTab 
                    active={currentView === View.Evidence} 
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.Evidence);
                    }} 
                    icon={<Database size={16} />} 
                    label="MY EVIDENCE" 
                  />
                  <NavTab 
                    active={currentView === View.Progress} 
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.Progress);
                    }} 
                    icon={<Activity size={16} />} 
                    label="PROGRESS" 
                  />
                  <NavTab 
                    active={currentView === View.RecordForm || isFormViewActive} 
                    onClick={() => setCurrentView(View.RecordForm)} 
                    icon={<FileText size={16} />} 
                    label="RECORD FORM" 
                  />
                  <NavTab 
                    active={currentView === View.AddEvidence} 
                    onClick={() => setCurrentView(View.AddEvidence)} 
                    icon={<Plus size={16} />} 
                    label="ADD EVIDENCE" 
                  />
                </>
              ) : (
                <>
                  <NavTab 
                    active={currentView === View.SupervisorDashboard} 
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.SupervisorDashboard);
                    }} 
                    icon={<Users size={16} />} 
                    label="SUPERVISOR DASHBOARD" 
                  />
                  {viewingTraineeId && (
                    <>
                      <NavTab 
                        active={currentView === View.Progress} 
                        onClick={() => setCurrentView(View.Progress)} 
                        icon={<Activity size={16} />} 
                        label="TRAINEE PROGRESS" 
                      />
                      <NavTab 
                        active={currentView === View.Evidence} 
                        onClick={() => setCurrentView(View.Evidence)} 
                        icon={<Database size={16} />} 
                        label="TRAINEE EVIDENCE" 
                      />
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/20 shadow-md"></div>
            </div>
          </div>
        </nav>
      )}

      <main className="pt-8 pb-20">
        {renderContent()}
      </main>

      <Footer onNavigateToSupervisorDashboard={handleNavigateToSupervisorDashboard} />
    </div>
  );
};

const NavTab: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button 
    onClick={onClick} 
    className={`
      flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest transition-all
      ${active 
        ? 'bg-slate-900 text-white shadow-md scale-[1.02]' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
      }
    `}
  >
    <span className={`${active ? 'opacity-100' : 'opacity-40'}`}>{icon}</span>
    {label}
  </button>
);

export default App;
