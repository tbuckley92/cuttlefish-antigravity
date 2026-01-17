
import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  CheckCircle2, AlertCircle, Info, Send, ArrowLeft, ChevronLeft, ChevronRight
} from '../components/Icons';

interface MSFResponseFormProps {
  traineeName: string;
  onSubmitted: (data: any) => void;
  onBack: () => void;
}

const STATEMENTS = [
  "Follows local guidelines on general cleanliness and avoidance of cross infection.",
  "Communicates well with patients, listening actively, and ensuring that clinical information is communicated honestly and in a way that is comprehensible to the patient.",
  "Obtains valid consent in an appropriate manner, ensuring that both risks and benefits are understood by patients.",
  "Communicates potentially upsetting information in an appropriate and sensitive manner.",
  "Communicates well with colleagues, both clinical and non‑clinical.",
  "Dictates letters clearly, and responds to administrative queries promptly.",
  "Complies with local policies for the approval of leave and makes appropriate arrangements for cover if unable to work because of sickness or other reasons.",
  "Shows appropriate empathy and compassion for patients.",
  "Respects the confidential nature of clinical information obtained from patients, and shows awareness of relevant principles.",
  "Works within the limits of their clinical competence, and seeks help/advice when appropriate.",
  "Treats all patients and colleagues with respect, avoiding discrimination; prioritises tasks appropriately and copes well when under stress."
];

const OPTIONS = [
  "They perform to a high standard in this area of practice.",
  "I have no concerns in this area of practice.",
  "I have some concerns in this area of practice.",
  "Not applicable (if you are unable to respond to any particular statement)."
];

export const MSFResponseForm: React.FC<MSFResponseFormProps> = ({ traineeName, onSubmitted, onBack }) => {
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [overallComments, setOverallComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Total steps: 11 statements + 1 final recommendations = 12 steps (indices 0-11)
  const totalSteps = STATEMENTS.length + 1;
  const isOnFinalStep = currentQuestion === STATEMENTS.length;

  const isComplete = STATEMENTS.every((_, idx) => selections[idx]) && overallComments.trim().length > 0;

  const handleSubmit = () => {
    if (!isComplete) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitted({ selections, comments, overallComments });
    }, 1500);
  };

  const goNext = () => {
    if (currentQuestion < totalSteps - 1) {
      setCurrentQuestion(q => q + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(q => q - 1);
    }
  };

  // Check if current statement has a response selected
  const currentStatementAnswered = !isOnFinalStep && selections[currentQuestion] !== undefined;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-8 duration-500 min-h-[calc(100vh-120px)] flex flex-col">
      {/* Compact Header Area */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="text-center flex-1">
          <h1 className="text-xl font-semibold text-slate-900">Multi-Source Feedback</h1>
          <p className="text-xs text-slate-500">Feedback for <b>{traineeName}</b></p>
        </div>
        <div className="w-16"></div> {/* Spacer for balance */}
      </div>

      {/* Compact Info Banner */}
      <div className="mb-4 p-3 bg-indigo-600/5 border border-indigo-600/10 rounded-xl flex items-center gap-3 text-left">
        <Info className="text-indigo-600 shrink-0" size={18} />
        <p className="text-xs text-slate-600 leading-snug">
          By completing this survey I declare that I am familiar with this clinician in a professional capacity.
        </p>
      </div>

      {/* Progress Indicator - Inline */}
      <div className="flex justify-center items-center gap-2 mb-4">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {currentQuestion + 1} / {totalSteps}
        </span>
        <div className="flex gap-1 items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${currentQuestion === i
                ? 'bg-indigo-500 scale-125'
                : i < currentQuestion
                  ? 'bg-teal-500'
                  : 'bg-slate-200'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card - Natural height */}
      <div className="mb-4">
        {!isOnFinalStep ? (
          <GlassCard key={currentQuestion} className="p-4 md:p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Question Header */}
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                {currentQuestion + 1}
              </span>
              <p className="text-sm md:text-base text-slate-800 leading-relaxed font-medium">{STATEMENTS[currentQuestion]}</p>
            </div>

            {/* Response Options - Compact */}
            <div className="space-y-1.5 ml-10">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block">
                Response <span className="text-rose-500">*</span>
              </label>
              {OPTIONS.map(opt => (
                <label
                  key={opt}
                  className={`
                    flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer
                    ${selections[currentQuestion] === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}
                  `}
                >
                  <input
                    type="radio"
                    name={`statement-${currentQuestion}`}
                    className="hidden"
                    onChange={() => setSelections(prev => ({ ...prev, [currentQuestion]: opt }))}
                  />
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selections[currentQuestion] === opt ? 'border-white' : 'border-slate-300'}`}>
                    {selections[currentQuestion] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                  <span className="text-xs font-medium leading-snug">{opt}</span>
                </label>
              ))}
            </div>

            {/* Optional Comments */}
            <div className="ml-10 pt-3 border-t border-slate-100">
              <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">
                Comments <span className="text-slate-300 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={comments[currentQuestion] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder="Add any specific context..."
                className="w-full min-h-[60px] max-h-[100px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs resize-none outline-none focus:border-indigo-500/40"
              />
            </div>
          </GlassCard>
        ) : (
          /* Final Recommendations Step */
          <GlassCard className="p-5 md:p-6 border-indigo-500/20 shadow-xl shadow-indigo-500/5 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Final Recommendations</h3>
            <label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
              Overall comments or recommendations <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              placeholder="Required overall feedback..."
              className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm resize-none outline-none focus:border-indigo-500/40 mb-4"
            />

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={!isComplete || isSubmitting}
                className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit response
                  </>
                )}
              </button>
              {!isComplete && (
                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle size={12} /> Answer all statements and provide comments
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Navigation Arrows - Fixed at bottom */}
      <div className="sticky bottom-0 z-10 py-4 bg-white/95 backdrop-blur-md border-t border-slate-100 -mx-4 px-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <button
          disabled={currentQuestion === 0}
          onClick={goPrev}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex gap-1.5 items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`transition-all duration-300 ${currentQuestion === i
                ? 'w-2 h-2 rounded-full bg-indigo-500 scale-125'
                : i < currentQuestion
                  ? 'w-1.5 h-1.5 rounded-full bg-teal-500'
                  : 'w-1.5 h-1.5 rounded-full bg-slate-200'
                }`}
            />
          ))}
        </div>

        {!isOnFinalStep ? (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all bg-indigo-600 text-white shadow-indigo-500/25 hover:bg-indigo-500 hover:scale-[1.02]"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <div className="w-28"></div> /* Spacer for alignment */
        )}
      </div>
    </div>
  );
};
