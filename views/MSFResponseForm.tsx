
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
    <div className="max-w-4xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Submission View
        </button>
      </div>

      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Multi-Source Feedback</h1>
        <p className="text-slate-500">Feedback for <b>{traineeName}</b></p>

        <div className="mt-8 p-6 bg-indigo-600/5 border border-indigo-600/10 rounded-3xl flex items-center gap-4 text-left max-w-2xl mx-auto">
          <Info className="text-indigo-600 shrink-0" size={24} />
          <p className="text-sm text-slate-600 leading-relaxed">
            By completing this survey I declare that I am familiar with this clinician in a professional capacity.
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center items-center gap-2 mb-8">
        <span className="text-xs text-slate-400 font-medium">
          {currentQuestion + 1} of {totalSteps}
        </span>
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={`w-2 h-2 rounded-full transition-all ${currentQuestion === i
                  ? 'bg-indigo-500 scale-125'
                  : i < currentQuestion
                    ? 'bg-teal-500'
                    : 'bg-slate-200'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card - Single Question View */}
      <div className="mb-8">
        {!isOnFinalStep ? (
          <GlassCard key={currentQuestion} className="p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                {currentQuestion + 1}
              </span>
              <p className="text-lg text-slate-800 leading-relaxed">{STATEMENTS[currentQuestion]}</p>
            </div>

            <div className="space-y-2 ml-12">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
                Response <span className="text-rose-500">*</span>
              </label>
              {OPTIONS.map(opt => (
                <label
                  key={opt}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
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
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selections[currentQuestion] === opt ? 'border-white' : 'border-slate-300'}`}>
                    {selections[currentQuestion] === opt && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                  <span className="text-sm font-medium">{opt}</span>
                </label>
              ))}
            </div>

            <div className="ml-12 pt-4 border-t border-slate-100">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
                Comments <span className="text-slate-300 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={comments[currentQuestion] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder="Add any specific context or examples..."
                className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm resize-none outline-none focus:border-indigo-500/40"
              />
            </div>
          </GlassCard>
        ) : (
          /* Final Recommendations Step */
          <GlassCard className="p-8 md:p-12 border-indigo-500/20 shadow-xl shadow-indigo-500/5 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Final Recommendations</h3>
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">
              Please add any overall comments or recommendations <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              placeholder="Required overall feedback..."
              className="w-full min-h-[160px] bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm resize-none outline-none focus:border-indigo-500/40 mb-8"
            />

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={!isComplete || isSubmitting}
                className="px-12 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} /> Submit response
                  </>
                )}
              </button>
              {!isComplete && (
                <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle size={14} /> Please answer all statements and provide overall comments
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Navigation Arrows */}
      <div className="flex justify-between items-center">
        <button
          disabled={currentQuestion === 0}
          onClick={goPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div className="flex gap-1.5 items-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${currentQuestion === i
                  ? 'bg-indigo-500 scale-125'
                  : i < currentQuestion
                    ? 'bg-teal-500'
                    : 'bg-slate-200'
                }`}
            />
          ))}
        </div>

        {!isOnFinalStep && (
          <button
            onClick={goNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${currentStatementAnswered
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Next <ChevronRight size={18} />
          </button>
        )}

        {isOnFinalStep && (
          <div className="w-24"></div> /* Spacer for alignment */
        )}
      </div>
    </div>
  );
};
