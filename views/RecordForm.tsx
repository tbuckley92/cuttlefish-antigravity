
import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ClipboardCheck, Activity, Scissors, 
  BarChart2, FileText, Users, ChevronRight, BookOpen, Clipboard
} from '../components/Icons';

interface RecordFormProps {
  onBack: () => void;
  onSelectForm: (type: string) => void;
}

const formTypes = [
  { 
    id: 'EPA', 
    label: 'EPA', 
    subtitle: 'Entrustable Professional Activity',
    icon: <ClipboardCheck size={24} />,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/5'
  },
  { 
    id: 'GSAT', 
    label: 'GSAT', 
    subtitle: 'Generic Skills Assessment Tool',
    icon: <BookOpen size={24} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600/5'
  },
  { 
    id: 'CBD', 
    label: 'CBD', 
    subtitle: 'Case-Based Discussion',
    icon: <Clipboard size={24} />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5'
  },
  { 
    id: 'DOPs', 
    label: 'DOPs', 
    subtitle: 'Direct Observation of Procedural Skills',
    icon: <Activity size={24} />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/5'
  },
  { 
    id: 'OSATs', 
    label: 'OSATS', 
    subtitle: 'Objective Structured Assessment of Technical Skills',
    icon: <Scissors size={24} />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/5'
  },
  { 
    id: 'CRS', 
    label: 'CRS', 
    subtitle: 'Clinical Rating Scale',
    icon: <BarChart2 size={24} />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5'
  },
  { 
    id: 'MAR', 
    label: 'MAR', 
    subtitle: 'Management of Acute Referral',
    icon: <FileText size={24} />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5'
  },
  { 
    id: 'MSF', 
    label: 'MSF', 
    subtitle: 'Multi-Source Feedback',
    icon: <Users size={24} />,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/5'
  },
];

const RecordForm: React.FC<RecordFormProps> = ({ onBack, onSelectForm }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 md:px-8 lg:px-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white/90 tracking-tight">Record a new form</h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Select assessment type to begin a new entry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {formTypes.map((form) => (
          <GlassCard 
            key={form.id} 
            onClick={() => onSelectForm(form.id)}
            className="flex items-center p-5 group relative overflow-hidden transition-all border-slate-200 dark:border-white/10 hover:shadow-xl"
          >
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-current opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none ${form.color}`}></div>
            
            {/* Icon Container */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${form.bgColor} ${form.color} border border-transparent group-hover:border-current/10`}>
              {form.icon}
            </div>
            
            {/* Content Container */}
            <div className="ml-5 flex-1 min-w-0">
              <h3 className="text-sm font-black tracking-[0.15em] text-slate-800 dark:text-white uppercase">
                {form.label}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-white/40 font-medium truncate uppercase tracking-tight mt-0.5">
                {form.subtitle}
              </p>
            </div>

            {/* Action Indicator */}
            <div className="ml-4 flex-shrink-0 transition-all duration-300 transform group-hover:translate-x-1 opacity-0 group-hover:opacity-100">
               <ChevronRight size={18} className={form.color} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
          <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] font-black">
            Forms are saved as drafts and can be completed later
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecordForm;
