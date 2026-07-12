import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  Stethoscope, 
  Search,
  Eye
} from 'lucide-react';

export interface ShowcaseItem {
  id: string;
  name: string;
  category: string;
  image: string;
  riskLevel: 'benign' | 'low' | 'moderate' | 'high';
  explanation: string;
  symptoms: string[];
  aiSuggestions: string[];
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'benign_mole',
    name: 'Benign Melanocytic Nevus',
    category: 'Normal Mole',
    image: '/src/assets/images/skin_mole_normal_1783884962854.jpg',
    riskLevel: 'benign',
    explanation: 'A completely normal, symmetrical, single-shaded brown spot with well-defined borders. Normal moles are safe and extremely common.',
    symptoms: [
      'Perfect symmetry (both halves match perfectly)',
      'Smooth, well-defined, regular borders',
      'Uniform brown or tan coloration throughout'
    ],
    aiSuggestions: [
      'Document monthly with SkinTight to confirm it remains unchanged',
      'Schedule a standard annual full-body exam with a dermatologist',
      'Apply daily broad-spectrum SPF 30+ sunscreen'
    ]
  },
  {
    id: 'atypical_mole',
    name: 'Atypical Dysplastic Nevus',
    category: 'Suspect Mole',
    image: '/src/assets/images/atypical_mole_suspect_1783884972298.jpg',
    riskLevel: 'moderate',
    explanation: 'An irregular mole with slightly asymmetrical contour, fuzzy borders, and multiple colors. These require careful monitoring as they can occasionally mimic melanoma.',
    symptoms: [
      'Asymmetrical shape (one half does not match the other)',
      'Hazy, notched, scalloped, or poorly-defined borders',
      'Varying colors (mixture of tan, dark brown, and black)'
    ],
    aiSuggestions: [
      'Scan weekly using SkinTight to alert on size, shape, or color shift',
      'Consult a board-certified dermatologist for a clinical dermoscopy',
      'Strictly avoid artificial tanning beds and intense midday sun'
    ]
  },
  {
    id: 'sun_damage',
    name: 'Solar Lentigines',
    category: 'Sun Damage / Freckles',
    image: '/src/assets/images/skin_sun_damage_spots_1783884980559.jpg',
    riskLevel: 'low',
    explanation: 'Common flat spots caused by chronic exposure to UV light. While they are benign in themselves, they indicate cumulative sun damage and increased skin vulnerability.',
    symptoms: [
      'Multiple flat, oval-shaped brown or dark spots',
      'Typically clusters on face, hands, arms, and upper back',
      'Completely flat and smooth, with no scaling or itching'
    ],
    aiSuggestions: [
      'Wear broad-brimmed protective hats and UV-blocking clothing outdoors',
      'Apply broad-spectrum mineral sunscreen (SPF 50+) daily',
      'Integrate topical skin barrier support like Vitamin C or Niacinamide'
    ]
  },
  {
    id: 'acne_pustule',
    name: 'Acne Vulgaris',
    category: 'Inflammatory Acne',
    image: '/src/assets/images/skin_acne_pustules_1783884987754.jpg',
    riskLevel: 'low',
    explanation: 'An inflammatory blockage of hair follicles and sebaceous glands by oil and dead skin. Highly active but temporary and completely non-cancerous.',
    symptoms: [
      'Red, inflamed bumps (papules) with clear central yellow/white pus heads',
      'Mild localized tenderness or warm throbbing sensation',
      'Develops quickly over 1 to 3 days and resolves'
    ],
    aiSuggestions: [
      'Wash gently twice daily with salicylic acid or benzoyl peroxide cleansers',
      'Strictly avoid popping, squeezing, or picking to prevent deep scarring',
      'Use only non-comedogenic (oil-free) moisturizers and skin products'
    ]
  },
  {
    id: 'eczema',
    name: 'Atopic Dermatitis',
    category: 'Eczema / Dryness',
    image: '/src/assets/images/skin_eczema_dryness_1783884995375.jpg',
    riskLevel: 'low',
    explanation: 'An inflammatory, itchy skin barrier disruption. Often triggered by environmental allergens, stress, or dry climates. Non-contagious.',
    symptoms: [
      'Intense, persistent itchiness that worsens at night',
      'Dry, rough, pink or red scaly patches',
      'Slightly thickened or compromised epidermal barrier'
    ],
    aiSuggestions: [
      'Apply thick, ceramide-rich barrier repair creams within 3 minutes of bathing',
      'Keep showers lukewarm and brief to prevent lipid barrier stripping',
      'Avoid harsh chemical soaps, heavily fragranced lotions, and wool fabrics'
    ]
  },
  {
    id: 'seborrheic_keratosis',
    name: 'Seborrheic Keratosis',
    category: 'Harmless Waxy Growth',
    image: '/src/assets/images/seborrheic_keratosis_lesion_1783885004465.jpg',
    riskLevel: 'benign',
    explanation: 'A very common, completely non-cancerous skin growth that typically appears in adulthood. They are harmless and do not transform into skin cancer.',
    symptoms: [
      'Slightly elevated, crusty, or granular texture',
      'Distinctive "stuck-on" appearance, looking like a waxy scab',
      'Color varies from light tan to dark brown or solid black'
    ],
    aiSuggestions: [
      'No medical treatment is required as they are harmless',
      'Avoid picking or scratching at the growth to prevent irritation/infection',
      'Consult a physician if it gets snagged on clothing, bleeds, or is annoying'
    ]
  },
  {
    id: 'psoriasis',
    name: 'Plaque Psoriasis',
    category: 'Chronic Scale Patch',
    image: '/src/assets/images/psoriasis_plaque_1783885021862.jpg',
    riskLevel: 'low',
    explanation: 'A chronic, non-contagious autoimmune condition that accelerates skin cell replacement, leading to thick raised patches of skin buildup.',
    symptoms: [
      'Thickened, red patches covered with dry, silvery-white scales',
      'Most commonly found on knees, elbows, scalp, and lower back',
      'Prone to itching, cracking, and minor bleeding if irritated'
    ],
    aiSuggestions: [
      'Moisturize deeply with urea, salicylic acid, or coal tar ointments',
      'Avoid scratching to prevent the Koebner phenomenon (triggering new plaques)',
      'Discuss prescription topical corticosteroid therapies with a clinician'
    ]
  },
  {
    id: 'cherry_angioma',
    name: 'Cherry Angioma',
    category: 'Benign Vascular Spot',
    image: '/src/assets/images/cherry_angioma_1783885030327.jpg',
    riskLevel: 'benign',
    explanation: 'A benign skin growth made up of a small cluster of dilated blood vessels. They are very common after the age of 30 and are completely harmless.',
    symptoms: [
      'Small, bright cherry-red, ruby-red, or deep purple smooth papules',
      'Ranges from flat red spots to slightly dome-like raised bumps',
      'Firm, smooth texture, typically measuring between 1mm and 5mm'
    ],
    aiSuggestions: [
      'Require no medical intervention as they are 100% benign',
      'Do not attempt to scratch off or use chemical wart-removers on them',
      'Can be cleanly removed by a dermatologist via quick laser or cryotherapy'
    ]
  }
];

export function SkinShowcaseCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const minSwipeDistance = 50;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SHOWCASE_ITEMS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
  };

  const activeItem = SHOWCASE_ITEMS[currentIndex];

  const getRiskBadgeStyles = (level: ShowcaseItem['riskLevel']) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-500/20 border-red-500/30 text-red-400',
          text: 'HIGH RISK',
          icon: <ShieldAlert size={14} className="text-red-400" />
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
          text: 'MODERATE RISK',
          icon: <AlertTriangle size={14} className="text-amber-400" />
        };
      case 'low':
        return {
          bg: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
          text: 'LOW RISK',
          icon: <Info size={14} className="text-blue-400" />
        };
      default:
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
          text: 'BENIGN / SAFE',
          icon: <CheckCircle2 size={14} className="text-emerald-400" />
        };
    }
  };

  const badge = getRiskBadgeStyles(activeItem.riskLevel);

  return (
    <div className="glass-card mb-8" style={{
      background: 'rgba(15, 23, 42, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '32px',
      padding: '24px',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header & Title */}
      <div className="flex flex-col gap-1 mb-5">
        <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Clinical Skin Library
        </h3>
        <p className="text-sm font-bold text-white leading-tight">Swipe & learn about common skin features and AI diagnostics</p>
      </div>

      {/* Main Swipeable Area */}
      <div 
        className="relative w-full overflow-hidden select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* Visual up close photo view */}
            <div className="relative aspect-square w-full max-w-[340px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border border-white/5 shadow-2xl group">
              <img 
                src={activeItem.image} 
                alt={activeItem.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">{activeItem.category}</span>
                    <h4 className="text-lg font-black text-white leading-tight mt-0.5">{activeItem.name}</h4>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-lg">
                    <Search size={16} className="text-cyan-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Diagnostics & Analysis Report */}
            <div className="space-y-4">
              {/* Risk Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Assessment</span>
                <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${badge.bg}`}>
                  {badge.icon}
                  <span>{badge.text}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[12.5px] text-slate-300 leading-relaxed font-medium">
                  {activeItem.explanation}
                </p>
              </div>

              {/* ABCDE Symmetries */}
              <div>
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Eye size={13} className="text-cyan-400" />
                  Visual Characteristics
                </h5>
                <ul className="space-y-1.5">
                  {activeItem.symptoms.map((symptom, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Recommendations */}
              <div className="pt-2 border-t border-white/5">
                <h5 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Stethoscope size={13} className="text-cyan-400 animate-pulse" />
                  AI Support Recommendations
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  {activeItem.aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start p-3 rounded-xl bg-cyan-950/15 border border-cyan-500/10">
                      <div className="w-5 h-5 rounded-full bg-cyan-400/10 text-cyan-400 font-mono text-[10px] font-black flex items-center justify-center flex-shrink-0 border border-cyan-400/20">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-300 leading-normal font-medium">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Navigation Controls & Interactive Dots */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
        {/* Left Arrow */}
        <button 
          onClick={handlePrev}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-slate-400 hover:text-white border border-white/5"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Slide Indicator Dots */}
        <div className="flex gap-1.5 justify-center items-center">
          {SHOWCASE_ITEMS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'w-6 bg-cyan-400' 
                  : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={handleNext}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-slate-400 hover:text-white border border-white/5"
          aria-label="Next image"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
