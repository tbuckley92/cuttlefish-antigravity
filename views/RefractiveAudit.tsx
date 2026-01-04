import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileDown, Eye, ClipboardCheck, Info, CheckCircle2 } from '../components/Icons';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';

interface RefractiveAuditProps {
  onBack: () => void;
  onNavigateToMyAudit: () => void;
  userId?: string;
}

export const RefractiveAudit: React.FC<RefractiveAuditProps> = ({ 
  onBack, 
  onNavigateToMyAudit,
  userId 
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [entryCount, setEntryCount] = useState<number>(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Generate the form URL
  useEffect(() => {
    if (userId) {
      const url = `${window.location.origin}${window.location.pathname}?ra=${userId}`;
      setFormUrl(url);
      
      // Generate QR code
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' }
        }).then(setQrDataUrl);
      });
    }
  }, [userId]);

  // Fetch entry count
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) return;
    
    supabase
      .from('refractive_audit_entries')
      .select('id', { count: 'exact', head: true })
      .eq('resident_user_id', userId)
      .then(({ count }) => {
        setEntryCount(count || 0);
      });
  }, [userId]);

  const handleGeneratePdf = async () => {
    if (!userId || !qrDataUrl) return;
    
    setIsGeneratingPdf(true);
    try {
      const { generateRefractiveAuditLetterPdf } = await import('../utils/refractiveAuditPdf');
      const blob = await generateRefractiveAuditLetterPdf(formUrl, qrDataUrl);
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'refractive-audit-letters.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Refractive Audit</h1>
          <p className="text-slate-500 text-sm">
            Capture post-cataract refractive outcomes via optician QR form
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 mb-8">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">How it works</h3>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>Generate and print letters containing your unique QR code</li>
              <li>Give letters to patients attending their optician follow-up</li>
              <li>Optician scans the QR code on their mobile device</li>
              <li>Optician enters visual acuity and refraction data</li>
              <li>Data automatically appears in your "My Refractive Audit" table</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* QR Code Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Eye size={18} className="text-indigo-600" />
            Your QR Code
          </h3>
          
          {qrDataUrl ? (
            <div className="flex flex-col items-center">
              <img 
                src={qrDataUrl} 
                alt="Refractive Audit QR Code" 
                className="w-48 h-48 mb-4"
              />
              <p className="text-xs text-slate-500 text-center break-all max-w-full mb-3">
                {formUrl}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(formUrl);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="py-2 px-4 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                         bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {linkCopied ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  'Copy Link'
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-slate-100 rounded-xl">
              <p className="text-slate-400">Loading QR code...</p>
            </div>
          )}
        </div>

        {/* Generate PDF Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileDown size={18} className="text-indigo-600" />
            Print Letters
          </h3>
          
          <p className="text-sm text-slate-600 mb-6">
            Generate a PDF with multiple letters, each containing your QR code 
            and instructions for the optician. Print and give to patients.
          </p>
          
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf || !qrDataUrl}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 
                     text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isGeneratingPdf ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown size={18} />
                Generate Letters PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* View Entries Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ClipboardCheck size={24} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">My Refractive Audit</h3>
              <p className="text-sm text-slate-500">
                {entryCount === 0 
                  ? 'No entries yet'
                  : `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} recorded`
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={onNavigateToMyAudit}
            className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold 
                     rounded-xl transition-colors text-sm"
          >
            View Entries
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefractiveAudit;
