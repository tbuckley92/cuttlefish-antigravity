
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
import EPAOperatingListForm from './views/EPAOperatingListForm';
import MARForm from './views/MARForm';
import Progress from './views/Progress';
import AddEvidence from './views/AddEvidence';
import RecordForm from './views/RecordForm';
import PlaceholderForm from './views/PlaceholderForm';
import ARCPPrep from './views/ARCPPrep';
import SupervisorDashboard from './views/SupervisorDashboard';
import ARCPPanelDashboard from './views/ARCPPanelDashboard';
import EyeLogbook from './views/EyeLogbook';
import { MSFSubmissionForm } from './views/MSFSubmissionForm';
import { MSFResponseForm } from './views/MSFResponseForm';
import { RefractiveAudit } from './views/RefractiveAudit';
import { MyRefractiveAudit } from './views/MyRefractiveAudit';
import { RefractiveAuditOpticianForm } from './views/RefractiveAuditOpticianForm';
import { EPALegacyForm, EPALegacyData } from './views/EPALegacyForm';
import ARCPForm from './views/ARCPForm';
import { LayoutDashboard, Database, Plus, FileText, Activity, Users, ArrowLeft, Eye, ClipboardCheck, Calendar, Settings, LogOut, Lock } from './components/Icons';
import { Logo } from './components/Logo';
import { INITIAL_SIAS, INITIAL_EVIDENCE, INITIAL_PROFILE, SPECIALTIES } from './constants';
import { SIA, EvidenceItem, EvidenceType, EvidenceStatus, TrainingGrade, UserProfile, UserRole, SupervisorProfile, ARCPOutcome, PortfolioProgressItem, ARCPPrepData } from './types';
import { MOCK_SUPERVISORS, getTraineeSummary } from './mockData';
import { Footer } from './components/Footer';
import { Auth } from './views/Auth';
import { ProfileSetup } from './views/ProfileSetup';
import { isSupabaseConfigured, supabase } from './utils/supabaseClient';
import { uuidv4 } from './utils/uuid';
import { uploadEvidenceFile } from './utils/storageUtils';


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
  EPAOperatingListForm = 'epa-operating-list-form',
  AddEvidence = 'add-evidence',
  RecordForm = 'record-form',
  MARForm = 'mar-form',
  MSFForm = 'msf-form',
  MSFSubmission = 'msf-submission',
  MSFResponse = 'msf-response',
  ARCPPrep = 'arcp-prep',
  SupervisorDashboard = 'supervisor-dashboard',
  EyeLogbook = 'eye-logbook',
  RefractiveAudit = 'refractive-audit',
  MyRefractiveAudit = 'my-refractive-audit',
  EPALegacyForm = 'epa-legacy-form',
  ARCPPanelDashboard = 'arcp-panel-dashboard',
  ARCPForm = 'arcp-form'
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
  editMode?: boolean; // Whether to open in edit mode
}

interface ReturnTarget {
  originView: View;
  section: number;
  index?: number;
}

// Context for launching mandatory CRS/OSATS/EPAOperatingList from EPA
interface MandatoryFormContext {
  expectedType: 'CRS' | 'OSATs' | 'EPAOperatingList' | 'DOPs' | 'CbD';
  defaultSubtype: string;
  reqKey: string;
  returnSection: number;
  returnIndex: number;
  epaFormParams: FormParams;
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
      sias: [],
    }),
    []
  );

  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedFormParams, setSelectedFormParams] = useState<FormParams | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem | null>(null);
  const [addEvidenceKey, setAddEvidenceKey] = useState(0); // Counter for unique AddEvidence keys
  const [sias, setSias] = useState<SIA[]>(() => (isSupabaseConfigured ? [] : INITIAL_SIAS));

  // Change default to empty array; we will load from DB if configured, or local storage if not
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
    return INITIAL_EVIDENCE;
  });

  const [arcpPrepData, setArcpPrepData] = useState<ARCPPrepData | undefined>(undefined);

  const [portfolioProgress, setPortfolioProgress] = useState<PortfolioProgressItem[]>([]);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

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


  // Persist evidence to localStorage whenever it changes (only if Supabase is NOT configured)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('eyePortfolio_evidence', JSON.stringify(allEvidence));
    }
  }, [allEvidence]);

  // Persist profile to localStorage whenever it changes (only if Supabase is NOT configured)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('eyePortfolio_profile', JSON.stringify(profile));
    }
  }, [profile]);

  // Load evidence from Supabase when session exists
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user) return;

    let isMounted = true;

    const fetchEvidence = async () => {
      setIsLoadingEvidence(true);
      // Optimised Fetch:
      // 1. Fetch ALL data for non-legacy items (they are small/modern)
      const nonLegacyPromise = supabase
        .from('evidence')
        .select('*')
        .eq('trainee_id', session.user.id)
        .neq('type', 'Curriculum Catch Up')
        .neq('type', 'FourteenFish')
        .order('event_date', { ascending: false });

      // 2. Fetch LIGHTWEIGHT data for legacy items (exclude 'data' column which has base64)
      const legacyPromise = supabase
        .from('evidence')
        .select('id, trainee_id, type, status, title, event_date, sia, level, notes, supervisor_name, supervisor_email, supervisor_gmc, created_at, updated_at')
        .eq('trainee_id', session.user.id)
        .in('type', ['Curriculum Catch Up', 'FourteenFish'])
        .order('event_date', { ascending: false });

      const [nonLegacyResponse, legacyResponse] = await Promise.all([nonLegacyPromise, legacyPromise]);

      if (nonLegacyResponse.error) console.error('Error fetching modern evidence:', nonLegacyResponse.error);
      if (legacyResponse.error) console.error('Error fetching legacy evidence:', legacyResponse.error);

      const combinedData = [
        ...(nonLegacyResponse.data || []),
        ...(legacyResponse.data || [])
      ].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

      // Process data
      if (combinedData) {
        const { mapRowToEvidenceItem } = await import('./utils/evidenceMapper');
        // @ts-ignore
        const mappedItems = combinedData.map(mapRowToEvidenceItem);
        setAllEvidence(mappedItems);
      }

      setIsLoadingEvidence(false);



      // Fetch Portfolio Progress
      const { data: progressData, error: progressError } = await supabase
        .from('portfolio_progress')
        .select('*')
        .eq('trainee_id', session.user.id);

      if (progressError) {
        console.error('Error fetching portfolio progress:', progressError);
      } else if (progressData) {
        setPortfolioProgress(progressData);
      }

      // Fetch ARCP Prep Data
      const { data: arcpData, error: arcpError } = await supabase
        .from('arcp_prep')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (arcpError) {
        console.error('Error fetching ARCP prep data:', arcpError);
      } else if (arcpData) {
        setArcpPrepData(arcpData);
      } else {
        // No row yet, set undefined or create one lazily? Local state remains undefined, component will handle it or create on first save.
        setArcpPrepData(undefined);
      }
    };

    fetchEvidence();

    return () => { isMounted = false; };
  }, [session?.user]);


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
          sias: data.sias ?? [],
          roles: data.roles ?? [],
        });
        setSias(data.sias ?? []);

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

  // Mandatory CRS/OSATS launch context (for auto-linking back to EPA)
  const [mandatoryContext, setMandatoryContext] = useState<MandatoryFormContext | null>(null);
  // Ref to hold the ID of evidence created during a mandatory form flow (needed for sync access)
  const mandatoryCreatedIdRef = React.useRef<string | null>(null);

  // State for viewing another trainee's evidence (fetched from DB)
  const [viewingTraineeEvidence, setViewingTraineeEvidence] = useState<EvidenceItem[]>([]);
  // State for initial EyeLogbook tab
  const [initialEyeLogbookTab, setInitialEyeLogbookTab] = useState<string | undefined>(undefined);

  // Fetch viewing trainee evidence when viewingTraineeId changes
  useEffect(() => {
    if (!viewingTraineeId || !isSupabaseConfigured || !supabase) {
      setViewingTraineeEvidence([]);
      return;
    }

    const fetchTraineeEvidence = async () => {
      // Fetch evidence for the viewed trainee
      // 1. Fetch non-legacy
      const nonLegacyPromise = supabase
        .from('evidence')
        .select('*')
        .eq('trainee_id', viewingTraineeId)
        .neq('type', 'Curriculum Catch Up')
        .neq('type', 'FourteenFish')
        .order('event_date', { ascending: false });

      // 2. Fetch legacy (lightweight)
      const legacyPromise = supabase
        .from('evidence')
        .select('id, trainee_id, type, status, title, event_date, sia, level, notes, supervisor_name, supervisor_email, supervisor_gmc, created_at, updated_at')
        .eq('trainee_id', viewingTraineeId)
        .in('type', ['Curriculum Catch Up', 'FourteenFish'])
        .order('event_date', { ascending: false });

      const [nonLegacyResponse, legacyResponse] = await Promise.all([nonLegacyPromise, legacyPromise]);

      if (nonLegacyResponse.error) console.error('Error fetching trainee modern evidence:', nonLegacyResponse.error);
      if (legacyResponse.error) console.error('Error fetching trainee legacy evidence:', legacyResponse.error);

      const combinedData = [
        ...(nonLegacyResponse.data || []),
        ...(legacyResponse.data || [])
      ].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

      if (combinedData) {
        const { mapRowToEvidenceItem } = await import('./utils/evidenceMapper');
        // @ts-ignore
        const mappedItems = combinedData.map(mapRowToEvidenceItem);
        setViewingTraineeEvidence(mappedItems);
      }
    };

    fetchTraineeEvidence();
  }, [viewingTraineeId]);


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
      sias: nextProfile.sias ?? [],
      arcp_interim_full: nextProfile.arcpInterimFull ?? 'Full ARCP',
      last_arcp_date: nextProfile.lastArcpDate || null,
      last_arcp_type: nextProfile.lastArcpType || null,
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


  const handleUpsertEvidence = async (item: Partial<EvidenceItem> & { id?: string }) => {
    // Capture ID for mandatory form context (CRS/OSATS launched from EPA)
    const ctx = mandatoryContext;
    const isMatchingMandatoryType = ctx && (
      (ctx.expectedType === 'CRS' && item.type === EvidenceType.CRS) ||
      (ctx.expectedType === 'OSATs' && item.type === EvidenceType.OSATs) ||
      (ctx.expectedType === 'DOPs' && item.type === EvidenceType.DOPs) ||
      (ctx.expectedType === 'CbD' && item.type === EvidenceType.CbD)
    );

    // Optimistic Update / Local State Update
    let newItemId = item.id;
    if (!newItemId) {
      // Import uuidv4 helper dynamically or assume it's available. 
      // We will import it at the top of the file in a separate edit or use full import here if possible.
      // For now, let's assume we import uuidv4 from utils.
      // Actually, to avoid "cannot find name uuidv4" error, let's use the full import logic or just copy logic?
      // Better to import it properly. I will modify imports first? 
      // Wait, I can't modify imports easily in the same tool call if they are far away.
      // I'll assume I'll add the import.
      newItemId = uuidv4();
    }

    // Store ID for mandatory context (before async op)
    if (isMatchingMandatoryType) {
      mandatoryCreatedIdRef.current = newItemId;
    }

    const optimisticItem: EvidenceItem = {
      ...item,
      id: newItemId,
      date: item.date || new Date().toISOString().split('T')[0],
      status: item.status || EvidenceStatus.Draft,
      title: item.title || 'Untitled Evidence',
      type: item.type || EvidenceType.Other,
    } as EvidenceItem;

    // Update local state immediately
    setAllEvidence(prev => {
      const exists = prev.find(e => e.id === newItemId);
      if (exists) {
        return prev.map(e => e.id === newItemId ? { ...e, ...item } as EvidenceItem : e);
      } else {
        return [optimisticItem, ...prev];
      }
    });

    // Supabase Persistence
    if (isSupabaseConfigured && supabase && session?.user) {
      try {
        const { mapEvidenceItemToRow } = await import('./utils/evidenceMapper');
        const rowData = mapEvidenceItemToRow(optimisticItem);

        // ensure trainee_id is set
        const payload = {
          ...rowData,
          trainee_id: session.user.id
        };

        const { error } = await supabase
          .from('evidence')
          .upsert(payload);

        if (error) {
          console.error('Error saving evidence to Supabase:', error);
          alert(`Failed to save evidence to server: ${error.message}`);
          // Consider reverting local state here if strict consistency is required
        }
      } catch (err) {
        console.error('Exception saving evidence:', err);
      }
    } else {
      // Local storage persistence is handled by the useEffect [allEvidence] hook
    }
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
  }


  const handleUpsertProgress = async (item: Partial<PortfolioProgressItem>) => {
    if (!session?.user) return;

    // Optimistic update
    const tempId = item.id || uuidv4();
    const newItem: PortfolioProgressItem = {
      ...item,
      id: tempId,
      trainee_id: session.user.id,
      updated_at: new Date().toISOString(),
    } as PortfolioProgressItem;

    setPortfolioProgress(prev => {
      const exists = prev.find(p => p.sia === item.sia && p.level === item.level);
      if (exists) {
        return prev.map(p => (p.sia === item.sia && p.level === item.level) ? { ...p, ...newItem } : p);
      }
      return [...prev, newItem];
    });

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('portfolio_progress')
        .upsert({
          trainee_id: session.user.id,
          sia: newItem.sia,
          level: newItem.level,
          status: newItem.status,
          evidence_type: newItem.evidence_type,
          evidence_id: newItem.evidence_id,
          notes: newItem.notes
        }, { onConflict: 'trainee_id, sia, level' });

      if (error) {
        console.error('Error saving portfolio progress:', error);
      }
    }
  };

  // Handler for unlinking evidence from progress matrix
  const handleDeleteProgress = async (sia: string, level: number, evidenceId: string) => {
    // 1. Remove from local state
    setPortfolioProgress(prev => prev.filter(p => !(p.sia === sia && p.level === level && p.evidence_id === evidenceId)));

    // 2. Update evidence item's selectedBoxes to remove this SIA-Level
    const evidenceItem = allEvidence.find(e => e.id === evidenceId);
    if (evidenceItem && (evidenceItem as any).selectedBoxes) {
      const boxKey = `${sia}-${level}`;
      const updatedBoxes = ((evidenceItem as any).selectedBoxes as string[]).filter((k: string) => k !== boxKey);
      handleUpsertEvidence({ id: evidenceId, selectedBoxes: updatedBoxes } as any);
    }

    // 3. Delete from Supabase
    if (isSupabaseConfigured && supabase && session?.user) {
      const { error } = await supabase
        .from('portfolio_progress')
        .delete()
        .eq('trainee_id', session.user.id)
        .eq('sia', sia)
        .eq('level', level)
        .eq('evidence_id', evidenceId);

      if (error) {
        console.error('Error deleting portfolio progress:', error);
      }
    }
  };

  const handleUpsertARCPPrepSafe = async (data: Partial<ARCPPrepData>) => {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      // Local-only update
      setArcpPrepData(prev => ({
        ...prev,
        ...data,
        id: prev?.id || data.id || uuidv4(),
        user_id: session?.user?.id || 'temp',
        status: data.status || prev?.status || 'DRAFT'
      } as ARCPPrepData));
      return;
    }

    // Generate ID for first-time creation
    let idToUse = arcpPrepData?.id;
    if (!idToUse) {
      idToUse = uuidv4();
    }

    const payload = {
      ...data,
      id: idToUse,
      user_id: session.user.id,
      toot_days: data.toot_days ?? arcpPrepData?.toot_days ?? 0,
      last_arcp_date: data.last_arcp_date ?? arcpPrepData?.last_arcp_date,
      last_arcp_type: data.last_arcp_type ?? arcpPrepData?.last_arcp_type,
      linked_form_r: data.linked_form_r ?? arcpPrepData?.linked_form_r ?? [],
      last_evidence_epas: data.last_evidence_epas ?? arcpPrepData?.last_evidence_epas ?? [],
      last_evidence_gsat: data.last_evidence_gsat ?? arcpPrepData?.last_evidence_gsat ?? [],
      last_evidence_msf: data.last_evidence_msf ?? arcpPrepData?.last_evidence_msf ?? [],
      last_evidence_esr: data.last_evidence_esr ?? arcpPrepData?.last_evidence_esr ?? [],
      current_evidence_epas: data.current_evidence_epas !== undefined ? data.current_evidence_epas : arcpPrepData?.current_evidence_epas,
      current_evidence_gsat: data.current_evidence_gsat !== undefined ? data.current_evidence_gsat : arcpPrepData?.current_evidence_gsat,
      current_evidence_msf: data.current_evidence_msf !== undefined ? data.current_evidence_msf : arcpPrepData?.current_evidence_msf,
      current_evidence_esr: data.current_evidence_esr !== undefined ? data.current_evidence_esr : arcpPrepData?.current_evidence_esr,
      current_es: data.current_es !== undefined ? data.current_es : arcpPrepData?.current_es,
      last_es: data.last_es !== undefined ? data.last_es : arcpPrepData?.last_es,
      status: data.status ?? arcpPrepData?.status ?? 'DRAFT',
      updated_at: new Date().toISOString()
    };

    console.log('Upserting ARCP prep:', payload);

    // Update local with explicit ID
    setArcpPrepData(prev => ({
      ...prev,
      ...payload,
    } as ARCPPrepData));

    // Check if we already have a row
    const existingId = arcpPrepData?.id;

    if (existingId) {
      // Update existing row
      const { error } = await supabase
        .from('arcp_prep')
        .update(payload)
        .eq('id', existingId);

      if (error) {
        console.error("Error updating ARCP prep:", error);
      } else {
        console.log("ARCP prep updated successfully");
      }
    } else {
      // Insert new row
      const { error } = await supabase
        .from('arcp_prep')
        .insert(payload);

      if (error) {
        console.error("Error inserting ARCP prep:", error);
      } else {
        console.log("ARCP prep inserted successfully");
      }
    }
  };

  // Migration effect to populate portfolio_progress from legacy profile data
  useEffect(() => {
    const migrateLegacyProgress = async () => {
      // Check if we have necessary data/connections
      if (!isSupabaseConfigured || !supabase || !session?.user || !profile) return;

      // We only want to migrate if we have legacy data but portfolioProgress appears incomplete
      // To be safe and idempotent, we'll check if we have any legacy completions to migrate
      const hasLegacyCatchUp = Object.keys(profile.curriculumCatchUpCompletions || {}).length > 0;
      const hasLegacyFish = Object.keys(profile.fourteenFishCompletions || {}).length > 0;

      if (!hasLegacyCatchUp && !hasLegacyFish) return;

      console.log('Checking for legacy progress migration...');

      const updates: any[] = [];

      // Helper to process legacy completions
      const processCompletions = (
        completions: Record<string, boolean>,
        type: EvidenceType.CurriculumCatchUp | EvidenceType.FourteenFish
      ) => {
        Object.entries(completions).forEach(([key, completed]) => {
          if (completed) {
            const lastDashIndex = key.lastIndexOf('-');
            if (lastDashIndex === -1) return;

            const siaRaw = key.substring(0, lastDashIndex);
            const level = parseInt(key.substring(lastDashIndex + 1));
            const sia = siaRaw === "GSAT" ? "GSAT" : siaRaw;

            if (sia && !isNaN(level)) {
              // Check if already in portfolioProgress to avoid unnecessary upserts 
              // (though upsert is safe, reducing network calls is good)
              const alreadyExists = portfolioProgress.some(
                p => p.sia === sia && p.level === level && (p.status === EvidenceStatus.SignedOff || p.status === 'Completed')
              );

              if (!alreadyExists) {
                updates.push({
                  trainee_id: session.user.id,
                  sia: sia,
                  level,
                  status: EvidenceStatus.SignedOff,
                  evidence_type: type,
                  notes: 'Migrated from legacy profile'
                });
              }
            }
          }
        });
      };

      if (profile.curriculumCatchUpCompletions) {
        processCompletions(profile.curriculumCatchUpCompletions, EvidenceType.CurriculumCatchUp);
      }

      if (profile.fourteenFishCompletions) {
        processCompletions(profile.fourteenFishCompletions, EvidenceType.FourteenFish);
      }

      if (updates.length > 0) {
        console.log(`Migrating ${updates.length} legacy progress records...`);

        // Batch upsert
        const { error } = await supabase
          .from('portfolio_progress')
          .upsert(updates, { onConflict: 'trainee_id, sia, level' });

        if (error) {
          console.error('Migration error:', error);
        } else {
          console.log(`Successfully migrated ${updates.length} progress records.`);
          // Refresh local state to reflect migration immediately
          const { data: progressData } = await supabase
            .from('portfolio_progress')
            .select('*')
            .eq('trainee_id', session.user.id);

          if (progressData) {
            setPortfolioProgress(progressData);
          }
        }
      } else {
        console.log('No legacy progress records needed migration.');
      }
    };

    if (profileReady) { // Only run when profile is fully loaded
      migrateLegacyProgress();
    }
  }, [profileReady, session?.user?.id, isSupabaseConfigured, portfolioProgress.length]); // Depend on length so if it starts empty then we migrate

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

  const handleEditEvidence = async (item: EvidenceItem) => {
    setEditingEvidence(item);
    if (item.type === EvidenceType.MSF) {
      setCurrentView(View.MSFSubmission);
    } else if (item.type === EvidenceType.EPA) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.EPAForm);
    } else if (item.type === EvidenceType.DOPs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.DOPsForm);
    } else if (item.type === EvidenceType.OSATs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.OSATSForm);
    } else if (item.type === EvidenceType.CbD) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.CBDForm);
    } else if (item.type === EvidenceType.CRS) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.CRSForm);
    } else if (item.type === EvidenceType.GSAT) {
      setSelectedFormParams({ sia: '', level: item.level || 1, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.GSATForm);
    } else if (item.type === EvidenceType.ARCPFullReview || item.type === EvidenceType.ARCPInterimReview) {
      setSelectedFormParams({
        sia: '',
        level: 0,
        id: item.id,
        status: urlParams.get('ra') ? EvidenceStatus.Submitted : item.status,
        originView: currentView,
        editMode: true // Trainees shouldn't get here via handleEditEvidence usually unless allowed, but ARCPPanelDashboard uses this for editing.
        // Actually, for Trainees, handleEditEvidence routes here too. 
        // Trainees are NOT allowed to edit. 
        // We rely on canEdit prop in ARCPForm. 
        // So editMode=true is a request, but canEdit will block it if not allowed?
        // Let's ensure canEdit is passed correctly in renderView.
      });
      setCurrentView(View.ARCPForm);
    } else if (item.type === EvidenceType.CurriculumCatchUp || item.type === EvidenceType.FourteenFish) {
      // Lazy load legacy data if missing
      // @ts-ignore
      if (!item.fileBase64 && !item.fileUrl && !item.file) {
        // Show loading state or just wait? The UI might freeze slightly, but it's better than initial load freeze.
        try {
          // Temporarily show generic loading if needed, or just await
          const { data: fullData, error } = await supabase
            .from('evidence')
            .select('*')
            .eq('id', item.id)
            .single();

          if (fullData) {
            const { mapRowToEvidenceItem } = await import('./utils/evidenceMapper');
            const fullItem = mapRowToEvidenceItem(fullData);

            // Update cache
            setAllEvidence(prev => prev.map(e => e.id === item.id ? fullItem : e));

            // Set view params with full item
            setSelectedFormParams({ sia: '', level: 0, id: fullItem.id, status: fullItem.status, originView: currentView });
            setCurrentView(View.EPALegacyForm);
            return;
          }
        } catch (err) {
          console.error("Failed to lazy load legacy item", err);
        }
      }

      setSelectedFormParams({ sia: '', level: 0, id: item.id, status: item.status, originView: currentView });
      setCurrentView(View.EPALegacyForm);
    } else if (item.type === EvidenceType.EPAOperatingList) {
      // Extract subspecialty from item data if available
      const subspecialty = item.epaOperatingListFormData?.subspecialty || '';
      setSelectedFormParams({
        sia: subspecialty,
        level: 0, // Not strictly used but good for consistency
        id: item.id,
        status: item.status,
        originView: currentView
      });
      setCurrentView(View.EPAOperatingListForm);
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
        id: uuidv4(),
        type: EvidenceType.MSF,
        title: `MSF - ${INITIAL_PROFILE.name} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        date: new Date().toISOString().split('T')[0],
        status: EvidenceStatus.Draft,
        msfRespondents: Array.from({ length: 11 }, () => ({
          id: uuidv4(),
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
    const updatedSias = sias.filter(s => s.id !== id);
    setSias(updatedSias);
    handleUpdateProfile({ ...profile, sias: updatedSias });
  };

  const handleUpdateSIA = (id: string, updatedData: Partial<SIA>) => {
    const updatedSias = sias.map(sia => {
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
    });
    setSias(updatedSias);
    handleUpdateProfile({ ...profile, sias: updatedSias });
  };

  const handleAddSIA = (specialty: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    const initials = supervisorName
      ? supervisorName.split(' ').map(n => n[0]).join('').toUpperCase()
      : '–';

    const newSia: SIA = {
      id: uuidv4(),
      specialty,
      level,
      supervisorName,
      supervisorEmail,
      supervisorInitials: initials
    };
    const updatedSias = [...sias, newSia];
    setSias(updatedSias);
    handleUpdateProfile({ ...profile, sias: updatedSias });
  };

  const handleLinkRequested = (idx: string, originView?: View, domain?: string, section?: number, formParams?: FormParams) => {
    // Check for ARCP Prep link requests - format: ARCP_PREP_LAST_EPAS or ARCP_PREP_CURRENT_EPAS
    if (idx.startsWith('ARCP_PREP_')) {
      const parts = idx.replace('ARCP_PREP_', '').toLowerCase().split('_');
      const section = parts[0]; // 'last' or 'current'
      const target = parts[1]; // 'epas', 'gsat', 'msf', 'esr'

      const lastFieldMap = {
        'epas': 'last_evidence_epas',
        'gsat': 'last_evidence_gsat',
        'msf': 'last_evidence_msf',
        'esr': 'last_evidence_esr'
      } as const;

      const currentFieldMap = {
        'epas': 'current_evidence_epas',
        'gsat': 'current_evidence_gsat',
        'msf': 'current_evidence_msf',
        'esr': 'current_evidence_esr'
      } as const;

      const fieldMap = section === 'last' ? lastFieldMap : currentFieldMap;

      // Store current linked IDs from arcpPrepData
      // @ts-ignore
      const currentLinkedIds = arcpPrepData?.[fieldMap[target as keyof typeof fieldMap]] || [];
      setLinkedEvidence({ [idx]: currentLinkedIds });
      setLinkingReqIdx(idx);
      setIsSelectionMode(true);
      setReturnTarget({ originView: View.ARCPPrep, section: 0 });

      // Mark existing items as selected
      if (currentLinkedIds.length > 0) {
        setAllEvidence(prev => prev.map(e => ({
          ...e,
          // @ts-ignore
          isSelectedForLink: currentLinkedIds.includes(e.id)
        })));
      }

      setCurrentView(View.Evidence);
      return;
    }

    // Only filter same-type evidence when it's a form request?
    // We want to allow cross-linking between different forms now
    const viewType = originView ? viewToEvidenceType(originView) : undefined;

    // Switched logic: we now EXCLUDE matching types in selection
    // because those can cause circular links or duplicates.
    let filterType: EvidenceType | undefined = undefined;

    // Build the reqKey dynamically if needed
    let reqKey = idx;
    if (originView === View.GSATForm && domain && section !== undefined) {
      reqKey = `GSAT - ${domain} - ${section} - ${idx}`;
    } else if (originView === View.EPAForm) {
      // EPAForm passes reqKey like 'EPA - L1 -SIA -B -0 ' - use it directly if it starts with 'EPA - '
      reqKey = idx;
    } else {
      // Default for other forms
      reqKey = `EPA-${idx}`;
    }

    setLinkingReqIdx(reqKey);
    setIsSelectionMode(true);

    // Store return target if provided
    if (section !== undefined) {
      setReturnTarget({ originView: originView || View.RecordForm, section, index: parseInt(idx.split('-').pop() || '0') });
    }

    // Store form params if provided
    if (formParams) {
      setSelectedFormParams(formParams);
    }
    setCurrentView(View.Evidence);
  };

  const handleConfirmSelection = (ids: string[]) => {
    if (linkingReqIdx !== null) {
      setLinkedEvidence(prev => {
        const newLinked = {
          ...prev,
          [linkingReqIdx]: [...new Set([...(prev[linkingReqIdx] || []), ...ids])]
        };
        return newLinked;
      });
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

  const handleDeleteEvidence = async (id: string) => {
    // Optimistic delete from local state
    setAllEvidence(prev => prev.filter(e => e.id !== id));

    // Reset associated portfolio_progress items
    const associatedProgress = portfolioProgress.filter(p => p.evidence_id === id);
    if (associatedProgress.length > 0) {
      associatedProgress.forEach(p => {
        handleUpsertProgress({
          sia: p.sia,
          level: p.level,
          status: EvidenceStatus.Draft, // Reset to Draft
          evidence_type: p.evidence_type,
          evidence_id: undefined, // Clear link 
          notes: 'Unlinked via deletion'
        });
      });
    }

    if (isSupabaseConfigured && supabase && session?.user) {
      const { error } = await supabase
        .from('evidence')
        .delete()
        .eq('id', id)
        .eq('trainee_id', session.user.id); // RLS redundancy safety

      if (error) {
        console.error('Error deleting evidence from Supabase:', error);
        alert('Failed to delete evidence from server.');
        // Could revert state here by fetching fresh data
      }
    }
  };

  const handleFormSubmitted = () => {
    setCurrentView(View.Evidence);
  };

  // Handler for launching mandatory CRS/OSATS/EPAOperatingList from EPA
  const handleCompleteMandatoryForm = (
    formType: 'CRS' | 'OSATs' | 'EPAOperatingList' | 'DOPs' | 'CbD',
    defaultSubtype: string,
    reqKey: string,
    sectionIndex: number,
    criterionIndex: number,
    originLevel?: number,
    originSia?: string
  ) => {
    // Store the current EPA form params so we can return
    const epaParams: FormParams = {
      sia: originSia ?? (selectedFormParams?.sia || ''),
      level: originLevel ?? (selectedFormParams?.level || 1),
      supervisorName: selectedFormParams?.supervisorName,
      supervisorEmail: selectedFormParams?.supervisorEmail,
      id: selectedFormParams?.id,
      status: selectedFormParams?.status,
      initialSection: sectionIndex
    };

    // Set up mandatory context for auto-linking on submit
    setMandatoryContext({
      expectedType: formType,
      defaultSubtype,
      reqKey,
      returnSection: sectionIndex,
      returnIndex: criterionIndex,
      epaFormParams: epaParams
    });

    // Clear the ref
    mandatoryCreatedIdRef.current = null;

    // Navigate to the appropriate form
    if (formType === 'CRS') {
      setSelectedFormParams({
        sia: originSia ?? (selectedFormParams?.sia || ''),
        level: originLevel ?? (selectedFormParams?.level || 1),
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        type: defaultSubtype, // This will be used for initialCrsType
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.CRSForm);
    } else if (formType === 'OSATs') {
      setSelectedFormParams({
        sia: originSia ?? (selectedFormParams?.sia || ''),
        level: originLevel ?? (selectedFormParams?.level || 1),
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        type: defaultSubtype, // This will be used for initialOsatsType
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.OSATSForm);
    } else if (formType === 'DOPs') {
      setSelectedFormParams({
        sia: originSia ?? (selectedFormParams?.sia || ''),
        level: originLevel ?? (selectedFormParams?.level || 1),
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        type: defaultSubtype, // This will be used for initialDopsType
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.DOPsForm);
    } else if (formType === 'EPAOperatingList') {
      // Navigate to EPA Operating List Form
      setSelectedFormParams({
        sia: defaultSubtype, // Subspecialty for the operating list
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.EPAOperatingListForm);
    } else if (formType === 'CbD') {
      setSelectedFormParams({
        sia: originSia ?? (selectedFormParams?.sia || ''),
        level: originLevel ?? (selectedFormParams?.level || 1),
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.CBDForm);
    }
  };

  // Handler for CRS form submission - handles auto-linking back to EPA
  const handleCRSSubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'CRS') {
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      const evidenceId = mandatoryCreatedIdRef.current || (selectedFormParams?.id);

      if (evidenceId) {
        // Auto-link the created evidence to the EPA criterion
        setLinkedEvidence(prev => ({
          ...prev,
          [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
        }));
      }

      // Set return target for scroll
      setReturnTarget({
        originView: View.EPAForm,
        section: returnSection,
        index: returnIndex
      });

      // Navigate back to EPA form
      setSelectedFormParams({
        ...epaFormParams,
        initialSection: returnSection
      });
      setCurrentView(View.EPAForm);

      // Clear mandatory context
      setMandatoryContext(null);
      mandatoryCreatedIdRef.current = null;
    } else {
      // Fallback to normal behavior
      handleFormSubmitted();
    }
  };

  // Handler for OSATS form submission - handles auto-linking back to EPA
  const handleOSATSSubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'OSATs') {
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      const evidenceId = mandatoryCreatedIdRef.current || (selectedFormParams?.id);

      if (evidenceId) {
        // Auto-link the created evidence to the EPA criterion
        setLinkedEvidence(prev => ({
          ...prev,
          [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
        }));
      }

      // Set return target for scroll
      setReturnTarget({
        originView: View.EPAForm,
        section: returnSection,
        index: returnIndex
      });

      // Navigate back to EPA form
      setSelectedFormParams({
        ...epaFormParams,
        initialSection: returnSection
      });
      setCurrentView(View.EPAForm);

      // Clear mandatory context
      setMandatoryContext(null);
      mandatoryCreatedIdRef.current = null;
    } else {
      // Fallback to normal behavior
      handleFormSubmitted();
    }
  };

  // Handler for EPA form submission (Operating List) - handles auto-linking back to origin EPA
  const handleEPAFromEPASubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'EPA') {
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      const evidenceId = mandatoryCreatedIdRef.current || (selectedFormParams?.id);

      if (evidenceId) {
        // Auto-link the created evidence to the EPA criterion
        setLinkedEvidence(prev => ({
          ...prev,
          [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
        }));
      }

      // Set return target for scroll
      setReturnTarget({
        originView: View.EPAForm,
        section: returnSection,
        index: returnIndex
      });

      // Navigate back to origin EPA form
      setSelectedFormParams({
        ...epaFormParams,
        initialSection: returnSection
      });
      setCurrentView(View.EPAForm);

      // Clear mandatory context
      setMandatoryContext(null);
      mandatoryCreatedIdRef.current = null;
    } else {
      // Fallback to normal behavior
      handleFormSubmitted();
    }
  };

  // Handler for EPA Operating List form submission - handles auto-linking back to origin EPA
  const handleEPAOperatingListSubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'EPAOperatingList') {
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      // Use the ref if set (newly created), otherwise check for existing evidence (if editing)
      const evidenceId = mandatoryCreatedIdRef.current || (selectedFormParams?.id);

      if (evidenceId) {
        // Auto-link the created evidence to the EPA criterion
        setLinkedEvidence(prev => ({
          ...prev,
          [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
        }));
      }

      // Set return target for scroll
      setReturnTarget({
        originView: View.EPAForm,
        section: returnSection,
        index: returnIndex
      });

      // Navigate back to origin EPA form
      setSelectedFormParams({
        ...epaFormParams,
        initialSection: returnSection
      });
      setCurrentView(View.EPAForm);

      // Clear mandatory context
      setMandatoryContext(null);
      mandatoryCreatedIdRef.current = null;
    } else {
      // Fallback to normal behavior
      handleFormSubmitted();
    }
  };

  // Handler for CbD form submission - handles auto-linking back to EPA
  const handleCBDSubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'CbD') {
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      // Use the ref if set (newly created), otherwise check for existing evidence (if editing)
      const evidenceId = mandatoryCreatedIdRef.current || (selectedFormParams?.id);

      if (evidenceId) {
        // Auto-link the created evidence to the EPA criterion
        setLinkedEvidence(prev => ({
          ...prev,
          [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
        }));
      }

      // Set return target for scroll
      setReturnTarget({
        originView: View.EPAForm,
        section: returnSection,
        index: returnIndex
      });

      // Navigate back to origin EPA form
      setSelectedFormParams({
        ...epaFormParams,
        initialSection: returnSection
      });
      setCurrentView(View.EPAForm);

      // Clear mandatory context
      setMandatoryContext(null);
      mandatoryCreatedIdRef.current = null;
    } else {
      // Fallback to normal behavior
      handleFormSubmitted();
    }
  };

  const handleNavigateToSupervisorDashboard = () => {
    // Set supervisor role and navigate to supervisor dashboard
    const defaultSupervisor = MOCK_SUPERVISORS[0];
    setCurrentSupervisor(defaultSupervisor);
    setCurrentRole(defaultSupervisor.role);
    setViewingTraineeId(null);
    setCurrentView(View.SupervisorDashboard);
  };

  const handleNavigateToARCPPanel = () => {
    setViewingTraineeId(null);
    setCurrentView(View.ARCPPanelDashboard);
  };

  const handleConfirmLinkSelection = (ids?: string[]) => {
    if (!linkingReqIdx) return;

    // Get selected IDs from parameter or fallback
    const selectedIds = ids || allEvidence
      .filter(e => (e as any).isSelectedForLink)
      .map(e => e.id);

    console.log('Confirming link selection:', linkingReqIdx, 'with IDs:', selectedIds);

    // Check if ARCP Prep link - format: ARCP_PREP_LAST_EPAS or ARCP_PREP_CURRENT_EPAS or ARCP_PREP_FORMR
    if (linkingReqIdx.startsWith('ARCP_PREP_')) {
      // Special case for Form R
      if (linkingReqIdx === 'ARCP_PREP_FORMR') {
        console.log('Saving ARCP Prep Form R:', selectedIds);

        // Update Form R linked array
        handleUpsertARCPPrepSafe({ linked_form_r: selectedIds });

        // Clear selection flags
        setAllEvidence(prev => prev.map(e => {
          const { isSelectedForLink, ...rest } = e as any;
          return rest as EvidenceItem;
        }));

        setIsSelectionMode(false);
        setLinkingReqIdx(null);
        setLinkedEvidence({});
        setCurrentView(View.ARCPPrep);
        return;
      }

      // Special case for Last ARCP general evidence
      if (linkingReqIdx === 'ARCP_PREP_LAST_ARCP') {
        console.log('Saving ARCP Prep Last ARCP Evidence:', selectedIds);

        // Update Last ARCP evidence array
        handleUpsertARCPPrepSafe({ last_arcp_evidence: selectedIds });

        // Clear selection flags
        setAllEvidence(prev => prev.map(e => {
          const { isSelectedForLink, ...rest } = e as any;
          return rest as EvidenceItem;
        }));

        setIsSelectionMode(false);
        setLinkingReqIdx(null);
        setLinkedEvidence({});
        setCurrentView(View.ARCPPrep);
        return;
      }

      const parts = linkingReqIdx.replace('ARCP_PREP_', '').toLowerCase().split('_');
      const section = parts[0]; // 'last' or 'current'
      const target = parts[1]; // 'epas', 'gsat', 'msf', 'esr'

      const fieldPrefix = section === 'last' ? 'last_evidence' : 'current_evidence';
      const fieldMap = {
        'epas': `${fieldPrefix}_epas`,
        'gsat': `${fieldPrefix}_gsat`,
        'msf': `${fieldPrefix}_msf`,
        'esr': `${fieldPrefix}_esr`
      } as const;

      console.log('Saving ARCP Prep linked evidence:', section, target, selectedIds);

      // Update ARCP Prep data
      handleUpsertARCPPrepSafe({ [fieldMap[target as keyof typeof fieldMap]]: selectedIds });

      // Clear selection flags
      setAllEvidence(prev => prev.map(e => {
        const { isSelectedForLink, ...rest } = e as any;
        return rest as EvidenceItem;
      }));

      setIsSelectionMode(false);
      setLinkingReqIdx(null);
      setLinkedEvidence({});

      // Navigate back to ARCP Prep
      setCurrentView(View.ARCPPrep);
      return;
    }

    // Update linkedEvidence state for forms
    setLinkedEvidence(prev => ({
      ...prev,
      [linkingReqIdx]: selectedIds
    }));

    // Clear selection flags from evidence
    setAllEvidence(prev => prev.map(e => {
      const { isSelectedForLink, ...rest } = e as any;
      return rest as EvidenceItem;
    }));

    setIsSelectionMode(false);
    setLinkingReqIdx(null);

    // If we're returning to a form, restore the form params and view
    // (This logic already exists in the app flow)
  };


  const handleNavigateBack = () => {
    if (selectedFormParams?.originView) {
      setCurrentView(selectedFormParams.originView);
    } else {
      // Fallback or default behavior
      setCurrentView(View.Dashboard);
    }
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
          ? viewingTraineeEvidence
          : allEvidence;
        const evidenceProfile = viewingTraineeId
          ? getTraineeSummary(viewingTraineeId)?.profile || profile
          : profile;
        return (
          <MyEvidence
            allEvidence={evidenceData}
            profile={evidenceProfile}
            selectionMode={isSelectionMode}
            onConfirmSelection={handleConfirmLinkSelection}
            onCancel={handleCancelSelection}
            onEditEvidence={viewingTraineeId ? undefined : handleEditEvidence}
            onDeleteEvidence={viewingTraineeId ? undefined : handleDeleteEvidence}
            isSupervisorView={!!viewingTraineeId}
            onBack={viewingTraineeId ? () => {
              setViewingTraineeId(null);
              // Return to correct dashboard based on current role
              if (currentRole === UserRole.ARCPPanelMember || currentRole === UserRole.ARCPSuperuser) {
                setCurrentView(View.ARCPPanelDashboard);
              } else {
                setCurrentView(View.SupervisorDashboard);
              }
            } : undefined}
            // Allow viewing evidence in read-only mode when viewing trainee evidence
            onViewItem={viewingTraineeId ? (item) => {
              // Navigate to the appropriate view based on evidence type (read-only mode)
              const readOnlyStatus = EvidenceStatus.Submitted;
              setSelectedFormParams({
                sia: item.sia || '',
                level: item.level || 1,
                id: item.id,
                status: readOnlyStatus,
                originView: View.Evidence // Return to Evidence view after viewing
              });

              switch (item.type) {
                case EvidenceType.ARCPFullReview:
                case EvidenceType.ARCPInterimReview:
                  setCurrentView(View.ARCPForm);
                  break;
                case EvidenceType.EPA:
                  setCurrentView(View.EPAForm);
                  break;
                case EvidenceType.GSAT:
                  setCurrentView(View.GSATForm);
                  break;
                case EvidenceType.DOPs:
                  setCurrentView(View.DOPsForm);
                  break;
                case EvidenceType.OSATs:
                  setCurrentView(View.OSATSForm);
                  break;
                case EvidenceType.CbD:
                  setCurrentView(View.CBDForm);
                  break;
                case EvidenceType.CRS:
                  setCurrentView(View.CRSForm);
                  break;
                default:
                  // For other types (MSF, Curriculum Catch Up, etc.), view in AddEvidence form
                  setEditingEvidence(item);
                  setCurrentView(View.AddEvidence);
                  break;
              }
            } : undefined}
            excludeType={isSelectionMode && returnTarget && returnTarget.originView !== View.EPAForm ? viewToEvidenceType(returnTarget.originView) : undefined}
            epaLinkingMode={isSelectionMode && returnTarget?.originView === View.EPAForm}
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
            portfolioProgress={viewingTraineeId ? [] : portfolioProgress}
            onUpsertProgress={viewingTraineeId ? undefined : handleUpsertProgress}
            onDeleteProgress={viewingTraineeId ? undefined : handleDeleteProgress}
            onViewEvidence={handleEditEvidence}
          />
        );
      case View.EPALegacyForm:
        const existingLegacyItem = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id)
          : null;

        // Reconstruct initial data if viewing
        let initialLegacyData: any = undefined;
        if (existingLegacyItem) {
          initialLegacyData = {
            id: existingLegacyItem.id,
            title: existingLegacyItem.title,
            type: existingLegacyItem.type,
            fileUrl: existingLegacyItem.fileUrl,
            fileBase64: existingLegacyItem.fileBase64, // Pass base64 data if available
            fileName: existingLegacyItem.fileName,
            // @ts-ignore
            selectedBoxes: new Set(existingLegacyItem.selectedBoxes || [])
          };
        }

        return (
          <EPALegacyForm
            onBack={() => {
              if (selectedFormParams?.originView) {
                setCurrentView(selectedFormParams.originView);
              } else {
                setCurrentView(View.RecordForm);
              }
            }}
            initialData={initialLegacyData}
            isReadOnly={!!existingLegacyItem}
            sias={[
              ...SPECIALTIES.map(s => ({ id: s, specialty: s, level: 0 } as SIA)),
              { id: 'GSAT', specialty: 'GSAT', level: 0 } as SIA
            ]}
            onSave={async (data) => {
              // 1. Create Evidence Item
              const newEvidenceId = uuidv4();

              // Helper to generate notes
              const levels = Array.from(data.selectedBoxes).map((k: string) => k.split('-')[1]).sort().join(', ');


              let fileUrl = data.fileBase64;

              // Attempt upload to Supabase Storage if configured and user is authenticated
              if (isSupabaseConfigured && session?.user && data.file) {
                try {
                  fileUrl = await uploadEvidenceFile(session.user.id, data.file);
                } catch (err) {
                  console.error("Failed to upload file to storage, falling back to Base64", err);
                  // Fallback: fileUrl remains base64 (if available) or undefined
                }
              }

              const evidenceItem: EvidenceItem = {
                id: newEvidenceId,
                type: data.type,
                title: data.title,
                date: new Date().toISOString().split('T')[0],
                status: EvidenceStatus.SignedOff, // Auto-signed off for legacy
                fileUrl: fileUrl, // Storage path or Base64 fallback
                fileBase64: data.fileBase64, // Always store base64 for viewing
                fileName: data.file?.name,
                notes: `Legacy Upload. Levels: ${levels}`,
                // @ts-ignore
                selectedBoxes: Array.from(data.selectedBoxes)
              } as EvidenceItem;

              await handleUpsertEvidence(evidenceItem);

              // 2. Update Progress Matrix for each selected box
              for (const boxKey of data.selectedBoxes) { // boxKey = "SIA-Level" e.g. "Cataract-1"
                const lastDash = boxKey.lastIndexOf('-');
                const sia = boxKey.substring(0, lastDash);
                const level = parseInt(boxKey.substring(lastDash + 1));

                await handleUpsertProgress({
                  sia: sia,
                  level: level,
                  status: EvidenceStatus.SignedOff,
                  evidence_type: data.type,
                  evidence_id: newEvidenceId,
                  notes: 'Linked via Legacy Form'
                });
              }

              // 3. Return to Evidence or Dashboard
              setCurrentView(View.Progress); // Go to Progress to show the green boxes!
            }}
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
            traineeName={profile.name}
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
          } else if (type === 'EPALegacy') {
            setSelectedFormParams(null);
            setCurrentView(View.EPALegacyForm);
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
          else if (type === 'EPAOperatingList') {
            setSelectedFormParams(null);
            setCurrentView(View.EPAOperatingListForm);
          }
          else if (type === 'MSF') handleNavigateToMSF();
        }} />;
      case View.EPAForm:
        // Load linked evidence from saved form if editing, filtered by level
        const existingEPA = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.EPA)
          : null;

        // Filter linked evidence to only include keys for the current level AND SIA
        const levelLinkedEvidence: Record<string, string[]> = {};
        const currentLevel = selectedFormParams?.level || 1;
        const currentSia = selectedFormParams?.sia || 'No attached SIA';
        // Match the reqKey format from EPAForm: `EPA - ${levelPrefix} -${selectedSia} -${sectionKey} -${idx} `
        const levelPrefix = currentLevel === 1 ? 'L1' : currentLevel === 2 ? 'L2' : currentLevel === 3 ? 'L3' : currentLevel === 4 ? 'L4' : '';
        // Full prefix includes both level and SIA to scope linked evidence per specialty
        const fullPrefix = `EPA - ${levelPrefix} -${currentSia} -`;

        if (existingEPA?.epaFormData?.linkedEvidence && fullPrefix) {
          Object.keys(existingEPA.epaFormData.linkedEvidence).forEach(key => {
            if (key.startsWith(fullPrefix)) {
              levelLinkedEvidence[key] = existingEPA.epaFormData.linkedEvidence[key];
            }
          });
        }

        // Merge with any current linkedEvidence that matches this level AND SIA
        if (fullPrefix) {
          Object.keys(linkedEvidence).forEach(key => {
            if (key.startsWith(fullPrefix)) {
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
            traineeName={profile.name}
            onBack={handleNavigateBack}
            onSubmitted={mandatoryContext?.expectedType === 'EPA' ? handleEPAFromEPASubmitted : handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, section, formParams) => handleLinkRequested(idx, View.EPAForm, undefined, section, formParams)}
            linkedEvidenceData={levelLinkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            onViewLinkedEvidence={handleViewLinkedEvidence}
            onCompleteMandatoryForm={handleCompleteMandatoryForm}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
          />
        );
      case View.GSATForm:
        return (
          <GSATForm
            id={selectedFormParams?.id}
            initialLevel={selectedFormParams?.level || 1}
            traineeName={profile.name}
            onBack={handleNavigateBack}
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, domain, section) => handleLinkRequested(idx, View.GSATForm, domain, section)}
            linkedEvidenceData={linkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
            initialSupervisorName={profile.supervisorName}
            initialSupervisorEmail={profile.supervisorEmail}
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
            initialDopsType={selectedFormParams?.type}
            traineeName={profile.name}
            onBack={handleNavigateBack}
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
            initialOsatsType={selectedFormParams?.type}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            traineeName={profile.name}
            onBack={handleBackToOrigin}
            onSubmitted={handleOSATSSubmitted}
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
            traineeName={profile.name}
            onBack={handleBackToOrigin}
            onSubmitted={handleCBDSubmitted}
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
            initialCrsType={selectedFormParams?.type}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            traineeName={profile.name}
            onBack={handleBackToOrigin}
            onSubmitted={handleCRSSubmitted}
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
            traineeName={profile.name}
            onBack={handleBackToOrigin}
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            allEvidence={allEvidence}
          />
        );
      case View.EPAOperatingListForm:
        const existingEPAOpList = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.EPAOperatingList)
          : null;
        return (
          <EPAOperatingListForm
            id={selectedFormParams?.id}
            initialSubspecialty={selectedFormParams?.sia}
            initialSupervisorName={selectedFormParams?.supervisorName}
            initialSupervisorEmail={selectedFormParams?.supervisorEmail}
            initialStatus={selectedFormParams?.status || existingEPAOpList?.status || EvidenceStatus.Draft}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            traineeName={profile.name}
            onBack={handleBackToOrigin}
            onSubmitted={handleEPAOperatingListSubmitted}
            onSave={(item) => {
              // Ensure we capture the ID created by handleUpsertEvidence
              const itemId = item.id || uuidv4();
              handleUpsertEvidence({ ...item, id: itemId });

              const ctx = mandatoryContext;
              if (ctx && ctx.expectedType === 'EPAOperatingList') {
                mandatoryCreatedIdRef.current = itemId;
              }
            }}
            allEvidence={allEvidence}
          />
        );
      case View.ARCPPrep:
        return (
          <ARCPPrep
            sias={sias}
            allEvidence={allEvidence}
            profile={profile}
            arcpPrepData={arcpPrepData}
            onBack={() => setCurrentView(View.Dashboard)}
            onNavigateGSAT={() => setCurrentView(View.GSATForm)}
            onNavigateMSF={handleNavigateToMSF}
            onUpsertEvidence={handleUpsertEvidence}
            onUpdateProfile={(updatedProfile) => handleUpdateProfile({ ...updatedProfile, lastArcpDate: updatedProfile.lastArcpDate, lastArcpType: updatedProfile.lastArcpType })}
            onUpdateARCPPrep={handleUpsertARCPPrepSafe}
            onEditEvidence={handleEditEvidence}
            onLinkRequested={(reqKey, existingIds) => {
              // Store current linked IDs
              setLinkedEvidence({ [reqKey]: existingIds || [] });
              setLinkingReqIdx(reqKey);
              setIsSelectionMode(true);
              setReturnTarget({ originView: View.ARCPPrep, section: 0 });

              // Mark existing items as selected
              if (existingIds && existingIds.length > 0) {
                setAllEvidence(prev => prev.map(e => ({
                  ...e,
                  // @ts-ignore
                  isSelectedForLink: existingIds.includes(e.id)
                })));
              }

              setCurrentView(View.Evidence);
            }}
            onNavigateEyeLogbook={() => setCurrentView(View.EyeLogbook)}
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
        return (
          <EyeLogbook
            userId={viewingTraineeId || session?.user?.id}
            deanery={profile.deanery}
            onBack={viewingTraineeId ? () => {
              setViewingTraineeId(null);
              setCurrentView(View.ARCPPanelDashboard);
            } : undefined}
          />
        );
      case View.RefractiveAudit:
        return (
          <RefractiveAudit
            onBack={() => setCurrentView(View.Dashboard)}
            onNavigateToMyAudit={() => setCurrentView(View.MyRefractiveAudit)}
            userId={session?.user?.id}
          />
        );
      case View.MyRefractiveAudit:
        return (
          <MyRefractiveAudit
            onBack={() => setCurrentView(View.RefractiveAudit)}
            userId={session?.user?.id}
          />
        );
      case View.ARCPForm:
        const arcpEvidence = selectedFormParams?.id
          ? (viewingTraineeId
            ? viewingTraineeEvidence
            : allEvidence
          ).find(e => e.id === selectedFormParams.id)
          : null;

        return (
          <ARCPForm
            initialData={arcpEvidence ? { ...arcpEvidence.data, id: arcpEvidence.id } : null}
            onBack={handleBackToOrigin}
            traineeName={viewingTraineeId ? getTraineeSummary(viewingTraineeId)?.profile.name : profile.name}
            canEdit={profile.roles?.some(r => ['Admin', 'EducationalSupervisor', 'ARCPPanelMember', 'ARCPSuperuser'].includes(r))}
            initialEditMode={selectedFormParams?.editMode}
          />
        );
      case View.ARCPPanelDashboard:
        return (
          <ARCPPanelDashboard
            currentUser={profile}
            onBack={() => setCurrentView(View.Dashboard)}
            onViewTraineeGSAT={(traineeId) => {
              setViewingTraineeId(traineeId);
              // Navigate to GSAT form for level 1 by default
              const existing = findExistingEvidence(EvidenceType.GSAT, 1);
              setSelectedFormParams({
                sia: '',
                level: 1,
                id: existing?.id,
                originView: View.ARCPPanelDashboard
              });
              setCurrentView(View.GSATForm);
            }}
            onViewActiveEPAs={(traineeId) => {
              setViewingTraineeId(traineeId);
              setInitialEyeLogbookTab('logbook');
              setCurrentView(View.EyeLogbook);
            }}
            onViewComplications={(traineeId) => {
              setViewingTraineeId(traineeId);
              setInitialEyeLogbookTab('complications');
              setCurrentView(View.EyeLogbook);
            }}
            onViewTraineeEvidence={(traineeId) => {
              setViewingTraineeId(traineeId);
              setCurrentView(View.Evidence);
            }}
            onViewESR={(traineeId) => {
              setViewingTraineeId(traineeId);
              // For now, navigate to supervisor dashboard showing this trainee's supervisor
              // TODO: Create dedicated ESR view
              alert(`ESR view for trainee ${traineeId} - Feature coming soon`);
            }}
            onUpdateARCPOutcome={(traineeId, outcome) => {
              const summary = getTraineeSummary(traineeId);
              if (summary) {
                summary.profile.arcpOutcome = outcome;
              }
            }}
            onViewEvidenceItem={(item) => {
              // Navigate to the appropriate view based on evidence type
              // Force status to Submitted to ensure read-only mode by default for viewing
              // But handleEditEvidence uses editMode: true
              const readOnlyStatus = EvidenceStatus.Submitted;

              setSelectedFormParams({
                sia: item.sia || '',
                level: item.level || 1,
                id: item.id,
                status: readOnlyStatus,
                originView: View.ARCPPanelDashboard
              });

              switch (item.type) {
                case EvidenceType.ARCPFullReview:
                case EvidenceType.ARCPInterimReview:
                  setCurrentView(View.ARCPForm);
                  break;
                case EvidenceType.EPA:
                  setCurrentView(View.EPAForm);
                  break;
                case EvidenceType.GSAT:
                  setCurrentView(View.GSATForm);
                  break;
                case EvidenceType.DOPs:
                  setCurrentView(View.DOPsForm);
                  break;
                case EvidenceType.OSATs:
                  setCurrentView(View.OSATSForm);
                  break;
                case EvidenceType.CbD:
                  setCurrentView(View.CBDForm);
                  break;
                case EvidenceType.CRS:
                  setCurrentView(View.CRSForm);
                  break;
                default:
                  // For other types (MSF, Curriculum Catch Up, Reflection, etc.), view in AddEvidence form
                  // Here we use setEditingEvidence to load data, but status Submitted makes it read-only mostly?
                  setEditingEvidence(item);
                  setCurrentView(View.AddEvidence);
                  break;
              }
            }}
            onEditEvidenceItem={handleEditEvidence}
          />
        );
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

  // Check for public optician form access via ?ra= query parameter
  // This must be checked BEFORE auth gating to allow unauthenticated access
  const urlParams = new URLSearchParams(window.location.search);
  const refractiveAuditResidentId = urlParams.get('ra');

  if (refractiveAuditResidentId) {
    // Render the public optician form without requiring authentication
    return <RefractiveAuditOpticianForm residentUserId={refractiveAuditResidentId} />;
  }

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
          onLogout={async () => {
            await supabase?.auth.signOut();
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
                  <NavTab
                    active={currentView === View.RefractiveAudit || currentView === View.MyRefractiveAudit}
                    onClick={() => {
                      setViewingTraineeId(null);
                      setCurrentView(View.RefractiveAudit);
                    }}
                    icon={<ClipboardCheck size={16} />}
                    label="REFRACTIVE AUDIT"
                  />
                </>
              ) : (
                <>
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

            <div className="flex items-center gap-3 relative">
              <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>

              {/* Settings Button */}
              <button
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/20 shadow-md flex items-center justify-center hover:from-indigo-400 hover:to-purple-400 transition-all"
                title="Settings"
              >
                <Settings size={18} className="text-white" />
              </button>

              {/* Settings Dropdown Menu */}
              {isSettingsMenuOpen && (
                <>
                  {/* Backdrop to close menu when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsMenuOpen(false)}
                  />

                  <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Switch Role</p>
                    </div>

                    {/* Role Options */}
                    <div className="p-2">
                      {/* Resident Role */}
                      <RoleMenuItem
                        label="RESIDENT DASHBOARD"
                        icon={<LayoutDashboard size={18} />}
                        isAvailable={profile.roles?.includes(UserRole.Trainee) || !profile.roles?.length}
                        isActive={currentRole === UserRole.Trainee}
                        onClick={() => {
                          setCurrentRole(UserRole.Trainee);
                          setViewingTraineeId(null);
                          setCurrentView(View.Dashboard);
                          setIsSettingsMenuOpen(false);
                        }}
                      />

                      {/* Supervisor Role */}
                      <RoleMenuItem
                        label="Supervisor Dashboard"
                        icon={<Users size={18} />}
                        isAvailable={profile.roles?.includes(UserRole.Supervisor) || profile.roles?.includes(UserRole.EducationalSupervisor)}
                        isActive={currentRole === UserRole.Supervisor || currentRole === UserRole.EducationalSupervisor}
                        onClick={() => {
                          if (profile.roles?.includes(UserRole.Supervisor) || profile.roles?.includes(UserRole.EducationalSupervisor)) {
                            setCurrentRole(UserRole.Supervisor);
                            setViewingTraineeId(null);
                            setCurrentView(View.SupervisorDashboard);
                            setIsSettingsMenuOpen(false);
                          }
                        }}
                      />

                      {/* ARCP Panel Role */}
                      <RoleMenuItem
                        label="ARCP Panel Dashboard"
                        icon={<ClipboardCheck size={18} />}
                        isAvailable={profile.roles?.includes(UserRole.ARCPPanelMember)}
                        isActive={currentView === View.ARCPPanelDashboard && currentRole !== UserRole.ARCPSuperuser}
                        onClick={() => {
                          if (profile.roles?.includes(UserRole.ARCPPanelMember)) {
                            setCurrentRole(UserRole.ARCPPanelMember);
                            setViewingTraineeId(null);
                            setCurrentView(View.ARCPPanelDashboard);
                            setIsSettingsMenuOpen(false);
                          }
                        }}
                      />

                      {/* ARCP Superuser Role */}
                      <RoleMenuItem
                        label="ARCP Superuser Dashboard"
                        icon={<Activity size={18} />}
                        isAvailable={profile.roles?.includes(UserRole.ARCPSuperuser)}
                        isActive={currentRole === UserRole.ARCPSuperuser}
                        onClick={() => {
                          if (profile.roles?.includes(UserRole.ARCPSuperuser)) {
                            setCurrentRole(UserRole.ARCPSuperuser);
                            setViewingTraineeId(null);
                            setCurrentView(View.ARCPPanelDashboard); // Same dashboard but with more permissions
                            setIsSettingsMenuOpen(false);
                          }
                        }}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200"></div>

                    {/* Logout Button */}
                    <div className="p-2">
                      <button
                        onClick={async () => {
                          setIsSettingsMenuOpen(false);
                          await supabase?.auth.signOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-medium text-sm">Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
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

      <Footer
        onNavigateToSupervisorDashboard={handleNavigateToSupervisorDashboard}
        onNavigateToARCPPanel={handleNavigateToARCPPanel}
        currentUserRoles={profile.roles || [UserRole.Admin]} // Default to Admin for demo
      />
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

const RoleMenuItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isAvailable: boolean;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isAvailable, isActive, onClick }) => (
  <button
    onClick={isAvailable ? onClick : undefined}
    disabled={!isAvailable}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
      ${isActive
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        : isAvailable
          ? 'text-slate-700 hover:bg-slate-50'
          : 'text-slate-400 cursor-not-allowed opacity-60'
      }
    `}
  >
    <span className={isActive ? 'text-indigo-600' : isAvailable ? 'text-slate-500' : 'text-slate-300'}>
      {icon}
    </span>
    <span className="flex-1 font-medium text-sm">{label}</span>
    {!isAvailable && (
      <Lock size={14} className="text-slate-400" />
    )}
    {isActive && (
      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
    )}
  </button>
);

export default App;
