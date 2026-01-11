
import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  Filter, Search, FileText, CheckCircle2, Clock,
  ArrowLeft, AlertCircle, ShieldCheck, ExternalLink, Trash2, FileDown, Download, X
} from '../components/Icons';
import { SPECIALTIES } from '../constants';
import { EvidenceType, EvidenceStatus, EvidenceItem, UserProfile } from '../types';
import { generateEvidencePDF } from '../utils/pdfGenerator';
import { createEvidenceZip } from '../utils/zipGenerator';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import { getEvidenceFileUrl } from '../utils/storageUtils';


interface MyEvidenceProps {
  allEvidence: EvidenceItem[];
  profile: UserProfile;
  selectionMode?: boolean;
  onConfirmSelection?: (ids: string[]) => void;
  onCancel?: () => void;
  onEditEvidence?: (item: EvidenceItem) => void;
  onViewItem?: (item: EvidenceItem) => void;
  onDeleteEvidence?: (id: string) => void;
  maxSelection?: number;
  isSupervisorView?: boolean;
  onBack?: () => void;
  excludeType?: EvidenceType;
  epaLinkingMode?: boolean; // When true, only show EPA Operating List items
}

const DELETABLE_COMPLETE_TYPES = [
  EvidenceType.CurriculumCatchUp,
  EvidenceType.FourteenFish,
  EvidenceType.Reflection,
  EvidenceType.QIP,
  EvidenceType.Award,
  EvidenceType.Course,
  EvidenceType.SignificantEvent,
  EvidenceType.Research,
  EvidenceType.Leadership,
  EvidenceType.Logbook,
  EvidenceType.Additional,
  EvidenceType.Compliment,
  EvidenceType.Other
];

const MyEvidence: React.FC<MyEvidenceProps> = ({
  allEvidence,
  profile,
  selectionMode = false,
  onConfirmSelection,
  onCancel,
  onEditEvidence,
  onViewItem,
  onDeleteEvidence,
  maxSelection = Infinity,
  isSupervisorView = false,
  onBack,
  excludeType,
  epaLinkingMode = false
}) => {

  const [filterType, setFilterType] = useState<string>('All');
  const [filterSIA, setFilterSIA] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allEvidence.forEach(item => {
      if (item.date) {
        const year = new Date(item.date).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Most recent first
  }, [allEvidence]);

  const filteredEvidence = useMemo(() => {
    return allEvidence.filter(item => {
      // Exclude ARCP Prep items from the main Evidence table
      if (item.type === EvidenceType.ARCPPrep) return false;

      // Hide ARCP outcomes unless they are SignedOff (CONFIRMED)
      if ((item.type === EvidenceType.ARCPFullReview || item.type === EvidenceType.ARCPInterimReview) &&
        item.status !== EvidenceStatus.SignedOff) {
        return false;
      }

      // In selection mode, exclude same-type evidence (e.g., EPAs can't link to EPAs)
      if (selectionMode && excludeType && item.type === excludeType) return false;

      const typeMatch = filterType === 'All' || item.type === filterType;
      const siaMatch = filterSIA === 'All' || item.sia === filterSIA;

      // Year filter
      const yearMatch = filterYear === 'All' || (item.date && new Date(item.date).getFullYear().toString() === filterYear);

      // Status filter
      const statusMatch = filterStatus === 'All' ||
        (filterStatus === 'Draft' && item.status === EvidenceStatus.Draft) ||
        (filterStatus === 'Submitted' && item.status === EvidenceStatus.Submitted) ||
        (filterStatus === 'Complete' && item.status === EvidenceStatus.SignedOff);



      return typeMatch && siaMatch && yearMatch && statusMatch;
    });
  }, [allEvidence, filterType, filterSIA, filterYear, filterStatus, selectionMode, excludeType]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteEvidence?.(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handlePDFClick = async (e: React.MouseEvent, item: EvidenceItem) => {
    e.stopPropagation();

    // For Curriculum Catch Up and FourteenFish, open the uploaded file directly
    if (item.type === EvidenceType.CurriculumCatchUp || item.type === EvidenceType.FourteenFish) {
      try {
        let urlToOpen = item.fileUrl;

        // Lazy load if missing (legacy optimization)
        if (!urlToOpen && isSupabaseConfigured) {
          const { data: fullData } = await supabase
            .from('evidence')
            .select('data')
            .eq('id', item.id)
            .single();

          if (fullData?.data) {
            // @ts-ignore
            urlToOpen = fullData.data.fileUrl || fullData.data.fileBase64;
          }
        }

        if (!urlToOpen) {
          alert('No file attached to this legacy record.');
          return;
        }

        // If Supabase is configured and it's not a base64/data URL, assume it's a storage path
        if (isSupabaseConfigured && !urlToOpen.startsWith('data:') && !urlToOpen.startsWith('http')) {
          urlToOpen = await getEvidenceFileUrl(urlToOpen);
        }

        window.open(urlToOpen, '_blank');
        return;
      } catch (error) {
        alert('Error opening file. Please try again.');
        console.error('File open error:', error);
        return;
      }
    }

    // For other evidence types, generate PDF from metadata
    try {
      const blob = generateEvidencePDF(item, profile, allEvidence);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedTitle = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${item.type}_${sanitizedTitle}_${item.date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error generating PDF. Please try again.');
      console.error('PDF generation error:', error);
    }
  };

  const handleExportSelected = async () => {
    if (selectedForExport.length === 0) {
      alert('Please select at least one COMPLETE evidence item to export.');
      return;
    }

    const selectedItems = filteredEvidence.filter(item =>
      selectedForExport.includes(item.id) && item.status === EvidenceStatus.SignedOff
    );

    if (selectedItems.length === 0) {
      alert('No valid COMPLETE items selected for export.');
      return;
    }

    setIsExporting(true);
    try {
      const zipBlob = await createEvidenceZip(selectedItems, profile, allEvidence);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Evidence_Portfolio_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error creating ZIP file. Please try again.');
      console.error('ZIP generation error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedForExport(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAllComplete = () => {
    const completeItems = filteredEvidence.filter(item => item.status === EvidenceStatus.SignedOff);
    const completeIds = completeItems.map(item => item.id);

    // If all complete items are selected, deselect all. Otherwise, select all.
    const allSelected = completeIds.every(id => selectedForExport.includes(id));

    if (allSelected) {
      setSelectedForExport(prev => prev.filter(id => !completeIds.includes(id)));
    } else {
      setSelectedForExport(prev => {
        const newSelection = [...prev];
        completeIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const completeCount = useMemo(() => {
    return filteredEvidence.filter(item => item.status === EvidenceStatus.SignedOff).length;
  }, [filteredEvidence]);

  const selectedCompleteCount = useMemo(() => {
    return filteredEvidence.filter(item =>
      item.status === EvidenceStatus.SignedOff && selectedForExport.includes(item.id)
    ).length;
  }, [filteredEvidence, selectedForExport]);

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
              <p className="text-xs text-teal-700/60 dark:text-white/60">Select records to attach to this requirement</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-500/10 dark:bg-white/10 text-teal-700 dark:text-white font-mono text-xs border border-teal-500/20 dark:border-white/20">
              {selectedIds.length} selected
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
        <div className="flex items-center gap-4 flex-1">
          {isSupervisorView && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Back to Supervisor Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white/90">
              {isSupervisorView ? `${profile.name}'s Evidence` : 'My Evidence'}
            </h1>
            <p className="hidden md:block text-sm text-slate-500 dark:text-white/40">
              {isSupervisorView ? 'Viewing trainee evidence portfolio' : 'Overview of all your workplace-based assessments and reflections'}
            </p>
          </div>
          {/* Mobile filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-white/60"
          >
            <Filter size={20} />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {completeCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCompleteCount === completeCount && completeCount > 0}
                onChange={handleSelectAllComplete}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600 dark:text-white/60 font-medium">
                Select All COMPLETE ({completeCount})
              </span>
            </label>
          )}
          <button
            onClick={handleExportSelected}
            disabled={selectedForExport.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : `EXPORT (${selectedForExport.length})`}
          </button>
        </div>
      </div>

      <GlassCard className="hidden md:flex p-1 flex-col md:flex-row gap-2">
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
            {Object.values(EvidenceType).filter(t => t !== EvidenceType.ARCPPrep).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterSIA}
            onChange={(e) => setFilterSIA(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-white/60 outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <option value="All">All SIAs</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-white/60 outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <option value="All">All Years</option>
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-white/60 outline-none hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Complete">Complete</option>
          </select>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 dark:text-white/40">
            <Filter size={18} />
          </button>
        </div>
      </GlassCard>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[100px]">Type</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Title</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[120px]">SIA</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[50px] text-center">Level</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[90px]">Date</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[80px] text-center">Status</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[60px] text-center">Actions</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[55px] text-center">Select</th>
                {selectionMode && <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 w-[45px] text-center">Link</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEvidence.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(item.id);
                      } else if (onEditEvidence) {
                        onEditEvidence(item);
                      } else if (onViewItem) {
                        onViewItem(item);
                      }
                    }}

                    className={`
                    group border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors cursor-pointer
                    ${selectionMode && isSelected ? 'bg-teal-500/5 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}
                  `}
                  >
                    <td className="px-3 py-3">
                      <span className={`
                      inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight truncate max-w-full
                      ${getTypeColors(item.type)}
                    `} title={item.type}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 max-w-[200px] md:max-w-[300px] lg:max-w-[450px]">
                        <span
                          className="text-sm font-medium text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white whitespace-nowrap overflow-hidden flex-1 min-w-0"
                          style={{
                            maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
                          }}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        {item.fileName && (
                          <div className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" title={`Attached: ${item.fileName}`}>
                            <FileText size={8} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 dark:text-white/50 truncate" title={item.sia || ''}>
                      {item.sia || '–'}
                    </td>
                    <td className="px-2 py-3 text-xs text-slate-500 dark:text-white/50 text-center">
                      {item.level || '–'}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-white/50 font-mono text-[11px]">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className={`
                      inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                      ${getStatusColors(item.status)}
                    `}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.status === EvidenceStatus.SignedOff && (
                          <button
                            onClick={(e) => handlePDFClick(e, item)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown size={14} />
                          </button>
                        )}
                        {(item.status === EvidenceStatus.Draft ||
                          (item.status === EvidenceStatus.SignedOff && DELETABLE_COMPLETE_TYPES.includes(item.type))) && onDeleteEvidence && (
                            <button
                              onClick={(e) => handleDeleteClick(e, item.id)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center">
                        {item.status === EvidenceStatus.SignedOff ? (
                          <input
                            type="checkbox"
                            checked={selectedForExport.includes(item.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-white/20">–</span>
                        )}
                      </div>
                    </td>
                    {selectionMode && (
                      <td className="px-2 py-3 text-center">
                        <div className="flex justify-center">
                          <div className={`
                          w-4 h-4 rounded border flex items-center justify-center transition-all
                          ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-white/20 text-transparent'}
                        `}>
                            <CheckCircle2 size={10} strokeWidth={3} />
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-white/10 rounded-[2.5rem] relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Delete Evidence</h2>
                  <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1.5 uppercase tracking-[0.2em] font-black">Confirm Deletion</p>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to delete this evidence item? This action <span className="text-slate-900 dark:text-white font-bold underline decoration-rose-500/30">cannot be undone</span>.
                </p>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleDeleteConfirm}
                    className="w-full py-4 rounded-2xl bg-rose-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-600/30 hover:bg-rose-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                  >
                    <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>Delete Evidence</span>
                  </button>

                  <button
                    onClick={handleDeleteCancel}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Decorative background element */}
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Slide-Out Panel */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
          ></div>

          {/* Slide-out panel */}
          <div className="relative w-72 max-w-full bg-white dark:bg-slate-900 shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Filters</h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 dark:text-white/40"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Options */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-white/60 outline-none"
                >
                  <option value="All">All Types</option>
                  {Object.values(EvidenceType).filter(t => t !== EvidenceType.ARCPPrep).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">SIA</label>
                <select
                  value={filterSIA}
                  onChange={(e) => setFilterSIA(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-white/60 outline-none"
                >
                  <option value="All">All SIAs</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Year</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-white/60 outline-none"
                >
                  <option value="All">All Years</option>
                  {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-bold mb-2 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-white/60 outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '–';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getTypeColors = (type: EvidenceType) => {
  switch (type) {
    case EvidenceType.CbD: return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30';
    case EvidenceType.DOPs: return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30';
    case EvidenceType.OSATs: return 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/20 dark:border-orange-500/30';
    case EvidenceType.Reflection: return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30';
    case EvidenceType.CRS: return 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30';
    case EvidenceType.EPA: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
    case EvidenceType.EPAOperatingList: return 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30';
    case EvidenceType.MSF: return 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/20';
    case EvidenceType.CurriculumCatchUp: return 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30';
    case EvidenceType.FourteenFish: return 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/20 dark:border-teal-500/30';
    case EvidenceType.ARCPFullReview: return 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/20 dark:border-violet-500/30';
    case EvidenceType.ARCPInterimReview: return 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/20 dark:border-fuchsia-500/30';
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
