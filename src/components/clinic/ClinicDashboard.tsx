import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Search,
  Download,
  PhoneCall,
  Settings,
  Clock,
  AlertTriangle,
  Lock,
  LogOut,
  X,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  History,
  RotateCcw,
  Camera,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Mail,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  Clinic,
  ClinicCase,
  ClinicAuditLog,
  TriageColor,
  CaseStatus,
  RulesConfig
} from '../../types/clinic';
import {
  getClinicCases,
  getClinicRules,
  getClinicAuditLogs,
  overrideCaseColor,
  updateCaseStatus,
  logClinicAudit,
  resetDemoData,
  TEST_CLINIC,
  DEMO_CLINIC
} from '../../lib/clinicService';
import { generateClinicCasePDF } from '../../lib/clinicPdfGenerator';
import { PhoneScriptWizard } from './PhoneScriptWizard';
import { RulesAdminPage } from './RulesAdminPage';
import { PilotMetricsTab } from './PilotMetricsTab';
import { resolvePhotoUrl } from '../../App';

interface ClinicDashboardProps {
  isDemoMode?: boolean;
  onToggleDemoMode?: (demo: boolean) => void;
  onExitToPatientApp: () => void;
  onOpenPatientIntake: (clinicId: string) => void;
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  scheduled: 'Scheduled',
  closed: 'Closed',
};

const NEXT_STATUS_ACTION: Record<CaseStatus, { next: CaseStatus; label: string } | null> = {
  new: { next: 'reviewed', label: 'Mark Reviewed' },
  reviewed: { next: 'scheduled', label: 'Mark Scheduled' },
  scheduled: { next: 'closed', label: 'Close Case' },
  closed: null,
};

function formatWaitingDuration(dateSubmittedIso: string, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - new Date(dateSubmittedIso).getTime());
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 1) return 'Waiting <1m';
  if (totalMins < 60) return `Waiting ${totalMins}m`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) return mins > 0 ? `Waiting ${hours}h ${mins}m` : `Waiting ${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `Waiting ${days}d ${remH}h` : `Waiting ${days}d`;
}

export const ClinicDashboard: React.FC<ClinicDashboardProps> = ({
  isDemoMode = false,
  onToggleDemoMode,
  onExitToPatientApp,
  onOpenPatientIntake,
}) => {
  const clinic: Clinic = isDemoMode ? DEMO_CLINIC : TEST_CLINIC;

  // Real Clinic Firebase Auth State (bypassed in Demo Mode)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Staff Session State
  const [staffRole, setStaffRole] = useState<'clinic_staff' | 'clinic_admin'>(
    isDemoMode ? 'clinic_admin' : 'clinic_staff'
  );
  const [staffName, setStaffName] = useState('Nurse R., RN');
  const [staffEmail, setStaffEmail] = useState('staff.r@clinic-a.example.com');
  const [sessionLocked, setSessionLocked] = useState(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState(15 * 60);

  // Active Tab
  const [activeView, setActiveView] = useState<
    'queue' | 'phone_script' | 'rules_admin' | 'metrics' | 'audit_log'
  >('queue');

  // Cases & Rules State
  const [cases, setCases] = useState<ClinicCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [colorFilter, setColorFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<ClinicCase | null>(null);
  const [resolvedCasePhotos, setResolvedCasePhotos] = useState<string[]>([]);
  const [loadingCasePhotos, setLoadingCasePhotos] = useState(false);
  const [activeRules, setActiveRules] = useState<RulesConfig | null>(null);

  // Minute ticker for live "Waiting [time]" displays
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Override Modal State
  const [overrideModalCase, setOverrideModalCase] = useState<ClinicCase | null>(null);
  const [overrideTargetColor, setOverrideTargetColor] = useState<TriageColor>('yellow');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ClinicAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Copy toast states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);
  const [demoResetDone, setDemoResetDone] = useState(false);

  // Observe Firebase Auth when in Real Clinic Mode
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && !isDemoMode) {
        setStaffEmail(user.email || 'staff@clinic-a.example.com');
        setStaffName(user.displayName || user.email?.split('@')[0] || 'Clinic Staff');
        try {
          const token = await user.getIdTokenResult();
          const roleClaim = token?.claims?.role;
          if (roleClaim === 'clinic_admin' || token?.claims?.admin === true) {
            setStaffRole('clinic_admin');
          } else {
            setStaffRole('clinic_staff');
          }
        } catch {
          setStaffRole('clinic_staff');
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setStaffName('Nurse R., RN');
      setStaffEmail('demo.staff@skintightai.example');
    } else if (!firebaseUser) {
      setStaffRole('clinic_staff');
    }
  }, [isDemoMode, firebaseUser]);

  // Update Wait Time Clock every 60 seconds
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // 15-Minute Inactivity Session Timeout (active in Real Clinic Mode; gentle auto-lock timer)
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
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

      if (!isDemoMode && firebaseUser && elapsed >= INACTIVITY_TIMEOUT_MS) {
        setSessionLocked(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [isDemoMode, firebaseUser]);

  // Fetch Cases and Rules
  const loadData = async () => {
    if (!isDemoMode && !firebaseUser) {
      setLoadingCases(false);
      return;
    }
    setLoadingCases(true);
    try {
      const [loadedCases, rules] = await Promise.all([
        getClinicCases(clinic.id),
        getClinicRules(clinic.id),
      ]);
      setCases(loadedCases);
      setActiveRules(rules);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    setSelectedCase(null);
    setOverrideModalCase(null);
    loadData();
  }, [clinic.id, isDemoMode, firebaseUser]);

  // Load Audit Logs when opening Audit Trail tab
  useEffect(() => {
    if (activeView === 'audit_log' && (isDemoMode || firebaseUser)) {
      setLoadingAudit(true);
      getClinicAuditLogs(clinic.id)
        .then(logs => setAuditLogs(logs))
        .finally(() => setLoadingAudit(false));
    }
  }, [activeView, clinic.id, isDemoMode, firebaseUser]);

  // Resolve real photos ONLY when a staff member opens a specific case view
  useEffect(() => {
    let active = true;
    if (!selectedCase || !selectedCase.photos || selectedCase.photos.length === 0) {
      setResolvedCasePhotos([]);
      setLoadingCasePhotos(false);
      return;
    }
    setLoadingCasePhotos(true);
    Promise.all(selectedCase.photos.map(p => resolvePhotoUrl(p)))
      .then(urls => {
        if (active) setResolvedCasePhotos(urls.filter(Boolean));
      })
      .finally(() => {
        if (active) setLoadingCasePhotos(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCase?.id, selectedCase?.photos]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to sign in. Verify your clinic credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setLoginError(err?.message || 'Google sign-in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffSignOut = async () => {
    if (!isDemoMode && auth) {
      await signOut(auth);
    }
    onExitToPatientApp();
  };

  const handleResetDemo = async () => {
    resetDemoData();
    setSelectedCase(null);
    setOverrideModalCase(null);
    setColorFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    await loadData();
    if (activeView === 'audit_log') {
      const logs = await getClinicAuditLogs(clinic.id);
      setAuditLogs(logs);
    }
    setDemoResetDone(true);
    setTimeout(() => setDemoResetDone(false), 2000);
  };

  const copyDemoLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/demo`);
    setCopiedDemoLink(true);
    setTimeout(() => setCopiedDemoLink(false), 2500);
  };

  const intakeLinkUrl = `${window.location.origin}/intake/${clinic.id}`;
  const copyIntakeLink = () => {
    navigator.clipboard.writeText(intakeLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPDF = async (c: ClinicCase) => {
    await generateClinicCasePDF(c, clinic, activeRules);
    await logClinicAudit(clinic.id, {
      action: 'case_pdf_download',
      caseId: c.id,
      patientName: c.patientName,
      staffEmail,
      staffName,
      staffRole,
      details: `1-Page Clinic Brief PDF downloaded for "${c.patientName}".`,
    });
  };

  const handleSelectCase = async (c: ClinicCase) => {
    setSelectedCase(c);
    await logClinicAudit(clinic.id, {
      action: 'case_view',
      caseId: c.id,
      patientName: c.patientName,
      staffEmail,
      staffName,
      staffRole,
      details: `Case record opened and viewed by ${staffName}.`,
    });
  };

  const handleStatusChange = async (c: ClinicCase, nextStatus: CaseStatus) => {
    const updated = await updateCaseStatus(
      clinic.id,
      c.id,
      nextStatus,
      staffName,
      staffEmail,
      staffRole
    );
    setCases(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    if (selectedCase?.id === updated.id) {
      setSelectedCase(updated);
    }
  };

  const handleConfirmOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalCase) return;
    if (!overrideReason.trim()) {
      alert('A clinical reason is required to override the rule-assigned triage category.');
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
      setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)));
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

  // Filtered cases (preserves Red -> Yellow -> Green, longest waiting first from getClinicCases)
  const filteredCases = cases.filter(c => {
    const activeColor = c.override?.overriddenColor || c.color;
    if (colorFilter !== 'all' && activeColor !== colorFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.patientName.toLowerCase().includes(q);
      const locMatch = (c.answers.bodyLocation || '').toLowerCase().includes(q);
      const whyMatch = c.why.some(w => w.toLowerCase().includes(q));
      return nameMatch || locMatch || whyMatch;
    }
    return true;
  });

  // Persistent Demo Banner rendered at the very top of every Demo Mode screen
  const renderDemoBanner = () => {
    if (!isDemoMode) return null;
    return (
      <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 border-b border-amber-600/40 px-3 sm:px-6 py-2 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black tracking-tight">
            <AlertTriangle size={15} className="shrink-0" />
            <span>DEMO — all patients are fictional.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-900 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{demoResetDone ? 'Demo Reset!' : 'Reset demo'}</span>
            </button>
            <button
              type="button"
              onClick={copyDemoLink}
              className="px-2.5 py-1 rounded-lg bg-amber-950/20 hover:bg-amber-950/30 text-slate-950 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer border border-slate-950/20"
            >
              {copiedDemoLink ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedDemoLink ? 'Copied /demo' : 'Copy Demo Link'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Persistent Draft / Physician Approval Banner
  const renderRulesStatusBanner = () => {
    if (!activeRules) return null;
    const isApproved = !!activeRules.approvedBy;
    return (
      <div
        className={`rounded-xl px-4 py-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
          isApproved
            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {isApproved ? (
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          )}
          <span>
            {isApproved
              ? `Rules ${activeRules.version} approved by ${activeRules.approvedBy}, ${activeRules.approvedDate}.`
              : 'DRAFT RULES — pending physician approval'}
          </span>
        </div>
        {staffRole === 'clinic_admin' && activeView !== 'rules_admin' && (
          <button
            type="button"
            onClick={() => setActiveView('rules_admin')}
            className="text-[11px] font-bold underline hover:text-white cursor-pointer whitespace-nowrap"
          >
            {isApproved ? 'Manage Rules' : 'Review & Approve Rules'}
          </button>
        )}
      </div>
    );
  };

  // Real Clinic Mode Authentication Gate
  if (!isDemoMode) {
    if (!authReady) {
      return (
        <div className="clinic-ui min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <RefreshCw size={15} className="animate-spin text-teal-400" />
            <span>Verifying clinic session...</span>
          </div>
        </div>
      );
    }

    if (!firebaseUser) {
      return (
        <div className="clinic-ui min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">{TEST_CLINIC.name}</h1>
                  <p className="text-[11px] text-slate-400">Staff Authentication Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onExitToPatientApp}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/50 text-red-200 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Staff Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="staff@clinic-a.example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-black cursor-pointer"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In to Clinic Dashboard'}
              </button>
            </form>

            <div className="relative py-1 flex items-center justify-center">
              <span className="border-t border-slate-800 w-full" />
              <span className="px-3 text-[10px] uppercase text-slate-500 bg-slate-900 shrink-0">
                or
              </span>
              <span className="border-t border-slate-800 w-full" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
            >
              Sign In with Google Workspace
            </button>

            {onToggleDemoMode && (
              <div className="pt-3 border-t border-slate-800 text-center space-y-2">
                <p className="text-[11px] text-slate-400">
                  Evaluating the workflow without clinic credentials?
                </p>
                <button
                  type="button"
                  onClick={() => onToggleDemoMode(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Interactive Demo (Fictional Data)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Inactivity Screen Lock (Real Clinic Mode)
  if (sessionLocked && !isDemoMode) {
    return (
      <div className="clinic-ui min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Staff Session Locked</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            For patient privacy, clinic staff dashboards automatically lock after 15 minutes of inactivity.
          </p>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-6 text-xs text-left">
            <div className="text-slate-400">Signed-In Staff Member:</div>
            <div className="font-semibold text-white mt-0.5">
              {staffName} ({staffEmail})
            </div>
            <div className="text-teal-400 text-[11px] mt-0.5">{clinic.name}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              lastActivityRef.current = Date.now();
              setTimeRemainingSec(15 * 60);
              setSessionLocked(false);
            }}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
          >
            Unlock Session &amp; Resume Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-ui min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {renderDemoBanner()}

      {/* Top Clinical Portal Navigation Bar */}
      <header
        className={`border-b border-slate-800 bg-slate-900/95 sticky ${
          isDemoMode ? 'top-[40px]' : 'top-0'
        } z-40 backdrop-blur-md`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Clinic Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  {clinic.name}
                </h1>
                <span className="text-[10px] font-bold text-teal-400 bg-teal-950 border border-teal-800/60 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                  {isDemoMode ? 'DEMO WORKSPACE' : 'CLINIC MODE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="truncate">
                  Staff: <strong className="text-slate-200">{staffName}</strong> (
                  {staffRole === 'clinic_admin' ? 'Clinic Admin' : 'Staff'})
                </span>
                {!isDemoMode && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock size={11} /> Auto-lock: {Math.floor(timeRemainingSec / 60)}:
                      {String(timeRemainingSec % 60).padStart(2, '0')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={copyIntakeLink}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check size={13} className="text-teal-400" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Intake Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPatientIntake(clinic.id)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-teal-950/80 border border-teal-800/60 hover:bg-teal-900/60 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Patient Form</span>
            </button>

            {/* Role switcher shown ONLY in interactive Demo Mode (real clinic uses Firebase Auth custom claims) */}
            {isDemoMode && (
              <button
                type="button"
                onClick={() => {
                  const next = staffRole === 'clinic_staff' ? 'clinic_admin' : 'clinic_staff';
                  setStaffRole(next);
                  if (next === 'clinic_staff' && (activeView === 'rules_admin' || activeView === 'metrics')) {
                    setActiveView('queue');
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                title="Switch demo role to preview Clinic Admin vs Staff permissions"
              >
                Role:{' '}
                <span className="text-white font-bold">
                  {staffRole === 'clinic_admin' ? 'Admin' : 'Staff'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStaffSignOut}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut size={13} />
              <span>{isDemoMode ? 'Exit Demo' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Secondary Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-800/60 pt-1">
          <button
            type="button"
            onClick={() => setActiveView('queue')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'queue'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Triage Queue</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {cases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('phone_script')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
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
              type="button"
              onClick={() => setActiveView('rules_admin')}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'rules_admin'
                  ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings size={13} />
              <span>Rules Admin</span>
            </button>
          )}

          {staffRole === 'clinic_admin' && (
            <button
              type="button"
              onClick={() => setActiveView('metrics')}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'metrics'
                  ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={13} />
              <span>Metrics</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveView('audit_log')}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'audit_log'
                ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={13} />
            <span>Audit Trail</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {/* Persistent Rules Status Banner on Staff Dashboard */}
        {renderRulesStatusBanner()}

        {/* VIEW 1: Phone-Script Mode */}
        {activeView === 'phone_script' && (
          <PhoneScriptWizard
            clinic={clinic}
            activeRules={activeRules}
            staffName={staffName}
            staffEmail={staffEmail}
            onCancel={() => setActiveView('queue')}
            onCaseCreated={async (newCase) => {
              await loadData();
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

        {/* VIEW 3: Pilot Metrics Tab (Admin Only) */}
        {activeView === 'metrics' && staffRole === 'clinic_admin' && (
          <PilotMetricsTab cases={cases} />
        )}

        {/* VIEW 4: Audit Trail */}
        {activeView === 'audit_log' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-teal-400" /> Access &amp; Activity Audit Trail
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every staff view, status update, color override, rule revision, and PDF download is logged with staff user and timestamp.
                </p>
              </div>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/40 px-2.5 py-1 rounded whitespace-nowrap">
                Append-Only Log
              </span>
            </div>

            {loadingAudit ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading audit ledger...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Patient / Target</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-teal-300 border border-slate-700">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                          {log.staffName || log.staffEmail}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {log.patientName || log.caseId || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-md">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: Core Triage Queue (Default) */}
        {activeView === 'queue' && (
          <div className="space-y-4">
            {/* Queue Control Header: Color Filters, Status Filters & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-md space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Color & Status Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
                  {/* Color Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setColorFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        colorFilter === 'all'
                          ? 'bg-slate-800 text-white border border-slate-600'
                          : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                      }`}
                    >
                      All ({cases.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorFilter('red')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        colorFilter === 'red'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                          : 'text-red-400/80 hover:text-red-300 bg-slate-950/60 border border-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span>
                        RED (
                        {cases.filter(c => (c.override?.overriddenColor || c.color) === 'red').length}
                        )
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorFilter('yellow')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        colorFilter === 'yellow'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'text-amber-400/80 hover:text-amber-300 bg-slate-950/60 border border-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>
                        YELLOW (
                        {cases.filter(c => (c.override?.overriddenColor || c.color) === 'yellow').length}
                        )
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorFilter('green')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        colorFilter === 'green'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'text-emerald-400/80 hover:text-emerald-300 bg-slate-950/60 border border-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>
                        GREEN (
                        {cases.filter(c => (c.override?.overriddenColor || c.color) === 'green').length}
                        )
                      </span>
                    </button>
                  </div>

                  <span className="hidden sm:inline text-slate-700">|</span>

                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'new', 'reviewed', 'scheduled', 'closed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          statusFilter === st
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800'
                        }`}
                      >
                        {st === 'all' ? 'All Statuses' : STATUS_LABELS[st]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-64 shrink-0">
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
            </div>

            {/* Cases Queue List */}
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
                  const photoCount = c.photos ? c.photos.length : 0;
                  const nextAction = NEXT_STATUS_ACTION[c.status || 'new'];
                  const showWaiting = c.status === 'new' || c.status === 'reviewed';

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
                        {/* Left: Neutral Photo Indicator & Case Metadata (NO photo thumbnails on cards) */}
                        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-950 border border-slate-800 shrink-0 flex flex-col items-center justify-center text-center px-1"
                            title={
                              photoCount > 0
                                ? `${photoCount} photo(s) attached — open case to view`
                                : 'No photos attached'
                            }
                          >
                            <Camera
                              size={16}
                              className={photoCount > 0 ? 'text-teal-400' : 'text-slate-600'}
                            />
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-tight">
                              {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'No photo'}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-white">
                                {c.patientName}
                              </h3>

                              {/* Status Pill */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border whitespace-nowrap ${
                                  c.status === 'new'
                                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                                    : c.status === 'reviewed'
                                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/40'
                                    : c.status === 'scheduled'
                                    ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {STATUS_LABELS[c.status || 'new']}
                              </span>

                              {/* Waiting Time Pill (shown until Scheduled/Closed) */}
                              {showWaiting && (
                                <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                  <Clock size={11} />
                                  {formatWaitingDuration(c.dateSubmitted, nowMs)}
                                </span>
                              )}

                              {c.isPhoneIntake && (
                                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800/50 px-2 py-0.5 rounded font-medium flex items-center gap-1 whitespace-nowrap">
                                  <PhoneCall size={10} /> Phone Intake
                                </span>
                              )}

                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {new Date(c.dateSubmitted).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>
                                Body Location:{' '}
                                <strong className="text-teal-400">
                                  {c.answers.bodyLocation || 'Unspecified'}
                                </strong>
                              </span>
                              {c.answers.exactBodyLocation && (
                                <span className="text-slate-400 text-[11px]">
                                  ({c.answers.exactBodyLocation})
                                </span>
                              )}
                            </div>

                            {/* The "Why" Line */}
                            <div className="mt-2 text-xs flex items-start gap-1.5">
                              <span className="font-bold text-slate-400 shrink-0">Why:</span>
                              <span
                                className={`font-semibold ${
                                  activeColor === 'red'
                                    ? 'text-red-300'
                                    : activeColor === 'yellow'
                                    ? 'text-amber-300'
                                    : 'text-emerald-300'
                                }`}
                              >
                                {c.why.join(' • ')}
                              </span>
                            </div>

                            {isOverridden && (
                              <div className="mt-1 text-[11px] text-red-300 italic">
                                Staff Override: Originally {c.override?.originalColor.toUpperCase()} → Changed to{' '}
                                {c.override?.overriddenColor.toUpperCase()} by {c.override?.overriddenBy} ("
                                {c.override?.reason}")
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Color Badge & One-Click Action Buttons */}
                        <div className="flex items-center flex-wrap gap-2 shrink-0 self-start md:self-center">
                          <div
                            className={`px-3 py-1.5 rounded-xl text-center border font-black text-xs uppercase tracking-wider whitespace-nowrap ${
                              activeColor === 'red'
                                ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/20'
                                : activeColor === 'yellow'
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            }`}
                          >
                            {activeColor} Priority
                          </div>

                          {nextAction && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(c, nextAction.next);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>{nextAction.label}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideModalCase(c);
                              setOverrideTargetColor(activeColor === 'red' ? 'yellow' : 'red');
                              setOverrideReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 whitespace-nowrap cursor-pointer"
                            title="Override rule-assigned category with mandatory staff reason"
                          >
                            <Edit3 size={13} />
                            <span>Override</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(c);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/10 whitespace-nowrap cursor-pointer"
                            title="Export 1-Page Clinic Brief PDF"
                          >
                            <Download size={13} />
                            <span>PDF</span>
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

      {/* MODAL 1: Full Case Detail Modal (Real photos display ONLY after opening case) */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-5 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                aria-label="Close case view"
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2.5 flex-wrap mb-3 pr-8">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                    (selectedCase.override?.overriddenColor || selectedCase.color) === 'red'
                      ? 'bg-red-500 text-white'
                      : (selectedCase.override?.overriddenColor || selectedCase.color) === 'yellow'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {(selectedCase.override?.overriddenColor || selectedCase.color).toUpperCase()} PRIORITY
                </span>
                <span className="text-xs text-slate-400">
                  Rules {selectedCase.rulesVersion}
                  {activeRules?.approvedBy
                    ? ` (Approved by ${activeRules.approvedBy}, ${activeRules.approvedDate})`
                    : ' (DRAFT — pending physician approval)'}
                </span>
              </div>

              <h2 className="text-xl font-black text-white">{selectedCase.patientName}</h2>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>Submitted {new Date(selectedCase.dateSubmitted).toLocaleString()}</span>
                <span>•</span>
                <span>Tel: {selectedCase.patientPhone || 'None'}</span>
                <span>•</span>
                <span>Email: {selectedCase.patientEmail || 'None'}</span>
                {(selectedCase.status === 'new' || selectedCase.status === 'reviewed') && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-700/40 text-amber-300 font-bold">
                    {formatWaitingDuration(selectedCase.dateSubmitted, nowMs)}
                  </span>
                )}
              </div>

              {/* Status Workflow Buttons */}
              <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Case Workflow Status (logged to Audit Trail)
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['new', 'reviewed', 'scheduled', 'closed'] as CaseStatus[]).map((st) => {
                    const isCurrent = (selectedCase.status || 'new') === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(selectedCase, st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-teal-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {STATUS_LABELS[st]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* "Why" line */}
              <div className="mb-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-1">
                  Why this case was flagged (Rules Triggered):
                </span>
                <ul className="text-xs text-teal-300 space-y-1 font-semibold">
                  {selectedCase.why.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>

              {/* Real Photos (displayed ONLY inside opened Case View) */}
              {selectedCase.photos && selectedCase.photos.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    Attached Spot Photos ({selectedCase.photos.length}):
                  </span>
                  {loadingCasePhotos ? (
                    <div className="text-xs text-slate-400 py-4">Loading secure photo(s)...</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {resolvedCasePhotos.map((src, i) => (
                        <div
                          key={i}
                          className="rounded-xl overflow-hidden border border-slate-800 aspect-square bg-slate-950"
                        >
                          <img
                            src={src}
                            alt={`Attached spot photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Structured Answers */}
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Pre-Visit Intake Answers:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <strong className="text-slate-400">Body Location:</strong>{' '}
                    <span className="text-white">{selectedCase.answers.bodyLocation || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">First Noticed:</strong>{' '}
                    <span className="text-white">
                      {selectedCase.answers.lesionFirstNoticedDate || '—'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">New or Existing:</strong>{' '}
                    <span className="text-white">{selectedCase.answers.newOrChanged || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Bleeding without Injury:</strong>{' '}
                    <span className="text-white">{selectedCase.answers.bleeding || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Non-Healing Sore:</strong>{' '}
                    <span className="text-white">{selectedCase.answers.nonHealing || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Pain / Itching:</strong>{' '}
                    <span className="text-white">
                      {selectedCase.answers.painOrSensation || '—'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Personal Skin Cancer Hx:</strong>{' '}
                    <span className="text-white">
                      {selectedCase.answers.personalCancerHistory || '—'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Family Skin Cancer Hx:</strong>{' '}
                    <span className="text-white">
                      {selectedCase.answers.familyCancerHistory || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Summary */}
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-300 block mb-1">
                  Patient-Reported Pre-Visit Summary:
                </span>
                <p className="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                  {selectedCase.patientSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideModalCase(selectedCase);
                    setOverrideTargetColor(
                      (selectedCase.override?.overriddenColor || selectedCase.color) === 'red'
                        ? 'yellow'
                        : 'red'
                    );
                    setOverrideReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Override Color Category
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedCase)}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer"
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
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
            >
              <h2 className="text-base font-bold text-white mb-2">Override Triage Category</h2>
              <p className="text-xs text-slate-400 mb-4">
                Clinic staff may override rule-assigned categories with a mandatory reason. Both original and new categories are recorded in the audit trail.
              </p>

              <form onSubmit={handleConfirmOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['red', 'yellow', 'green'] as TriageColor[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setOverrideTargetColor(col)}
                        className={`py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
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
                    Mandatory Staff Reason <span className="text-teal-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Patient clarified bleeding was from an accidental scratch, not spontaneous..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOverrideModalCase(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOverride}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold cursor-pointer"
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
