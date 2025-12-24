
import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import MyEvidence from './views/MyEvidence';
import EPAForm from './views/EPAForm';
import DOPsForm from './views/DOPsForm';
import OSATSForm from './views/OSATSForm';
import AddEvidence from './views/AddEvidence';
import { LayoutDashboard, Database, ClipboardCheck, Sun, Moon, Plus } from './components/Icons';
import { INITIAL_SIAS } from './constants';
import { SIA } from './types';

enum View {
  Dashboard = 'dashboard',
  Evidence = 'evidence',
  EPAForm = 'epa-form',
  DOPsForm = 'dops-form',
  OSATSForm = 'osats-form',
  AddEvidence = 'add-evidence'
}

interface FormParams {
  sia: string;
  level: number;
  supervisorName?: string;
  supervisorEmail?: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedFormParams, setSelectedFormParams] = useState<FormParams | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sias, setSias] = useState<SIA[]>(INITIAL_SIAS);
  
  // Selection mode for linking evidence
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [linkingReqIdx, setLinkingReqIdx] = useState<number | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<Record<number, string[]>>({});

  useEffect(() => {
    // Sync with HTML class for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNavigateToEPA = (sia: string, level: number, supervisorName?: string, supervisorEmail?: string) => {
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

  const handleNavigateToAddEvidence = (sia?: string, level?: number) => {
    if (sia && level) {
      setSelectedFormParams({ sia, level });
    } else {
      setSelectedFormParams(null);
    }
    setCurrentView(View.AddEvidence);
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

  const handleLinkRequested = (reqIndex: number) => {
    setLinkingReqIdx(reqIndex);
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
    setLinkingReqIdx(null);
    setCurrentView(View.EPAForm);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setLinkingReqIdx(null);
    setCurrentView(View.EPAForm);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0d1117] text-white/90' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/10 blur-[120px] rounded-full"></div>
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/[0.03] blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/[0.03] blur-[120px] rounded-full"></div>
          </>
        )}
      </div>

      {!isSelectionMode && (
        <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6">
          <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setCurrentView(View.Dashboard)}>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={18} className="text-white" />
              </div>
              <span className="font-semibold tracking-tight text-slate-900 dark:text-white/90">OphthaPortfolio</span>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] p-1 rounded-xl border border-slate-200 dark:border-white/5">
              <NavTab active={currentView === View.Dashboard} onClick={() => setCurrentView(View.Dashboard)} icon={<LayoutDashboard size={14} />} label="Dashboard" />
              <NavTab active={currentView === View.Evidence} onClick={() => setCurrentView(View.Evidence)} icon={<Database size={14} />} label="My Evidence" />
              <NavTab 
                active={currentView === View.AddEvidence || currentView === View.EPAForm || currentView === View.DOPsForm || currentView === View.OSATSForm} 
                onClick={() => setCurrentView(View.AddEvidence)}
                icon={<Plus size={14} />} 
                label="Add Evidence" 
              />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/20 shadow-md"></div>
            </div>
          </div>
        </nav>
      )}

      <main className="pt-8 pb-20">
        {currentView === View.Dashboard && (
          <Dashboard sias={sias} onRemoveSIA={handleRemoveSIA} onUpdateSIA={handleUpdateSIA} onAddSIA={handleAddSIA} onNavigateToEPA={handleNavigateToEPA} onNavigateToDOPs={handleNavigateToDOPs} onNavigateToOSATS={handleNavigateToOSATS} onNavigateToEvidence={() => setCurrentView(View.Evidence)} />
        )}
        
        {currentView === View.Evidence && (
          <MyEvidence selectionMode={isSelectionMode} onConfirmSelection={handleConfirmSelection} onCancel={handleCancelSelection} onCreateEvidence={() => setCurrentView(View.AddEvidence)} />
        )}
        
        {currentView === View.EPAForm && (
          <EPAForm sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialSupervisorName={selectedFormParams?.supervisorName} initialSupervisorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.Dashboard)} onLinkRequested={handleLinkRequested} linkedEvidenceData={linkedEvidence} />
        )}

        {currentView === View.DOPsForm && (
          <DOPsForm sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.Dashboard)} />
        )}

        {currentView === View.OSATSForm && (
          <OSATSForm sia={selectedFormParams?.sia} level={selectedFormParams?.level} initialAssessorName={selectedFormParams?.supervisorName} initialAssessorEmail={selectedFormParams?.supervisorEmail} onBack={() => setCurrentView(View.Dashboard)} />
        )}

        {currentView === View.AddEvidence && (
          <AddEvidence sia={selectedFormParams?.sia} level={selectedFormParams?.level} onBack={() => setCurrentView(View.Evidence)} onCreated={() => setCurrentView(View.Evidence)} />
        )}
      </main>
    </div>
  );
};

const NavTab: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${active ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'}`}>
    {icon}
    {label}
  </button>
);

export default App;
