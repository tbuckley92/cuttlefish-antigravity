
import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  ArrowLeft, ClipboardCheck, Activity, Scissors, 
  BarChart2, FileText, Users, ChevronRight
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
    icon: <ClipboardCheck size={32} />,
    color: 'text-teal-500'
  },
  { 
    id: 'DOPs', 
    label: 'DOPs', 
    subtitle: 'Direct Observation of Procedural Skills',
    icon: <Activity size={32} />,
    color: 'text-purple-500'
  },
  { 
    id: 'OSATs', 
    label: 'OSATS', 
    subtitle: 'Objective Structured Assessment of Technical Skills',
    icon: <Scissors size={32} />,
    color: 'text-orange-500'
  },
  { 
    id: 'CRS', 
    label: 'CRS', 
    subtitle: 'Clinical Rating Scale',
    icon: <BarChart2 size={32} />,
    color: 'text-blue-500'
  },
  { 
    id: 'MAR', 
    label: 'MAR', 
    subtitle: 'Management of Acute Referral',
    icon: <FileText size={32} />,
    color: 'text-emerald-500'
  },
  { 
    id: 'MSF', 
    label: 'MSF', 
    subtitle: 'Multi-Source Feedback',
    icon: <Users size={32} />,
    color: 'text-indigo-500'
  },
];

const RecordForm: React.FC<RecordFormProps> = ({ onBack, onSelectForm }) => {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-white/40">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white/90">Record a new form</h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Select the assessment type to start a new draft</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {formTypes.map((form) => (
          <GlassCard 
            key={form.id} 
            onClick={() => onSelectForm(form.id)}
            className="aspect-square flex flex-col items-center justify-center p-8 group relative overflow-hidden text-center"
          >
            {/* Background Accent Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-current opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none ${form.color}`}></div>
            
            <div className={`mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 ${form.color}`}>
              {form.icon}
            </div>
            
            <h3 className="text-xl font-black tracking-widest text-slate-800 dark:text-white/90 mb-2 uppercase">
              {form.label}
            </h3>
            
            <p className="text-xs text-slate-400 dark:text-white/30 font-medium uppercase tracking-tighter leading-tight opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              {form.subtitle}
            </p>

            <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
               <ChevronRight size={18} className={form.color} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-xs text-slate-400 dark:text-white/20 uppercase tracking-[0.2em] font-bold">
          All forms are created as draft and can be linked later
        </p>
      </div>
    </div>
  );
};

export default RecordForm;
