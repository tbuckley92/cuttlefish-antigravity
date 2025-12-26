
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { X, CheckCircle2, User } from './Icons';

interface SignOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gmc: string, signature: string) => void;
  formInfo: {
    type: string;
    traineeName: string;
    date: string;
    supervisorName: string;
  };
}

export const SignOffDialog: React.FC<SignOffDialogProps> = ({ isOpen, onClose, onConfirm, formInfo }) => {
  const [gmc, setGmc] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#312e81'; // Indigo-900
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setIsCanvasDirty(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsCanvasDirty(false);
    }
  };

  const handleConfirm = () => {
    if (gmc.trim() || isCanvasDirty) {
      onConfirm(gmc, isCanvasDirty ? 'drawn-signature' : 'gmc-only');
    }
  };

  const canSubmit = gmc.trim().length > 0 || isCanvasDirty;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-8 duration-300">
        <GlassCard className="p-6 md:p-8 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-white/10">
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
              <span className="text-slate-400 font-bold uppercase">Assessment</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.type}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase">Trainee</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.traineeName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase">Supervisor</span>
              <span className="text-slate-900 dark:text-white font-medium">{formInfo.supervisorName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase">Date</span>
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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
              <span className="text-[9px] font-black text-slate-300 dark:text-white/20 tracking-[0.2em] uppercase">And / Or</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block flex justify-between">
                Signature 
                <button onClick={clearCanvas} className="text-indigo-500 hover:text-indigo-600 transition-colors">Clear</button>
              </label>
              <div className="relative group">
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[120px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl cursor-crosshair touch-none"
                />
                {!isCanvasDirty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                    <p className="text-xs text-slate-500 italic">Draw signature here</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleConfirm}
                disabled={!canSubmit}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Confirm sign off
              </button>
              <button 
                onClick={onClose}
                className="w-full mt-2 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
