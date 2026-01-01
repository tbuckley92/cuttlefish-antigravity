
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { UploadCloud, Eye, X, BarChart2, FileText } from '../components/Icons';
import * as pdfjsLib from 'pdfjs-dist';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PhacoCase {
  date: string; // Stored as ISO string for Date object compatibility
  procedure: string;
  side: string;
  role: string; // P = Performed, PS = Performed Supervised, SJ = Supervised Junior, A = Assisted
  hospital: string;
}

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
  'P': 'Performed',
  'PS': 'Performed Supervised',
  'SJ': 'Supervised Junior',
  'A': 'Assisted'
};

type TimePeriod = 'LAST_MONTH' | 'LAST_6_MONTHS' | 'LAST_YEAR' | 'ALL_TIME' | 'CUSTOM';

const EyeLogbook: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [cases, setCases] = useState<PhacoCase[]>(() => {
    // Load cases from localStorage on mount
    const savedCases = localStorage.getItem('ophthaPortfolio_eyelogbook_cases');
    if (savedCases) {
      try {
        return JSON.parse(savedCases);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => {
    // Load time period preference from localStorage
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_timePeriod');
    return (saved as TimePeriod) || 'LAST_YEAR';
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_customStartDate');
    return saved || '';
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_customEndDate');
    return saved || '';
  });
  const [fileName, setFileName] = useState<string>(() => {
    // Load filename from localStorage
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_filename');
    return saved || '';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist cases to localStorage whenever they change
  useEffect(() => {
    if (cases.length > 0) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_cases', JSON.stringify(cases));
    }
  }, [cases]);

  // Persist time period preference
  useEffect(() => {
    localStorage.setItem('ophthaPortfolio_eyelogbook_timePeriod', timePeriod);
  }, [timePeriod]);

  // Persist custom dates
  useEffect(() => {
    if (customStartDate) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_customStartDate', customStartDate);
    }
    if (customEndDate) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_customEndDate', customEndDate);
    }
  }, [customStartDate, customEndDate]);

  // Parse YYYY-MM-DD date format to Date object (EyeLogbook.co.uk format)
  const parseDate = (dateStr: string): Date | null => {
    // Match YYYY-MM-DD format (actual format from EyeLogbook.co.uk)
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(match[3], 10);
    
    const date = new Date(year, month, day);
    // Validate the date
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    return date;
  };

  const parsePDF = async (file: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extractedCases: PhacoCase[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items
        const textItems: Array<{ text: string; x: number; y: number }> = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4] || 0,
          y: item.transform[5] || 0
        }));

        // Join all text for pattern matching
        const fullText = textItems.map(item => item.text).join(' ');
        
        // Use regex to find all occurrences of the procedure with date and role
        // Pattern: "Phacoemulsification with IOL" followed by side (L/R/B/L), date (YYYY-MM-DD), patient ID, and role (P/PS/SJ/A)
        const procedurePattern = /Phacoemulsification with IOL\s*\|?\s*([LR]|B\/L)?\s*\|?\s*(\d{4}-\d{2}-\d{2})/g;
        let match;
        
        while ((match = procedurePattern.exec(fullText)) !== null) {
          const side = match[1] || '';
          const dateStr = match[2];
          const parsedDate = parseDate(dateStr);
          
          if (parsedDate) {
            // Extract text after the date to find role and hospital
            const afterMatch = fullText.substring(match.index, match.index + 300);
            
            // Look for role pattern: after patient ID (digits/spaces), find P, PS, SJ, or A
            // The role appears between the patient ID and hospital name
            // Pattern: date followed by patient ID (digits, spaces, commas) then role code
            // Note: PS and SJ must come before P and A to match the longer codes first
            const rolePattern = /\d{4}-\d{2}-\d{2}\s+[\d\s,]+\s+(PS|SJ|P|A)\s+[A-Z]/;
            const roleMatch = afterMatch.match(rolePattern);
            const role = roleMatch ? roleMatch[1] : 'P'; // Default to 'P' if not found
            
            // Try to extract hospital name from nearby text
            const hospitalMatch = afterMatch.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Hospital)/);
            const hospital = hospitalMatch ? hospitalMatch[1] : 'Unknown';
            
            // Store date as ISO string for consistency
            extractedCases.push({
              date: parsedDate.toISOString().split('T')[0],
              procedure: 'Phacoemulsification with IOL',
              side,
              role,
              hospital
            });
          }
        }
      }

      // Keep all cases (don't deduplicate - each row is a separate procedure)
      setCases(extractedCases);
      // Save filename to localStorage
      localStorage.setItem('ophthaPortfolio_eyelogbook_filename', file.name);
      setFileName(file.name);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      alert('Error parsing PDF. Please ensure the file is a valid EyeLogbook PDF from EyeLogbook.co.uk');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      setUploadedFile(file);
      await parsePDF(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setCases([]);
    setFileName('');
    localStorage.removeItem('ophthaPortfolio_eyelogbook_cases');
    localStorage.removeItem('ophthaPortfolio_eyelogbook_filename');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Process cases for chart display
  const getChartData = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = now;
    
    switch (timePeriod) {
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'LAST_6_MONTHS':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'LAST_YEAR':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      case 'ALL_TIME':
        startDate = null; // No start date filter
        break;
      case 'CUSTOM':
        startDate = customStartDate ? new Date(customStartDate) : null;
        endDate = customEndDate ? new Date(customEndDate) : now;
        break;
    }

    // Filter cases by date range
    const filteredCases = cases.filter(caseItem => {
      const caseDate = new Date(caseItem.date);
      const afterStart = startDate === null || caseDate >= startDate;
      const beforeEnd = caseDate <= endDate;
      return afterStart && beforeEnd;
    });

    // Group by month
    const monthlyData: Record<string, number> = {};
    
    filteredCases.forEach(caseItem => {
      const date = new Date(caseItem.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Convert to array format for chart
    const chartData = Object.entries(monthlyData)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        count
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return chartData;
  };

  const chartData = getChartData();
  
  // Get filtered cases for the selected time period
  const getFilteredCases = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = now;
    
    switch (timePeriod) {
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'LAST_6_MONTHS':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'LAST_YEAR':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      case 'ALL_TIME':
        startDate = null;
        break;
      case 'CUSTOM':
        startDate = customStartDate ? new Date(customStartDate) : null;
        endDate = customEndDate ? new Date(customEndDate) : now;
        break;
    }
    
    return cases.filter(c => {
      const caseDate = new Date(c.date);
      const afterStart = startDate === null || caseDate >= startDate;
      const beforeEnd = caseDate <= endDate;
      return afterStart && beforeEnd;
    });
  };
  
  const filteredCases = getFilteredCases();
  const totalCases = filteredCases.length;
  
  // Calculate role breakdown
  const roleBreakdown = filteredCases.reduce((acc, c) => {
    const role = c.role || 'P';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Eye size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Eye Logbook</h1>
            <p className="text-sm text-slate-500">Upload your EyeLogbook.co.uk summary PDF to visualize Phacoemulsification with IOL cases</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <GlassCard className="p-6">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
            Upload Summary PDF
          </label>
          {!uploadedFile && !fileName ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden" 
              />
              <UploadCloud size={32} className="mb-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">
                Click to upload PDF
              </p>
              <p className="text-xs text-slate-400 mt-1">From EyeLogbook.co.uk</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{uploadedFile?.name || fileName}</p>
                    <p className="text-xs text-slate-500">
                      {cases.length} Phacoemulsification with IOL cases extracted
                    </p>
                  </div>
                </div>
                <button 
                  onClick={removeFile}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-rose-500"
                >
                  <X size={18} />
                </button>
              </div>
              {isProcessing && (
                <p className="text-xs text-slate-500 text-center">Processing PDF...</p>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">
            Time Period
          </label>
          <div className="flex flex-col gap-2">
            {(['LAST_MONTH', 'LAST_6_MONTHS', 'LAST_YEAR', 'ALL_TIME', 'CUSTOM'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                  timePeriod === period
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {period === 'LAST_MONTH' ? 'Last Month' :
                 period === 'LAST_6_MONTHS' ? 'Last 6 Months' : 
                 period === 'LAST_YEAR' ? 'Last Year' :
                 period === 'ALL_TIME' ? 'All Time' : 'Custom Range'}
              </button>
            ))}
          </div>
          
          {timePeriod === 'CUSTOM' && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 size={24} className="text-indigo-600" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Total Cases
              </p>
              <p className="text-3xl font-bold text-slate-900">{totalCases}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Phacoemulsification with IOL procedures
          </p>
          
          {totalCases > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Role Breakdown
              </p>
              {/* P/PS Combined - Performed cases */}
              {(() => {
                const pCount = (roleBreakdown['P'] || 0) + (roleBreakdown['PS'] || 0);
                const percentage = totalCases > 0 ? Math.round((pCount / totalCases) * 100) : 0;
                if (pCount === 0) return null;
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                        P/PS
                      </span>
                      <span className="text-xs text-slate-600">Performed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{pCount}</span>
                      <span className="text-xs text-slate-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })()}
              {/* SJ - Supervised Junior */}
              {(roleBreakdown['SJ'] || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                      SJ
                    </span>
                    <span className="text-xs text-slate-600">Supervised Junior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{roleBreakdown['SJ']}</span>
                    <span className="text-xs text-slate-400">({Math.round(((roleBreakdown['SJ'] || 0) / totalCases) * 100)}%)</span>
                  </div>
                </div>
              )}
              {/* A - Assisted */}
              {(roleBreakdown['A'] || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      A
                    </span>
                    <span className="text-xs text-slate-600">Assisted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{roleBreakdown['A']}</span>
                    <span className="text-xs text-slate-400">({Math.round(((roleBreakdown['A'] || 0) / totalCases) * 100)}%)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {chartData.length > 0 && (
        <GlassCard className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cases by Month</h2>
            <p className="text-sm text-slate-500">
              Phacoemulsification with IOL cases performed over selected period
            </p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#4f46e5" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {cases.length === 0 && uploadedFile && !isProcessing && (
        <GlassCard className="p-8 text-center">
          <p className="text-slate-500">No Phacoemulsification with IOL cases found in the PDF.</p>
        </GlassCard>
      )}
    </div>
  );
};

export default EyeLogbook;
