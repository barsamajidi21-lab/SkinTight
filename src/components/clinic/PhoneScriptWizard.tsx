import React, { useState } from 'react';
import {
  PhoneCall,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  RefreshCw,
  Send,
  ShieldCheck
} from 'lucide-react';
import { Clinic, ClinicCase, RulesConfig } from '../../types/clinic';
import { DEFAULT_DRAFT_RULES_CONFIG, evaluateTriageRules } from '../../lib/triageRulesEngine';
import { submitClinicCase } from '../../lib/clinicService';
import { IntakeForm } from '../../App';

interface PhoneScriptWizardProps {
  clinic: Clinic;
  activeRules?: RulesConfig | null;
  staffName: string;
  staffEmail: string;
  onCaseCreated: (createdCase: ClinicCase) => void;
  onCancel: () => void;
}

interface ScriptStep {
  id: string;
  field: keyof IntakeForm;
  title: string;
  scriptPrompt: string;
  options: { label: string; value: string; hint?: string }[];
}

export const PhoneScriptWizard: React.FC<PhoneScriptWizardProps> = ({
  clinic,
  activeRules,
  staffName,
  staffEmail,
  onCaseCreated,
  onCancel
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [answers, setAnswers] = useState<Partial<IntakeForm>>({
    bleeding: 'None reported',
    nonHealing: 'None reported',
    painOrSensation: 'None reported',
    personalCancerHistory: 'No personal history',
    familyCancerHistory: 'No family history',
    immuneSuppressing: 'No',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scriptSteps: ScriptStep[] = [
    {
      id: 'bodyLocation',
      field: 'bodyLocation',
      title: 'Body Location',
      scriptPrompt: '"Where on your body is the spot or mole located that you are calling about today?"',
      options: [
        { label: 'Face, Cheeks, or Forehead', value: 'Face' },
        { label: 'Neck or Scalp', value: 'Neck' },
        { label: 'Chest or Abdomen', value: 'Chest' },
        { label: 'Upper Back or Shoulders', value: 'Upper Back' },
        { label: 'Arms, Forearms, or Hands', value: 'Arms' },
        { label: 'Legs, Thighs, or Feet', value: 'Legs' },
      ],
    },
    {
      id: 'bleeding',
      field: 'bleeding',
      title: 'Bleeding Without Injury',
      scriptPrompt: '"Has the spot bled on its own recently without you scratching or bumping it?"',
      options: [
        { label: 'No, it has never bled', value: 'None reported' },
        { label: 'Yes, it bled on its own without injury', value: 'Yes, without injury', hint: 'Triggers RED priority' },
        { label: 'It only bled when scratched or scraped', value: 'Bled only from injury/scratch' },
        { label: 'Caller is not sure', value: 'Not sure', hint: 'Defaults to YELLOW if no red flags' },
      ],
    },
    {
      id: 'nonHealing',
      field: 'nonHealing',
      title: 'Sore Not Healing (More Than 3–4 Weeks)',
      scriptPrompt: '"Is it an open sore or crusty spot that has not healed after 3 or 4 weeks?"',
      options: [
        { label: 'No, not an open sore', value: 'None reported' },
        { label: 'Yes, sore has not healed in over 3–4 weeks', value: 'Yes (> 3-4 weeks)', hint: 'Triggers RED priority' },
        { label: 'It heals a little, then opens or crusts again', value: 'Crusting and reforming' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'newOrChanged',
      field: 'newOrChanged',
      title: 'New or Changed Spot',
      scriptPrompt: '"Is this a brand-new spot, or an existing spot that has changed?"',
      options: [
        { label: 'Brand-new spot noticed recently', value: 'New spot', hint: 'Triggers YELLOW minimum' },
        { label: 'Existing spot that changed size, shape, or color', value: 'Existing spot that changed' },
        { label: 'Existing spot that looks unchanged', value: 'Existing spot unchanged' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'changeTimePeriod',
      field: 'changeTimePeriod',
      title: 'How Fast Has It Changed',
      scriptPrompt: '"Over what time period have you noticed these changes happening?"',
      options: [
        { label: 'Quickly over days to a few weeks', value: 'Rapidly over days/weeks', hint: 'Triggers RED priority' },
        { label: 'Over weeks to a few months', value: 'Over weeks to a few months' },
        { label: 'Slowly over a year or more', value: 'Slowly over a year or more' },
        { label: 'Unchanged for years', value: 'Has not changed' },
      ],
    },
    {
      id: 'colorChange',
      field: 'colorChange',
      title: 'Color Changes',
      scriptPrompt: '"Does the spot have more than one color, or has it turned very dark black?"',
      options: [
        { label: 'One uniform light-brown or tan color', value: 'Uniform brown' },
        { label: 'Very dark black or multiple colors', value: 'Dark black / Multicolor', hint: 'Higher priority feature' },
        { label: 'Light pink or skin-colored', value: 'Pink / pearly' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'painOrSensation',
      field: 'painOrSensation',
      title: 'Itching, Pain, or Tenderness',
      scriptPrompt: '"Is the spot itchy, sore, painful, or tender when touched?"',
      options: [
        { label: 'No itching or pain', value: 'None reported' },
        { label: 'Yes, itching', value: 'Itching' },
        { label: 'Yes, pain or tenderness', value: 'Pain or tenderness' },
        { label: 'Burning or stinging feeling', value: 'Burning sensation' },
      ],
    },
    {
      id: 'personalCancerHistory',
      field: 'personalCancerHistory',
      title: 'Past Skin Cancer History',
      scriptPrompt: '"Have you ever personally had melanoma or another type of skin cancer?"',
      options: [
        { label: 'No personal history of skin cancer', value: 'No personal history' },
        { label: 'Yes, melanoma in the past', value: 'Melanoma', hint: 'Triggers RED if spot is new or changing' },
        { label: 'Yes, basal cell or squamous cell skin cancer', value: 'Basal / Squamous Cell' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'immuneSuppressing',
      field: 'immuneSuppressing',
      title: 'Immune System Status',
      scriptPrompt: '"Do you take any medicine that lowers your immune system, or have you had an organ transplant?"',
      options: [
        { label: 'No', value: 'No' },
        { label: 'Yes, taking immune-suppressing medicine', value: 'Yes' },
        { label: 'Yes, organ transplant recipient', value: 'Yes (Organ transplant recipient)' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
  ];

  const currentStep = scriptSteps[currentStepIndex];
  const rulesToUse = activeRules || DEFAULT_DRAFT_RULES_CONFIG;
  const currentEvaluation = evaluateTriageRules(answers, rulesToUse);

  const getStaffInstruction = () => {
    if (currentEvaluation.color === 'red') {
      return clinic.urgentInstruction || 'Offer the next available urgent slot and notify the triage nurse immediately.';
    }
    if (currentEvaluation.color === 'yellow') {
      return clinic.yellowInstruction || 'Schedule standard in-person visit within 2–3 weeks.';
    }
    return clinic.greenInstruction || 'Schedule routine periodic skin check.';
  };

  const selectAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentStep.field]: value }));
  };

  const handleNext = () => {
    if (currentStepIndex < scriptSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleFinishAndSubmit = async () => {
    if (!patientName.trim()) {
      alert('Please enter the patient identifier or name before saving.');
      return;
    }
    setIsSubmitting(true);
    try {
      const createdCase = await submitClinicCase(
        clinic.id,
        patientName.trim(),
        answers,
        [],
        {
          patientPhone: patientPhone.trim(),
          isPhoneIntake: true,
          staffName,
          staffEmail,
        }
      );
      onCaseCreated(createdCase);
    } catch (err: any) {
      alert(err.message || 'Failed to save phone intake case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clinic-ui w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
      {/* Left: Guided Script */}
      <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Exit Phone Script
            </button>
            <div className="text-xs font-semibold text-teal-400 flex items-center gap-1.5 bg-teal-950/60 border border-teal-800/40 px-2.5 py-1 rounded-full whitespace-nowrap">
              <PhoneCall size={12} /> Step {currentStepIndex + 1} of {scriptSteps.length}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Caller / Patient Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g., Patient H."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Callback Phone #</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="(555) 010-0144"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Ask Caller ({currentStep.title})
            </span>
            <div className="mt-2 p-4 rounded-xl bg-teal-950/30 border border-teal-500/20 text-teal-200 text-sm sm:text-base font-semibold leading-relaxed italic">
              {currentStep.scriptPrompt}
            </div>
          </div>

          <div className="space-y-2.5">
            {currentStep.options.map((opt, idx) => {
              const isSelected = answers[currentStep.field] === opt.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectAnswer(opt.value)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 text-white font-medium shadow-md shadow-teal-500/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div>
                    <div className="text-xs sm:text-sm">{opt.label}</div>
                    {opt.hint && (
                      <div className="text-[10px] text-amber-400 font-normal mt-0.5">{opt.hint}</div>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-teal-400 bg-teal-400' : 'border-slate-600'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="pt-5 border-t border-slate-800 flex items-center justify-between gap-2 mt-6">
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {currentStepIndex < scriptSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              Next Question <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishAndSubmit}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
              Save to Queue
            </button>
          )}
        </div>
      </div>

      {/* Right: Real-Time Rules Calculation */}
      <div className="w-full md:w-80 lg:w-96 p-5 sm:p-7 bg-slate-950/90 flex flex-col justify-between">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Live Rule Result
          </div>

          <div className={`p-4 rounded-2xl border text-center mb-5 ${
            currentEvaluation.color === 'red'
              ? 'bg-red-950/40 border-red-500/50 text-red-200'
              : currentEvaluation.color === 'yellow'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">Category</span>
            <div className="text-xl font-black mt-1">
              {currentEvaluation.color === 'red' && 'RED — URGENT'}
              {currentEvaluation.color === 'yellow' && 'YELLOW — STANDARD'}
              {currentEvaluation.color === 'green' && 'GREEN — ROUTINE'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {currentEvaluation.rulesVersion} ({rulesToUse.approvedBy ? `Approved by ${rulesToUse.approvedBy}` : 'DRAFT — pending physician approval'})
            </div>
          </div>

          <div className="mb-5 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">
              Scheduling Step:
            </span>
            <p className="text-xs text-teal-300 font-semibold leading-relaxed">
              "{getStaffInstruction()}"
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 block mb-2">
              "Why" Line:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {currentEvaluation.why.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    currentEvaluation.color === 'red' ? 'bg-red-400' : (currentEvaluation.color === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400')
                  }`} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-normal">
          <ShieldCheck size={14} className="inline mr-1 text-teal-400" />
          Assigned strictly by clinic rules. Not an AI diagnosis.
        </div>
      </div>
    </div>
  );
};
