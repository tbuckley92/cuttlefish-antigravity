
import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  Filter, Search, FileText, CheckCircle2, Clock, 
  ArrowLeft, AlertCircle, ShieldCheck
} from '../components/Icons';
import { INITIAL_EVIDENCE, SPECIALTIES } from '../constants';
import { EvidenceType, EvidenceStatus, EvidenceItem } from '../types';

interface MyEvidenceProps {
  selectionMode?: boolean;
  onConfirmSelection?: (ids: string[]) => void;
  onCancel?: () => void;
  onEditEvidence?: (item: EvidenceItem) => void;
  maxSelection?: number;
}

const MyEvidence: React.FC<MyEvidenceProps> = ({ 
  selectionMode = false, 
  onConfirmSelection, 
  onCancel,
  onEditEvidence,
  maxSelection = 5 
}) => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>(INITIAL_EVIDENCE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterSIA, setFilterSIA] = useState<string>('All');

  const filteredEvidence = useMemo(() => {
    return evidence.filter(item => {
      const typeMatch = filterType === 'All' || item.type === filterType;
      const siaMatch = filterSIA === 'All' || item.sia === filterSIA;
      return typeMatch && siaMatch;
    });
  }, [evidence, filterType, filterSIA]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length < maxSelection) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-6 flex flex-col gap-6 animate-in fade-in duration-300 ${selectionMode ? 'mt-12' : ''}`}>
      
      {selectionMode && (
        <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-teal-600/10 dark:bg-teal-900/40 border-b border-teal-500/20 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-teal-700 dark:text-white/70">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-teal-900 dark:text-white font-medium">Link Evidence</h2>
              <p className="text-xs text-teal-700/60 dark:text-white/60">Select up to {maxSelection} records to attach to this requirement</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-500/10 dark:bg-white/10 text-teal-700 dark:text-white font-mono text-xs border border-teal-500/20 dark:border-white/20">
              {selectedIds.length} / {maxSelection}
            </span>
          </div>
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => onConfirmSelection?.(selectedIds)}
            className="px-6 py-2 rounded-lg bg-teal-500 text-white font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/20"
          >
            Confirm Link
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white/90">My Evidence</h1>
          <p className="text-sm text-slate-500 dark:text-white/40">Overview of all your workplace-based assessments and reflections</p>
        </div>
      </div>

      <GlassCard className="p-1 flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-2">
          <Search size={18} className="text-slate-400 dark:text-white/30" />
          <input 
            type="text" 
            placeholder="Search evidence..." 
            className="bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 w-full"
          />
        </div>
        <div className="flex items-center gap-2 p-1">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-white/60 outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <option value="All">All Types</option>
            {Object.values(EvidenceType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={filterSIA}
            onChange={(e) => setFilterSIA(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-white/60 outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <option value="All">All SIAs</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 dark:text-white/40">
            <Filter size={18} />
          </button>
        </div>
      </GlassCard>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-32">Type</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">SIA</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-24 text-center">Level</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-32">Date</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-32">Status</th>
              {selectionMode && <th className="px-6 py-4 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredEvidence.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr 
                  key={item.id} 
                  onClick={() => selectionMode ? toggleSelection(item.id) : onEditEvidence?.(item)}
                  className={`
                    group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer
                    ${selectionMode && isSelected ? 'bg-teal-500/5 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}
                  `}
                >
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight
                      ${getTypeColors(item.type)}
                    `}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white">
                    {item.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-white/50">
                    {item.sia || '–'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-white/50 text-center">
                    {item.level || '–'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-white/50 font-mono text-xs">
                    {item.date}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      ${getStatusColors(item.status)}
                    `}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                  </td>
                  {selectionMode && (
                    <td className="px-6 py-4">
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-all
                        ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-white/20 text-transparent'}
                      `}>
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredEvidence.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/20 mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-slate-500 dark:text-white/60 font-medium">No records found</p>
            <p className="text-slate-400 dark:text-white/30 text-sm mt-1">Try adjusting your filters or create a new evidence item.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getTypeColors = (type: EvidenceType) => {
  switch (type) {
    case EvidenceType.CbD: return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30';
    case EvidenceType.DOPs: return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30';
    case EvidenceType.OSATs: return 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/20 dark:border-orange-500/30';
    case EvidenceType.Reflection: return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30';
    case EvidenceType.CRS: return 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30';
    case EvidenceType.EPA: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
    case EvidenceType.MSF: return 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/20';
    default: return 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/20';
  }
};

const getStatusColors = (status: EvidenceStatus) => {
  switch (status) {
    case EvidenceStatus.SignedOff: return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
    case EvidenceStatus.Submitted: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    case EvidenceStatus.Draft: return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40 border border-slate-200 dark:border-white/10';
    default: return 'bg-white/5 text-white/40';
  }
};

const getStatusIcon = (status: EvidenceStatus) => {
  switch (status) {
    case EvidenceStatus.SignedOff: return <ShieldCheck size={12} />;
    case EvidenceStatus.Submitted: return <Clock size={12} />;
    case EvidenceStatus.Draft: return <FileText size={12} />;
    default: return null;
  }
};

export default MyEvidence;
