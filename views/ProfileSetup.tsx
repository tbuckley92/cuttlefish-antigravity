import React, { useMemo, useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Logo } from '../components/Logo';
import { DEANERIES } from '../constants';

type BaseRole = 'RESIDENT' | 'SUPERVISOR';

export interface ProfileSetupValues {
  name: string;
  gmc_number: string;
  rcophth_number: string;
  deanery: string;
  base_role: BaseRole;
  frcophth_part1: boolean;
  frcophth_part2_written: boolean;
  frcophth_part2_viva: boolean;
  refraction_certificate: boolean;
  cct_date: string;
  arcp_month: string;
  fte: number;
}

const defaultValues: ProfileSetupValues = {
  name: '',
  gmc_number: '',
  rcophth_number: '',
  deanery: '',
  base_role: 'RESIDENT',
  frcophth_part1: false,
  frcophth_part2_written: false,
  frcophth_part2_viva: false,
  refraction_certificate: false,
  cct_date: '',
  arcp_month: '',
  fte: 100,
};

export const ProfileSetup: React.FC<{
  email: string;
  initial?: Partial<ProfileSetupValues>;
  onComplete: () => void;
}> = ({ email, initial, onComplete }) => {
  const [values, setValues] = useState<ProfileSetupValues>({ ...defaultValues, ...initial });
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    return (
      values.name.trim().length > 0 &&
      values.deanery.trim().length > 0 &&
      values.gmc_number.trim().length > 0 &&
      values.rcophth_number.trim().length > 0
    );
  }, [values]);

  const handleChange = (field: keyof ProfileSetupValues, v: any) => {
    setValues(prev => ({ ...prev, [field]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.');
      return;
    }
    if (!isValid) {
      setError('Please complete all required fields.');
      return;
    }

    setIsBusy(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData.user;
      if (!user) throw new Error('No authenticated user.');

      // Upsert profile row. This assumes `public.user_profile` exists.
      const payload = {
        user_id: user.id,
        email,
        name: values.name.trim(),
        gmc_number: values.gmc_number.trim(),
        rcophth_number: values.rcophth_number.trim(),
        deanery: values.deanery.trim(),
        base_role: values.base_role,
        frcophth_part1: values.frcophth_part1,
        frcophth_part2_written: values.frcophth_part2_written,
        frcophth_part2_viva: values.frcophth_part2_viva,
        refraction_certificate: values.refraction_certificate,
        cct_date: values.cct_date || null,
        arcp_month: values.arcp_month || null,
        fte: values.fte ?? 100,
      };

      const { error: upsertError } = await supabase.from('user_profile').upsert(payload, {
        onConflict: 'user_id',
      });
      if (upsertError) throw upsertError;

      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-slate-200">
              <Logo size={24} className="text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-900">Complete your profile</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">{email}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full name *">
                <input
                  value={values.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
              <Field label="Deanery *">
                <select
                  value={values.deanery}
                  onChange={(e) => handleChange('deanery', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                >
                  <option value="">Select deanery...</option>
                  {DEANERIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="GMC number *">
                <input
                  value={values.gmc_number}
                  onChange={(e) => handleChange('gmc_number', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
              <Field label="RCOphth number *">
                <input
                  value={values.rcophth_number}
                  onChange={(e) => handleChange('rcophth_number', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
              <Field label="Role on signup *">
                <select
                  value={values.base_role}
                  onChange={(e) => handleChange('base_role', e.target.value as BaseRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                >
                  <option value="RESIDENT">Resident</option>
                  <option value="SUPERVISOR">Supervisor</option>
                </select>
              </Field>
              <Field label="FTE (%)">
                <input
                  type="number"
                  value={values.fte}
                  onChange={(e) => handleChange('fte', Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
              <Field label="CCT date">
                <input
                  type="date"
                  value={values.cct_date}
                  onChange={(e) => handleChange('cct_date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
              <Field label="ARCP month">
                <input
                  value={values.arcp_month}
                  onChange={(e) => handleChange('arcp_month', e.target.value)}
                  placeholder="e.g. June"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50"
                />
              </Field>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4">Qualifications</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Toggle
                  label="FRCOphth Part 1"
                  checked={values.frcophth_part1}
                  onChange={(v) => handleChange('frcophth_part1', v)}
                />
                <Toggle
                  label="FRCOphth Part 2 Written"
                  checked={values.frcophth_part2_written}
                  onChange={(v) => handleChange('frcophth_part2_written', v)}
                />
                <Toggle
                  label="FRCOphth Part 2 Viva"
                  checked={values.frcophth_part2_viva}
                  onChange={(v) => handleChange('frcophth_part2_viva', v)}
                />
                <Toggle
                  label="Refraction Certificate"
                  checked={values.refraction_certificate}
                  onChange={(v) => handleChange('refraction_certificate', v)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || isBusy}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-60"
            >
              {isBusy ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{label}</label>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`p-4 rounded-2xl border text-left transition-all ${
      checked
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] font-black uppercase tracking-widest">{checked ? 'Yes' : 'No'}</span>
    </div>
  </button>
);

