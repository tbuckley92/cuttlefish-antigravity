import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Logo } from '../components/Logo';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { sendNotificationEmail } from '../utils/emailUtils';
import { Mail, Lock } from '../components/Icons';

type Mode = 'sign-in' | 'sign-up';

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);



  const disabled = !email.trim() || !password || isBusy;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        // Send welcome email (fire and forget - don't block on result)
        sendNotificationEmail({
          type: 'welcome',
          recipientEmail: email.trim(),
        }).catch(err => console.warn('Welcome email failed:', err));

        setInfo('Account created. If email confirmation is enabled, please confirm via email then sign in.');
        setMode('sign-in');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setIsBusy(false);
    }
  };



  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-slate-200">
              <Logo size={24} className="text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-900">EyePortfolio</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                Supabase login
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 shadow-inner mb-6">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`py-2 rounded-xl text-[11px] font-black tracking-widest transition-all ${mode === 'sign-in' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`py-2 rounded-xl text-[11px] font-black tracking-widest transition-all ${mode === 'sign-up' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              SIGN UP
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 text-sm">
              {info}
            </div>
          )}



          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={disabled}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-60"
            >
              {isBusy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-6 text-xs text-slate-500">
              Configure Supabase by copying <span className="font-mono">env.example</span> into your local env and
              setting <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

