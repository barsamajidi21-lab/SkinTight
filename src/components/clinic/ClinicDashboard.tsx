import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Filter, 
  Search, 
  FileText, 
  Download, 
  PhoneCall, 
  Settings, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  User, 
  Eye, 
  ChevronRight, 
  X, 
  Edit3, 
  Copy, 
  Check, 
  ExternalLink,
  History,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Clinic, ClinicCase, ClinicAuditLog, TriageColor, RulesConfig } from '../../types/clinic';
import { 
  getClinicCases, 
  getClinicRules, 
  getClinicAuditLogs, 
  overrideCaseColor, 
  logClinicAudit, 
  TEST_CLINIC 
} from '../../lib/clinicService';
import { generateClinicCasePDF } from '../../lib/clinicPdfGenerator';
import { PhoneScriptWizard } from './PhoneScriptWizard';
import { RulesAdminPage } from './RulesAdminPage';
import { resolvePhotoUrl } from '../../App';

interface ClinicDashboardProps {
  onExitToPatientApp: () => void;
  onOpenPatientIntake: (clinicId: string) => void;
}

export const ClinicDashboard: React.FC<ClinicDashboardProps> = ({
  onExitToPatientApp,
  onOpenPatientIntake,
}) => {
  // Staff User Session
  const [clinic, setClinic] = useState<Clinic>(TEST_CLINIC);
  const [staffRole, setStaffRole] = useState<'clinic_staff' | 'clinic_admin'>('clinic_staff');
  const [staffName, setStaffName] = useState('Nurse R., RN');
  const [staffEmail, setStaffEmail] = useState('staff.r@clinic-a.example.com');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState(15 * 60);

  // Active View Tab: 'queue' | 'phone_script' | 'rules_admin' | 'audit_log'
  const [activeView, setActiveView] = useState<'queue' | 'phone_script' | 'rules_admin' | 'audit_log'>('queue');

  // Cases and Rules State
  const [cases, setCases] = useState<ClinicCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [colorFilter, setColorFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<ClinicCase | null>(null);
  const [activeRules, setActiveRules] = useState<RulesConfig | null>(null);

  // Override Modal State
  const [overrideModalCase, setOverrideModalCase] = useState<ClinicCase | null>(null);
  const [overrideTargetColor, setOverrideTargetColor] = useState<TriageColor>('yellow');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ClinicAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Link copy toast
  const [copiedLink, setCopiedLink] = useState(false);

  // 15-Minute Inactivity Session Timeout
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setTimeRemainingSec(15 * 60);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
      setTimeRemainingSec(remaining);

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        setSessionLocked(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, []);

  // Fetch Cases and Rules on Mount
  const loadData = async () => {
    setLoadingCases(true);
    try {
      const [loadedCases, rules] = await Promise.all([
        getClinicCases(clinic.id),
        getClinicRules(clinic.id)
      ]);
      setCases(loadedCases);
      setActiveRules(rules);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinic.id]);

  // Load audit logs when opening audit tab
  useEffect(() => {
    if (activeView === 'audit_log') {
      setLoadingAudit(true);
      getClinicAuditLogs(clinic.id)
        .then(logs => setAuditLogs(logs))
        .finally(() => setLoadingAudit(false));
    }
  }, [activeView, clinic.id]);

  // Handle PDF Generation with Audit Trail
  const handleDownloadPDF = async (c: ClinicCase) => {
    await generateClinicCasePDF(c, clinic);
    await logClinicAudit(clinic.id, {
      action: 'case_pdf_download',
      caseId: c.id,
      patientName: c.patientName,
      staffEmail,
      staffName,
      staffRole,
      details: `1-Page Clinic Brief PDF downloaded for patient "${c.patientName}".`,
    });
  };

  // Handle Case View with Audit Logging
  const handleSelectCase = async (c: ClinicCase) => {
    setSelectedCase(c);
    await logClinicAudit(clinic.id, {
      action: 'case_view',
      caseId: c.id,
      patientName: c.patientName,
      staffEmail,
      staffName,
      staffRole,
      details: `Full clinical case record opened and viewed by ${staffName}.`,
    });
  };

  // Handle Color Override Submission
  const handleConfirmOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalCase) return;
    if (!overrideReason.trim()) {
      alert('A clinical reason is mandatory to override the rule-assigned triage color.');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const updated = await overrideCaseColor(
        clinic.id,
        overrideModalCase.id,
        overrideTargetColor,
        overrideReason.trim(),
        staffName,
        staffEmail
      );
      setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (selectedCase?.id === updated.id) {
        setSelectedCase(updated);
      }
      setOverrideModalCase(null);
      setOverrideReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to apply color override.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Filtered cases list
  const filteredCases = cases.filter(c => {
    const activeColor = c.override?.overriddenColor || c.color;
    if (colorFilter !== 'all' && activeColor !== colorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.patientName.toLowerCase().includes(q);
      const locMatch = (c.answers.bodyLocation || '').toLowerCase().includes(q);
      const whyMatch = c.why.some(w => w.toLowerCase().includes(q));
      return nameMatch || locMatch || whyMatch;
    }
    return true;
  });

  const intakeLinkUrl = `${window.location.origin}/intake/${clinic.id}`;

  const copyIntakeLink = () => {
    navigator.clipboard.writeText(intakeLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Inactivity Screen Lock
  if (sessionLocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Staff Session Locked</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Per HIPAA Security Rule specifications, clinical staff dashboards automatically lock after 15 minutes of inactivity to protect Patient Health Information (PHI).
          </p>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-6 text-xs text-left">
            <div className="text-slate-400">Authenticated Staff User:</div>
            <div className="font-semibold text-white mt-0.5">{staffName} ({staffEmail})</div>
            <div className="text-teal-400 text-[11px] mt-0.5">{clinic.name}</div>
          </div>
          <button
            onClick={() => {
              lastActivityRef.current = Date.now();
              setTimeRemainingSec(15 * 60);
              setSessionLocked(false);
            }}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-colors"
          >
            Unlock Session & Resume Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Clinical Portal Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Clinic Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight">{clinic.name}</h1>
                <span className="text-[10px] font-bold text-teal-400 bg-teal-950 border border-teal-800/60 px-2 py-0.5 rounded">
                  CLINIC MODE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Staff: <strong className="text-slate-200">{staffName}</strong> ({staffRole === 'clinic_admin' ? 'Clinic Admin' : 'Staff Nurse/MA'})</span>
                <span>•</span>
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock size={11} /> Auto-lock: {Math.floor(timeRemainingSec / 60)}:{String(timeRemainingSec % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Intake Link Copy Button */}
            <div className="relative">
              <button
                onClick={copyIntakeLink}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedLink ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
                <span className="hidden sm:inline">Copy Intake Link</span>
              </button>
            </div>

            {/* Test Patient Intake Link in New View */}
            <button
              onClick={() => onOpenPatientIntake(clinic.id)}
              className="px-3 py-1.5 rounded-lg bg-teal-950/80 border border-teal-800/60 hover:bg-teal-900/60 text-teal-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open Patient Form</span>
            </button>

            {/* Toggle Role (Demo switcher between Staff and Admin) */}
            <button
              onClick={() => setStaffRole(prev => prev === 'clinic_staff' ? 'clinic_admin' : 'clinic_staff')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
              title="Click to toggle staff vs. clinic admin privileges"
            >
              Role: <span className="text-white font-semibold">{staffRole === 'clinic_admin' ? 'Admin' : 'Staff'}</span>
            </button>

            {/* Exit to Patient App */}
            <button
              onClick={onExitToPatientApp}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={13} /> <span className="hidden md:inline">Patient Mode</span>
            </button>
          </div>
        </div>

        {/* Portal Secondary Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveView('queue')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeView === 'queue'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Triage Priority Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('phone_script')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeView === 'phone_script'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall size={13} />
            <span>Phone-Script Mode</span>
          </button>

          {staffRole === 'clinic_admin' && (
            <button
              onClick={() => setActiveView('rules_admin')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeView === 'rules_admin'
                  ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings size={13} />
              <span>Rules Admin & Governance</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('audit_log')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeView === 'audit_log'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={13} />
            <span>HIPAA Audit Trail</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* VIEW 1: Phone-Script Mode */}
        {activeView === 'phone_script' && (
          <PhoneScriptWizard
            clinic={clinic}
            staffName={staffName}
            staffEmail={staffEmail}
            onCancel={() => setActiveView('queue')}
            onCaseCreated={(newCase) => {
              setCases(prev => [newCase, ...prev]);
              setActiveView('queue');
              handleSelectCase(newCase);
            }}
          />
        )}

        {/* VIEW 2: Rules Admin Governance Page */}
        {activeView === 'rules_admin' && activeRules && (
          <RulesAdminPage
            clinic={clinic}
            currentConfig={activeRules}
            staffName={staffName}
            staffEmail={staffEmail}
            onBack={() => setActiveView('queue')}
            onRulesSaved={(newConfig) => {
              setActiveRules(newConfig);
              loadData();
            }}
          />
        )}

        {/* VIEW 3: Immutable Audit Trail */}
        {activeView === 'audit_log' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-teal-400" /> Immutable HIPAA Access & Audit Log
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every staff view, triage edit, color override, rule revision, and PDF download is cryptographically recorded. Read-only.
                </p>
              </div>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/40 px-2.5 py-1 rounded">
                Tamper-Resistant Storage
              </span>
            </div>

            {loadingAudit ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading audit ledger...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Patient / Target</th>
                      <th className="py-2.5 px-3">Event Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-teal-300 border border-slate-700">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {log.staffName || log.staffEmail}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {log.patientName || log.caseId || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-md">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: Core Triage Queue (Default) */}
        {activeView === 'queue' && (
          <div className="space-y-5">
            {/* Queue Control Header: Search & Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              {/* Color Filter Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setColorFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    colorFilter === 'all'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({cases.length})
                </button>
                <button
                  onClick={() => setColorFilter('red')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    colorFilter === 'red'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-red-400/70 hover:text-red-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  RED ({cases.filter(c => (c.override?.overriddenColor || c.color) === 'red').length})
                </button>
                <button
                  onClick={() => setColorFilter('yellow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    colorFilter === 'yellow'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-400/70 hover:text-amber-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  YELLOW ({cases.filter(c => (c.override?.overriddenColor || c.color) === 'yellow').length})
                </button>
                <button
                  onClick={() => setColorFilter('green')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    colorFilter === 'green'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-emerald-400/70 hover:text-emerald-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  GREEN ({cases.filter(c => (c.override?.overriddenColor || c.color) === 'green').length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by patient, site, or rule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Cases Queue Table / List */}
            {loadingCases ? (
              <div className="py-20 text-center text-slate-400 text-xs">Loading triage cases...</div>
            ) : filteredCases.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                No patient cases found matching current filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCases.map((c) => {
                  const activeColor = c.override?.overriddenColor || c.color;
                  const isOverridden = !!c.override;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg ${
                        activeColor === 'red'
                          ? 'bg-red-950/20 border-red-900/40 hover:border-red-500/60'
                          : activeColor === 'yellow'
                          ? 'bg-amber-950/15 border-amber-900/40 hover:border-amber-500/60'
                          : 'bg-emerald-950/15 border-emerald-900/40 hover:border-emerald-500/60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left: Patient and Spot Information */}
                        <div className="flex items-start gap-4">
                          {/* Photo Thumbnail */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                            {c.photos && c.photos[0] ? (
                              <img src={c.photos[0]} alt="Case spot" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-medium">
                                No Photo
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-white">{c.patientName}</h3>
                              {c.isPhoneIntake && (
                                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800/50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                  <PhoneCall size={10} /> Phone Intake
                                </span>
                              )}
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-400">
                                {new Date(c.dateSubmitted).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-2">
                              <span>Body Location: <strong className="text-teal-400">{c.answers.bodyLocation || 'Unspecified'}</strong></span>
                              {c.answers.exactBodyLocation && (
                                <span className="text-slate-400 text-[11px]">({c.answers.exactBodyLocation})</span>
                              )}
                            </div>

                            {/* The "Why" Line */}
                            <div className="mt-2 text-xs flex items-start gap-1.5">
                              <span className="font-bold text-slate-400 shrink-0">"Why" Line:</span>
                              <span className={`font-semibold ${
                                activeColor === 'red' ? 'text-red-300' : (activeColor === 'yellow' ? 'text-amber-300' : 'text-emerald-300')
                              }`}>
                                {c.why.join(' • ')}
                              </span>
                            </div>

                            {isOverridden && (
                              <div className="mt-1 text-[11px] text-red-300 italic">
                                Staff Override: Originally {c.override?.originalColor.toUpperCase()} → Changed to {c.override?.overriddenColor.toUpperCase()} by {c.override?.overriddenBy} ("{c.override?.reason}")
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Color Badge & Action Buttons */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                          {/* Triage Badge */}
                          <div className={`px-3 py-1.5 rounded-xl text-center border font-black text-xs uppercase tracking-wider ${
                            activeColor === 'red'
                              ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/20'
                              : activeColor === 'yellow'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                          }`}>
                            {activeColor} Priority
                          </div>

                          {/* Override Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideModalCase(c);
                              setOverrideTargetColor(activeColor === 'red' ? 'yellow' : 'red');
                              setOverrideReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700"
                            title="Override rule-assigned category with mandatory clinician reason"
                          >
                            <Edit3 size={13} />
                            <span className="hidden sm:inline">Override</span>
                          </button>

                          {/* Download 1-Page PDF */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(c);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/10"
                            title="Export 1-Page Clinic Brief PDF"
                          >
                            <Download size={13} />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Full Case Detail Modal */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedCase(null)}
                className="absolute top-5 right-5 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                  (selectedCase.override?.overriddenColor || selectedCase.color) === 'red'
                    ? 'bg-red-500 text-white'
                    : (selectedCase.override?.overriddenColor || selectedCase.color) === 'yellow'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {(selectedCase.override?.overriddenColor || selectedCase.color).toUpperCase()} CATEGORY
                </span>
                <span className="text-xs text-slate-400">Scored via {selectedCase.rulesVersion}</span>
              </div>

              <h2 className="text-xl font-black text-white">{selectedCase.patientName}</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Submitted {new Date(selectedCase.dateSubmitted).toLocaleString()} • Tel: {selectedCase.patientPhone || 'None'} • Email: {selectedCase.patientEmail || 'None'}
              </div>

              {/* "Why" line */}
              <div className="my-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-1">Triggered Triage Rules ("Why" Line):</span>
                <ul className="text-xs text-teal-300 space-y-1 font-semibold">
                  {selectedCase.why.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>

              {/* Photos */}
              {selectedCase.photos && selectedCase.photos.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-300 block mb-2">Attached Spot Photos:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCase.photos.map((p, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-slate-800 aspect-square">
                        <img src={p} alt={`Lesion ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Answers */}
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-300 block mb-2">Questionnaire Answers:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div><strong className="text-slate-400">Body Location:</strong> <span className="text-white">{selectedCase.answers.bodyLocation}</span></div>
                  <div><strong className="text-slate-400">First Noticed:</strong> <span className="text-white">{selectedCase.answers.lesionFirstNoticedDate}</span></div>
                  <div><strong className="text-slate-400">New or Existing:</strong> <span className="text-white">{selectedCase.answers.newOrChanged}</span></div>
                  <div><strong className="text-slate-400">Bleeding without Injury:</strong> <span className="text-white">{selectedCase.answers.bleeding}</span></div>
                  <div><strong className="text-slate-400">Non-Healing Sore:</strong> <span className="text-white">{selectedCase.answers.nonHealing}</span></div>
                  <div><strong className="text-slate-400">Pain / Itching:</strong> <span className="text-white">{selectedCase.answers.painOrSensation}</span></div>
                  <div><strong className="text-slate-400">Personal Cancer Hx:</strong> <span className="text-white">{selectedCase.answers.personalCancerHistory}</span></div>
                  <div><strong className="text-slate-400">Family Cancer Hx:</strong> <span className="text-white">{selectedCase.answers.familyCancerHistory}</span></div>
                </div>
              </div>

              {/* Patient Summary */}
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-300 block mb-1">Pre-Visit Patient Summary:</span>
                <p className="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                  {selectedCase.patientSummary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    setOverrideModalCase(selectedCase);
                    setOverrideTargetColor((selectedCase.override?.overriddenColor || selectedCase.color) === 'red' ? 'yellow' : 'red');
                    setOverrideReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                >
                  Override Color Category
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedCase)}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-2"
                >
                  <Download size={15} /> Download 1-Page Brief PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Color Override with Mandatory Reason */}
      <AnimatePresence>
        {overrideModalCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
            >
              <h2 className="text-base font-bold text-white mb-2">Override Triage Category</h2>
              <p className="text-xs text-slate-400 mb-4">
                Clinical staff may override rule-assigned scores with a mandatory clinical reason. Both original and new scores will be preserved in the audit log.
              </p>

              <form onSubmit={handleConfirmOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['red', 'yellow', 'green'] as TriageColor[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setOverrideTargetColor(col)}
                        className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                          overrideTargetColor === col
                            ? col === 'red' 
                              ? 'bg-red-500 text-white' 
                              : col === 'yellow' 
                              ? 'bg-amber-500 text-slate-950' 
                              : 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mandatory Clinical Reason <span className="text-teal-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Patient clarified bleeding was from a kitchen scratch, not spontaneous lesion ulceration..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOverrideModalCase(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOverride}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                  >
                    Save Override
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
