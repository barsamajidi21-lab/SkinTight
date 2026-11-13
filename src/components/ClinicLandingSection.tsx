import React, { useState, useRef } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ArrowRight,
  Send,
  AlertTriangle,
  RefreshCw,
  Clock,
  Users,
  ShieldCheck
} from 'lucide-react';
import { submitDemoRequest } from '../lib/clinicService';

interface ClinicLandingSectionProps {
  onTryDemo: () => void;
}

export const ClinicLandingSection: React.FC<ClinicLandingSectionProps> = ({ onTryDemo }) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [role, setRole] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !practiceName.trim() || !role.trim() || !workEmail.trim() || !phone.trim()) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitDemoRequest({
        name,
        practiceName,
        role,
        workEmail,
        phone,
        message,
      });
      setSubmittedMessage(result.message);
      setName('');
      setPracticeName('');
      setRole('');
      setWorkEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to submit demo request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="clinic-ui w-full mb-8 space-y-6">
      {/* Primary Clinic Hero Card */}
      <div className="rounded-3xl bg-slate-900/95 border border-teal-500/30 p-5 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-bold uppercase tracking-wider">
            <Building2 size={13} /> For Dermatology Clinics
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
          Triage front door for dermatology practices
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mb-6">
          Receive organized patient photos and pre-visit history before appointments, sorted by your clinic&apos;s own physician-approved triage rules.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-7">
          <button
            type="button"
            onClick={onTryDemo}
            className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-colors cursor-pointer"
          >
            <span>Try Interactive Clinic Demo</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={scrollToForm}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send size={15} className="text-teal-400" />
            <span>Request a Demo</span>
          </button>
        </div>

        {/* 3-Step How It Works For Clinics */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">
            How it works for clinics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <Camera size={16} className="text-teal-400 shrink-0" />
              </div>
              <div className="text-sm font-bold text-white leading-snug">
                Patient sends photos + 60-second history
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Send your clinic link before the visit or let front-desk staff run the same questions by phone.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <ClipboardCheck size={16} className="text-amber-400 shrink-0" />
              </div>
              <div className="text-sm font-bold text-white leading-snug">
                Physician-approved rules flag urgent cases for staff
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Every case shows Red, Yellow, or Green with the exact rule reason — never guesswork.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <FileText size={16} className="text-sky-400 shrink-0" />
              </div>
              <div className="text-sm font-bold text-white leading-snug">
                Provider gets a 1-page brief
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Download a clean 1-page PDF summary ready for nurse intake and exam room review.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Practice Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Urgent patients identified first</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Bleeding and fast-changing spots rise to the top of the queue.</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Users size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">New staff follow the same triage script</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Built-in phone call guide keeps front-desk scheduling consistent.</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock size={18} className="text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Fewer intake hours</div>
              <div className="text-[11px] text-slate-400 mt-0.5">History and photos arrive structured before the patient walks in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Request a Demo Form */}
      <div
        ref={formRef}
        id="clinicDemoRequestForm"
        className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 sm:p-7 shadow-xl"
      >
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-black text-white">Request a Demo for Your Practice</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Walk through the staff triage queue, phone-script wizard, and rules setup with our team.
          </p>
        </div>

        {/* Prominent Patient Info Warning */}
        <div className="mb-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-2.5 text-amber-200 text-xs font-semibold">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>Please do not include any patient information.</span>
        </div>

        {submittedMessage ? (
          <div className="p-5 rounded-2xl bg-teal-950/40 border border-teal-500/40 text-teal-200 text-sm flex items-start gap-3">
            <CheckCircle2 size={20} className="text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white mb-1">Request Received</div>
              <p className="text-xs text-teal-200">{submittedMessage}</p>
              <button
                type="button"
                onClick={() => setSubmittedMessage(null)}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Send Another Inquiry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-200 text-xs">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dr. A. / Office Manager"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Practice Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  placeholder="e.g., Dermatology Practice B"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Role <span className="text-teal-400">*</span>
                </label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                >
                  <option value="">Select your role</option>
                  <option value="Dermatologist / Physician">Dermatologist / Physician</option>
                  <option value="Practice Administrator / Manager">Practice Administrator / Manager</option>
                  <option value="Nurse / Medical Assistant">Nurse / Medical Assistant</option>
                  <option value="Front Desk / Scheduling Coordinator">Front Desk / Scheduling Coordinator</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Work Email <span className="text-teal-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="you@practice.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number <span className="text-teal-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 010-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Message (optional — do not include patient details)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Preferred demo times or clinic workflow questions..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{isSubmitting ? 'Submitting...' : 'Request Demo'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
