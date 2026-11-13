import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Save,
  History,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Clinic, RulesConfig } from '../../types/clinic';
import { saveClinicRules, getClinicRulesHistory } from '../../lib/clinicService';

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
  const [historyList, setHistoryList] = useState<RulesConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig({ ...currentConfig });
    setPhysicianName(currentConfig.approvedBy || '');
    setApprovalDate(currentConfig.approvedDate || new Date().toISOString().split('T')[0]);
    getClinicRulesHistory(clinic.id).then(setHistoryList);
  }, [clinic.id, currentConfig]);

  const toggleRule = (ruleId: string) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    }));
  };

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

    const versionMatch = config.version.match(/v(\d+)\.(\d+)/);
    const major = versionMatch ? versionMatch[1] : '1';
    const minor = versionMatch ? parseInt(versionMatch[2], 10) + 1 : 1;
    const nextVersion = `v${major}.${minor}`;

    const isPhysicianApproved = !!physicianName.trim();
    const updatedLabel = isPhysicianApproved
      ? `Rules ${nextVersion} approved by ${physicianName.trim()}, ${approvalDate}.`
      : 'DRAFT RULES — pending physician approval';

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
      const updatedHistory = await getClinicRulesHistory(clinic.id);
      setHistoryList(updatedHistory);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save clinic rules.');
    } finally {
      setIsSaving(false);
    }
  };

  const isApproved = !!config.approvedBy;

  return (
    <div className="clinic-ui w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Queue
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white">Triage Rules &amp; Physician Approval</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2.5 py-0.5 rounded-full">
              Clinic Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Edit the transparent rules used to sort incoming patient cases. Rules are plain text and never use AI guesses.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 sm:text-right shrink-0">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Version</div>
          <div className="text-sm font-bold text-teal-400">{config.version}</div>
          <div className="text-[11px] text-amber-300 font-medium">
            {isApproved ? `Approved by ${config.approvedBy}, ${config.approvedDate}` : 'DRAFT — pending physician approval'}
          </div>
        </div>
      </div>

      {/* Prominent Approval Status Banner */}
      {isApproved ? (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3 text-emerald-200">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-sm font-bold text-emerald-300">
              Rules {config.version} approved by {config.approvedBy}, {config.approvedDate}.
            </strong>
            Active categories are governed by this approved ruleset. New edits save as a new version in the history log.
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-amber-200">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-sm font-bold text-amber-300 mb-0.5">
              DRAFT RULES — pending physician approval
            </strong>
            These starter rules are drafts. Have your medical director review, adjust if needed, and record physician approval below before relying on them in live clinical scheduling.
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/50 text-teal-200 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-teal-400" />
          <span>Rules saved as {config.version} and recorded in the audit trail.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Physician Sign-Off Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-teal-400" /> Physician Approval Record
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Approving Physician Name &amp; Credentials
              </label>
              <input
                type="text"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
                placeholder="e.g., Dr. J., MD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Leave blank to keep rules marked as "DRAFT RULES — pending physician approval".
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Approval Date
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
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-black text-red-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> RED Category Rules (Urgent)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Triggering any enabled RED rule puts the case at the top of the staff queue.
              </p>
            </div>
            <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/40 px-2.5 py-1 rounded-lg whitespace-nowrap">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>

                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">"Why" Line Shown to Staff:</span>
                      <input
                        type="text"
                        value={rule.whyText}
                        onChange={(e) => updateRuleText(rule.id, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    aria-label={`Toggle ${rule.name}`}
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
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> YELLOW Category Rules (Standard Review)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Spots with symptoms, skin cancer history, or missing/"not sure" answers go to Yellow.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-lg whitespace-nowrap">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{rule.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>

                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">"Why" Line Shown to Staff:</span>
                      <input
                        type="text"
                        value={rule.whyText}
                        onChange={(e) => updateRuleText(rule.id, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    aria-label={`Toggle ${rule.name}`}
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

        {/* Safety Default Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-white">Safety Default:</span>
            <span className="text-slate-400 ml-2">
              If rules conflict or answers are missing, always assign <strong className="text-amber-400">YELLOW</strong> (never GREEN).
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-950 border border-amber-800/40 text-amber-400 text-[10px] font-bold self-start sm:self-center whitespace-nowrap">
            SAFETY RULE LOCKED
          </span>
        </div>

        {/* Save Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel Changes
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            Save Rules Version &amp; Record Approval
          </button>
        </div>
      </form>

      {/* Version History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <History size={16} className="text-teal-400" /> Rules Version History
        </h2>
        {historyList.length === 0 ? (
          <div className="text-xs text-slate-500 py-4">No previous rule versions saved yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Version</th>
                  <th className="py-2 px-3">Updated</th>
                  <th className="py-2 px-3">Approval Status</th>
                  <th className="py-2 px-3">Active Rules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyList.map((ver, i) => (
                  <tr key={`${ver.version}-${i}`}>
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{ver.version}</td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(ver.updatedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {ver.approvedBy ? (
                        <span className="text-emerald-300 font-semibold">
                          Approved by {ver.approvedBy}, {ver.approvedDate}
                        </span>
                      ) : (
                        <span className="text-amber-300 font-semibold">DRAFT — pending physician approval</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{ver.rules.filter(r => r.enabled).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
