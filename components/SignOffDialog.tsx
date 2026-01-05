
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { X, CheckCircle2, User } from './Icons';

interface Particle {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  size: number;
}

interface SignOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gmc: string, name: string, email: string, signature: string) => void;
  formInfo: {
    type: string;
    traineeName: string;
    date: string;
    supervisorName: string;
    supervisorEmail?: string; // Pre-populate if available
  };
}

export const SignOffDialog: React.FC<SignOffDialogProps> = ({ isOpen, onClose, onConfirm, formInfo }) => {
  const [gmc, setGmc] = useState('');
  const [supervisorName, setSupervisorName] = useState(formInfo.supervisorName || '');
  const [supervisorEmail, setSupervisorEmail] = useState(formInfo.supervisorEmail || '');
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleTimerRef = useRef<number | null>(null);

  // Sync state with formInfo props when dialog opens or props change
  useEffect(() => {
    if (isOpen) {
      setSupervisorName(formInfo.supervisorName || '');
      setSupervisorEmail(formInfo.supervisorEmail || '');
    }
  }, [isOpen, formInfo.supervisorName, formInfo.supervisorEmail]);

  if (!isOpen) return null;

  const triggerBurst = () => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Clear any existing timer
    if (particleTimerRef.current) {
      clearTimeout(particleTimerRef.current);
    }

    const newParticles: Particle[] = [
      {
        id: Date.now(),
        emoji: '🎉',
        dx: -50,
        dy: -40,
        rot: -15,
        delay: 0,
        size: 24,
      },
      {
        id: Date.now() + 1,
        emoji: '👁️',
        dx: 50,
        dy: -40,
        rot: 15,
        delay: 50,
        size: 24,
      },
    ];

    setParticles(newParticles);

    // Clear particles after animation completes
    particleTimerRef.current = window.setTimeout(() => {
      setParticles([]);
    }, 900);
  };

  const handleConfirm = () => {
    triggerBurst();
    // Delay closing the dialog so the emoji burst animation can play
    setTimeout(() => {
      onConfirm(gmc, supervisorName, supervisorEmail, 'gmc-only');
    }, 800);
  };

  const canSubmit = gmc.trim().length > 0 && supervisorName.trim().length > 0 && supervisorEmail.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-6 md:p-8 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 border-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign off assessment</h2>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest font-black">Co-present validation</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6 space-y-2 border border-slate-100 dark:border-white/5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Assessment</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.type}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Trainee</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.traineeName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Supervisor</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.supervisorName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Date</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.date}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">GMC Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={gmc}
                  onChange={(e) => setGmc(e.target.value)}
                  placeholder="Enter 7-digit GMC"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Supervisor Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="Enter Full Name"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Supervisor Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="Enter Email Address"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="pt-4">
              <style>{`
                @keyframes emojiBurst {
                  0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.5);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1);
                  }
                }
                .emoji-burst-particle {
                  animation: emojiBurst 0.8s ease-out forwards;
                  animation-delay: var(--delay);
                }
                @media (prefers-reduced-motion: reduce) {
                  .emoji-burst-particle {
                    animation: none;
                    opacity: 0;
                  }
                }
              `}</style>
              <div className="relative">
                <button
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Confirm sign off
                </button>
                {particles.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {particles.map((p) => (
                      <span
                        key={p.id}
                        className="emoji-burst-particle absolute left-1/2 top-1/2"
                        style={{
                          '--dx': `${p.dx}px`,
                          '--dy': `${p.dy}px`,
                          '--rot': `${p.rot}deg`,
                          '--delay': `${p.delay}ms`,
                          fontSize: `${p.size}px`,
                        } as React.CSSProperties}
                      >
                        {p.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full mt-2 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
