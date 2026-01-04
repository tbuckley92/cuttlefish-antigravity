
import React, { useState, useCallback, useRef } from 'react';
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
import { MSFSubmissionForm } from './views/MSFSubmissionForm';
import { MSFResponseForm } from './views/MSFResponseForm';
import { LayoutDashboard, Database, Plus, FileText, Activity } from './components/Icons';
import { Logo } from './components/Logo';
import { INITIAL_SIAS, INITIAL_EVIDENCE, INITIAL_PROFILE } from './constants';
import { SIA, EvidenceItem, EvidenceType, EvidenceStatus } from './types';

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
  ARCPPrep = 'arcp-prep'
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

// Context for launching mandatory CRS/OSATS from EPA
interface MandatoryFormContext {
  expectedType: 'CRS' | 'OSATs';
  defaultSubtype: string;
  reqKey: string;
  returnSection: number;
  returnIndex: number;
  epaFormParams: FormParams;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedFormParams, setSelectedFormParams] = useState<FormParams | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem | null>(null);
  const [sias, setSias] = useState<SIA[]>(INITIAL_SIAS);
  const [allEvidence, setAllEvidence] = useState<EvidenceItem[]>(INITIAL_EVIDENCE);

  // Selection mode for linking evidence
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [linkingReqIdx, setLinkingReqIdx] = useState<string | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<Record<string, string[]>>({});

  // Persistence state for returning to the correct outcome in a form
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);

  // Respondent simulation state
  const [activeRespondentId, setActiveRespondentId] = useState<string | null>(null);

  // Use a ref to track a counter for unique IDs even when created in same millisecond
  const evidenceIdCounter = useRef(0);

  // Mandatory CRS/OSATS launch context (for auto-linking back to EPA)
  const [mandatoryContext, setMandatoryContext] = useState<MandatoryFormContext | null>(null);
  // Ref to hold the ID of evidence created during a mandatory form flow (needed for sync access)
  const mandatoryCreatedIdRef = useRef<string | null>(null);

  const handleUpsertEvidence = (item: Partial<EvidenceItem> & { id?: string }) => {
    console.log('App.tsx: handleUpsertEvidence called with:', item); // Debug log

    // Increment counter BEFORE the state update to ensure uniqueness
    evidenceIdCounter.current += 1;
    const counterValue = evidenceIdCounter.current;

    // Capture ID for mandatory form context (CRS/OSATS launched from EPA)
    // Check if this is a new creation matching the expected type
    const ctx = mandatoryContext;
    const isMatchingMandatoryType = ctx && (
      (ctx.expectedType === 'CRS' && item.type === EvidenceType.CRS) ||
      (ctx.expectedType === 'OSATs' && item.type === EvidenceType.OSATs)
    );

    setAllEvidence(prev => {
      // Only check for existing if we have an ID
      if (item.id) {
        const exists = prev.find(e => e.id === item.id);
        if (exists) {
          console.log('App.tsx: Updating existing evidence:', item.id); // Debug log
          // For updates, track the ID if it's a mandatory form context match
          if (isMatchingMandatoryType) {
            mandatoryCreatedIdRef.current = item.id;
          }
          return prev.map(e => e.id === item.id ? { ...e, ...item } as EvidenceItem : e);
        }
      }

      // Generate a truly unique ID using timestamp + counter + random
      // Counter is incremented outside state update to ensure uniqueness
      const generateUniqueId = () => {
        const timestamp = Date.now().toString(36);
        const counter = counterValue.toString(36);
        const random = Math.random().toString(36).substring(2, 11);
        return `ev-${timestamp}-${counter}-${random}`;
      };

      // Generate ID and ensure it doesn't exist (shouldn't happen with counter, but safety check)
      let newId = item.id || generateUniqueId();
      let attempts = 0;
      while (prev.find(e => e.id === newId) && attempts < 10) {
        // If somehow we get a duplicate, increment counter and regenerate
        evidenceIdCounter.current += 1;
        newId = generateUniqueId();
        attempts++;
      }

      if (attempts >= 10) {
        console.error('App.tsx: Failed to generate unique ID after 10 attempts!');
      }

      const newItem: EvidenceItem = {
        id: newId,
        date: item.date || new Date().toISOString().split('T')[0],
        status: item.status || EvidenceStatus.Draft,
        title: item.title || 'Untitled Evidence',
        type: item.type || EvidenceType.Other,
        ...item
      } as EvidenceItem;

      // Track the created ID for mandatory form context (auto-linking)
      if (isMatchingMandatoryType) {
        mandatoryCreatedIdRef.current = newItem.id;
      }

      console.log('App.tsx: Creating new evidence item with ID:', newItem.id, 'Title:', newItem.title, 'Full item:', newItem); // Debug log
      const updated = [newItem, ...prev];
      console.log('App.tsx: Total evidence count after creation:', updated.length, 'IDs:', updated.map(e => `${e.id}:${e.title}`)); // Debug log
      return updated;
    });
  };

  const handleNavigateToEPA = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setReturnTarget(null);
    setSelectedFormParams({ sia, level, supervisorName, supervisorEmail });
    setCurrentView(View.EPAForm);
  };

  const handleNavigateToDOPs = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setSelectedFormParams({ sia, level, supervisorName, supervisorEmail });
    setCurrentView(View.DOPsForm);
  };

  const handleNavigateToOSATS = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setSelectedFormParams({ sia, level, supervisorName, supervisorEmail });
    setCurrentView(View.OSATSForm);
  };

  const handleNavigateToCBD = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setSelectedFormParams({ sia, level, supervisorName, supervisorEmail });
    setCurrentView(View.CBDForm);
  };

  const handleNavigateToCRS = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
    setSelectedFormParams({ sia, level, supervisorName, supervisorEmail });
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
    } else if (item.type === EvidenceType.ARCPPrep) {
      setCurrentView(View.ARCPPrep);
    } else if (item.type === EvidenceType.EPA) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.EPAForm);
    } else if (item.type === EvidenceType.DOPs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.DOPsForm);
    } else if (item.type === EvidenceType.OSATs) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.OSATSForm);
    } else if (item.type === EvidenceType.CbD) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.CBDForm);
    } else if (item.type === EvidenceType.CRS) {
      setSelectedFormParams({ sia: item.sia || '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.CRSForm);
    } else if (item.type === EvidenceType.GSAT) {
      setSelectedFormParams({ sia: '', level: item.level || 1, id: item.id, status: item.status });
      setCurrentView(View.GSATForm);
    } else {
      setCurrentView(View.AddEvidence);
    }
  };

  // Define the function directly (not using useCallback) to debug
  const handleViewLinkedEvidence = ((evidenceId: string, section?: number) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:161', message: 'handleViewLinkedEvidence called', data: { evidenceId, allEvidenceCount: allEvidence.length, allEvidenceIds: allEvidence.map(e => e.id) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    console.log('handleViewLinkedEvidence called with evidenceId:', evidenceId);
    const evidence = allEvidence.find(e => e.id === evidenceId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:163', message: 'Evidence lookup result', data: { evidenceId, evidenceFound: !!evidence, evidenceType: evidence?.type, evidenceTitle: evidence?.title }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    if (!evidence) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:164', message: 'ERROR: Evidence not found', data: { evidenceId, allEvidenceIds: allEvidence.map(e => e.id) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      console.error('Evidence not found:', evidenceId, 'Available evidence:', allEvidence.map(e => e.id));
      return;
    }
    console.log('Found evidence:', evidence.type, evidence.title);

    // Store current view and form params as origin context
    const originView = currentView;
    const originFormParams = selectedFormParams ? { ...selectedFormParams, initialSection: section } : undefined;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:172', message: 'Preparing navigation', data: { originView, hasOriginParams: !!originFormParams, evidenceType: evidence.type, evidenceId: evidence.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:199', message: 'Navigating to OSATS form', data: { evidenceId: evidence.id, evidenceType: evidence.type, originView }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:209', message: 'Navigating to CBD form', data: { evidenceId: evidence.id, evidenceType: evidence.type, originView }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:219', message: 'Navigating to CRS form', data: { evidenceId: evidence.id, evidenceType: evidence.type, originView }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:229', message: 'Navigating to GSAT form', data: { evidenceId: evidence.id, evidenceType: evidence.type, originView }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:263', message: 'ERROR: Unknown evidence type, no navigation', data: { evidenceType: evidence.type, evidenceId: evidence.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
    }
  }) as (evidenceId: string) => void;

  // Debug: Verify function is created - this should always be a function
  console.log('App.tsx: handleViewLinkedEvidence defined, type:', typeof handleViewLinkedEvidence);
  if (typeof handleViewLinkedEvidence !== 'function') {
    console.error('CRITICAL: handleViewLinkedEvidence is not a function! Type:', typeof handleViewLinkedEvidence, 'Value:', handleViewLinkedEvidence);
  }

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

    // Extract index from EPA key if it's a string (format: EPA-L{level}-{section}-{idx})
    let extractedIndex: number | undefined = undefined;
    if (typeof reqIndex === 'string' && reqIndex.startsWith('EPA-')) {
      const parts = reqIndex.split('-');
      if (parts.length >= 4) {
        const idxPart = parts[parts.length - 1];
        const parsedIdx = parseInt(idxPart, 10);
        if (!isNaN(parsedIdx)) {
          extractedIndex = parsedIdx;
        }
      }
    } else if (typeof reqIndex === 'number') {
      extractedIndex = reqIndex;
    }

    setReturnTarget({
      originView: origin,
      section: sectionIndex ?? 0,
      index: extractedIndex
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

  // Handler for launching mandatory CRS/OSATS/EPA from EPA
  const handleCompleteMandatoryForm = (
    formType: 'CRS' | 'OSATs' | 'EPA',
    defaultSubtype: string,
    reqKey: string,
    sectionIndex: number,
    criterionIndex: number
  ) => {
    // Store the current EPA form params so we can return
    const epaParams: FormParams = {
      sia: selectedFormParams?.sia || '',
      level: selectedFormParams?.level || 1,
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
        sia: selectedFormParams?.sia || '',
        level: selectedFormParams?.level || 1,
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        type: defaultSubtype, // This will be used for initialCrsType
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.CRSForm);
    } else if (formType === 'OSATs') {
      setSelectedFormParams({
        sia: selectedFormParams?.sia || '',
        level: selectedFormParams?.level || 1,
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        type: defaultSubtype, // This will be used for initialOsatsType
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.OSATSForm);
    } else if (formType === 'EPA') {
      // Navigate to EPA L4 Operating List
      setSelectedFormParams({
        sia: defaultSubtype, // This should be 'Operating List'
        level: 4, // Operating List is always Level 4
        supervisorName: selectedFormParams?.supervisorName,
        supervisorEmail: selectedFormParams?.supervisorEmail,
        originView: View.EPAForm,
        originFormParams: epaParams
      });
      setCurrentView(View.EPAForm);
    }
  };

  const handleFormSubmitted = () => {
    setCurrentView(View.Evidence);
  };

  // Handler for CRS form submission - handles auto-linking back to EPA
  const handleCRSSubmitted = () => {
    if (mandatoryContext && mandatoryContext.expectedType === 'CRS' && mandatoryCreatedIdRef.current) {
      const evidenceId = mandatoryCreatedIdRef.current;
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      // Auto-link the created evidence to the EPA criterion
      setLinkedEvidence(prev => ({
        ...prev,
        [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
      }));

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
    if (mandatoryContext && mandatoryContext.expectedType === 'OSATs' && mandatoryCreatedIdRef.current) {
      const evidenceId = mandatoryCreatedIdRef.current;
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      // Auto-link the created evidence to the EPA criterion
      setLinkedEvidence(prev => ({
        ...prev,
        [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
      }));

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
    if (mandatoryContext && mandatoryContext.expectedType === 'EPA' && mandatoryCreatedIdRef.current) {
      const evidenceId = mandatoryCreatedIdRef.current;
      const { reqKey, returnSection, returnIndex, epaFormParams } = mandatoryContext;

      // Auto-link the created evidence to the EPA criterion
      setLinkedEvidence(prev => ({
        ...prev,
        [reqKey]: [...new Set([...(prev[reqKey] || []), evidenceId])]
      }));

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

  const renderContent = () => {
    // Debug: Verify handleViewLinkedEvidence is accessible in renderContent
    console.log('App.tsx: renderContent called, handleViewLinkedEvidence type:', typeof handleViewLinkedEvidence);
    switch (currentView) {
      case View.Dashboard:
        return (
          <Dashboard
            sias={sias}
            allEvidence={allEvidence}
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
              setSelectedFormParams(null);
              setCurrentView(View.GSATForm);
            }}
            onNavigateToARCPPrep={() => setCurrentView(View.ARCPPrep)}
          />
        );
      case View.Evidence:
        return (
          <MyEvidence
            allEvidence={allEvidence}
            selectionMode={isSelectionMode}
            onConfirmSelection={handleConfirmSelection}
            onCancel={handleCancelSelection}
            onEditEvidence={handleEditEvidence}
          />
        );
      case View.Progress:
        return (
          <Progress allEvidence={allEvidence} />
        );
      case View.AddEvidence:
        return (
          <AddEvidence
            key={editingEvidence?.id || 'new-record'}
            sia={selectedFormParams?.sia}
            level={selectedFormParams?.level}
            initialType={selectedFormParams?.type}
            editingEvidence={editingEvidence || undefined}
            onBack={() => {
              setEditingEvidence(null);
              setCurrentView(View.Evidence);
            }}
            onCreated={(item) => {
              console.log('App.tsx: onCreated callback triggered with:', item); // Debug log
              handleUpsertEvidence(item);
              console.log('App.tsx: After handleUpsertEvidence call'); // Debug log

              // Delay navigation to ensure state update completes
              // Use setTimeout to let React process the state update first
              setTimeout(() => {
                setEditingEvidence(null);
                setCurrentView(View.Evidence);
              }, 10);
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
            setSelectedFormParams(null);
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

        // Create a wrapper function that ensures handleViewLinkedEvidence is always called
        const viewLinkedEvidenceHandler = (evidenceId: string, section?: number) => {
          console.log('viewLinkedEvidenceHandler called with:', evidenceId, 'handleViewLinkedEvidence type:', typeof handleViewLinkedEvidence);
          if (typeof handleViewLinkedEvidence === 'function') {
            return handleViewLinkedEvidence(evidenceId, section);
          } else {
            console.error('CRITICAL: handleViewLinkedEvidence is not a function! Type:', typeof handleViewLinkedEvidence);
            // Fallback: try to navigate directly
            const evidence = allEvidence.find(e => e.id === evidenceId);
            if (evidence) {
              const originView = currentView;
              const originFormParams = selectedFormParams ? { ...selectedFormParams, initialSection: section } : undefined;
              const readOnlyStatus = EvidenceStatus.Submitted;

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
              }
            }
          }
        };

        console.log('App.tsx: Passing viewLinkedEvidenceHandler to EPAForm, type:', typeof viewLinkedEvidenceHandler);

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
            onBack={() => {
              if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
                // Return to origin form with the section preserved
                setSelectedFormParams({
                  ...selectedFormParams.originFormParams,
                  initialSection: selectedFormParams.originFormParams.initialSection
                });
                setCurrentView(selectedFormParams.originView);
              } else {
                setCurrentView(View.RecordForm);
              }
            }}
            onSubmitted={mandatoryContext?.expectedType === 'EPA' ? handleEPAFromEPASubmitted : handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, section) => handleLinkRequested(idx, View.EPAForm, undefined, section)}
            linkedEvidenceData={levelLinkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            onViewLinkedEvidence={viewLinkedEvidenceHandler}
            onCompleteMandatoryForm={handleCompleteMandatoryForm}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
          />
        );
      case View.GSATForm:
        const existingGSAT = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.GSAT)
          : null;
        return (
          <GSATForm
            id={selectedFormParams?.id}
            initialLevel={selectedFormParams?.level || 1}
            initialStatus={selectedFormParams?.status || existingGSAT?.status || EvidenceStatus.Draft}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            onBack={() => {
              if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
                setSelectedFormParams(selectedFormParams.originFormParams);
                setCurrentView(selectedFormParams.originView);
              } else {
                setCurrentView(View.RecordForm);
              }
            }}
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, domain, section) => handleLinkRequested(idx, View.GSATForm, domain, section)}
            linkedEvidenceData={linkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            onViewLinkedEvidence={handleViewLinkedEvidence}
            initialSection={returnTarget?.section}
            autoScrollToIdx={returnTarget?.index}
            allEvidence={allEvidence}
          />
        );
      case View.DOPsForm:
        const existingDOPs = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.DOPs)
          : null;
        return <DOPsForm
          id={selectedFormParams?.id}
          sia={selectedFormParams?.sia}
          level={selectedFormParams?.level}
          initialAssessorName={selectedFormParams?.supervisorName}
          initialAssessorEmail={selectedFormParams?.supervisorEmail}
          initialStatus={selectedFormParams?.status || existingDOPs?.status || EvidenceStatus.Draft}
          originView={selectedFormParams?.originView}
          originFormParams={selectedFormParams?.originFormParams}
          onBack={() => {
            if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
              setSelectedFormParams(selectedFormParams.originFormParams);
              setCurrentView(selectedFormParams.originView);
            } else {
              setCurrentView(View.RecordForm);
            }
          }}
          onSubmitted={handleFormSubmitted}
          onSave={handleUpsertEvidence}
          onViewLinkedEvidence={handleViewLinkedEvidence}
          allEvidence={allEvidence}
        />;
      case View.OSATSForm:
        const existingOSATS = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.OSATs)
          : null;
        return <OSATSForm
          id={selectedFormParams?.id}
          sia={selectedFormParams?.sia}
          level={selectedFormParams?.level}
          initialAssessorName={selectedFormParams?.supervisorName}
          initialAssessorEmail={selectedFormParams?.supervisorEmail}
          initialStatus={selectedFormParams?.status || existingOSATS?.status || EvidenceStatus.Draft}
          initialOsatsType={selectedFormParams?.type}
          originView={selectedFormParams?.originView}
          originFormParams={selectedFormParams?.originFormParams}
          onBack={() => {
            if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
              setSelectedFormParams(selectedFormParams.originFormParams);
              setCurrentView(selectedFormParams.originView);
            } else {
              setCurrentView(View.RecordForm);
            }
          }}
          onSubmitted={handleOSATSSubmitted}
          onSave={handleUpsertEvidence}
          onViewLinkedEvidence={handleViewLinkedEvidence}
          allEvidence={allEvidence}
        />;
      case View.CBDForm:
        const existingCBD = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.CbD)
          : null;
        return <CBDForm
          id={selectedFormParams?.id}
          sia={selectedFormParams?.sia}
          level={selectedFormParams?.level}
          initialAssessorName={selectedFormParams?.supervisorName}
          initialAssessorEmail={selectedFormParams?.supervisorEmail}
          initialStatus={selectedFormParams?.status || existingCBD?.status || EvidenceStatus.Draft}
          originView={selectedFormParams?.originView}
          originFormParams={selectedFormParams?.originFormParams}
          onBack={() => {
            if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
              setSelectedFormParams(selectedFormParams.originFormParams);
              setCurrentView(selectedFormParams.originView);
            } else {
              setCurrentView(View.RecordForm);
            }
          }}
          onSubmitted={handleFormSubmitted}
          onSave={handleUpsertEvidence}
          onViewLinkedEvidence={handleViewLinkedEvidence}
          allEvidence={allEvidence}
        />;
      case View.CRSForm:
        const existingCRS = selectedFormParams?.id
          ? allEvidence.find(e => e.id === selectedFormParams.id && e.type === EvidenceType.CRS)
          : null;
        return <CRSForm
          id={selectedFormParams?.id}
          sia={selectedFormParams?.sia}
          level={selectedFormParams?.level}
          initialAssessorName={selectedFormParams?.supervisorName}
          initialAssessorEmail={selectedFormParams?.supervisorEmail}
          initialStatus={selectedFormParams?.status || existingCRS?.status || EvidenceStatus.Draft}
          initialCrsType={selectedFormParams?.type}
          originView={selectedFormParams?.originView}
          originFormParams={selectedFormParams?.originFormParams}
          onBack={() => {
            if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
              setSelectedFormParams(selectedFormParams.originFormParams);
              setCurrentView(selectedFormParams.originView);
            } else {
              setCurrentView(View.RecordForm);
            }
          }}
          onSubmitted={handleCRSSubmitted}
          onSave={handleUpsertEvidence}
          onViewLinkedEvidence={handleViewLinkedEvidence}
          allEvidence={allEvidence}
        />;
      case View.MARForm:
        return <PlaceholderForm title="MAR Form" subtitle="Management of Acute Referral - Content TBC" onBack={() => setCurrentView(View.RecordForm)} />;
      case View.ARCPPrep:
        return (
          <ARCPPrep
            sias={sias}
            allEvidence={allEvidence}
            onBack={() => setCurrentView(View.Dashboard)}
            onNavigateGSAT={() => setCurrentView(View.GSATForm)}
            onNavigateMSF={handleNavigateToMSF}
            onUpsertEvidence={handleUpsertEvidence}
          />
        );
      default:
        return <Dashboard sias={sias} allEvidence={allEvidence} onRemoveSIA={handleRemoveSIA} onUpdateSIA={handleUpdateSIA} onAddSIA={handleAddSIA} onNavigateToEPA={handleNavigateToEPA} onNavigateToDOPs={handleNavigateToDOPs} onNavigateToOSATS={handleNavigateToOSATS} onNavigateToCBD={handleNavigateToCBD} onNavigateToCRS={handleNavigateToCRS} onNavigateToEvidence={() => setCurrentView(View.Evidence)} onNavigateToRecordForm={() => setCurrentView(View.RecordForm)} onNavigateToAddEvidence={handleNavigateToAddEvidence} onNavigateToGSAT={() => setCurrentView(View.GSATForm)} onNavigateToARCPPrep={() => setCurrentView(View.ARCPPrep)} />;
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
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setCurrentView(View.Dashboard)}>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform border border-slate-200">
                <Logo size={24} className="text-indigo-600" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">EyePortfolio</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              <NavTab
                active={currentView === View.Dashboard}
                onClick={() => setCurrentView(View.Dashboard)}
                icon={<LayoutDashboard size={16} />}
                label="DASHBOARD"
              />
              <NavTab
                active={currentView === View.Evidence}
                onClick={() => setCurrentView(View.Evidence)}
                icon={<Database size={16} />}
                label="MY EVIDENCE"
              />
              <NavTab
                active={currentView === View.Progress}
                onClick={() => setCurrentView(View.Progress)}
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
