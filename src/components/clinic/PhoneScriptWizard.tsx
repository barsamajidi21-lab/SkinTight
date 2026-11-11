import React, { useState } from 'react';
import { 
  PhoneCall, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  ArrowLeft,
  RefreshCw,
  Building2,
  Send,
  User,
  ShieldCheck
} from 'lucide-react';
import { Clinic, ClinicCase } from '../../types/clinic';
import { evaluateTriageRules } from '../../lib/triageRulesEngine';
import { submitClinicCase } from '../../lib/clinicService';
import { IntakeForm } from '../../App';

interface PhoneScriptWizardProps {
  clinic: Clinic;
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
  staffName,
  staffEmail,
  onCaseCreated,
  onCancel
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [answers, setAnswers] = useState<Partial<IntakeForm>>({
    bleeding: 'None reported',
    nonHealing: 'None reported',
    painOrSensation: 'None reported',
    personalCancerHistory: 'No personal history',
    familyCancerHistory: 'No family history',
    immuneSuppressing: 'No',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Script Questions in conversational call language
  const scriptSteps: ScriptStep[] = [
    {
      id: 'bodyLocation',
      field: 'bodyLocation',
      title: 'Body Location',
      scriptPrompt: '"Where on your body is the spot or mole located that you are calling about today?"',
      options: [
        { label: 'Face / Cheeks / Forehead', value: 'Face' },
        { label: 'Neck or Scalp', value: 'Neck' },
        { label: 'Chest or Abdomen', value: 'Chest' },
        { label: 'Upper Back / Shoulders', value: 'Upper Back' },
        { label: 'Arms / Forearms / Hands', value: 'Arms' },
        { label: 'Legs / Thighs / Feet', value: 'Legs' },
      ],
    },
    {
      id: 'bleeding',
      field: 'bleeding',
      title: 'Bleeding / Oozing',
      scriptPrompt: '"Has the spot bled on its own recently without you scratching or bumping it?"',
      options: [
        { label: 'No, it has never bled', value: 'None reported' },
        { label: 'Yes, it bled without injury (Spontaneous bleeding)', value: 'Yes, without injury', hint: 'Triggers RED category' },
        { label: 'It only bled when scratched / scraped', value: 'Bled only from injury/scratch' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'nonHealing',
      field: 'nonHealing',
      title: 'Non-Healing Sore (> 3–4 Weeks)',
      scriptPrompt: '"Is it an open sore, pimple, or crusty spot that has failed to heal for more than 3 or 4 weeks?"',
      options: [
        { label: 'No, not an open or non-healing sore', value: 'None reported' },
        { label: 'Yes, persistent sore for over 3–4 weeks', value: 'Yes (> 3-4 weeks)', hint: 'Triggers RED category' },
        { label: 'It heals slightly, then breaks open or crusts again', value: 'Crusting and reforming' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'newOrChanged',
      field: 'newOrChanged',
      title: 'New or Existing Spot',
      scriptPrompt: '"Is this a brand new spot, or an existing mole that has noticeably changed?"',
      options: [
        { label: 'Brand new spot noticed recently', value: 'New spot', hint: 'Triggers YELLOW minimum' },
        { label: 'Existing spot that has changed size, shape, or color', value: 'Existing spot that changed' },
        { label: 'Existing spot that looks unchanged', value: 'Existing spot unchanged' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'changeTimePeriod',
      field: 'changeTimePeriod',
      title: 'Timeline of Change',
      scriptPrompt: '"Over what time period have you noticed these changes happening?"',
      options: [
        { label: 'Rapidly over days to a few weeks', value: 'Rapidly over days/weeks', hint: 'Triggers RED if growing' },
        { label: 'Over weeks to a few months', value: 'Over weeks to a few months' },
        { label: 'Slowly over a year or more', value: 'Slowly over a year or more' },
        { label: 'Completely unchanged for years', value: 'Has not changed' },
      ],
    },
    {
      id: 'colorChange',
      field: 'colorChange',
      title: 'Color Evolution',
      scriptPrompt: '"Does the spot have multiple colors, or has it turned very dark black or blue?"',
      options: [
        { label: 'Uniform single brown/tan color', value: 'Uniform brown' },
        { label: 'Very dark black or multicolored (red, white, blue)', value: 'Dark black / Multicolor', hint: 'High risk feature' },
        { label: 'Light pink or flesh-colored', value: 'Pink / pearly' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'painOrSensation',
      field: 'painOrSensation',
      title: 'Symptoms & Sensation',
      scriptPrompt: '"Are you experiencing any itching, pain, tenderness, or irritation around the spot?"',
      options: [
        { label: 'No symptoms or sensation', value: 'None reported' },
        { label: 'Yes, frequent itching or irritation', value: 'Itching' },
        { label: 'Yes, localized pain or tenderness', value: 'Pain or tenderness' },
        { label: 'Burning or tingling sensation', value: 'Burning sensation' },
      ],
    },
    {
      id: 'personalCancerHistory',
      field: 'personalCancerHistory',
      title: 'Personal Skin Cancer History',
      scriptPrompt: '"Have you ever personally been diagnosed with melanoma or other skin cancers?"',
      options: [
        { label: 'No personal history of skin cancer', value: 'No personal history' },
        { label: 'Yes, diagnosed with Melanoma in the past', value: 'Melanoma', hint: 'Triggers RED if spot is changing' },
        { label: 'Yes, Basal Cell (BCC) or Squamous Cell (SCC)', value: 'Basal / Squamous Cell' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
    {
      id: 'immuneSuppressing',
      field: 'immuneSuppressing',
      title: 'Immune System Status',
      scriptPrompt: '"Do you take any medications that lower your immune system, or had an organ transplant?"',
      options: [
        { label: 'No immune conditions or medications', value: 'No' },
        { label: 'Yes, taking immunosuppressive therapy / biologic', value: 'Yes' },
        { label: 'Yes, organ transplant recipient', value: 'Organ transplant recipient' },
        { label: 'Caller is not sure', value: 'Not sure' },
      ],
    },
  ];

  const currentStep = scriptSteps[currentStepIndex];

  // Evaluate rules in real-time as answers change
  const currentEvaluation = evaluateTriageRules(answers);

  // Clinic staff instruction for current color
  const getStaffInstruction = () => {
    if (currentEvaluation.color === 'red') {
      return clinic.urgentInstruction || 'Offer the next available urgent slot and notify the triage nurse immediately.';
    }
    if (currentEvaluation.color === 'yellow') {
      return clinic.yellowInstruction || 'Schedule standard in-person consultation within 2–3 weeks.';
    }
    return clinic.greenInstruction || 'Schedule routine periodic preventive skin check.';
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
      alert('Please enter caller patient name before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const createdCase = await submitClinicCase(
        clinic.id,
        patientName.trim(),
        answers,
        [], // No photos on phone intake
        {
          patientPhone: patientPhone.trim(),
          patientEmail: patientEmail.trim(),
          isPhoneIntake: true,
          staffName,
          staffEmail,
        }
      );
      onCaseCreated(createdCase);
    } catch (err: any) {
      alert(err.message || 'Failed to submit phone intake case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
      {/* Left: Step-by-Step Guided Script (60% width) */}
      <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Exit Phone Script
            </button>
            <div className="text-xs font-semibold text-teal-400 flex items-center gap-1.5 bg-teal-950/60 border border-teal-800/40 px-2.5 py-1 rounded-full">
              <PhoneCall size={12} className="animate-pulse" /> Live Call Mode (Step {currentStepIndex + 1} of {scriptSteps.length})
            </div>
          </div>

          {/* Caller Details at Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Caller / Patient Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g., Jennifer Hayes"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Callback Phone #</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="(512) 555-0144"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Current Script Prompt */}
          <div className="mb-6">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Staff Guided Script ({currentStep.title})
            </span>
            <div className="mt-2 p-4 rounded-xl bg-teal-950/30 border border-teal-500/20 text-teal-200 text-sm sm:text-base font-semibold leading-relaxed italic">
              {currentStep.scriptPrompt}
            </div>
          </div>

          {/* Selectable Options */}
          <div className="space-y-2.5">
            {currentStep.options.map((opt, idx) => {
              const isSelected = answers[currentStep.field] === opt.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectAnswer(opt.value)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
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

        {/* Wizard Controls */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between mt-8">
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium flex items-center gap-1.5"
          >
            <ChevronLeft size={16} /> Previous Question
          </button>

          {currentStepIndex < scriptSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              Next Question <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishAndSubmit}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
              Submit Phone Intake to Queue
            </button>
          )}
        </div>
      </div>

      {/* Right: Real-Time Triage Category & Clinic Instruction (40% width) */}
      <div className="w-full md:w-80 lg:w-96 p-6 sm:p-8 bg-slate-950/90 flex flex-col justify-between">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Real-Time Decision Engine
          </div>

          {/* Color Category Box */}
          <div className={`p-4 rounded-2xl border text-center mb-5 ${
            currentEvaluation.color === 'red'
              ? 'bg-red-950/40 border-red-500/50 text-red-200'
              : currentEvaluation.color === 'yellow'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">Calculated Priority</span>
            <div className="text-2xl font-black mt-1">
              {currentEvaluation.color === 'red' && 'RED — HIGH PRIORITY'}
              {currentEvaluation.color === 'yellow' && 'YELLOW — MODERATE'}
              {currentEvaluation.color === 'green' && 'GREEN — ROUTINE'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Scored by {currentEvaluation.rulesVersion} ({currentEvaluation.rulesLabel})
            </div>
          </div>

          {/* Clinic Editable Action Instruction for Staff */}
          <div className="mb-5 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">
              Staff Protocol Instruction:
            </span>
            <p className="text-xs text-teal-300 font-semibold leading-relaxed">
              "{getStaffInstruction()}"
            </p>
          </div>

          {/* The "Why" Line */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 block mb-2">
              Triggered Rule(s) / "Why" Line:
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
          Assigns priority category strictly via clinic-approved clinical rules. Not an AI diagnostic verdict.
        </div>
      </div>
    </div>
  );
};
