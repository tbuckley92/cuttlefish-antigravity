
import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { ArrowLeft, AlertCircle } from '../components/Icons';

interface PlaceholderFormProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

const PlaceholderForm: React.FC<PlaceholderFormProps> = ({ title, subtitle, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-right-8 duration-300">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Back to Record Form
      </button>

      <GlassCard className="p-12 md:p-20 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/20 mb-8">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white/90 mb-2">{title}</h2>
        <p className="text-slate-500 dark:text-white/40 uppercase tracking-widest text-xs font-bold mb-6">{subtitle}</p>
        <p className="text-sm text-slate-600 dark:text-white/60 max-w-sm leading-relaxed">
          This form is currently being developed. You can create a draft record, but the full clinical metadata fields will be available in the next update.
        </p>
        <button 
          onClick={onBack}
          className="mt-10 px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
        >
          Return to Hub
        </button>
      </GlassCard>
    </div>
  );
};

export default PlaceholderForm;
