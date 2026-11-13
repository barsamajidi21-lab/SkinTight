import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Clinic } from '../../types/clinic';
import { submitClinicCase, isDemoClinic } from '../../lib/clinicService';
import { IntakeForm } from '../../App';

interface ClinicIntakePageProps {
  clinic: Clinic;
  onBackToApp?: () => void;
}

export const ClinicIntakePage: React.FC<ClinicIntakePageProps> = ({ clinic, onBackToApp }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<IntakeForm>>({
    bodyLocation: '',
    exactBodyLocation: '',
    lesionFirstNoticedDate: '',
    newOrChanged: '',
    changeTimePeriod: '',
    approximateSize: '',
    colorChange: '',
    sizeChange: '',
    shapeChange: '',
    bleeding: 'None reported',
    nonHealing: 'None reported',
    painOrSensation: 'None reported',
    patientComments: '',
    ageRange: '',
    personalCancerHistory: 'No personal history',
    familyCancerHistory: 'No family history',
    sunburnOrTanningHistory: 'None',
    immuneSuppressing: 'No',
  });

  const updateField = (key: keyof IntakeForm, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds 15MB limit. Please choose a smaller photo.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Please enter your full name so clinic staff can identify your chart.');
      return;
    }
    if (!form.bodyLocation) {
      alert('Please select the body area of concern.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      await submitClinicCase(
        clinic.id,
        patientName.trim(),
        form,
        photos,
        {
          patientEmail: patientEmail.trim(),
          patientPhone: patientPhone.trim(),
          isPhoneIntake: false,
        }
      );
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit intake. Please try again or contact the clinic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDemoBanner = !!(clinic.isDemo || isDemoClinic(clinic.id));

  return (
    <div className="clinic-ui min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center font-sans">
      {showDemoBanner && (
        <div className="w-full sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black text-center shadow-md">
          DEMO — all patients are fictional.
        </div>
      )}
      <div className="w-full max-w-3xl p-4 sm:p-6 md:p-8">
        {/* Navigation & Clinic Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">{clinic.name}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <MapPin size={12} className="text-teal-400" /> {clinic.address}
              </p>
            </div>
          </div>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
        </div>

        {/* Successful Submission View */}
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-3">Information Received</h2>
            
            {/* Exact Required Safety Confirmation Message */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mb-6 text-slate-200 text-sm sm:text-base leading-relaxed text-left font-medium">
              Thank you. Your information has been received. If a spot is bleeding heavily, growing quickly, or you feel unwell, contact your doctor or seek care now. Otherwise, bring this report to your appointment. Call 911 for emergencies.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-teal-400" />
                <span>Need immediate clinic assistance? Call {clinic.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-teal-400" />
                <span>Office Hours: Mon–Fri, 8:00 AM – 5:00 PM</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setCurrentStep(1);
                setPhotos([]);
              }}
              className="mt-8 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Submit Another Spot or Question
            </button>
          </motion.div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl">
            {/* Title & Intake Purpose */}
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 border border-teal-800/50 px-2.5 py-1 rounded-md">
                Official Pre-Visit Intake Portal
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">Dermatology Pre-Visit Skin Summary</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Help our clinical team prepare for your appointment by sharing information about your spot or skin concern.
              </p>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
              {[
                { step: 1, title: 'Patient Info & Photos' },
                { step: 2, title: 'Spot Changes & Symptoms' },
                { step: 3, title: 'Clinical History' }
              ].map(s => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep === s.step 
                      ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/30' 
                      : currentStep > s.step 
                      ? 'bg-teal-950 text-teal-400 border border-teal-800' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {s.step}
                  </div>
                  <span className={`text-xs hidden sm:inline font-medium ${
                    currentStep === s.step ? 'text-white' : 'text-slate-500'
                  }`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>

            {submissionError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-200 text-xs flex items-center gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* STEP 1: Patient Identity & Photo Documentation */}
              {currentStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Patient Full Name <span className="text-teal-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g., Patient A."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Age Range <span className="text-teal-400">*</span>
                      </label>
                      <select
                        value={form.ageRange || ''}
                        onChange={(e) => updateField('ageRange', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="">Select age range</option>
                        <option value="Under 20">Under 20</option>
                        <option value="20-39">20–39</option>
                        <option value="40-59">40–59</option>
                        <option value="60+">60+</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="(555) 010-0199"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Body Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Body Location <span className="text-teal-400">*</span>
                      </label>
                      <select
                        required
                        value={form.bodyLocation || ''}
                        onChange={(e) => updateField('bodyLocation', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="">Select primary body location</option>
                        <option value="Face">Face / Forehead / Cheeks</option>
                        <option value="Neck">Neck</option>
                        <option value="Chest">Chest</option>
                        <option value="Upper Back">Upper Back</option>
                        <option value="Lower Back">Lower Back</option>
                        <option value="Arms">Arms / Forearms</option>
                        <option value="Hands">Hands / Fingers</option>
                        <option value="Legs">Legs / Thighs / Calves</option>
                        <option value="Feet">Feet / Soles / Toes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Exact Spot Description
                      </label>
                      <input
                        type="text"
                        value={form.exactBodyLocation || ''}
                        onChange={(e) => updateField('exactBodyLocation', e.target.value)}
                        placeholder="e.g., Right inner wrist, 2 inches above palm"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Photo Upload Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Upload Clear Close-Up Photo(s) of the Spot
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <Camera size={32} className="mx-auto text-teal-400 mb-2" />
                      <p className="text-xs font-semibold text-white">Click or tap to attach skin photo(s)</p>
                      <p className="text-[11px] text-slate-500 mt-1">Photos are securely archived for doctor review only (max 15MB each)</p>
                    </div>

                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                        {photos.map((p, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden border border-slate-700 aspect-square group">
                            <img src={p} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-red-400 hover:text-red-300"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!patientName.trim()) return alert('Please enter your full name.');
                        if (!form.bodyLocation) return alert('Please select the body location.');
                        setCurrentStep(2);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      Continue to Spot Changes <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Spot Changes & Symptoms */}
              {currentStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Is this spot new or existing? <span className="text-teal-400">*</span>
                      </label>
                      <select
                        value={form.newOrChanged || ''}
                        onChange={(e) => updateField('newOrChanged', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="">Select spot status</option>
                        <option value="New spot">New spot</option>
                        <option value="Existing spot that changed">Existing spot that changed</option>
                        <option value="Existing spot unchanged">Existing spot unchanged</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        When did you first notice it?
                      </label>
                      <input
                        type="text"
                        value={form.lesionFirstNoticedDate || ''}
                        onChange={(e) => updateField('lesionFirstNoticedDate', e.target.value)}
                        placeholder="e.g., 3 weeks ago, or 6 months ago"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Has it bled without being scratched or injured? <span className="text-teal-400">*</span>
                      </label>
                      <select
                        value={form.bleeding || 'None reported'}
                        onChange={(e) => updateField('bleeding', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="None reported">No, has not bled</option>
                        <option value="Yes, without injury">Yes, bled without injury or trauma</option>
                        <option value="Bled only from injury/scratch">Bled only after accidental scratch</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Is it a sore that hasn't healed in 3–4 weeks? <span className="text-teal-400">*</span>
                      </label>
                      <select
                        value={form.nonHealing || 'None reported'}
                        onChange={(e) => updateField('nonHealing', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="None reported">No, normal healing / not an open sore</option>
                        <option value="Yes (> 3-4 weeks)">Yes, persistent sore for more than 3–4 weeks</option>
                        <option value="Crusting and reforming">Heals slightly then crusts again</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Over what time period has it changed?
                      </label>
                      <select
                        value={form.changeTimePeriod || ''}
                        onChange={(e) => updateField('changeTimePeriod', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="">Select timeframe</option>
                        <option value="Rapidly over days/weeks">Rapidly over days to weeks</option>
                        <option value="Over weeks to a few months">Over weeks to a few months</option>
                        <option value="Slowly over a year or more">Slowly over a year or more</option>
                        <option value="Has not changed">Has not changed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Any sensation (itching, pain, tenderness)?
                      </label>
                      <select
                        value={form.painOrSensation || 'None reported'}
                        onChange={(e) => updateField('painOrSensation', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="None reported">None / no sensation</option>
                        <option value="Itching">Itching</option>
                        <option value="Pain or tenderness">Pain or tenderness</option>
                        <option value="Burning or stinging">Burning or stinging</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Color or Size Changes Observed
                    </label>
                    <input
                      type="text"
                      value={form.colorChange || ''}
                      onChange={(e) => updateField('colorChange', e.target.value)}
                      placeholder="e.g., Became darker black, multiple colors, grew from pencil tip to pencil eraser"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                    />
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2"
                    >
                      Continue to History <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Clinical Background & Submission */}
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Personal Skin Cancer History
                      </label>
                      <select
                        value={form.personalCancerHistory || 'No personal history'}
                        onChange={(e) => updateField('personalCancerHistory', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="No personal history">No personal history</option>
                        <option value="Melanoma">Melanoma</option>
                        <option value="Basal Cell Carcinoma (BCC)">Basal Cell Carcinoma (BCC)</option>
                        <option value="Squamous Cell Carcinoma (SCC)">Squamous Cell Carcinoma (SCC)</option>
                        <option value="Precancerous (Actinic Keratosis)">Precancerous (Actinic Keratosis)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Family Melanoma / Skin Cancer History
                      </label>
                      <select
                        value={form.familyCancerHistory || 'No family history'}
                        onChange={(e) => updateField('familyCancerHistory', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                      >
                        <option value="No family history">No family history</option>
                        <option value="Melanoma in first-degree relative">Melanoma in parent, sibling, or child</option>
                        <option value="Melanoma in extended relative">Melanoma in extended family</option>
                        <option value="Non-melanoma skin cancer">Non-melanoma skin cancer</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Are you taking medications that suppress the immune system?
                    </label>
                    <select
                      value={form.immuneSuppressing || 'No'}
                      onChange={(e) => updateField('immuneSuppressing', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes (Immunosuppressant, biologic, chemotherapy)</option>
                      <option value="Organ transplant recipient">Organ transplant recipient</option>
                      <option value="Not sure">Not sure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Any specific questions or concerns for the doctor?
                    </label>
                    <textarea
                      rows={3}
                      value={form.patientComments || ''}
                      onChange={(e) => updateField('patientComments', e.target.value)}
                      placeholder="e.g., Catches on clothing, or feels different than other moles..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-white text-sm outline-none resize-none"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                    <ShieldCheck size={18} className="text-teal-400 shrink-0 mt-0.5" />
                    <span>
                      SkinTight is a pre-visit documentation and clinical information tool. It does not diagnose conditions or give medical advice. Your information is delivered directly to {clinic.name}.
                    </span>
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} /> Submitting to Clinic...
                        </>
                      ) : (
                        <>Submit Pre-Visit Information</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
