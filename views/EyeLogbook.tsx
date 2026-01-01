
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { UploadCloud, Eye, X, BarChart2, FileText, Search, ChevronLeft, ChevronRight, Grid, List, PieChart } from '../components/Icons';
import * as pdfjsLib from 'pdfjs-dist';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Updated data model for all procedures
interface LogbookEntry {
  procedure: string;
  side: string;           // L, R, B/L
  date: string;           // YYYY-MM-DD
  patientId: string;      // Patient ID
  role: string;           // P, PS, SJ, A
  hospital: string;       // Hospital name
  grade: string;          // ST1, ST2, ST3, ST4, ST5, ST6, ST7, etc.
}

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
  'P': 'Performed',
  'PS': 'Performed Supervised',
  'SJ': 'Supervised Junior',
  'A': 'Assisted'
};

// ESR Grid Categories and procedure mapping
const ESR_CATEGORIES: Record<string, string[]> = {
  'Cataract Surgery': ['Phacoemulsification', 'IOL', 'Cataract', 'ECCE', 'ICCE', 'Secondary IOL'],
  'Strabismus': ['Strabismus', 'Squint', 'Recession', 'Resection', 'Muscle surgery'],
  'Oculoplastic & Lacrimal': ['Eyelid', 'Entropion', 'Ectropion', 'Chalazion', 'DCR', 'Lacrimal', 'Blepharoplasty', 'Lid lesion', 'Cyst excision', 'Papilloma'],
  'Ptosis': ['Ptosis', 'Levator'],
  'Glaucoma': ['Trabeculectomy', 'Glaucoma', 'SLT', 'Iridotomy', 'Tube', 'Ahmed', 'Baerveldt', 'iStent', 'MIGS'],
  'Corneal Grafts': ['Corneal', 'DSAEK', 'DMEK', 'PK', 'DALK', 'Keratoplasty'],
  'Retinal Detachment & VR': ['Vitrectomy', 'Retinal detachment', 'Buckle', 'Cryo', 'PPV', 'Membrane peel', 'Macular hole'],
  'Retinal LASER': ['Retinal LASER', 'PRP', 'Focal laser', 'Photocoagulation'],
  'Intravitreal': ['Intravitreal', 'Anti-VEGF', 'Lucentis', 'Eylea', 'Avastin', 'Ozurdex', 'Triamcinolone'],
};

// Training grades for ESR Grid columns
const TRAINING_GRADES = ['ST1', 'ST2', 'ST3', 'ST4', 'ST5', 'ST6', 'ST7'];

// Roles for ESR Grid sub-rows
const ESR_ROLES = ['P', 'PS', 'A', 'SJ'];

type TimePeriod = 'LAST_MONTH' | 'LAST_6_MONTHS' | 'LAST_YEAR' | 'ALL_TIME' | 'CUSTOM';
type TabType = 'logbook' | 'esr-grid' | 'procedure-stats';

const ITEMS_PER_PAGE = 20;

const EyeLogbook: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>(() => {
    const savedEntries = localStorage.getItem('ophthaPortfolio_eyelogbook_entries');
    if (savedEntries) {
      try {
        return JSON.parse(savedEntries);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => {
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_timePeriod');
    return (saved as TimePeriod) || 'ALL_TIME';
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
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_filename');
    return saved || '';
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('ophthaPortfolio_eyelogbook_activeTab');
    return (saved as TabType) || 'logbook';
  });
  
  // Logbook table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Procedure Stats filter
  const [procedureFilter, setProcedureFilter] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist entries to localStorage whenever they change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_entries', JSON.stringify(entries));
    } else {
      localStorage.removeItem('ophthaPortfolio_eyelogbook_entries');
    }
  }, [entries]);

  // Persist time period preference
  useEffect(() => {
    localStorage.setItem('ophthaPortfolio_eyelogbook_timePeriod', timePeriod);
  }, [timePeriod]);

  // Persist custom dates
  useEffect(() => {
    if (customStartDate) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_customStartDate', customStartDate);
    } else {
      localStorage.removeItem('ophthaPortfolio_eyelogbook_customStartDate');
    }
    if (customEndDate) {
      localStorage.setItem('ophthaPortfolio_eyelogbook_customEndDate', customEndDate);
    } else {
      localStorage.removeItem('ophthaPortfolio_eyelogbook_customEndDate');
    }
  }, [customStartDate, customEndDate]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('ophthaPortfolio_eyelogbook_activeTab', activeTab);
  }, [activeTab]);

  // Parse YYYY-MM-DD date format to Date object
  const parseDate = (dateStr: string): Date | null => {
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    
    const date = new Date(year, month, day);
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    return date;
  };

  // Get ESR category for a procedure
  const getESRCategory = (procedure: string): string | null => {
    const procedureLower = procedure.toLowerCase();
    for (const [category, keywords] of Object.entries(ESR_CATEGORIES)) {
      for (const keyword of keywords) {
        if (procedureLower.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    return null;
  };

  const parsePDF = async (file: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extractedEntries: LogbookEntry[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items with positions
        const textItems: Array<{ text: string; x: number; y: number }> = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4] || 0,
          y: item.transform[5] || 0
        }));

        // Join all text for pattern matching
        const fullText = textItems.map(item => item.text).join(' ');
        
        // Generic pattern to find procedures with dates
        // Format: Procedure Name | Side | Date | Patient ID | Role | Grade | Hospital
        // We need to capture: procedure name, side, date, patient ID, role, grade, hospital
        
        // First, find all dates in YYYY-MM-DD format and work backwards/forwards to extract data
        const datePattern = /(\d{4}-\d{2}-\d{2})/g;
        let dateMatch;
        
        // Split text into segments that might represent rows
        const segments = fullText.split(/(?=\d{4}-\d{2}-\d{2})/);
        
        for (const segment of segments) {
          const dateMatch = segment.match(/^(\d{4}-\d{2}-\d{2})/);
          if (!dateMatch) continue;
          
          const dateStr = dateMatch[1];
          const parsedDate = parseDate(dateStr);
          if (!parsedDate) continue;
          
          // Look for procedure name before this segment in the full text
          const segmentIndex = fullText.indexOf(segment);
          const beforeSegment = fullText.substring(Math.max(0, segmentIndex - 200), segmentIndex);
          
          // Common procedure patterns
          const procedurePatterns = [
            /([A-Z][a-z]+(?:\s+[a-z]+)*(?:\s+with\s+[A-Z]+)?)\s*\|?\s*([LR]|B\/L)?\s*$/,
            /(Phacoemulsification with IOL)\s*\|?\s*([LR]|B\/L)?\s*$/i,
            /(Intravitreal injection[^|]*)\s*\|?\s*([LR]|B\/L)?\s*$/i,
            /(Vitrectomy[^|]*)\s*\|?\s*([LR]|B\/L)?\s*$/i,
            /(Trabeculectomy[^|]*)\s*\|?\s*([LR]|B\/L)?\s*$/i,
          ];
          
          let procedureName = '';
          let side = '';
          
          // Try to find procedure name from before the date
          for (const pattern of procedurePatterns) {
            const procMatch = beforeSegment.match(pattern);
            if (procMatch) {
              procedureName = procMatch[1].trim();
              side = procMatch[2] || '';
              break;
            }
          }
          
          // If no procedure found, try a more generic approach
          if (!procedureName) {
            // Look for text that ends with | or side indicator before the date
            const genericMatch = beforeSegment.match(/([A-Za-z][A-Za-z\s\-\/]+(?:with\s+\w+)?)\s*\|?\s*([LR]|B\/L)?\s*\|?\s*$/);
            if (genericMatch) {
              procedureName = genericMatch[1].trim();
              side = genericMatch[2] || '';
            }
          }
          
          if (!procedureName) continue;
          
          // Extract data after the date
          const afterDate = segment.substring(11); // Skip YYYY-MM-DD and space
          
          // Extract patient ID (usually digits, spaces, commas)
          const patientIdMatch = afterDate.match(/^\s*([\d\s,]+)/);
          const patientId = patientIdMatch ? patientIdMatch[1].trim().replace(/\s+/g, '') : '';
          
          // Extract role (P, PS, SJ, A)
          const rolePattern = /\s+(PS|SJ|P|A)\s+/;
          const roleMatch = afterDate.match(rolePattern);
          const role = roleMatch ? roleMatch[1] : 'P';
          
          // Extract grade (ST1-ST7, ASTO, TSC, OLT, etc.)
          const gradePattern = /\s+(ST[1-7]|ASTO|TSC|OLT|FY[12]|CT[12]|GP|SAS|Cons)\s+/i;
          const gradeMatch = afterDate.match(gradePattern);
          const grade = gradeMatch ? gradeMatch[1].toUpperCase() : '';
          
          // Extract hospital name
          const hospitalPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*(?:Hospital|Infirmary|Centre|Center|Eye Unit))/i;
          const hospitalMatch = afterDate.match(hospitalPattern);
          const hospital = hospitalMatch ? hospitalMatch[1].trim() : 'Unknown';
          
          extractedEntries.push({
            procedure: procedureName,
            side: side || '',
            date: parsedDate.toISOString().split('T')[0],
            patientId,
            role,
            hospital,
            grade: grade || ''
          });
        }
      }

      // If the above approach didn't work well, try the original specific pattern approach
      if (extractedEntries.length === 0) {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const textItems: Array<{ text: string; x: number; y: number }> = textContent.items.map((item: any) => ({
            text: item.str,
            x: item.transform[4] || 0,
            y: item.transform[5] || 0
          }));
          const fullText = textItems.map(item => item.text).join(' ');
          
          // Try original pattern for Phacoemulsification
          const procedurePattern = /([A-Za-z][A-Za-z\s\-\/]+(?:with\s+\w+)?)\s*\|?\s*([LR]|B\/L)?\s*\|?\s*(\d{4}-\d{2}-\d{2})/g;
          let match;
          
          while ((match = procedurePattern.exec(fullText)) !== null) {
            const procedureName = match[1].trim();
            const side = match[2] || '';
            const dateStr = match[3];
            const parsedDate = parseDate(dateStr);
            
            if (!parsedDate) continue;
            
            // Skip if procedure name is too short or just whitespace
            if (procedureName.length < 3) continue;
            
            const afterMatch = fullText.substring(match.index, match.index + 400);
            
            // Extract patient ID
            const patientIdMatch = afterMatch.match(/\d{4}-\d{2}-\d{2}\s+([\d\s,]+)/);
            const patientId = patientIdMatch ? patientIdMatch[1].trim().replace(/\s+/g, '') : '';
            
            // Extract role
            const rolePattern = /\d{4}-\d{2}-\d{2}\s+[\d\s,]+\s+(PS|SJ|P|A)\s+/;
            const roleMatch = afterMatch.match(rolePattern);
            const role = roleMatch ? roleMatch[1] : 'P';
            
            // Extract grade
            const gradePattern = /(ST[1-7]|ASTO|TSC|OLT|FY[12]|CT[12]|GP|SAS|Cons)/i;
            const gradeMatch = afterMatch.match(gradePattern);
            const grade = gradeMatch ? gradeMatch[1].toUpperCase() : '';
            
            // Extract hospital
            const hospitalPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*(?:Hospital|Infirmary|Centre|Center|Eye Unit))/i;
            const hospitalMatch = afterMatch.match(hospitalPattern);
            const hospital = hospitalMatch ? hospitalMatch[1].trim() : 'Unknown';
            
            extractedEntries.push({
              procedure: procedureName,
              side,
              date: parsedDate.toISOString().split('T')[0],
              patientId,
              role,
              hospital,
              grade
            });
          }
        }
      }

      setEntries(extractedEntries);
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
    setEntries([]);
    setFileName('');
    localStorage.removeItem('ophthaPortfolio_eyelogbook_entries');
    localStorage.removeItem('ophthaPortfolio_eyelogbook_filename');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get unique values for filters
  const uniqueProcedures = useMemo(() => {
    const procs = new Set(entries.map(e => e.procedure));
    return Array.from(procs).sort();
  }, [entries]);

  const uniqueGrades = useMemo(() => {
    const grades = new Set(entries.map(e => e.grade).filter(g => g));
    return Array.from(grades).sort();
  }, [entries]);

  // Filter entries based on time period
  const getTimeFilteredEntries = (entriesToFilter: LogbookEntry[]) => {
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

    return entriesToFilter.filter(entry => {
      const entryDate = new Date(entry.date);
      const afterStart = startDate === null || entryDate >= startDate;
      const beforeEnd = entryDate <= endDate;
      return afterStart && beforeEnd;
    });
  };

  // Filtered entries for Logbook table
  const filteredLogbookEntries = useMemo(() => {
    let filtered = getTimeFilteredEntries(entries);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.procedure.toLowerCase().includes(query) ||
        e.hospital.toLowerCase().includes(query) ||
        e.patientId.includes(query)
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(e => e.role === roleFilter);
    }
    
    if (sideFilter !== 'all') {
      filtered = filtered.filter(e => e.side === sideFilter);
    }
    
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(e => e.grade === gradeFilter);
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery, roleFilter, sideFilter, gradeFilter, timePeriod, customStartDate, customEndDate]);

  // Pagination
  const totalPages = Math.ceil(filteredLogbookEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredLogbookEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, sideFilter, gradeFilter, timePeriod, customStartDate, customEndDate]);

  // ESR Grid data calculation
  const esrGridData = useMemo(() => {
    const timeFiltered = getTimeFilteredEntries(entries);
    const grid: Record<string, Record<string, Record<string, number>>> = {};
    
    // Initialize grid structure
    for (const category of Object.keys(ESR_CATEGORIES)) {
      grid[category] = {};
      for (const role of ESR_ROLES) {
        grid[category][role] = {};
        for (const grade of TRAINING_GRADES) {
          grid[category][role][grade] = 0;
        }
      }
    }
    
    // Populate grid
    for (const entry of timeFiltered) {
      const category = getESRCategory(entry.procedure);
      if (!category) continue;
      
      const role = entry.role || 'P';
      const grade = entry.grade || '';
      
      // Only count if we have a valid grade in our list
      if (TRAINING_GRADES.includes(grade) && ESR_ROLES.includes(role)) {
        grid[category][role][grade]++;
      }
    }
    
    return grid;
  }, [entries, timePeriod, customStartDate, customEndDate]);

  // Calculate row totals for ESR Grid
  const getRowTotal = (category: string, role: string) => {
    return TRAINING_GRADES.reduce((sum, grade) => sum + (esrGridData[category]?.[role]?.[grade] || 0), 0);
  };

  // Calculate column totals for ESR Grid
  const getColumnTotal = (grade: string) => {
    let total = 0;
    for (const category of Object.keys(ESR_CATEGORIES)) {
      for (const role of ESR_ROLES) {
        total += esrGridData[category]?.[role]?.[grade] || 0;
      }
    }
    return total;
  };

  // Procedure Stats data
  const procedureStatsData = useMemo(() => {
    let filtered = getTimeFilteredEntries(entries);
    
    if (procedureFilter !== 'all') {
      filtered = filtered.filter(e => e.procedure === procedureFilter);
    }
    
    // Group by month
    const monthlyData: Record<string, number> = {};
    
    filtered.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Convert to array format for chart
    const chartData = Object.entries(monthlyData)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        count,
        sortKey: month
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, count }) => ({ month, count }));

    return chartData;
  }, [entries, procedureFilter, timePeriod, customStartDate, customEndDate]);

  // Role breakdown for Procedure Stats
  const procedureStatsRoleBreakdown = useMemo(() => {
    let filtered = getTimeFilteredEntries(entries);
    
    if (procedureFilter !== 'all') {
      filtered = filtered.filter(e => e.procedure === procedureFilter);
    }
    
    return filtered.reduce((acc, e) => {
      const role = e.role || 'P';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [entries, procedureFilter, timePeriod, customStartDate, customEndDate]);

  const totalStatsEntries = useMemo(() => {
    let filtered = getTimeFilteredEntries(entries);
    if (procedureFilter !== 'all') {
      filtered = filtered.filter(e => e.procedure === procedureFilter);
    }
    return filtered.length;
  }, [entries, procedureFilter, timePeriod, customStartDate, customEndDate]);

  // Tab navigation component
  const TabButton = ({ tab, label, icon }: { tab: TabType; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Eye size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Eye Logbook</h1>
            <p className="text-sm text-slate-500">Upload your EyeLogbook.co.uk summary PDF to view and analyze your surgical cases</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
              Upload Summary PDF
            </label>
            {!uploadedFile && !fileName ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <UploadCloud size={24} className="mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">
                  Click to upload PDF from EyeLogbook.co.uk
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{uploadedFile?.name || fileName}</p>
                    <p className="text-xs text-slate-500">
                      {entries.length} procedures extracted
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
            )}
            {isProcessing && (
              <p className="text-xs text-slate-500 text-center mt-2">Processing PDF...</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Tab Navigation */}
      {entries.length > 0 && (
        <div className="flex gap-2 mb-6">
          <TabButton tab="logbook" label="Logbook" icon={<List size={16} />} />
          <TabButton tab="esr-grid" label="ESR Grid" icon={<Grid size={16} />} />
          <TabButton tab="procedure-stats" label="Procedure Stats" icon={<PieChart size={16} />} />
        </div>
      )}

      {/* Logbook Tab */}
      {activeTab === 'logbook' && entries.length > 0 && (
        <div className="space-y-6">
          {/* Filters */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  Search
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search procedures, hospitals..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              
              {/* Role Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option value="all">All Roles</option>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{key} - {label}</option>
                  ))}
                </select>
              </div>
              
              {/* Side Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  Side
                </label>
                <select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option value="all">All Sides</option>
                  <option value="L">Left (L)</option>
                  <option value="R">Right (R)</option>
                  <option value="B/L">Bilateral (B/L)</option>
                </select>
              </div>
              
              {/* Grade Filter */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                  Grade
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Procedure</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Role</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Side</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Patient ID</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Grade</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Hospital</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map((entry, index) => (
                    <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{entry.procedure}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.role === 'P' || entry.role === 'PS' ? 'bg-green-100 text-green-700' :
                          entry.role === 'SJ' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{entry.side || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{entry.patientId || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{entry.grade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{entry.hospital}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogbookEntries.length)} of {filteredLogbookEntries.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ESR Grid Tab */}
      {activeTab === 'esr-grid' && entries.length > 0 && (
        <div className="space-y-6">
          {/* Time Period Filter for ESR Grid */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap gap-2">
              {(['ALL_TIME', 'LAST_YEAR', 'LAST_6_MONTHS', 'LAST_MONTH'] as TimePeriod[]).map(period => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                    timePeriod === period
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {period === 'LAST_MONTH' ? 'Last Month' :
                   period === 'LAST_6_MONTHS' ? 'Last 6 Months' : 
                   period === 'LAST_YEAR' ? 'Last Year' : 'All Time'}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* ESR Grid Table */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">RCOphth ESR Logbook Summary Grid</h2>
              <p className="text-sm text-slate-500">Cases by category, grade, and role</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 sticky left-0 bg-slate-100">Category</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2">Role</th>
                    {TRAINING_GRADES.map(grade => (
                      <th key={grade} className="text-center text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 min-w-[50px]">{grade}</th>
                    ))}
                    <th className="text-center text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 bg-indigo-50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(ESR_CATEGORIES).map((category, catIndex) => (
                    ESR_ROLES.map((role, roleIndex) => (
                      <tr 
                        key={`${category}-${role}`} 
                        className={`border-b border-slate-100 ${roleIndex === ESR_ROLES.length - 1 ? 'border-b-2 border-slate-200' : ''}`}
                      >
                        {roleIndex === 0 && (
                          <td 
                            rowSpan={ESR_ROLES.length} 
                            className="px-3 py-2 text-slate-900 font-medium align-top sticky left-0 bg-white border-r border-slate-100"
                          >
                            {category}
                          </td>
                        )}
                        <td className="px-3 py-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            role === 'P' || role === 'PS' ? 'bg-green-100 text-green-700' :
                            role === 'SJ' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {role}
                          </span>
                        </td>
                        {TRAINING_GRADES.map(grade => {
                          const count = esrGridData[category]?.[role]?.[grade] || 0;
                          return (
                            <td key={grade} className="text-center px-3 py-1.5 text-slate-600">
                              {count > 0 ? count : '-'}
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-1.5 font-bold text-indigo-600 bg-indigo-50">
                          {getRowTotal(category, role) || '-'}
                        </td>
                      </tr>
                    ))
                  ))}
                  {/* Column Totals */}
                  <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                    <td colSpan={2} className="px-3 py-2 text-slate-900 font-bold sticky left-0 bg-indigo-50">Total</td>
                    {TRAINING_GRADES.map(grade => (
                      <td key={grade} className="text-center px-3 py-2 font-bold text-indigo-600">
                        {getColumnTotal(grade) || '-'}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 font-bold text-indigo-700 bg-indigo-100">
                      {TRAINING_GRADES.reduce((sum, grade) => sum + getColumnTotal(grade), 0) || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Procedure Stats Tab */}
      {activeTab === 'procedure-stats' && entries.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Procedure Filter */}
            <GlassCard className="p-6">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">
                Procedure
              </label>
              <select
                value={procedureFilter}
                onChange={(e) => setProcedureFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500/50 transition-all mb-3"
              >
                <option value="all">All Procedures</option>
                {uniqueProcedures.map(proc => (
                  <option key={proc} value={proc}>{proc}</option>
                ))}
              </select>
            </GlassCard>

            {/* Time Period */}
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

            {/* Stats Summary */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart2 size={24} className="text-indigo-600" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    Total Cases
                  </p>
                  <p className="text-3xl font-bold text-slate-900">{totalStatsEntries}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {procedureFilter === 'all' ? 'All procedures' : procedureFilter}
              </p>
              
              {totalStatsEntries > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                    Role Breakdown
                  </p>
                  {/* P/PS Combined */}
                  {(() => {
                    const pCount = (procedureStatsRoleBreakdown['P'] || 0) + (procedureStatsRoleBreakdown['PS'] || 0);
                    const percentage = totalStatsEntries > 0 ? Math.round((pCount / totalStatsEntries) * 100) : 0;
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
                  {/* SJ */}
                  {(procedureStatsRoleBreakdown['SJ'] || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          SJ
                        </span>
                        <span className="text-xs text-slate-600">Supervised Junior</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{procedureStatsRoleBreakdown['SJ']}</span>
                        <span className="text-xs text-slate-400">({Math.round(((procedureStatsRoleBreakdown['SJ'] || 0) / totalStatsEntries) * 100)}%)</span>
                      </div>
                    </div>
                  )}
                  {/* A */}
                  {(procedureStatsRoleBreakdown['A'] || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          A
                        </span>
                        <span className="text-xs text-slate-600">Assisted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{procedureStatsRoleBreakdown['A']}</span>
                        <span className="text-xs text-slate-400">({Math.round(((procedureStatsRoleBreakdown['A'] || 0) / totalStatsEntries) * 100)}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Chart */}
          {procedureStatsData.length > 0 && (
            <GlassCard className="p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Cases by Month</h2>
                <p className="text-sm text-slate-500">
                  {procedureFilter === 'all' ? 'All procedures' : procedureFilter} over selected period
                </p>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={procedureStatsData}>
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
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && !isProcessing && (
        <GlassCard className="p-8 text-center">
          <Eye size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Upload a PDF from EyeLogbook.co.uk to get started</p>
        </GlassCard>
      )}
    </div>
  );
};

export default EyeLogbook;
