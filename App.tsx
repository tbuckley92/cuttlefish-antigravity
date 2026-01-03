
import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Dashboard from './views/Dashboard';
import MyEvidence from './views/MyEvidence';
import EPAForm from './views/EPAForm';
import GSATForm from './views/GSATForm';
import DOPsForm from './views/DOPsForm';
import OSATSForm from './views/OSATSForm';
import CBDForm from './views/CBDForm';
import CRSForm from './views/CRSForm';
import MARForm from './views/MARForm';
import Progress from './views/Progress';
import AddEvidence from './views/AddEvidence';
import RecordForm from './views/RecordForm';
import PlaceholderForm from './views/PlaceholderForm';
import ARCPPrep from './views/ARCPPrep';
import SupervisorDashboard from './views/SupervisorDashboard';
import EyeLogbook from './views/EyeLogbook';
import { MSFSubmissionForm } from './views/MSFSubmissionForm';
import { MSFResponseForm } from './views/MSFResponseForm';
import { LayoutDashboard, Database, Plus, FileText, Activity, Users, ArrowLeft, Eye } from './components/Icons';
import { Logo } from './components/Logo';
import { INITIAL_SIAS, INITIAL_EVIDENCE, INITIAL_PROFILE } from './constants';
import { SIA, EvidenceItem, EvidenceType, EvidenceStatus, TrainingGrade, UserProfile, UserRole, SupervisorProfile, ARCPOutcome } from './types';
import { MOCK_SUPERVISORS, getTraineeSummary } from './mockData';
import { Footer } from './components/Footer';
import { Auth } from './views/Auth';
import { ProfileSetup } from './views/ProfileSetup';
import { isSupabaseConfigured, supabase } from './utils/supabaseClient';

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
  SupervisorDashboard = 'supervisor-dashboard',
  EyeLogbook = 'eye-logbook'
}

interface FormParams {
  sia: string;
  level: number;
  supervisorName?: string;
  supervisorEmail?: string;
  type?: string;
  id?: string; // Existing ID if editing
  status?: EvidenceStatus;
  initialSection?: number; // Section to navigate to when opening the form
  originView?: View; // View we came from when viewing linked evidence
  originFormParams?: FormParams; // Form params of the origin form
}

interface ReturnTarget {
  originView: View;
  section: number;
  index?: number;
}

// Helper to map View to EvidenceType for filtering same-type evidence when linking
const viewToEvidenceType = (view: View): EvidenceType | undefined => {
  switch (view) {
    case View.EPAForm: return EvidenceType.EPA;
    case View.GSATForm: return EvidenceType.GSAT;
    case View.DOPsForm: return EvidenceType.DOPs;
    case View.OSATSForm: return EvidenceType.OSATs;
    case View.CBDForm: return EvidenceType.CbD;
    case View.CRSForm: return EvidenceType.CRS;
    case View.MARForm: return EvidenceType.MAR;
    case View.MSFForm: return EvidenceType.MSF;
    default: return undefined;
  }
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [profileReady, setProfileReady] = useState(!isSupabaseConfigured);
  const [profileSetupNeeded, setProfileSetupNeeded] = useState(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [profileReloadKey, setProfileReloadKey] = useState(0);

  const clearLegacyLocalData = () => {
    // Important: prevents new accounts from inheriting demo/local data.
    localStorage.removeItem('eyePortfolio_evidence');
    localStorage.removeItem('eyePortfolio_profile');
  };

  const EMPTY_PROFILE: UserProfile = useMemo(
    () => ({
      name: '',
      grade: TrainingGrade.ST1,
      location: '',
      fte: 100,
      arcpMonth: '',
      cctDate: '',
      arcpDate: '',
      supervisorName: '',
      supervisorEmail: '',
      supervisorGmc: '',
      predictedSIAs: [],
      pdpGoals: [],
      deanery: '',
      frcophthPart1: false,
      frcophthPart2Written: false,
      frcophthPart2Viva: false,
      refractionCertificate: false,
    }),
    []
  );

  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedFormParams, setSelectedFormParams] = useState<FormParams | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem | null>(null);
  const [addEvidenceKey, setAddEvidenceKey] = useState(0); // Counter for unique AddEvidence keys
  const [sias, setSias] = useState<SIA[]>(() => (isSupabaseConfigured ? [] : INITIAL_SIAS));
  const [allEvidence, setAllEvidence] = useState<EvidenceItem[]>(() => {
    if (isSupabaseConfigured) return [];
    const savedEvidence = localStorage.getItem('eyePortfolio_evidence');
    if (savedEvidence) {
      try {
        return JSON.parse(savedEvidence);
      } catch {
        return INITIAL_EVIDENCE;
      }
    }
    return INITIAL_EVIDENCE;
  });
  
  // Profile state with localStorage persistence
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (isSupabaseConfigured) return EMPTY_PROFILE;
    const savedProfile = localStorage.getItem('eyePortfolio_profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch {
        return INITIAL_PROFILE;
      }
    }
    return INITIAL_PROFILE;
  });

  // Persist evidence to localStorage whenever it changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('eyePortfolio_evidence', JSON.stringify(allEvidence));
    }
  }, [allEvidence]);

  // Persist profile to localStorage whenever it changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('eyePortfolio_profile', JSON.stringify(profile));
    }
  }, [profile]);

  // Supabase session lifecycle
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setAuthEmail(data.session?.user?.email ?? '');
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthEmail(nextSession?.user?.email ?? '');

      if (nextSession) {
        // Ensure nothing from demo/localStorage leaks into authenticated accounts.
        clearLegacyLocalData();
        setAllEvidence([]);
        setSias([]);
        setProfile(EMPTY_PROFILE);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [EMPTY_PROFILE]);

  // Load profile from DB (and decide whether profile setup is needed)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!authReady) return;
    if (!session) {
      setProfileReady(true);
      setProfileSetupNeeded(false);
      return;
    }

    let isMounted = true;
    setProfileReady(false);
    (async () => {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        // If table/RLS isn't set up yet, keep user on profile setup with error shown there.
        setProfileSetupNeeded(true);
        setProfileReady(true);
        return;
      }

      const isComplete =
        !!data &&
        typeof data.name === 'string' &&
        data.name.trim().length > 0 &&
        typeof data.gmc_number === 'string' &&
        data.gmc_number.trim().length > 0 &&
        typeof data.rcophth_number === 'string' &&
        data.rcophth_number.trim().length > 0 &&
        typeof data.deanery === 'string' &&
        data.deanery.trim().length > 0 &&
        typeof data.base_role === 'string' &&
        data.base_role.length > 0;

      setProfileSetupNeeded(!isComplete);

      if (isComplete) {
        setProfile({
          name: data.name ?? '',
          grade: (data.grade as TrainingGrade) ?? TrainingGrade.ST1,
          location: data.deanery ?? '',
          fte: typeof data.fte === 'number' ? data.fte : 100,
          arcpMonth: data.arcp_month ?? '',
          cctDate: data.cct_date ?? '',
          arcpDate: data.arcp_date ?? '',
          supervisorName: data.supervisor_name ?? '',
          supervisorEmail: data.supervisor_email ?? '',
          supervisorGmc: data.supervisor_gmc ?? '',
          predictedSIAs: data.predicted_sias ?? [],
          pdpGoals: data.pdp_goals ?? [],
          deanery: data.deanery ?? '',
          arcpOutcome: data.arcp_outcome ?? undefined,
          frcophthPart1: data.frcophth_part1 ?? false,
          frcophthPart2Written: data.frcophth_part2_written ?? false,
          frcophthPart2Viva: data.frcophth_part2_viva ?? false,
          refractionCertificate: data.refraction_certificate ?? false,
        });

        // Map base role into the existing UI role switch.
        if (data.base_role === 'SUPERVISOR') {
          setCurrentRole(UserRole.EducationalSupervisor);
        } else {
          setCurrentRole(UserRole.Trainee);
        }
      }

      setProfileReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [authReady, session, profileReloadKey]);

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

  const handleUpdateProfile = async (nextProfile: UserProfile) => {
    setProfile(nextProfile);

    if (!isSupabaseConfigured || !supabase || !session) return;

    // Only update fields the dashboard can edit (avoid touching required fields like GMC etc. here).
    const deanery = (nextProfile.deanery || nextProfile.location || '').trim();
    const payload: Record<string, any> = {
      name: nextProfile.name,
      grade: nextProfile.grade,
      supervisor_name: nextProfile.supervisorName,
      supervisor_email: nextProfile.supervisorEmail,
      supervisor_gmc: nextProfile.supervisorGmc ?? '',
      predicted_sias: nextProfile.predictedSIAs ?? [],
      pdp_goals: nextProfile.pdpGoals ?? [],
      arcp_outcome: nextProfile.arcpOutcome ?? null,
      fte: nextProfile.fte ?? 100,
      arcp_month: nextProfile.arcpMonth ?? null,
      cct_date: nextProfile.cctDate || null,
      arcp_date: nextProfile.arcpDate || null,
      frcophth_part1: nextProfile.frcophthPart1 ?? false,
      frcophth_part2_written: nextProfile.frcophthPart2Written ?? false,
      frcophth_part2_viva: nextProfile.frcophthPart2Viva ?? false,
      refraction_certificate: nextProfile.refractionCertificate ?? false,
    };
    if (deanery) payload.deanery = deanery;

    await supabase.from('user_profile').update(payload).eq('user_id', session.user.id);
  };

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
      const { id: itemId, ...itemData } = item;
      const exists = itemId ? prev.find(e => e.id === itemId) : null;
      
      if (exists) {
        return prev.map(e => e.id === itemId ? { ...e, ...itemData } as EvidenceItem : e);
      } else {
        const newItem: EvidenceItem = {
          id: itemId || Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString().split('T')[0],
          status: EvidenceStatus.Draft,
          title: 'Untitled Evidence',
          type: EvidenceType.Other,
          ...itemData
        } as EvidenceItem;
        return [newItem, ...prev];
      }
    });
  };

  const handleBackToOrigin = () => {
    if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
      setSelectedFormParams({
        ...selectedFormParams.originFormParams,
        initialSection: selectedFormParams.originFormParams.initialSection
      });
      setCurrentView(selectedFormParams.originView);
    } else if (selectedFormParams?.originView) {
      setCurrentView(selectedFormParams.originView);
    } else {
      setCurrentView(View.RecordForm);
    }
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
      id: existing?.id,
      originView: View.Dashboard
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
      id: existing?.id,
      originView: View.Dashboard
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
      id: existing?.id,
      originView: View.Dashboard
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
      id: existing?.id,
      originView: View.Dashboard
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
      id: existing?.id,
      originView: View.Dashboard
    });
    setCurrentView(View.CRSForm);
  };

  const handleNavigateToAddEvidence = (sia?: string, level?: number, type?: string) => {
    setEditingEvidence(null);
    setAddEvidenceKey(prev => prev + 1); // Increment to force remount
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
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
      setCurrentView(View.EPAForm);
    } else if (item.type === EvidenceType.DOPs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
      setCurrentView(View.DOPsForm);
    } else if (item.type === EvidenceType.OSATs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
      setCurrentView(View.OSATSForm);
    } else if (item.type === EvidenceType.CbD) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
      setCurrentView(View.CBDForm);
    } else if (item.type === EvidenceType.CRS) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
      setCurrentView(View.CRSForm);
    } else if (item.type === EvidenceType.GSAT) {
      setSelectedFormParams({ sia: '', level: item.level || 1, id: item.id, status: item.status, originView: View.Evidence });
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
        [linkingReqIdx]: [...new Set([...(prev[linkingReqIdx] || []), ...ids])]
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

  const handleViewLinkedEvidence = (evidenceId: string, section?: number) => {
    console.log('handleViewLinkedEvidence called with evidenceId:', evidenceId);
    const evidence = allEvidence.find(e => e.id === evidenceId);
    if (!evidence) {
      console.error('Evidence not found:', evidenceId, 'Available evidence:', allEvidence.map(e => e.id));
      return;
    }
    console.log('Found evidence:', evidence.type, evidence.title);

    // Store current view and form params as origin context
    const originView = currentView;
    const originFormParams = selectedFormParams ? { ...selectedFormParams, initialSection: section } : undefined;
    console.log('Origin view:', originView, 'Origin params:', originFormParams);

    // Force status to Submitted to ensure read-only mode
    const readOnlyStatus = EvidenceStatus.Submitted;

    // Navigate to the appropriate form view based on evidence type
    if (evidence.type === EvidenceType.EPA) {
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.EPAForm);
    } else if (evidence.type === EvidenceType.DOPs) {
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.DOPsForm);
    } else if (evidence.type === EvidenceType.OSATs) {
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.OSATSForm);
    } else if (evidence.type === EvidenceType.CbD) {
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.CBDForm);
    } else if (evidence.type === EvidenceType.CRS) {
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.CRSForm);
    } else if (evidence.type === EvidenceType.GSAT) {
      setSelectedFormParams({ 
        sia: '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.GSATForm);
    } else {
      // Handle "Add Evidence" types (Reflection, QIP, Audit, Award, etc.)
      setEditingEvidence(evidence);
      setSelectedFormParams({ 
        sia: evidence.sia || '', 
        level: evidence.level || 1, 
        id: evidence.id, 
        status: readOnlyStatus,
        originView,
        originFormParams
      });
      setCurrentView(View.AddEvidence);
    }
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
            onUpdateProfile={handleUpdateProfile}
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
            isResident={currentRole === UserRole.Trainee}
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
            excludeType={isSelectionMode && returnTarget ? viewToEvidenceType(returnTarget.originView) : undefined}
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
            onUpdateProfile={viewingTraineeId ? undefined : handleUpdateProfile}
            onUpsertEvidence={viewingTraineeId ? undefined : handleUpsertEvidence}
            onDeleteEvidence={viewingTraineeId ? undefined : handleDeleteEvidence}
          />
        );
      case View.AddEvidence:
        return (
          <AddEvidence 
            key={editingEvidence?.id || `new-${addEvidenceKey}`}
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialType={selectedFormParams?.type}
            editingEvidence={editingEvidence || undefined}
            onBack={() => {
              setEditingEvidence(null);
              handleBackToOrigin();
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
              handleBackToOrigin();
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
          if (type === 'EPA') {
            setSelectedFormParams(null);
            setCurrentView(View.EPAForm);
          }
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
          else if (type === 'DOPs') {
            setSelectedFormParams(null);
            setCurrentView(View.DOPsForm);
          }
          else if (type === 'OSATs') {
            setSelectedFormParams(null);
            setCurrentView(View.OSATSForm);
          }
          else if (type === 'CBD') {
            setSelectedFormParams(null);
            setCurrentView(View.CBDForm);
          }
          else if (type === 'CRS') {
            setSelectedFormParams(null);
            setCurrentView(View.CRSForm);
          }
          else if (type === 'MAR') {
            setSelectedFormParams(null);
            setCurrentView(View.MARForm);
          }
          else if (type === 'MSF') handleNavigateToMSF();
        }} />;
      case View.EPAForm:
        // Load linked evidence from saved form if editing, filtered by level
        const existingEPA = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.EPA)
          : null;
        
        // Filter linked evidence to only include keys for the current level
        const levelLinkedEvidence: Record<string, string[]> = {};
        const currentLevel = selectedFormParams?.level || 1;
        const levelPrefix = currentLevel === 1 ? 'EPA-L1-' : currentLevel === 2 ? 'EPA-L2-' : currentLevel === 3 ? 'EPA-L3-' : currentLevel === 4 ? 'EPA-L4-' : '';
        
        if (existingEPA?.epaFormData?.linkedEvidence && levelPrefix) {
          Object.keys(existingEPA.epaFormData.linkedEvidence).forEach(key => {
            if (key.startsWith(levelPrefix)) {
              levelLinkedEvidence[key] = existingEPA.epaFormData.linkedEvidence[key];
            }
          });
        }
        
        // Merge with any current linkedEvidence that matches this level
        if (levelPrefix) {
          Object.keys(linkedEvidence).forEach(key => {
            if (key.startsWith(levelPrefix)) {
              levelLinkedEvidence[key] = linkedEvidence[key];
            }
          });
        }
        
        return (
          <EPAForm 
            id={selectedFormParams?.id}
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialSupervisorName={selectedFormParams?.supervisorName} 
            initialSupervisorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingEPA?.status || EvidenceStatus.Draft}
            initialSection={selectedFormParams?.initialSection ?? returnTarget?.section}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            onBack={handleBackToOrigin}
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, section) => handleLinkRequested(idx, View.EPAForm, undefined, section)} 
            linkedEvidenceData={levelLinkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            onViewLinkedEvidence={handleViewLinkedEvidence}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
          />
        );
      case View.GSATForm:
        return (
          <GSATForm 
            id={selectedFormParams?.id}
            initialLevel={selectedFormParams?.level || 1} 
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, domain, section) => handleLinkRequested(idx, View.GSATForm, domain, section)} 
            linkedEvidenceData={linkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
          />
        );
      case View.DOPsForm:
        const existingDOPs = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.DOPs)
          : null;
        return (
          <DOPsForm 
            id={selectedFormParams?.id} 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialAssessorName={selectedFormParams?.supervisorName} 
            initialAssessorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingDOPs?.status || EvidenceStatus.Draft}
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted} 
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
      case View.OSATSForm:
        const existingOSATs = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.OSATs)
          : null;
        return (
          <OSATSForm 
            id={selectedFormParams?.id} 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialAssessorName={selectedFormParams?.supervisorName} 
            initialAssessorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingOSATs?.status || EvidenceStatus.Draft}
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted} 
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
      case View.CBDForm:
        const existingCBD = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.CbD)
          : null;
        return (
          <CBDForm 
            id={selectedFormParams?.id} 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialAssessorName={selectedFormParams?.supervisorName} 
            initialAssessorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingCBD?.status || EvidenceStatus.Draft}
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted} 
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
      case View.CRSForm:
        const existingCRS = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.CRS)
          : null;
        return (
          <CRSForm 
            id={selectedFormParams?.id} 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialAssessorName={selectedFormParams?.supervisorName} 
            initialAssessorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingCRS?.status || EvidenceStatus.Draft}
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted} 
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
      case View.MARForm:
        const existingMAR = selectedFormParams?.id 
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.MAR)
          : null;
        return (
          <MARForm 
            id={selectedFormParams?.id} 
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialAssessorName={selectedFormParams?.supervisorName} 
            initialAssessorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingMAR?.status || EvidenceStatus.Draft}
            onBack={handleBackToOrigin} 
            onSubmitted={handleFormSubmitted} 
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
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
      case View.EyeLogbook:
        return <EyeLogbook />;
      default:
        return <Dashboard sias={sias} allEvidence={allEvidence} profile={profile} onUpdateProfile={handleUpdateProfile} onRemoveSIA={handleRemoveSIA} onUpdateSIA={handleUpdateSIA} onAddSIA={handleAddSIA} onNavigateToEPA={handleNavigateToEPA} onNavigateToDOPs={handleNavigateToDOPs} onNavigateToOSATS={handleNavigateToOSATS} onNavigateToCBD={handleNavigateToCBD} onNavigateToCRS={handleNavigateToCRS} onNavigateToEvidence={() => setCurrentView(View.Evidence)} onNavigateToRecordForm={() => setCurrentView(View.RecordForm)} onNavigateToAddEvidence={handleNavigateToAddEvidence} onNavigateToGSAT={() => {
          setReturnTarget(null);
          // Find existing GSAT for level 1 (default)
          const existing = findExistingEvidence(EvidenceType.GSAT, 1);
          setSelectedFormParams({ 
            sia: '', 
            level: 1, 
            id: existing?.id 
          });
          setCurrentView(View.GSATForm);
        }} onNavigateToARCPPrep={() => setCurrentView(View.ARCPPrep)} isResident={currentRole === UserRole.Trainee} />;
    }
  };

  const isFormViewActive = [View.EPAForm, View.GSATForm, View.DOPsForm, View.OSATSForm, View.CBDForm, View.CRSForm, View.MARForm, View.MSFForm].includes(currentView);
  const isViewingLinkedEvidence = !!selectedFormParams?.originFormParams;

  const LoadingScreen = ({ label }: { label: string }) => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-slate-900 font-semibold">{label}</p>
        <p className="text-slate-500 text-sm mt-1">Please wait…</p>
      </div>
    </div>
  );

  if (isSupabaseConfigured) {
    if (!authReady) return <LoadingScreen label="Connecting to Supabase" />;
    if (!session) return <Auth />;
    if (!profileReady) return <LoadingScreen label="Loading your profile" />;
    if (profileSetupNeeded) {
      return (
        <ProfileSetup
          email={authEmail || session.user.email || ''}
          onComplete={() => {
            setProfileReloadKey(k => k + 1);
          }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-[#f8fafc] text-slate-900">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/[0.03] blur-[120px] rounded-full"></div>
      </div>

      {!isSelectionMode && !isViewingLinkedEvidence && (
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
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform border border-slate-200">
                <Logo size={24} className="text-indigo-600" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">EyePortfolio</span>
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
                    onClick={() => handleNavigateToAddEvidence()} 
                    icon={<Plus size={16} />} 
                    label="ADD EVIDENCE" 
                  />
                  <NavTab 
                    active={currentView === View.EyeLogbook} 
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.EyeLogbook);
                    }} 
                    icon={<Eye size={16} />} 
                    label="EYE LOGBOOK" 
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

      {isViewingLinkedEvidence && (
        <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-purple-600/10 dark:bg-purple-900/40 border-b border-purple-500/20 flex justify-between items-center shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToOrigin}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-purple-700 dark:text-white/70"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-purple-900 dark:text-white font-medium">Viewing Linked Evidence</h2>
              <p className="text-xs text-purple-700/60 dark:text-white/60">Currently viewing evidence record in read-only mode</p>
            </div>
          </div>
          <button 
            onClick={handleBackToOrigin}
            className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
          >
            Back to Form
          </button>
        </div>
      )}

      <main className={`pb-20 ${isViewingLinkedEvidence ? 'pt-24' : 'pt-2'}`}>
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
