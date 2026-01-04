import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Eye, Calendar } from '../components/Icons';
import { 
  SNELLEN_VA_OPTIONS, 
  SPHERE_OPTIONS, 
  CYLINDER_OPTIONS, 
  AXIS_MIN, 
  AXIS_MAX,
  VISION_CHANGE_OPTIONS,
  formatDiopter
} from '../constants/refractiveAudit';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';

interface RefractiveAuditOpticianFormProps {
  residentUserId: string;
}

type FormState = 'form' | 'submitting' | 'success' | 'error';

export const RefractiveAuditOpticianForm: React.FC<RefractiveAuditOpticianFormProps> = ({ 
  residentUserId 
}) => {
  const [formState, setFormState] = useState<FormState>('form');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Resident info (fetched from database)
  const [residentName, setResidentName] = useState<string>('');
  const [residentGmc, setResidentGmc] = useState<string>('');

  // Fetch resident info on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !residentUserId) return;
    
    supabase
      .from('user_profile')
      .select('name, gmc_number')
      .eq('user_id', residentUserId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setResidentName(data.name || '');
          setResidentGmc(data.gmc_number || '');
        }
      });
  }, [residentUserId]);
  
  // Form fields
  const [patientId, setPatientId] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [vaRight, setVaRight] = useState('');
  const [vaLeft, setVaLeft] = useState('');
  const [sphRight, setSphRight] = useState<number>(0);
  const [sphLeft, setSphLeft] = useState<number>(0);
  const [cylRight, setCylRight] = useState<number>(0);
  const [cylLeft, setCylLeft] = useState<number>(0);
  const [axisRight, setAxisRight] = useState<string>('');
  const [axisLeft, setAxisLeft] = useState<string>('');
  const [visionChangeRight, setVisionChangeRight] = useState<'better' | 'same' | 'worse' | ''>('');
  const [visionChangeLeft, setVisionChangeLeft] = useState<'better' | 'same' | 'worse' | ''>('');

  const isFormValid = 
    patientDob !== '' &&
    vaRight !== '' &&
    vaLeft !== '' &&
    visionChangeRight !== '' &&
    visionChangeLeft !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;
    
    setFormState('submitting');
    setErrorMessage('');

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database not configured');
      }

      const { error } = await supabase
        .from('refractive_audit_entries')
        .insert({
          resident_user_id: residentUserId,
          patient_id: patientId.trim(),
          patient_dob: patientDob,
          va_right: vaRight,
          va_left: vaLeft,
          sph_right: sphRight,
          sph_left: sphLeft,
          cyl_right: cylRight,
          cyl_left: cylLeft,
          axis_right: axisRight === '' ? 0 : parseInt(axisRight),
          axis_left: axisLeft === '' ? 0 : parseInt(axisLeft),
          vision_change_right: visionChangeRight,
          vision_change_left: visionChangeLeft,
        });

      if (error) throw error;
      
      setFormState('success');
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setFormState('error');
    }
  };

  const handleReset = () => {
    setPatientId('');
    setPatientDob('');
    setVaRight('');
    setVaLeft('');
    setSphRight(0);
    setSphLeft(0);
    setCylRight(0);
    setCylLeft(0);
    setAxisRight('');
    setAxisLeft('');
    setVisionChangeRight('');
    setVisionChangeLeft('');
    setFormState('form');
    setErrorMessage('');
  };

  // Success screen
  if (formState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
          <p className="text-slate-600 mb-8">
            The refractive audit data has been submitted successfully.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
          >
            Submit Another Entry
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (formState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Submission Failed</h1>
          <p className="text-slate-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => setFormState('form')}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-6 py-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Eye size={28} />
            <h1 className="text-xl font-bold">Refractive Audit</h1>
          </div>
          <p className="text-indigo-100 text-sm mb-3">
            Post-cataract refraction data collection
          </p>
          {(residentName || residentGmc) && (
            <div className="bg-indigo-500/30 rounded-xl px-4 py-3 mt-2">
              <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">Submitting for</p>
              {residentName && (
                <p className="font-semibold">{residentName}</p>
              )}
              {residentGmc && (
                <p className="text-sm text-indigo-200">GMC: {residentGmc}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* Patient Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Patient Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Patient ID
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID / hospital number (optional)"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative w-full min-w-0 overflow-hidden">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <input
                  type="date"
                  value={patientDob}
                  onChange={(e) => setPatientDob(e.target.value)}
                  className="w-full max-w-full min-w-0 pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent box-border"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Acuity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Visual Acuity (Snellen)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Right Eye <span className="text-red-500">*</span>
              </label>
              <select
                value={vaRight}
                onChange={(e) => setVaRight(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Select</option>
                {SNELLEN_VA_OPTIONS.map(va => (
                  <option key={va} value={va}>{va}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Left Eye <span className="text-red-500">*</span>
              </label>
              <select
                value={vaLeft}
                onChange={(e) => setVaLeft(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Select</option>
                {SNELLEN_VA_OPTIONS.map(va => (
                  <option key={va} value={va}>{va}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Refraction */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Refraction</h2>
          
          {/* Right Eye */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">R</span>
              Right Eye
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Sphere</label>
                <select
                  value={sphRight}
                  onChange={(e) => setSphRight(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {SPHERE_OPTIONS.map(val => (
                    <option key={val} value={val}>{formatDiopter(val)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cylinder</label>
                <select
                  value={cylRight}
                  onChange={(e) => setCylRight(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {CYLINDER_OPTIONS.map(val => (
                    <option key={val} value={val}>{formatDiopter(val)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Axis (°)</label>
                <input
                  type="number"
                  min={AXIS_MIN}
                  max={AXIS_MAX}
                  value={axisRight}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setAxisRight('');
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        setAxisRight(String(Math.max(AXIS_MIN, Math.min(AXIS_MAX, num))));
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Left Eye */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs flex items-center justify-center font-bold">L</span>
              Left Eye
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Sphere</label>
                <select
                  value={sphLeft}
                  onChange={(e) => setSphLeft(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {SPHERE_OPTIONS.map(val => (
                    <option key={val} value={val}>{formatDiopter(val)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cylinder</label>
                <select
                  value={cylLeft}
                  onChange={(e) => setCylLeft(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {CYLINDER_OPTIONS.map(val => (
                    <option key={val} value={val}>{formatDiopter(val)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Axis (°)</label>
                <input
                  type="number"
                  min={AXIS_MIN}
                  max={AXIS_MAX}
                  value={axisLeft}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setAxisLeft('');
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        setAxisLeft(String(Math.max(AXIS_MIN, Math.min(AXIS_MAX, num))));
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vision Change */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Vision Change Since Surgery</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Right Eye <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {VISION_CHANGE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visionChangeRight"
                      value={opt.value}
                      checked={visionChangeRight === opt.value}
                      onChange={(e) => setVisionChangeRight(e.target.value as typeof visionChangeRight)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Left Eye <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {VISION_CHANGE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visionChangeLeft"
                      value={opt.value}
                      checked={visionChangeLeft === opt.value}
                      onChange={(e) => setVisionChangeLeft(e.target.value as typeof visionChangeLeft)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || formState === 'submitting'}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 
                   text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-indigo-200
                   flex items-center justify-center gap-2"
        >
          {formState === 'submitting' ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>
    </div>
  );
};

export default RefractiveAuditOpticianForm;
