
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronRight, CheckCircle2,
  Clock, FileText, BookOpen, Users, User,
  ClipboardCheck, Activity, X,
  UploadCloud, Calendar, Save, Edit2, Trash2, Link as LinkIcon, Search, AlertTriangle
} from '../components/Icons';
import { uuidv4 } from '../utils/uuid';
import { EvidenceItem, EvidenceType, EvidenceStatus, SIA, UserProfile, ARCPPrepData, ARCPReviewType, PDPGoal } from '../types';
import { supabase } from '../utils/supabaseClient';

interface ARCPPrepProps {
  sias: SIA[];
  allEvidence: EvidenceItem[];
  profile: UserProfile;
  arcpPrepData?: ARCPPrepData;
  onBack: () => void;
  onNavigateGSAT: () => void;
  onNavigateMSF: () => void;
  onUpsertEvidence: (item: Partial<EvidenceItem>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateARCPPrep: (data: Partial<ARCPPrepData>) => void;
  onNavigateEyeLogbook: () => void;
  onEditEvidence?: (item: EvidenceItem) => void;
  onLinkRequested?: (reqKey: string, existingIds: string[]) => void;
}

const ARCPPrep: React.FC<ARCPPrepProps> = ({
  sias,
  allEvidence,
  profile,
  arcpPrepData,
  onBack,
  onNavigateGSAT,
  onNavigateMSF,
  onUpsertEvidence,
  onUpdateProfile,
  onUpdateARCPPrep,
  onNavigateEyeLogbook,
  onEditEvidence,
  onLinkRequested
}) => {
  // Local state for editing
  const [localTootDays, setLocalTootDays] = useState(arcpPrepData?.toot_days || 0);
  const [localLastArcpDate, setLocalLastArcpDate] = useState(arcpPrepData?.last_arcp_date || '');
  const [localLastArcpType, setLocalLastArcpType] = useState(arcpPrepData?.last_arcp_type || ARCPReviewType.FullARCP);
  const [localNoMsfPlanned, setLocalNoMsfPlanned] = useState(arcpPrepData?.no_msf_planned || false);

  // Current ARCP state (will update profile)
  const [localCurrentArcpDate, setLocalCurrentArcpDate] = useState(profile.arcpDate || '');
  const [localCurrentArcpType, setLocalCurrentArcpType] = useState(profile.arcpInterimFull || 'Full ARCP');

  // Educational Supervisor State
  const [localLastESName, setLocalLastESName] = useState(arcpPrepData?.last_es?.name || '');
  const [localLastESEmail, setLocalLastESEmail] = useState(arcpPrepData?.last_es?.email || '');
  const [localLastESGmc, setLocalLastESGmc] = useState(arcpPrepData?.last_es?.gmc || '');
  const [isEditingLastES, setIsEditingLastES] = useState(!arcpPrepData?.last_es?.name);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced Search for Supervisor
  useEffect(() => {
    const searchUsers = async () => {
      if (!isEditingLastES || !searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Search user_profile for supervisors
        const { data, error } = await supabase
          .from('user_profile')
          .select('name, email, gmc_number, deanery')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .neq('user_id', profile.id) // Exclude self
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isEditingLastES, profile.id]);

  const selectSupervisor = (user: any) => {
    setLocalLastESName(user.name);
    setLocalLastESEmail(user.email);
    setLocalLastESGmc(user.gmc_number || '');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Save timestamps
  const [lastManualSave, setLastManualSave] = useState<Date | null>(null);
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);

  // PDP Modal State
  const [isPDPModalOpen, setIsPDPModalOpen] = useState(false);
  const [tempPDPGoals, setTempPDPGoals] = useState<PDPGoal[]>([]);

  // Update local state when props change
  useEffect(() => {
    setLocalTootDays(arcpPrepData?.toot_days || 0);
    setLocalLastArcpDate(arcpPrepData?.last_arcp_date || '');
    setLocalLastArcpType(arcpPrepData?.last_arcp_type || ARCPReviewType.FullARCP);
    setLocalNoMsfPlanned(arcpPrepData?.no_msf_planned || false);
    setLocalLastESName(arcpPrepData?.last_es?.name || '');
    setLocalLastESEmail(arcpPrepData?.last_es?.email || '');
    setLocalLastESGmc(arcpPrepData?.last_es?.gmc || '');
    setLocalCurrentArcpDate(profile.arcpDate || '');
    setLocalCurrentArcpType(profile.arcpInterimFull || 'Full ARCP');
  }, [arcpPrepData, profile.arcpDate, profile.arcpInterimFull]);

  // Autosave every 15 seconds
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      // Build payload with current values
      const autosavePayload: Partial<ARCPPrepData> = {
        toot_days: localTootDays,
        last_arcp_date: localLastArcpDate,
        last_arcp_type: localLastArcpType,
        no_msf_planned: localNoMsfPlanned,
        current_es: profile.supervisorName ? {
          name: profile.supervisorName,
          email: profile.supervisorEmail,
          gmc: profile.supervisorGmc
        } : undefined,
        last_es: (localLastESName || localLastESEmail || localLastESGmc) ? {
          name: localLastESName,
          email: localLastESEmail,
          gmc: localLastESGmc
        } : undefined,
        status: 'SAVED'
      };

      onUpdateARCPPrep(autosavePayload);

      // Also autosave current ARCP changes to profile
      onUpdateProfile({
        ...profile,
        arcpDate: localCurrentArcpDate,
        arcpInterimFull: localCurrentArcpType
      });

      setLastAutosave(new Date());
    }, 15000); // 15 seconds

    return () => clearInterval(autosaveInterval);
  }, [localTootDays, localLastArcpDate, localLastArcpType, localNoMsfPlanned, localLastESName, localLastESEmail, localLastESGmc, localCurrentArcpDate, localCurrentArcpType, profile, onUpdateARCPPrep, onUpdateProfile]);

  // Form R State
  const [isFormRDialogOpen, setIsFormRDialogOpen] = useState(false);
  const [formRDate, setFormRDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRFileName, setFormRFileName] = useState('');
  const [formRFileUrl, setFormRFileUrl] = useState('');
  const [formRFile, setFormRFile] = useState<File | null>(null);
  const formRFileInputRef = useRef<HTMLInputElement>(null);

  // Computed defaults for Current ARCP
  const defaultCurrentEPAs = useMemo(() =>
    allEvidence.filter(e => e.type === EvidenceType.EPA && e.status === EvidenceStatus.SignedOff).map(e => e.id),
    [allEvidence]
  );

  const defaultCurrentGSAT = useMemo(() => {
    const gsats = allEvidence.filter(e => e.type === EvidenceType.GSAT && e.status === EvidenceStatus.SignedOff);
    const sorted = gsats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.length > 0 ? [sorted[0].id] : [];
  }, [allEvidence]);

  const defaultCurrentMSF = useMemo(() => {
    const msfs = allEvidence.filter(e => e.type === EvidenceType.MSF && e.status === EvidenceStatus.SignedOff);
    const sorted = msfs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.length > 0 ? [sorted[0].id] : [];
  }, [allEvidence]);

  const defaultCurrentESR = useMemo(() => {
    // ESR not implemented yet, return empty
    return [];
  }, [allEvidence]);

  // Get Form R evidence from linked_form_r array
  const formRItems = useMemo(() => {
    const linkedIds = arcpPrepData?.linked_form_r || [];
    if (linkedIds.length > 0) {
      return allEvidence.filter(e => linkedIds.includes(e.id));
    }
    return [];
  }, [allEvidence, arcpPrepData]);

  const existingFormR = formRItems[0] || null;

  // Get Last ARCP evidence from last_arcp_evidence array
  const lastArcpEvidence = useMemo(() => {
    const linkedIds = arcpPrepData?.last_arcp_evidence || [];
    if (linkedIds.length > 0) {
      return allEvidence.filter(e => linkedIds.includes(e.id));
    }
    return [];
  }, [allEvidence, arcpPrepData]);

  const eyeLogbookLastUpdated = useMemo(() => {
    const log = allEvidence.find(e => e.type === EvidenceType.Logbook);
    return log?.date;
  }, [allEvidence]);

  const pdpStatus = profile.pdpGoals?.length > 0
    ? (profile.pdpGoals.every(g => g.status === 'COMPLETE') ? 'Completed' : 'Active')
    : 'Not Started';

  // Get items for a section (Last or Current)
  const getItems = (section: 'last' | 'current', target: 'epas' | 'gsat' | 'msf' | 'esr'): EvidenceItem[] => {
    if (section === 'last') {
      const fieldMap = {
        'epas': 'last_evidence_epas',
        'gsat': 'last_evidence_gsat',
        'msf': 'last_evidence_msf',
        'esr': 'last_evidence_esr'
      } as const;
      const ids = arcpPrepData?.[fieldMap[target]] || [];
      return allEvidence.filter(e => ids.includes(e.id));
    } else {
      // Current: use customized if set, otherwise defaults
      const fieldMap = {
        'epas': 'current_evidence_epas',
        'gsat': 'current_evidence_gsat',
        'msf': 'current_evidence_msf',
        'esr': 'current_evidence_esr'
      } as const;
      const customIds = arcpPrepData?.[fieldMap[target]];

      let ids: string[];
      if (customIds === null || customIds === undefined) {
        // Use defaults
        ids = target === 'epas' ? defaultCurrentEPAs :
          target === 'gsat' ? defaultCurrentGSAT :
            target === 'msf' ? defaultCurrentMSF : defaultCurrentESR;
      } else {
        ids = customIds;
      }
      return allEvidence.filter(e => ids.includes(e.id));
    }
  };

  // Check if current section is using defaults
  const isUsingDefaults = (target: 'epas' | 'gsat' | 'msf' | 'esr'): boolean => {
    const fieldMap = {
      'epas': 'current_evidence_epas',
      'gsat': 'current_evidence_gsat',
      'msf': 'current_evidence_msf',
      'esr': 'current_evidence_esr'
    } as const;
    const customIds = arcpPrepData?.[fieldMap[target]];
    return customIds === null || customIds === undefined;
  };

  // Handlers
  const handleSaveAll = () => {
    const updates: Partial<ARCPPrepData> = {
      toot_days: localTootDays,
      last_arcp_date: localLastArcpDate,
      last_arcp_type: localLastArcpType,
      no_msf_planned: localNoMsfPlanned,
      current_es: profile.supervisorName ? {
        name: profile.supervisorName,
        email: profile.supervisorEmail,
        gmc: profile.supervisorGmc
      } : undefined,
      last_es: (localLastESName || localLastESEmail || localLastESGmc) ? {
        name: localLastESName,
        email: localLastESEmail,
        gmc: localLastESGmc
      } : undefined,
      status: 'SAVED'
    };

    onUpdateARCPPrep(updates);

    // Update profile with current ARCP changes
    onUpdateProfile({
      ...profile,
      arcpDate: localCurrentArcpDate,
      arcpInterimFull: localCurrentArcpType
    });

    setLastManualSave(new Date());
    setIsEditingLastES(false);
  };

  const handleTOOTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setLocalTootDays(val);
  };

  const handleLastARCPDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLastArcpDate(e.target.value);
  };

  const handleLastARCPTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalLastArcpType(e.target.value);
  };

  const handleCurrentARCPDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalCurrentArcpDate(e.target.value);
  };

  const handleCurrentARCPTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalCurrentArcpType(e.target.value);
  };

  // Link Evidence
  const handleLinkEvidence = (section: 'last' | 'current', target: 'epas' | 'gsat' | 'msf' | 'esr') => {
    if (!onLinkRequested) return;

    const items = getItems(section, target);
    const existingIds = items.map(e => e.id);
    const reqKey = `ARCP_PREP_${section.toUpperCase()}_${target.toUpperCase()}`;

    onLinkRequested(reqKey, existingIds);
  };

  // Remove Evidence
  const handleRemoveEvidence = (section: 'last' | 'current', target: 'epas' | 'gsat' | 'msf' | 'esr', idToRemove: string) => {
    const fieldPrefix = section === 'last' ? 'last_evidence' : 'current_evidence';
    const fieldMap = {
      'epas': `${fieldPrefix}_epas`,
      'gsat': `${fieldPrefix}_gsat`,
      'msf': `${fieldPrefix}_msf`,
      'esr': `${fieldPrefix}_esr`
    } as const;

    const currentItems = getItems(section, target);
    const newIds = currentItems.filter(e => e.id !== idToRemove).map(e => e.id);

    onUpdateARCPPrep({ [fieldMap[target]]: newIds });
  };

  // Reset Current to defaults
  const handleResetToDefaults = (target: 'epas' | 'gsat' | 'msf' | 'esr') => {
    const fieldMap = {
      'epas': 'current_evidence_epas',
      'gsat': 'current_evidence_gsat',
      'msf': 'current_evidence_msf',
      'esr': 'current_evidence_esr'
    } as const;

    // Setting to null means use defaults
    onUpdateARCPPrep({ [fieldMap[target]]: null });
  };

  // Remove Last ARCP Evidence link
  const handleRemoveLastArcpEvidence = (idToRemove: string) => {
    const currentLinks = arcpPrepData?.last_arcp_evidence || [];
    onUpdateARCPPrep({ last_arcp_evidence: currentLinks.filter(id => id !== idToRemove) });
  };

  // Form R Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      setFormRFileName(file.name);
      setFormRFileUrl(URL.createObjectURL(file));
      setFormRFile(file);
    }
  };

  const handleFormRSubmit = () => {
    if (!formRDate || (!formRFileName && !existingFormR)) {
      alert("Please select a date and upload a PDF.");
      return;
    }

    const evidenceId = uuidv4();

    onUpsertEvidence({
      id: evidenceId,
      title: "Form R (Part B)",
      type: EvidenceType.FormR,
      date: formRDate,
      fileName: formRFileName,
      fileUrl: formRFileUrl,
      // @ts-ignore
      file: formRFile,
      status: EvidenceStatus.SignedOff
    });

    // Link Form R to ARCP Prep (add to array)
    const currentLinks = arcpPrepData?.linked_form_r || [];
    onUpdateARCPPrep({ linked_form_r: [...currentLinks, evidenceId] });

    // Clear form state
    setFormRFileName('');
    setFormRFileUrl('');
    setFormRFile(null);

    setIsFormRDialogOpen(false);
  };

  // PDP Handlers
  const handleOpenPDPModal = () => {
    setTempPDPGoals(profile.pdpGoals || []);
    setIsPDPModalOpen(true);
  };

  const handleSavePDP = () => {
    onUpdateProfile({ ...profile, pdpGoals: tempPDPGoals });
    setIsPDPModalOpen(false);
  };

  const handleAddPDPGoal = () => {
    setTempPDPGoals([...tempPDPGoals, {
      id: uuidv4(),
      title: '',
      actions: '',
      targetDate: '',
      successCriteria: '',
      status: 'IN PROGRESS'
    }]);
  };

  const handleDeletePDPGoal = (id: string) => {
    setTempPDPGoals(tempPDPGoals.filter(g => g.id !== id));
  };

  const handleUpdatePDPGoal = (id: string, field: keyof PDPGoal, value: any) => {
    setTempPDPGoals(tempPDPGoals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 animate-in fade-in duration-500">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">ARCP Preparation</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Portfolio & Evidence Review</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
          >
            <Save size={16} />
            Save
          </button>
          <div className="text-[9px] text-slate-400 text-right">
            {lastManualSave && (
              <span>Saved: {lastManualSave.toLocaleTimeString()}</span>
            )}
            {lastAutosave && (
              <span className="ml-2">Auto: {lastAutosave.toLocaleTimeString()}</span>
            )}
            {!lastManualSave && !lastAutosave && (
              <span>Autosave every 15s</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Column: Mandatory Artifacts & Review Details */}
        <div className="lg:col-span-5 space-y-4">

          {/* Mandatory Artifacts */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck size={16} className="text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Mandatory Artifacts</h2>
            </div>

            <GlassCard className={`p-0 overflow-hidden transition-all duration-300 ${pdpStatus === 'Completed' && eyeLogbookLastUpdated && formRItems.length > 0
                ? 'border-2 border-green-500/30 bg-green-50/10 shadow-lg shadow-green-500/10'
                : 'border-2 border-amber-400/40 bg-amber-50/10'
              }`}>
              <div className="divide-y divide-slate-100">

                {/* PDP */}
                <div className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors" onClick={handleOpenPDPModal}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${pdpStatus === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Activity size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">PDP Status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${pdpStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {pdpStatus}
                    </span>
                    <Edit2 size={12} className="text-slate-400" />
                  </div>
                </div>

                {/* EyeLogbook */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                        <BookOpen size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">EyeLogbook & Complications</p>
                        {eyeLogbookLastUpdated && <p className="text-[9px] text-slate-400">Last Updated: {eyeLogbookLastUpdated}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={onNavigateEyeLogbook}
                      className="flex-1 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[9px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Eyelogbook
                    </button>
                    <button
                      onClick={onNavigateEyeLogbook}
                      className="flex-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Complications
                    </button>
                  </div>
                </div>

                {/* Form R */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${formRItems.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <FileText size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Form R</p>
                        {formRItems.length > 0 ? (
                          <p className="text-[9px] text-slate-400">Updated: {formRItems[0].date}</p>
                        ) : (
                          <p className="text-[9px] text-amber-500 font-bold">Required</p>
                        )}
                      </div>
                    </div>
                    {formRItems.length === 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!onLinkRequested) return;
                            const existingIds = formRItems.map(e => e.id);
                            onLinkRequested('ARCP_PREP_FORMR', existingIds);
                          }}
                          className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                        >
                          <LinkIcon size={10} /> Link
                        </button>
                        <button
                          onClick={() => setIsFormRDialogOpen(true)}
                          className="text-[9px] font-bold text-green-600 flex items-center gap-1 hover:underline"
                        >
                          <UploadCloud size={10} /> Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Linked Form R items */}
                  {formRItems.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {formRItems.map(item => (
                        <div key={item.id} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center group">
                          <div className="cursor-pointer flex-1" onClick={() => onEditEvidence?.(item)}>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] font-bold text-slate-700 truncate">{item.title}</p>
                              <CheckCircle2 size={10} className="text-green-500" />
                            </div>
                            <p className="text-[9px] text-slate-400">{item.date}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentLinks = arcpPrepData?.linked_form_r || [];
                              onUpdateARCPPrep({ linked_form_r: currentLinks.filter(id => id !== item.id) });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-opacity"
                            title="Remove link"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TOOT */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Clock size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Time Out of Training</p>
                      <p className="text-[9px] text-slate-400">Days (TOOT)</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={localTootDays}
                    onChange={handleTOOTChange}
                    className="w-16 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none"
                  />
                </div>

              </div>
            </GlassCard>
          </section>

          {/* ARCP Details */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">ARCP Details</h2>
            </div>

            <GlassCard className={`p-3 space-y-3 transition-all duration-300 ${localCurrentArcpDate && localLastArcpDate
                ? 'border-2 border-green-500/30 bg-green-50/10 shadow-lg shadow-green-500/10'
                : 'border-2 border-amber-400/40 bg-amber-50/10'
              }`}>
              {/* Current ARCP - Editable */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Current ARCP Date</label>
                  <input
                    type="date"
                    value={localCurrentArcpDate}
                    onChange={handleCurrentARCPDateChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">ARCP Type</label>
                  <select
                    value={localCurrentArcpType}
                    onChange={handleCurrentARCPTypeChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-purple-500"
                  >
                    <option value="Full ARCP">Full ARCP</option>
                    <option value="Interim Review">Interim</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Last ARCP - Editable, stored in arcp_prep */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Date of Last ARCP Review</label>
                  <input
                    type="date"
                    value={localLastArcpDate}
                    onChange={handleLastARCPDateChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Interim Review or Full ARCP?</label>
                  <select
                    value={localLastArcpType}
                    onChange={handleLastARCPTypeChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-purple-500"
                  >
                    <option value={ARCPReviewType.FullARCP}>Full ARCP</option>
                    <option value={ARCPReviewType.InterimReview}>Interim</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Last ARCP Evidence Linking */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Last ARCP</label>
                  <button
                    onClick={() => {
                      if (!onLinkRequested) return;
                      const existingIds = lastArcpEvidence.map(e => e.id);
                      onLinkRequested('ARCP_PREP_LAST_ARCP', existingIds);
                    }}
                    className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                  >
                    <LinkIcon size={10} /> Link
                  </button>
                </div>

                {/* Linked Last ARCP Evidence Items */}
                {lastArcpEvidence.length > 0 ? (
                  <div className="space-y-1.5">
                    {lastArcpEvidence.map(item => (
                      <div key={item.id} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center group">
                        <div className="cursor-pointer flex-1" onClick={() => onEditEvidence?.(item)}>
                          <p className="text-[10px] font-bold text-slate-700 truncate">{item.title}</p>
                          <p className="text-[9px] text-slate-400">{item.date}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLastArcpEvidence(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-opacity"
                          title="Remove link"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-slate-400 text-[10px]">
                    No items
                  </div>
                )}
              </div>
            </GlassCard>
          </section>

          {/* Educational Supervisors */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">Educational Supervisors</h2>
            </div>

            <GlassCard className="p-3 space-y-3">
              {/* Current Educational Supervisor - Read from profile */}
              <div>
                <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Current Educational Supervisor</label>
                <div className="p-2 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg border border-teal-200">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">{profile.supervisorName || 'Not Set'}</span>
                  </div>
                  {profile.supervisorEmail && (
                    <p className="text-[10px] text-slate-600 ml-5">Email: {profile.supervisorEmail}</p>
                  )}
                  {profile.supervisorGmc && (
                    <p className="text-[10px] text-slate-600 ml-5">GMC: {profile.supervisorGmc}</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Last Educational Supervisor - Editable, stored in arcp_prep */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block">Last Educational Supervisor</label>
                  {!isEditingLastES && (
                    <button
                      onClick={() => setIsEditingLastES(true)}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Edit2 size={10} /> Edit
                    </button>
                  )}
                </div>

                {isEditingLastES ? (
                  <div className="space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Search size={12} className="text-slate-400" />
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Search Supervisor</label>
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 shadow-sm transition-all placeholder:font-normal"
                      />

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                          <div className="max-h-48 overflow-y-auto">
                            {searchResults.map((user, idx) => (
                              <button
                                key={idx}
                                onClick={() => selectSupervisor(user)}
                                className="w-full p-2.5 text-left hover:bg-teal-50 transition-colors flex items-center justify-between group border-b border-slate-50 last:border-none"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{user.name}</p>
                                  <p className="text-[10px] text-slate-500">{user.email}</p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight size={14} className="text-teal-500" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isSearching && (
                        <div className="absolute right-3 top-[34px] animate-spin text-teal-500">
                          <Activity size={12} />
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Details</span>
                      </div>
                      <div>
                        <label className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Name</label>
                        <input
                          type="text"
                          value={localLastESName}
                          onChange={(e) => setLocalLastESName(e.target.value)}
                          placeholder="Name"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Email</label>
                        <input
                          type="email"
                          value={localLastESEmail}
                          onChange={(e) => setLocalLastESEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">GMC Number</label>
                        <input
                          type="text"
                          value={localLastESGmc}
                          onChange={(e) => setLocalLastESGmc(e.target.value)}
                          placeholder="GMC"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveAll}
                      className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-teal-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
                    >
                      <Save size={14} />
                      Save Supervisor
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-900">{localLastESName || 'Not Set'}</span>
                    </div>
                    {localLastESEmail && (
                      <p className="text-[10px] text-slate-600 ml-5">Email: {localLastESEmail}</p>
                    )}
                    {localLastESGmc && (
                      <p className="text-[10px] text-slate-600 ml-5">GMC: {localLastESGmc}</p>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </section>

        </div>

        {/* Right Column: Evidence Sections */}
        <div className="lg:col-span-7 space-y-4">

          <EvidenceSection
            title="EPAs"
            lastItems={getItems('last', 'epas')}
            currentItems={getItems('current', 'epas')}
            isCurrentDefault={isUsingDefaults('epas')}
            onLinkLast={() => handleLinkEvidence('last', 'epas')}
            onLinkCurrent={() => handleLinkEvidence('current', 'epas')}
            onRemoveLast={(id) => handleRemoveEvidence('last', 'epas', id)}
            onRemoveCurrent={(id) => handleRemoveEvidence('current', 'epas', id)}
            onResetCurrent={() => handleResetToDefaults('epas')}
            onViewItem={onEditEvidence}
          />

          <EvidenceSection
            title="GSAT"
            lastItems={getItems('last', 'gsat')}
            currentItems={getItems('current', 'gsat')}
            isCurrentDefault={isUsingDefaults('gsat')}
            onLinkLast={() => handleLinkEvidence('last', 'gsat')}
            onLinkCurrent={() => handleLinkEvidence('current', 'gsat')}
            onRemoveLast={(id) => handleRemoveEvidence('last', 'gsat', id)}
            onRemoveCurrent={(id) => handleRemoveEvidence('current', 'gsat', id)}
            onResetCurrent={() => handleResetToDefaults('gsat')}
            onViewItem={onEditEvidence}
          />

          <EvidenceSection
            title="MSF"
            lastItems={getItems('last', 'msf')}
            currentItems={getItems('current', 'msf')}
            isCurrentDefault={isUsingDefaults('msf')}
            onLinkLast={() => handleLinkEvidence('last', 'msf')}
            onLinkCurrent={() => handleLinkEvidence('current', 'msf')}
            onRemoveLast={(id) => handleRemoveEvidence('last', 'msf', id)}
            onRemoveCurrent={(id) => handleRemoveEvidence('current', 'msf', id)}
            onResetCurrent={() => handleResetToDefaults('msf')}
            onViewItem={onEditEvidence}
            currentCheckboxLabel="No MSF planned for this review"
            currentCheckboxChecked={localNoMsfPlanned}
            onCurrentCheckboxChange={setLocalNoMsfPlanned}
          />

          <EvidenceSection
            title="ESR"
            lastItems={getItems('last', 'esr')}
            currentItems={getItems('current', 'esr')}
            isCurrentDefault={isUsingDefaults('esr')}
            onLinkLast={() => handleLinkEvidence('last', 'esr')}
            onLinkCurrent={() => handleLinkEvidence('current', 'esr')}
            onRemoveLast={(id) => handleRemoveEvidence('last', 'esr', id)}
            onRemoveCurrent={(id) => handleRemoveEvidence('current', 'esr', id)}
            onResetCurrent={() => handleResetToDefaults('esr')}
            onViewItem={onEditEvidence}
          />

        </div>

      </div>

      {/* Form R Dialog */}
      {isFormRDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-white shadow-2xl rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Form R</h2>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Part B - Professional Declaration</p>
                </div>
                <button onClick={() => setIsFormRDialogOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Date</label>
                  <input
                    type="date"
                    value={formRDate}
                    onChange={(e) => setFormRDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Upload PDF</label>
                  <div
                    onClick={() => formRFileInputRef.current?.click()}
                    className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ${formRFileName ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300'}`}
                  >
                    <input type="file" ref={formRFileInputRef} accept=".pdf" onChange={handleFileChange} className="hidden" />
                    {formRFileName ? (
                      <div className="text-center">
                        <CheckCircle2 className="mx-auto text-indigo-500 mb-1" size={20} />
                        <p className="text-xs font-bold text-slate-900">{formRFileName}</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">Click to replace</p>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400">
                        <UploadCloud className="mx-auto mb-1" size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Click to upload</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleFormRSubmit}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Save Form R
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDP Modal */}
      {isPDPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Personal Development Plan</h2>
              <button onClick={() => setIsPDPModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {tempPDPGoals.map((goal, idx) => (
                <div key={goal.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500">Goal {idx + 1}</span>
                    <button onClick={() => handleDeletePDPGoal(goal.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <textarea
                    placeholder="Goal title..."
                    value={goal.title}
                    onChange={(e) => handleUpdatePDPGoal(goal.id, 'title', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-indigo-500"
                    rows={2}
                  />
                  <textarea
                    placeholder="Actions required..."
                    value={goal.actions}
                    onChange={(e) => handleUpdatePDPGoal(goal.id, 'actions', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-indigo-500"
                    rows={1}
                  />
                  <textarea
                    placeholder="Success criteria..."
                    value={goal.successCriteria}
                    onChange={(e) => handleUpdatePDPGoal(goal.id, 'successCriteria', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-indigo-500"
                    rows={1}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Target Date</label>
                      <input
                        type="date"
                        value={goal.targetDate || ''}
                        onChange={(e) => handleUpdatePDPGoal(goal.id, 'targetDate', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Status</label>
                      <select
                        value={goal.status || 'IN PROGRESS'}
                        onChange={(e) => handleUpdatePDPGoal(goal.id, 'status', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="COMPLETE">Complete</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddPDPGoal}
                className="flex-1 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
              >
                + Add Goal
              </button>
              <button
                onClick={handleSavePDP}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500"
              >
                Save PDP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Evidence Section Component with Link/Remove for both Last and Current
const EvidenceSection: React.FC<{
  title: string;
  lastItems: EvidenceItem[];
  currentItems: EvidenceItem[];
  isCurrentDefault: boolean;
  onLinkLast: () => void;
  onLinkCurrent: () => void;
  onRemoveLast: (id: string) => void;
  onRemoveCurrent: (id: string) => void;
  onResetCurrent: () => void;
  onViewItem?: (item: EvidenceItem) => void;
  // Optional checkbox for Current section
  currentCheckboxLabel?: string;
  currentCheckboxChecked?: boolean;
  onCurrentCheckboxChange?: (checked: boolean) => void;
}> = ({ title, lastItems, currentItems, isCurrentDefault, onLinkLast, onLinkCurrent, onRemoveLast, onRemoveCurrent, onResetCurrent, onViewItem, currentCheckboxLabel, currentCheckboxChecked, onCurrentCheckboxChange }) => {

  const getIcon = () => {
    switch (title) {
      case 'EPAs': return <ClipboardCheck size={16} className="text-indigo-600" />;
      case 'GSAT': return <ClipboardCheck size={16} className="text-teal-600" />;
      case 'MSF': return <Users size={16} className="text-amber-600" />;
      case 'ESR': return <FileText size={16} className="text-slate-600" />;
      default: return null;
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Last ARCP */}
        <GlassCard className={`p-3 transition-all duration-300 ${lastItems.length > 0
          ? 'border-2 border-green-500/30 bg-green-50/30 shadow-lg shadow-green-500/10'
          : 'border-2 border-amber-400/40 bg-amber-50/30'
          }`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last ARCP</h3>
              {lastItems.length > 0 ? (
                <CheckCircle2 size={12} className="text-green-600" />
              ) : (
                <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
              )}
            </div>
            <button onClick={onLinkLast} className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 hover:underline">
              <LinkIcon size={10} /> Link
            </button>
          </div>

          <div className="space-y-1.5 min-h-[60px]">
            {lastItems.length > 0 ? lastItems.map(item => (
              <div
                key={item.id}
                className="p-2 bg-slate-50 rounded-lg border border-slate-100 group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => onViewItem?.(item)}>
                    <p className="text-[10px] font-bold text-slate-700 truncate pr-4">{item.title}</p>
                    <p className="text-[9px] text-slate-400">{item.date}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveLast(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-opacity"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-slate-300 min-h-[60px]">
                <p className="text-[10px]">No links</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Current ARCP */}
        <GlassCard className={`p-3 bg-gradient-to-b from-white to-slate-50 transition-all duration-300 ${currentItems.length > 0
          ? 'border-2 border-green-500/30 bg-green-50/30 shadow-lg shadow-green-500/10'
          : 'border-2 border-amber-400/40 bg-amber-50/30'
          }`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-teal-600">
                Current ARCP {isCurrentDefault && <span className="text-slate-400">(Default)</span>}
              </h3>
              {currentItems.length > 0 ? (
                <CheckCircle2 size={12} className="text-green-600" />
              ) : (
                <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isCurrentDefault && (
                <button onClick={onResetCurrent} className="text-[9px] font-bold text-slate-400 hover:text-slate-600" title="Reset to defaults">
                  Reset
                </button>
              )}
              <button onClick={onLinkCurrent} className="text-[9px] font-bold text-teal-600 flex items-center gap-1 hover:underline">
                <LinkIcon size={10} /> Link
              </button>
            </div>
          </div>

          <div className="space-y-1.5 min-h-[60px]">
            {currentItems.length > 0 ? currentItems.map(item => (
              <div
                key={item.id}
                className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => onViewItem?.(item)}>
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] font-bold text-slate-900 truncate flex-1 pr-4">{item.title}</p>
                      {item.status === EvidenceStatus.SignedOff && <CheckCircle2 size={10} className="text-green-500" />}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">{item.date}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveCurrent(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-opacity"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-slate-300 min-h-[60px]">
                <p className="text-[10px]">No items</p>
              </div>
            )}
          </div>

          {/* Optional checkbox */}
          {currentCheckboxLabel && onCurrentCheckboxChange && (
            <label className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 cursor-pointer group">
              <input
                type="checkbox"
                checked={currentCheckboxChecked || false}
                onChange={(e) => onCurrentCheckboxChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-600 group-hover:text-slate-900">
                {currentCheckboxLabel}
              </span>
            </label>
          )}
        </GlassCard>
      </div>
    </section>
  );
};

export default ARCPPrep;
