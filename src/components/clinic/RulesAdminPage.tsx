import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  FileText, 
  Save, 
  History, 
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  UserCheck,
  Calendar,
  Lock,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Clinic, RulesConfig, TriageRule } from '../../types/clinic';
import { saveClinicRules } from '../../lib/clinicService';

interface RulesAdminPageProps {
  clinic: Clinic;
  currentConfig: RulesConfig;
  staffName: string;
  staffEmail: string;
  onRulesSaved: (newConfig: RulesConfig) => void;
  onBack: () => void;
}

export const RulesAdminPage: React.FC<RulesAdminPageProps> = ({
  clinic,
  currentConfig,
  staffName,
  staffEmail,
  onRulesSaved,
  onBack,
}) => {
  const [config, setConfig] = useState<RulesConfig>({ ...currentConfig });
  const [physicianName, setPhysicianName] = useState(currentConfig.approvedBy || '');
  const [approvalDate, setApprovalDate] = useState(currentConfig.approvedDate || new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Toggle individual rule
  const toggleRule = (ruleId: string) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    }));
  };

  // Update rule text
  const updateRuleText = (ruleId: string, whyText: string) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === ruleId ? { ...r, whyText } : r)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    // Compute next version
    const versionMatch = config.version.match(/v(\d+)\.(\d+)/);
    const major = versionMatch ? versionMatch[1] : '1';
    const minor = versionMatch ? parseInt(versionMatch[2]) + 1 : 1;
    const nextVersion = `v${major}.${minor}`;

    const isPhysicianApproved = !!physicianName.trim();
    const updatedLabel = isPhysicianApproved 
      ? `Approved by ${physicianName.trim()}, ${approvalDate}` 
      : 'DRAFT — pending physician approval';

    const updated: RulesConfig = {
      ...config,
      version: nextVersion,
      label: updatedLabel,
      approvedBy: isPhysicianApproved ? physicianName.trim() : null,
      approvedDate: isPhysicianApproved ? approvalDate : null,
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await saveClinicRules(clinic.id, updated, staffEmail, staffName);
      setConfig(saved);
      onRulesSaved(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save clinic rules.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Staff Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white">Triage Rules Engine & Governance</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2.5 py-0.5 rounded-full">
              Clinic Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure transparent, physician-approved rules for sorting incoming pre-visit patient cases.
          </p>
        </div>

        {/* Current Active Version Badge */}
        <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Ruleset</div>
          <div className="text-sm font-bold text-teal-400">{config.version}</div>
          <div className="text-[10px] text-amber-300 font-medium">{config.label}</div>
        </div>
      </div>

      {/* Mandatory DRAFT Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-200">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="block text-sm font-bold text-amber-300 mb-0.5">
            MANDATORY CLINICAL GOVERNANCE NOTICE
          </strong>
          All starter rules below are labeled as <strong>"DRAFT — pending physician approval"</strong>. In accordance with clinical risk protocol, triage category colors must be reviewed and approved by a licensed medical director. Color verdicts are assigned solely by transparent rules, never by AI inference.
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/50 text-teal-200 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-teal-400" />
          <span>Rules updated successfully! Version incremented and logged to immutable audit trail.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Physician Sign-Off & Governance Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-teal-400" /> Physician Approval & Attestation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Approving Physician Full Name & Credentials
              </label>
              <input
                type="text"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
                placeholder="e.g., Dr. J., MD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Leave blank to keep rules marked as "DRAFT — pending physician approval".
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date of Clinical Review & Sign-Off
              </label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* RED Rules Config Table */}
        <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-red-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> RED Category Criteria (Urgent Triage)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Triggering any enabled RED rule immediately flags the case for rapid clinician intake.
              </p>
            </div>
            <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/40 px-2.5 py-1 rounded-lg">
              {config.rules.filter(r => r.color === 'red' && r.enabled).length} Active Rules
            </span>
          </div>

          <div className="space-y-3">
            {config.rules.filter(r => r.color === 'red').map(rule => (
              <div 
                key={rule.id}
                className={`p-4 rounded-xl border transition-all ${
                  rule.enabled 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">[{rule.predicateKey}]</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                    
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">"Why" Line Text:</span>
                      <input
                        type="text"
                        value={rule.whyText}
                        onChange={(e) => updateRuleText(rule.id, e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {rule.enabled ? (
                      <ToggleRight size={28} className="text-red-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YELLOW Rules Config Table */}
        <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> YELLOW Category Criteria (Standard Review)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cases with spot changes, symptoms, cancer history, or missing answers defaults to Yellow.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-lg">
              {config.rules.filter(r => r.color === 'yellow' && r.enabled).length} Active Rules
            </span>
          </div>

          <div className="space-y-3">
            {config.rules.filter(r => r.color === 'yellow').map(rule => (
              <div 
                key={rule.id}
                className={`p-4 rounded-xl border transition-all ${
                  rule.enabled 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">[{rule.predicateKey}]</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                    
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">"Why" Line Text:</span>
                      <input
                        type="text"
                        value={rule.whyText}
                        onChange={(e) => updateRuleText(rule.id, e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {rule.enabled ? (
                      <ToggleRight size={28} className="text-amber-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Default Enforcer */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-white">Fail-Safe Safety Default:</span>
            <span className="text-slate-400 ml-2">
              If rules conflict or required information is missing, always assign <strong className="text-amber-400">YELLOW</strong> (never GREEN).
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-950 border border-amber-800/40 text-amber-400 text-[10px] font-bold">
            ENFORCED BY LAW
          </span>
        </div>

        {/* Save Bar */}
        <div className="pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel Changes
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            Publish Ruleset & Log Version
          </button>
        </div>
      </form>
    </div>
  );
};
