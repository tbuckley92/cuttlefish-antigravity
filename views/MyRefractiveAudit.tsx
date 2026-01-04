import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Trash2, Search, Filter, AlertCircle } from '../components/Icons';
import { RefractiveAuditEntry, formatDiopter } from '../constants/refractiveAudit';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';

interface MyRefractiveAuditProps {
  onBack: () => void;
  userId?: string;
}

export const MyRefractiveAudit: React.FC<MyRefractiveAuditProps> = ({ onBack, userId }) => {
  const [entries, setEntries] = useState<RefractiveAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch entries
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setIsLoading(false);
      return;
    }

    const fetchEntries = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('refractive_audit_entries')
          .select('*')
          .eq('resident_user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setEntries(data || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load entries. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    setDeletingId(id);
    try {
      if (!supabase) throw new Error('Database not configured');
      
      const { error } = await supabase
        .from('refractive_audit_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    if (entries.length === 0) return;

    const headers = [
      'Date', 'Patient ID', 'DOB',
      'VA Right', 'VA Left',
      'Sph Right', 'Sph Left',
      'Cyl Right', 'Cyl Left',
      'Axis Right', 'Axis Left',
      'Vision Change Right', 'Vision Change Left'
    ];

    const rows = entries.map(e => [
      new Date(e.created_at).toLocaleDateString(),
      e.patient_id,
      e.patient_dob,
      e.va_right,
      e.va_left,
      formatDiopter(e.sph_right),
      formatDiopter(e.sph_left),
      formatDiopter(e.cyl_right),
      formatDiopter(e.cyl_left),
      e.axis_right.toString(),
      e.axis_left.toString(),
      e.vision_change_right,
      e.vision_change_left
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refractive-audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter entries by search term and date range
  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
    const entryDate = new Date(e.created_at);
    const matchesDateFrom = !dateFrom || entryDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || entryDate <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  // Stats
  const stats = {
    total: entries.length,
    betterRight: entries.filter(e => e.vision_change_right === 'better').length,
    betterLeft: entries.filter(e => e.vision_change_left === 'better').length,
    worseRight: entries.filter(e => e.vision_change_right === 'worse').length,
    worseLeft: entries.filter(e => e.vision_change_left === 'worse').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Refractive Audit</h1>
            <p className="text-slate-500 text-sm">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded
            </p>
          </div>
        </div>
        
        <button
          onClick={handleExportCsv}
          disabled={entries.length === 0}
          className="flex items-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 
                   disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-sm text-slate-500">Total Entries</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-700">{stats.betterRight + stats.betterLeft}</p>
          <p className="text-sm text-emerald-600">Vision Better</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-700">
            {entries.filter(e => e.vision_change_right === 'same' || e.vision_change_left === 'same').length}
          </p>
          <p className="text-sm text-amber-600">Vision Same</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-700">{stats.worseRight + stats.worseLeft}</p>
          <p className="text-sm text-red-600">Vision Worse</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="self-end px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
          <Filter size={32} className="text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            {searchTerm ? 'No entries match your search' : 'No entries yet'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {searchTerm ? 'Try a different search term' : 'Entries will appear here when opticians submit data'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">VA (R/L)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sphere (R/L)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cyl (R/L)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Axis (R/L)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vision Δ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{entry.patient_id}</p>
                      <p className="text-xs text-slate-500">{entry.patient_dob}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-900">{entry.va_right}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-sm text-slate-900">{entry.va_left}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-900">{formatDiopter(entry.sph_right)}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-sm text-slate-900">{formatDiopter(entry.sph_left)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-900">{formatDiopter(entry.cyl_right)}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-sm text-slate-900">{formatDiopter(entry.cyl_left)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-900">{entry.axis_right}°</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-sm text-slate-900">{entry.axis_left}°</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <VisionBadge value={entry.vision_change_right} />
                        <VisionBadge value={entry.vision_change_left} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                      >
                        {deletingId === entry.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Vision change badge component
const VisionBadge: React.FC<{ value: 'better' | 'same' | 'worse' }> = ({ value }) => {
  const styles = {
    better: 'bg-emerald-100 text-emerald-700',
    same: 'bg-amber-100 text-amber-700',
    worse: 'bg-red-100 text-red-700',
  };
  
  const labels = {
    better: '↑',
    same: '=',
    worse: '↓',
  };

  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${styles[value]}`}>
      {labels[value]}
    </span>
  );
};

export default MyRefractiveAudit;
