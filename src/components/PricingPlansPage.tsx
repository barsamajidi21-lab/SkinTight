import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Stethoscope, 
  Building2, 
  FileText, 
  QrCode, 
  ArrowRight, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Users, 
  Zap, 
  HelpCircle, 
  X, 
  Send, 
  ShoppingBag, 
  Lock, 
  Camera, 
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface PricingPlansPageProps {
  setActiveTab: (tab: any) => void;
  onStartScan?: () => void;
}

export type PlanType = 'free' | 'premium' | 'clinic_portal' | 'b2b_referral' | 'brand_affiliate';

interface InquiryData {
  planId: PlanType;
  planName: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  billingCycle: 'monthly' | 'annual';
  notes: string;
}

export const PricingPlansPage: React.FC<PricingPlansPageProps> = ({ 
  setActiveTab,
  onStartScan 
}) => {
  const [filterSection, setFilterSection] = useState<'all' | 'b2c' | 'b2b' | 'affiliate'>('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    id: PlanType;
    name: string;
    badge: string;
    price: string;
    description: string;
  }>({
    id: 'premium',
    name: 'Premium Skin Journal & Tracking',
    badge: 'Individual (B2C)',
    price: '$7.99 / mo',
    description: 'Unlimited AI scans, longitudinal mole tracking, and exportable clinical PDF reports.'
  });

  const [inquiryForm, setInquiryForm] = useState<InquiryData>({
    planId: 'premium',
    planName: 'Premium Skin Journal & Tracking',
    name: '',
    email: '',
    organization: '',
    role: '',
    billingCycle: 'annual',
    notes: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState<number | null>(null);

  const openInquiryModal = (
    id: PlanType, 
    name: string, 
    badge: string, 
    price: string, 
    description: string
  ) => {
    setSelectedPlan({ id, name, badge, price, description });
    setInquiryForm(prev => ({
      ...prev,
      planId: id,
      planName: name,
      billingCycle
    }));
    setIsSubmitted(false);
    setModalOpen(true);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.email) return;

    setIsSubmitting(true);
    // Simulate brief network submission for prototype
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const handleLaunchFreeScan = () => {
    if (onStartScan) {
      onStartScan();
    } else {
      setActiveTab('scan');
    }
  };

  const faqs = [
    {
      q: "How does the 7-day free trial for Premium work?",
      a: "You receive instant full access to unlimited AI lesion scans, side-by-side photo comparisons, and clinical PDF exports. You can test the longitudinal tracking capabilities with zero commitment. During our current beta onboarding, no credit card or billing details are collected."
    },
    {
      q: "How does the Clinic Triage & Intake Portal integrate into existing practices?",
      a: "Clinics receive a dedicated QR code and pre-screening link to place in patient registration packets, waiting rooms, or website appointment request pages. Consenting patients complete a 90-second photo self-check that organizes ABCD criteria into a clean digital triage summary before the provider enters the exam room."
    },
    {
      q: "What is the B2B Patient Referral & Triage Partnership model?",
      a: "When users in our app scan a lesion exhibiting rapid change or high-risk markers, our triage engine prompts them to find local accredited dermatologists or urgent care clinics. Partner practices receive priority placement and pre-screened referral notifications, helping patients get into clinic calendars before potential malignancies advance."
    },
    {
      q: "Are the skincare brand recommendations unbiased?",
      a: "Yes. Skin Tight strictly limits skincare affiliations to clinically tested, broad-spectrum UVA/UVB sunscreens, mineral blocks, and barrier-repair formulations vetted against American Academy of Dermatology (AAD) and Skin Cancer Foundation standards. Recommendations are non-intrusive and only displayed alongside wellness guidance."
    }
  ];

  return (
    <div 
      className="page-container w-full min-h-screen text-slate-100"
      style={{
        backgroundColor: '#060B13',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Top Hero Section */}
      <div className="w-full max-w-5xl mx-auto pt-4 pb-8 px-3 sm:px-6 text-center">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide mb-4 shadow-sm">
          <Sparkles size={14} className="text-[#00E5B9]" />
          <span>Transparent Monetization &amp; Healthcare Partnerships</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
          Skin Health for Individuals.<br />
          <span className="bg-gradient-to-r from-[#00E5B9] via-teal-300 to-[#8A2BE2] bg-clip-text text-transparent">
            Scalable Triage for Providers.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          Proactive early detection habits for patients, paired with pre-screened intake and referral infrastructure for dermatologists and health systems.
        </p>

        {/* Category Filter Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setFilterSection('all')}
            className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: filterSection === 'all' ? '#00E5B9' : 'rgba(255,255,255,0.04)',
              color: filterSection === 'all' ? '#060B13' : '#94a3b8',
              borderColor: filterSection === 'all' ? '#00E5B9' : 'rgba(255,255,255,0.08)'
            }}
          >
            All Plans &amp; Partnerships
          </button>
          <button
            onClick={() => setFilterSection('b2c')}
            className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: filterSection === 'b2c' ? '#00E5B9' : 'rgba(255,255,255,0.04)',
              color: filterSection === 'b2c' ? '#060B13' : '#94a3b8',
              borderColor: filterSection === 'b2c' ? '#00E5B9' : 'rgba(255,255,255,0.08)'
            }}
          >
            For Individuals (B2C)
          </button>
          <button
            onClick={() => setFilterSection('b2b')}
            className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: filterSection === 'b2b' ? '#00E5B9' : 'rgba(255,255,255,0.04)',
              color: filterSection === 'b2b' ? '#060B13' : '#94a3b8',
              borderColor: filterSection === 'b2b' ? '#00E5B9' : 'rgba(255,255,255,0.08)'
            }}
          >
            For Clinics &amp; Providers (B2B)
          </button>
          <button
            onClick={() => setFilterSection('affiliate')}
            className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: filterSection === 'affiliate' ? '#00E5B9' : 'rgba(255,255,255,0.04)',
              color: filterSection === 'affiliate' ? '#060B13' : '#94a3b8',
              borderColor: filterSection === 'affiliate' ? '#00E5B9' : 'rgba(255,255,255,0.08)'
            }}
          >
            Skincare Brand Affiliates
          </button>
        </div>

        {/* B2C Billing Cycle Toggle (shown when viewing B2C or All) */}
        {(filterSection === 'all' || filterSection === 'b2c') && (
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner mb-6">
            <button
              onClick={() => setBillingCycle('monthly')}
              className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: billingCycle === 'monthly' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: billingCycle === 'monthly' ? '#ffffff' : '#94a3b8'
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className="mini-btn px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: billingCycle === 'annual' ? '#00E5B9' : 'transparent',
                color: billingCycle === 'annual' ? '#060B13' : '#94a3b8'
              }}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-[#00E5B9] font-black uppercase">
                Save 38%
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 space-y-12">
        {/* ========================================================================= */}
        {/* SECTION 1: FOR INDIVIDUALS (B2C) */}
        {/* ========================================================================= */}
        {(filterSection === 'all' || filterSection === 'b2c') && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[#00E5B9]">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  Section 1: For Individuals (B2C)
                </h2>
                <p className="text-xs text-slate-400 m-0">
                  Daily proactive skin tracking, visual history, and educational mole monitoring.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Option 1: FREE BASIC PLAN */}
              <div 
                className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden"
                style={{
                  backgroundColor: '#0A0F1D',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        Free Community Access
                      </span>
                      <h3 className="text-2xl font-black text-white mt-3 mb-1">
                        Free Basic Plan
                      </h3>
                      <p className="text-xs text-slate-400">
                        Essential checkup tool to raise early skin cancer awareness.
                      </p>
                    </div>
                  </div>

                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">$0</span>
                      <span className="text-sm font-semibold text-slate-400">/ month forever</span>
                    </div>
                    <p className="text-xs text-teal-400/90 mt-1 font-medium">
                      ✓ No credit card or registration required
                    </p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>1 Free Instant AI Skin Scan</strong> with instant vision analysis
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Basic Risk Breakdown</strong> (ABCD Criteria indicators: Asymmetry, Border, Color, Diameter)
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Access to Educational Skin Health Articles</strong> in the SkinTight Academy
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-300 text-xs leading-relaxed">
                        Local clinic discovery directory for Georgia &amp; nationwide providers
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLaunchFreeScan}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
                    style={{
                      backgroundColor: 'rgba(0, 229, 185, 0.06)'
                    }}
                  >
                    <Camera size={18} />
                    <span>Start Free Scan Now</span>
                  </button>
                </div>
              </div>

              {/* Option 2: PREMIUM SKIN JOURNAL & TRACKING (Featured Card) */}
              <div 
                className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.22) 0%, rgba(75, 0, 130, 0.45) 100%), #0A0F1D',
                  border: '2px solid rgba(0, 229, 185, 0.65)',
                  boxShadow: '0 20px 45px -10px rgba(138, 43, 226, 0.35), 0 0 25px rgba(0, 229, 185, 0.15)'
                }}
              >
                {/* Featured Badge */}
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-l from-[#00E5B9] to-[#8A2BE2] text-[#060B13] font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-bl-2xl shadow-md">
                    ★ Recommended for Mole Tracking
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#00E5B9] bg-[#00E5B9]/10 px-3 py-1 rounded-full border border-[#00E5B9]/30">
                        Proactive Prevention
                      </span>
                      <h3 className="text-2xl font-black text-white mt-3 mb-1">
                        Premium Skin Journal &amp; Tracking
                      </h3>
                      <p className="text-xs text-slate-300">
                        Longitudinal photographic monitoring to spot evolving changes early.
                      </p>
                    </div>
                  </div>

                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">
                        {billingCycle === 'annual' ? '$59' : '$7.99'}
                      </span>
                      <span className="text-sm font-semibold text-slate-300">
                        {billingCycle === 'annual' ? '/ year ($4.91/mo)' : '/ month'}
                      </span>
                    </div>
                    <p className="text-xs text-[#00E5B9] mt-1 font-semibold flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Includes 7-Day Full Access Free Trial
                    </p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#00E5B9]/20 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-100 font-medium leading-relaxed">
                        <strong>Unlimited AI Skin Scans</strong> &amp; Longitudinal Visual History
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#00E5B9]/20 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-100 font-medium leading-relaxed">
                        <strong>Private "Skin Journal"</strong> to track mole changes, diameters &amp; colors over time
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#00E5B9]/20 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-100 font-medium leading-relaxed">
                        <strong>Exportable Clinical PDF Reports</strong> formatted for Primary Care Doctors &amp; Dermatologists
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-[#00E5B9]/20 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-100 font-medium leading-relaxed">
                        <strong>Priority Processing &amp; Enhanced Image Quality Validation</strong> (sharpness, lighting, scale)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => openInquiryModal(
                      'premium',
                      'Premium Skin Journal & Tracking',
                      'Individual (B2C)',
                      billingCycle === 'annual' ? '$59 / year' : '$7.99 / mo',
                      'Includes unlimited AI scans, private timeline photo tracking, and clinical PDF report downloads.'
                    )}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg"
                    style={{
                      backgroundColor: '#00E5B9',
                      color: '#060B13',
                      boxShadow: '0 8px 24px rgba(0, 229, 185, 0.35)'
                    }}
                  >
                    <span>Upgrade to Premium (7-Day Free Trial)</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: FOR CLINICS & HEALTHCARE PROVIDERS (B2B) */}
        {/* ========================================================================= */}
        {(filterSection === 'all' || filterSection === 'b2b') && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Stethoscope size={20} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  Section 2: For Clinics &amp; Healthcare Providers (B2B)
                </h2>
                <p className="text-xs text-slate-400 m-0">
                  Reduce triage bottlenecks, accelerate intake workflows, and receive pre-screened referral pipelines.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Option 3: CLINIC TRIAGE & INTAKE PORTAL */}
              <div 
                className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden"
                style={{
                  backgroundColor: '#0A0F1D',
                  border: '1px solid rgba(138, 43, 226, 0.4)'
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                        Practice Workflow Automation
                      </span>
                      <h3 className="text-2xl font-black text-white mt-3 mb-1">
                        Clinic Triage &amp; Intake Portal
                      </h3>
                      <p className="text-xs text-slate-400">
                        Designed for independent dermatology practices &amp; outpatient clinics.
                      </p>
                    </div>
                  </div>

                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">$149</span>
                      <span className="text-sm font-semibold text-slate-400">/ month per clinic location</span>
                    </div>
                    <p className="text-xs text-purple-300 mt-1 font-medium">
                      ✓ Simple flat-rate billing per practice location
                    </p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-purple-500/10 text-purple-400">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Pre-screened patient intake reports</strong> delivered prior to scheduled appointments
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-purple-500/10 text-purple-400">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Filters out low-risk benign visits</strong> to free up provider schedules for high-risk urgent procedures &amp; biopsies
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-purple-500/10 text-purple-400">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Custom QR / Link integration</strong> for clinic waiting rooms, kiosks &amp; website patient portals
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-purple-500/10 text-purple-400">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Dedicated dashboard</strong> to view patient-consented scan histories, side-by-side mole comparisons &amp; timeline logs
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => openInquiryModal(
                      'clinic_portal',
                      'Clinic Triage & Intake Portal',
                      'Healthcare Provider (B2B)',
                      '$149 / month per clinic location',
                      'Complete clinical intake suite with patient QR codes, pre-appointment reports, and provider review dashboard.'
                    )}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border border-purple-500/40 text-purple-200 hover:bg-purple-600/20"
                    style={{
                      backgroundColor: 'rgba(138, 43, 226, 0.15)'
                    }}
                  >
                    <Building2 size={18} />
                    <span>Request Clinic Pilot / Contact Sales</span>
                  </button>
                </div>
              </div>

              {/* Option 4: B2B PATIENT REFERRAL & TRIAGE PARTNERSHIP */}
              <div 
                className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden"
                style={{
                  backgroundColor: '#0A0F1D',
                  border: '1px solid rgba(0, 229, 185, 0.35)'
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#00E5B9] bg-[#00E5B9]/10 px-3 py-1 rounded-full border border-[#00E5B9]/20">
                        Performance / Network Partnership
                      </span>
                      <h3 className="text-2xl font-black text-white mt-3 mb-1">
                        B2B Patient Referral &amp; Triage Partnership
                      </h3>
                      <p className="text-xs text-slate-400">
                        Designed for local dermatology practices, urgent care, and wellness centers.
                      </p>
                    </div>
                  </div>

                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">Performance-Based</span>
                    </div>
                    <p className="text-xs text-[#00E5B9] mt-1 font-medium">
                      ✓ Flexible referral model structured per verified pre-screened referral
                    </p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Direct connection from high-risk AI app alerts</strong> to verified local clinic appointment queues
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Performance-based structure</strong> per pre-screened patient referral delivered to your office
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Turn-by-turn GPS direction integration</strong> &amp; preferred booking placement inside our Clinic Finder
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-0.5 bg-teal-500/10 text-[#00E5B9]">
                        <Check size={16} />
                      </div>
                      <span className="text-sm text-slate-200 font-medium leading-relaxed">
                        <strong>Priority care bridge</strong> ensuring high-risk or evolving lesions receive rapid medical evaluation
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => openInquiryModal(
                      'b2b_referral',
                      'B2B Patient Referral & Triage Partnership',
                      'Clinic Network Partner (B2B)',
                      'Performance / Referral Structure',
                      'Connect high-risk app alerts directly to your clinic queue with preferred placement and GPS routing.'
                    )}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border border-[#00E5B9]/40 text-teal-300 hover:bg-[#00E5B9]/15"
                    style={{
                      backgroundColor: 'rgba(0, 229, 185, 0.08)'
                    }}
                  >
                    <Stethoscope size={18} />
                    <span>Partner With Skin Tight</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: DERMATOLOGY-VERIFIED SKINCARE PARTNERSHIPS */}
        {/* ========================================================================= */}
        {(filterSection === 'all' || filterSection === 'affiliate') && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[#00E5B9]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  Section 3: Dermatology-Verified Skincare Partnerships
                </h2>
                <p className="text-xs text-slate-400 m-0">
                  Clinically vetted SPF, sun protection apparel, and preventative skin products.
                </p>
              </div>
            </div>

            {/* Option 5: CURATED SKINCARE BRAND ADVERTISING & AFFILIATES */}
            <div 
              className="rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all"
              style={{
                backgroundColor: '#0A0F1D',
                border: '1px solid rgba(255, 255, 255, 0.09)'
              }}
            >
              <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
                <div className="space-y-4 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[#00E5B9] text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck size={14} />
                    <span>Curated Brand Affiliate Program</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Curated Skincare Brand Advertising &amp; Affiliates
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    Skin Tight partners exclusively with brands manufacturing dermatologist-tested, broad-spectrum UVA/UVB SPFs, UPF 50+ sun protective gear, and evidence-based skin barrier repair formulations.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-start gap-2.5 text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <CheckCircle2 size={16} className="text-[#00E5B9] shrink-0 mt-0.5" />
                      <span><strong>Non-intrusive product recommendations</strong> contextually embedded in low-risk wellness &amp; daily UV guidance reports.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <CheckCircle2 size={16} className="text-[#00E5B9] shrink-0 mt-0.5" />
                      <span><strong>Strict Clinical Vetting:</strong> No unverified claims or cosmetic fluff; exclusively certified UV protection.</span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto shrink-0 flex flex-col items-center gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center w-full sm:w-64">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Partnership Model</div>
                    <div className="text-lg font-black text-white">Affiliate &amp; Co-Marketing</div>
                    <div className="text-xs text-[#00E5B9] font-medium mt-1">High-Intent Skin Health Audience</div>
                  </div>

                  <button
                    onClick={() => openInquiryModal(
                      'brand_affiliate',
                      'Curated Skincare Brand Advertising & Affiliates',
                      'Brand Partnership',
                      'Affiliate / Co-Marketing',
                      'Feature vetted broad-spectrum SPFs and sun safety gear in our post-scan recommendations.'
                    )}
                    className="w-full sm:w-64 py-4 rounded-2xl font-black text-sm tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border border-teal-500/40 text-teal-300 hover:bg-teal-500/10"
                    style={{
                      backgroundColor: 'rgba(0, 229, 185, 0.08)'
                    }}
                  >
                    <span>Inquire About Brand Partnerships</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* COMPREHENSIVE FEATURE COMPARISON MATRIX */}
        {/* ========================================================================= */}
        <section className="pt-6">
          <div className="rounded-3xl p-6 sm:p-8 bg-[#0A0F1D] border border-white/5">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Zap size={20} className="text-[#00E5B9]" />
              <span>Full Tier &amp; Capability Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Compare features across individual subscriptions and enterprise clinic integrations.
            </p>

            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-3 px-3 font-bold uppercase tracking-wider">Core Capabilities</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-white">Free Basic</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[#00E5B9]">Premium ($7.99/mo)</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-purple-400">Clinic Portal ($149)</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-teal-300">B2B Referral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr>
                    <td className="py-3.5 px-3 font-medium">Instant AI Vision Lesion Check</td>
                    <td className="py-3.5 px-3">1 Scan</td>
                    <td className="py-3.5 px-3 text-[#00E5B9] font-bold">Unlimited</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">Patient Included</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">Patient Included</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-3 font-medium">ABCD Criteria Breakdown</td>
                    <td className="py-3.5 px-3 text-teal-400">✓ Basic</td>
                    <td className="py-3.5 px-3 text-[#00E5B9] font-bold">✓ Advanced</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">✓ Clinical Triage</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">✓ Clinical Triage</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-3 font-medium">Longitudinal Photo Timeline</td>
                    <td className="py-3.5 px-3 text-slate-600">—</td>
                    <td className="py-3.5 px-3 text-[#00E5B9] font-bold">✓ Full Journal</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">✓ Multi-Patient</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">✓ Referral Case</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-3 font-medium">Exportable Doctor PDF Reports</td>
                    <td className="py-3.5 px-3 text-slate-600">—</td>
                    <td className="py-3.5 px-3 text-[#00E5B9] font-bold">✓ Instant PDF</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">✓ EHR Ready</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">✓ Direct Sync</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-3 font-medium">Custom Waiting Room QR Kiosk</td>
                    <td className="py-3.5 px-3 text-slate-600">—</td>
                    <td className="py-3.5 px-3 text-slate-600">—</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">✓ Included</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-3 font-medium">Turn-by-turn Local Referral Routing</td>
                    <td className="py-3.5 px-3 text-slate-400">Standard</td>
                    <td className="py-3.5 px-3 text-slate-400">Standard</td>
                    <td className="py-3.5 px-3 text-purple-300 font-bold">Preferred Partner</td>
                    <td className="py-3.5 px-3 text-teal-300 font-bold">Priority Placement</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FAQ ACCORDION SECTION */}
        {/* ========================================================================= */}
        <section className="pt-2">
          <div className="rounded-3xl p-6 sm:p-8 bg-[#0A0F1D] border border-white/5 space-y-4">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <HelpCircle size={20} className="text-[#00E5B9]" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isExpanded = faqExpanded === index;
                return (
                  <div 
                    key={index}
                    className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setFaqExpanded(isExpanded ? null : index)}
                      className="mini-btn w-full p-4 text-left flex items-center justify-between text-sm font-bold text-slate-200 hover:text-white transition-colors"
                      style={{ minHeight: '48px' }}
                    >
                      <span>{faq.q}</span>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-[#00E5B9] shrink-0 ml-2" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400 shrink-0 ml-2" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-4 pt-0 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MANDATORY MEDICAL DISCLAIMER BANNER */}
        {/* Coral Red (#FF3B30) for disclaimers as strictly requested */}
        {/* ========================================================================= */}
        <section className="pt-4 pb-8">
          <div 
            className="rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all"
            style={{
              backgroundColor: 'rgba(255, 59, 48, 0.08)',
              border: '1.5px solid #FF3B30',
              boxShadow: '0 8px 30px rgba(255, 59, 48, 0.12)'
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'rgba(255, 59, 48, 0.2)',
                  color: '#FF3B30'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(255, 59, 48, 0.2)',
                      color: '#FF3B30'
                    }}
                  >
                    Mandatory Clinical Disclaimer
                  </span>
                </div>
                <p 
                  className="text-sm font-semibold leading-relaxed m-0"
                  style={{ color: '#ffffff' }}
                >
                  Skin Tight is an AI-powered wellness and educational monitoring tool, not a diagnostic medical device. It does not provide medical diagnoses, treatment plans, or prescriptions. Always consult a licensed dermatologist.
                </p>
                <p 
                  className="text-xs leading-relaxed m-0"
                  style={{ color: '#fca5a5' }}
                >
                  Notice: If you detect a lesion that is rapidly enlarging, changing color, bleeding, itching, or failing to heal, schedule an in-person clinical exam with a certified healthcare provider immediately.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* CLEAN MODAL POPUP FOR BETA ONBOARDING & CONTACT / INTEREST */}
      {/* Do NOT collect actual credit card data or banking info */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-[4000] flex items-center justify-center p-3 sm:p-6"
          style={{ backgroundColor: 'rgba(6, 11, 19, 0.85)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div 
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto"
            style={{
              backgroundColor: '#0A0F1D',
              border: '1px solid rgba(0, 229, 185, 0.35)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 229, 185, 0.15)'
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5B9] bg-[#00E5B9]/10 px-3 py-1 rounded-full border border-[#00E5B9]/20">
                  {selectedPlan.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2 mb-1">
                  {selectedPlan.name}
                </h3>
                <div className="text-sm font-bold text-teal-300">
                  {selectedPlan.price}
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="mini-btn p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Informational Pilot / Beta Onboarding Notice */}
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 text-xs text-teal-200 mb-6 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-[#00E5B9] shrink-0 mt-0.5" />
              <div>
                <strong>Beta Program Notice:</strong> Thank you for your interest! Skin Tight is currently onboarding select beta users and clinic partners. <em>No credit card or banking information is collected today.</em>
              </div>
            </div>

            {isSubmitted ? (
              /* Success State */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#00E5B9]/20 border border-[#00E5B9]/40 flex items-center justify-center text-[#00E5B9] mx-auto">
                  <Check size={32} />
                </div>
                <h4 className="text-xl font-black text-white">
                  You're on the Priority List!
                </h4>
                <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Thank you for your interest! Our team will reach out to <strong>{inquiryForm.email}</strong> shortly with your onboarding pass and pilot details.
                </p>

                <div className="pt-4 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      handleLaunchFreeScan();
                    }}
                    className="w-full py-3.5 rounded-xl font-black text-sm tracking-wide bg-[#00E5B9] text-[#060B13] hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    <span>Try Free AI Skin Scan Now</span>
                  </button>

                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-white/5 border border-white/5"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              /* Interest Form */
              <form onSubmit={handleSubmitInquiry} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Full Name <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jordan Hayes or Alex Rivera"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5B9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Email Address <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@practice.com or personal@gmail.com"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5B9]"
                  />
                </div>

                {/* Show organization / practice name for B2B tiers */}
                {(selectedPlan.id === 'clinic_portal' || selectedPlan.id === 'b2b_referral' || selectedPlan.id === 'brand_affiliate') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Practice / Organization / Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Atlanta Dermatology & Aesthetic Center"
                      value={inquiryForm.organization}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, organization: e.target.value }))}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5B9]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Questions or Specific Goals
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about your practice workflow, lesion tracking requirements, or pilot timeline..."
                    value={inquiryForm.notes}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5B9] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl font-black text-sm tracking-wide bg-[#00E5B9] text-[#060B13] hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Connecting with Pilot Team...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Beta Access Request</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-2.5">
                    🔒 No payment info collected. Confidential pilot evaluation only.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
