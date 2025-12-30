
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
  originView?: View; // View we came from when viewing linked evidence
  originFormParams?: FormParams; // Form params of the origin form
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
  
  // Selection mode for linking evidence
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [linkingReqIdx, setLinkingReqIdx] = useState<string | null>(null); 
  const [linkedEvidence, setLinkedEvidence] = useState<Record<string, string[]>>({});
  
  // Persistence state for returning to the correct outcome in a form
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);

  // Respondent simulation state
  const [activeRespondentId, setActiveRespondentId] = useState<string | null>(null);

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
  const handleViewLinkedEvidence = ((evidenceId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:161',message:'handleViewLinkedEvidence called',data:{evidenceId,allEvidenceCount:allEvidence.length,allEvidenceIds:allEvidence.map(e=>e.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('handleViewLinkedEvidence called with evidenceId:', evidenceId);
    const evidence = allEvidence.find(e => e.id === evidenceId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:163',message:'Evidence lookup result',data:{evidenceId,evidenceFound:!!evidence,evidenceType:evidence?.type,evidenceTitle:evidence?.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!evidence) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:164',message:'ERROR: Evidence not found',data:{evidenceId,allEvidenceIds:allEvidence.map(e=>e.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Evidence not found:', evidenceId, 'Available evidence:', allEvidence.map(e => e.id));
      return;
    }
    console.log('Found evidence:', evidence.type, evidence.title);

    // Store current view and form params as origin context
    const originView = currentView;
    const originFormParams = selectedFormParams ? { ...selectedFormParams } : undefined;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:172',message:'Preparing navigation',data:{originView,hasOriginParams:!!originFormParams,evidenceType:evidence.type,evidenceId:evidence.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:199',message:'Navigating to OSATS form',data:{evidenceId:evidence.id,evidenceType:evidence.type,originView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:209',message:'Navigating to CBD form',data:{evidenceId:evidence.id,evidenceType:evidence.type,originView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:219',message:'Navigating to CRS form',data:{evidenceId:evidence.id,evidenceType:evidence.type,originView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:229',message:'Navigating to GSAT form',data:{evidenceId:evidence.id,evidenceType:evidence.type,originView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/d806ef10-a7cf-4ba2-a7d3-41bd2e75b0c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:263',message:'ERROR: Unknown evidence type, no navigation',data:{evidenceType:evidence.type,evidenceId:evidence.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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

  const handleFormSubmitted = () => {
    setCurrentView(View.Evidence);
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
        
        // Ensure handleViewLinkedEvidence is always defined - useCallback should always return a function
        // But if it's somehow undefined, provide a fallback
        const safeHandleViewLinkedEvidence = (() => {
          if (typeof handleViewLinkedEvidence === 'function') {
            return handleViewLinkedEvidence;
          }
          console.error('CRITICAL: handleViewLinkedEvidence is not a function! Type:', typeof handleViewLinkedEvidence, 'Creating fallback.');
          return (evidenceId: string) => {
            console.error('FALLBACK: handleViewLinkedEvidence was undefined, called with:', evidenceId);
            // Try to call the actual function if it exists in closure
            if (typeof handleViewLinkedEvidence === 'function') {
              return handleViewLinkedEvidence(evidenceId);
            }
          };
        })();
        
        console.log('App.tsx: Passing to EPAForm, safeHandleViewLinkedEvidence type:', typeof safeHandleViewLinkedEvidence, 'handleViewLinkedEvidence type:', typeof handleViewLinkedEvidence);
        
        // Final verification before passing
        const finalHandler = typeof safeHandleViewLinkedEvidence === 'function' 
          ? safeHandleViewLinkedEvidence 
          : ((evidenceId: string) => {
              console.error('FINAL FALLBACK: safeHandleViewLinkedEvidence was not a function! Called with:', evidenceId);
            });
        
        console.log('App.tsx: Final handler type before passing:', typeof finalHandler);
        
        return (
          <EPAForm 
            id={selectedFormParams?.id}
            sia={selectedFormParams?.sia} 
            level={selectedFormParams?.level} 
            initialSupervisorName={selectedFormParams?.supervisorName} 
            initialSupervisorEmail={selectedFormParams?.supervisorEmail} 
            initialStatus={selectedFormParams?.status || existingEPA?.status || EvidenceStatus.Draft}
            originView={selectedFormParams?.originView}
            originFormParams={selectedFormParams?.originFormParams}
            onBack={() => {
              if (selectedFormParams?.originView && selectedFormParams?.originFormParams) {
                // Return to origin form
                setSelectedFormParams(selectedFormParams.originFormParams);
                setCurrentView(selectedFormParams.originView);
              } else {
                setCurrentView(View.RecordForm);
              }
            }}
            onSubmitted={handleFormSubmitted}
            onSave={handleUpsertEvidence}
            onLinkRequested={(idx, section) => handleLinkRequested(idx, View.EPAForm, undefined, section)} 
            linkedEvidenceData={levelLinkedEvidence}
            onRemoveLink={handleRemoveLinkedEvidence}
            onViewLinkedEvidence={(evidenceId: string) => {
              console.log('App.tsx: Direct inline handler called with:', evidenceId, 'handleViewLinkedEvidence type:', typeof handleViewLinkedEvidence);
              if (typeof handleViewLinkedEvidence === 'function') {
                return handleViewLinkedEvidence(evidenceId);
              }
              console.error('App.tsx: handleViewLinkedEvidence is not a function! Calling fallback.');
              // Fallback: try to find and navigate to the evidence
              const evidence = allEvidence.find(e => e.id === evidenceId);
              if (evidence) {
                const originView = currentView;
                const originFormParams = selectedFormParams ? { ...selectedFormParams } : undefined;
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
              } else {
                console.error('Evidence not found:', evidenceId);
              }
            }}
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
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">OphthaPortfolio</span>
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
