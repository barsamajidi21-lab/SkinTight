import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  Stethoscope, 
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
    name: 'Benign Nevus',
    category: 'Normal Mole',
    image: '/images/skin_mole_normal_1783884962854.jpg',
    riskLevel: 'benign',
    explanation: 'Symmetrical, uniform brown spot with smooth borders. Harmless and extremely common.',
    symptoms: [
      'Symmetrical shape & regular borders',
      'Consistent tan or brown coloration'
    ],
    aiSuggestions: [
      'Monitor monthly with SkinTight',
      'Apply daily broad-spectrum SPF 30+'
    ]
  },
  {
    id: 'atypical_mole',
    name: 'Atypical Nevus',
    category: 'Suspect Mole',
    image: '/images/atypical_mole_suspect_1783884972298.jpg',
    riskLevel: 'moderate',
    explanation: 'Irregular shape, blurry borders, or mixed colors. Requires professional evaluation.',
    symptoms: [
      'Asymmetrical or notched borders',
      'Shades of tan, brown, or black'
    ],
    aiSuggestions: [
      'Track weekly using SkinTight app',
      'Consult dermatologist for exam'
    ]
  },
  {
    id: 'sun_damage',
    name: 'Solar Lentigines',
    category: 'Sun Damage',
    image: '/images/skin_sun_damage_spots_1783884980559.jpg',
    riskLevel: 'low',
    explanation: 'Flat brown patches from chronic sun exposure. Safe, but indicates UV susceptibility.',
    symptoms: [
      'Flat, smooth brown spots in clusters',
      'Most common on face and hands'
    ],
    aiSuggestions: [
      'Wear SPF 50+ and sun hats',
      'Get annual dermatological exams'
    ]
  },
  {
    id: 'acne_pustule',
    name: 'Acne Vulgaris',
    category: 'Pimple / Pustule',
    image: '/images/skin_acne_pustules_1783884987754.jpg',
    riskLevel: 'low',
    explanation: 'Inflamed pore blockage containing localized pus. Highly active but temporary and safe.',
    symptoms: [
      'Red bump with white central head',
      'Mild localized skin tenderness'
    ],
    aiSuggestions: [
      'Wash daily with salicylic acid',
      'Do not pop to prevent scars'
    ]
  },
  {
    id: 'eczema',
    name: 'Atopic Dermatitis',
    category: 'Eczema',
    image: '/images/skin_eczema_dryness_1783884995375.jpg',
    riskLevel: 'low',
    explanation: 'Dry, itchy, red patches caused by skin barrier weakness. Relieved by deep hydration.',
    symptoms: [
      'Rough, pink, or red scaly patches',
      'Persistent itching sensation'
    ],
    aiSuggestions: [
      'Moisturize with ceramide cream',
      'Avoid harsh chemical soaps'
    ]
  },
  {
    id: 'seborrheic_keratosis',
    name: 'Seborrheic Keratosis',
    category: 'Harmless Growth',
    image: '/images/seborrheic_keratosis_lesion_1783885004465.jpg',
    riskLevel: 'benign',
    explanation: 'Waxy, raised crusty growth common in adults. Safe and never becomes cancerous.',
    symptoms: [
      'Elevated "stuck-on" scabby look',
      'Waxy tan, brown, or black crust'
    ],
    aiSuggestions: [
      'No medical treatment required',
      'Do not pick or scratch'
    ]
  },
  {
    id: 'psoriasis',
    name: 'Plaque Psoriasis',
    category: 'Chronic Scales',
    image: '/images/psoriasis_plaque_1783885021862.jpg',
    riskLevel: 'low',
    explanation: 'Autoimmune skin buildup causing raised, scaly red patches. Non-contagious.',
    symptoms: [
      'Raised red plaques with silver scales',
      'Common on elbows and knees'
    ],
    aiSuggestions: [
      'Apply rich moisturizers daily',
      'Consult doctor for topical therapy'
    ]
  },
  {
    id: 'cherry_angioma',
    name: 'Cherry Angioma',
    category: 'Vascular Spot',
    image: '/images/cherry_angioma_1783885030327.jpg',
    riskLevel: 'benign',
    explanation: 'Harmless small bright red dome-shaped spot of dilated blood vessels.',
    symptoms: [
      'Bright cherry-red smooth papule',
      'Smooth texture, safe to leave'
    ],
    aiSuggestions: [
      'No treatment needed, 100% benign',
      'Easily removed if requested'
    ]
  }
];

export function SkinShowcaseCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SHOWCASE_ITEMS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);
  };

  const activeItem = SHOWCASE_ITEMS[currentIndex];

  const getRiskBadgeStyles = (level: ShowcaseItem['riskLevel']) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-500/20 border-red-500/30 text-red-400',
          text: 'HIGH RISK',
          icon: <ShieldAlert size={12} className="text-red-400" />
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
          text: 'MODERATE',
          icon: <AlertTriangle size={12} className="text-amber-400" />
        };
      case 'low':
        return {
          bg: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
          text: 'LOW RISK',
          icon: <Info size={12} className="text-blue-400" />
        };
      default:
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
          text: 'BENIGN',
          icon: <CheckCircle2 size={12} className="text-emerald-400" />
        };
    }
  };

  const badge = getRiskBadgeStyles(activeItem.riskLevel);

  return (
    <div className="glass-card mb-6" style={{
      background: 'rgba(15, 23, 42, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '24px',
      padding: '16px',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Swipeable container */}
      <div className="relative w-full overflow-hidden select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              const swipeThreshold = 50;
              if (info.offset.x < -swipeThreshold) {
                handleNext();
              } else if (info.offset.x > swipeThreshold) {
                handlePrev();
              }
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {/* Visual up close photo view */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-xl">
              <img 
                src={activeItem.image} 
                alt={activeItem.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end p-3.5">
                <div className="w-full flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">{activeItem.category}</span>
                    <h4 className="text-base font-black text-white leading-tight mt-0.5">{activeItem.name}</h4>
                  </div>
                  {/* Assessment Badge embedded neatly over image */}
                  <div className={`px-2.5 py-1 rounded-full border text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm ${badge.bg}`}>
                    {badge.icon}
                    <span>{badge.text}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* High Visibility Swipe Dots */}
            <div className="flex justify-center items-center gap-1.5 py-1">
              {SHOWCASE_ITEMS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-[7px] rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-[20px] bg-cyan-400 shadow-sm shadow-cyan-400/30' 
                      : 'w-[7px] bg-slate-700 hover:bg-slate-600 active:scale-95'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>

            {/* AI Diagnostics & Analysis Report */}
            <div className="space-y-3 px-0.5">
              {/* Description */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {activeItem.explanation}
                </p>
              </div>

              {/* Character & Suggestions Grid (Saves massive vertical space by using 2-column layout) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Visual characteristics column */}
                <div className="space-y-1.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
                    <Eye size={11} className="text-cyan-400" />
                    Features
                  </h5>
                  <ul className="space-y-1">
                    {activeItem.symptoms.map((symptom, idx) => (
                      <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-tight">
                        <span className="w-1 h-1 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations column */}
                <div className="space-y-1.5">
                  <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
                    <Stethoscope size={11} className="text-cyan-400" />
                    AI Action
                  </h5>
                  <ul className="space-y-1">
                    {activeItem.aiSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-tight">
                        <span className="w-1 h-1 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0"></span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
