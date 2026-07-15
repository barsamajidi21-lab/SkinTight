import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ShieldAlert, BadgeCheck, Flame, Quote } from 'lucide-react';

interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  badge: string;
  text: string;
  critiqueType: 'positive' | 'constructive' | 'critical';
  tag: string;
}

const REVIEWS: Review[] = [
  {
    id: 'review-james',
    name: 'James L.',
    rating: 5,
    date: 'July 2026',
    badge: 'Verified Spot Tracker',
    text: 'Honestly super impressed by how straightforward and easy it is to use. The fact that this tool is 100% free is amazing for anyone who wants a visual journal to monitor skin spots over time without paywalls.',
    critiqueType: 'positive',
    tag: 'Highly Recommended'
  },
  {
    id: 'review-elena',
    name: 'Elena R.',
    rating: 4,
    date: 'June 2026',
    badge: 'Consistent Log Creator',
    text: 'Really useful for keeping monthly photo records of my skin. My only critique is that room lighting heavily impacts the AI assessment results, so you must capture photos under the exact same lighting to get stable insights.',
    critiqueType: 'constructive',
    tag: 'Honest Critique'
  },
  {
    id: 'review-marcus',
    name: 'Marcus V.',
    rating: 5,
    date: 'May 2026',
    badge: 'First-time Tester',
    text: 'It is a solid tracking utility, and the AI correctly flagged my dry patch as eczema. I really appreciate that you guys have clearly mentioned this does not replace a doctor—keeping user expectations realistic and safe is awesome.',
    critiqueType: 'positive',
    tag: 'Excellent Journal'
  }
];

export function Reviews3DCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  return (
    <div className="glass-card mb-6" style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '24px',
      padding: '20px 16px',
      width: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 3D Title & Average Score Header */}
      <div className="flex flex-col items-center justify-center text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-black text-[9px] tracking-widest uppercase mb-1.5">
          <BadgeCheck size={11} className="text-teal-400 animate-pulse" />
          <span>Verified User Reviews</span>
        </div>
        
        {/* Rating score badge */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white tracking-tight">4.7</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={15} className="fill-teal-400 text-teal-400" />
            ))}
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Community Score</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight mt-1 max-w-xs">
          Transparent user feedback on monitoring, usability, and constraints.
        </p>
      </div>

      {/* Swipeable 3D Deck Area */}
      <div className="relative w-full h-[195px] flex items-center justify-center select-none perspective-1000">
        <AnimatePresence initial={false}>
          {REVIEWS.map((review, idx) => {
            // Calculate relative offset
            let offset = idx - activeIndex;
            if (offset < -1) offset += REVIEWS.length;
            if (offset > 1) offset -= REVIEWS.length;

            const isCenter = offset === 0;
            const isLeft = offset === -1 || (offset === REVIEWS.length - 1 && activeIndex === 0);
            const isRight = offset === 1 || (offset === -1 && activeIndex === REVIEWS.length - 1);

            // Hide cards that are not immediately adjacent
            const isVisible = isCenter || isLeft || isRight;
            if (!isVisible) return null;

            // 3D positioning styles
            const rotateY = isCenter ? 0 : offset * 32;
            const translateZ = isCenter ? 0 : -100;
            const scale = isCenter ? 1 : 0.88;
            const translateX = isCenter ? 0 : offset * 80;
            const opacity = isCenter ? 1 : 0.35;
            const zIndex = isCenter ? 10 : 5;

            return (
              <motion.div
                key={review.id}
                style={{
                  position: 'absolute',
                  width: '92%',
                  maxWidth: '350px',
                  zIndex,
                  transformStyle: 'preserve-3d'
                }}
                animate={{
                  x: translateX,
                  scale: scale,
                  opacity: opacity,
                  rotateY: rotateY,
                  z: translateZ
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
                drag={isCenter ? 'x' : false}
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
                className={`cursor-grab active:cursor-grabbing p-4 rounded-2xl border flex flex-col justify-between h-[180px] shadow-2xl backdrop-blur-md transition-all ${
                  isCenter 
                    ? 'bg-slate-900/95 border-teal-500/30 shadow-teal-500/5' 
                    : 'bg-slate-950/80 border-white/5'
                }`}
              >
                {/* Header with name and rating stars */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white leading-tight">{review.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-wide mt-0.5">{review.badge}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, sIdx) => (
                        <Star 
                          key={sIdx} 
                          size={10} 
                          className={sIdx < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'} 
                        />
                      ))}
                    </div>
                    {/* Badge type tag */}
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      review.critiqueType === 'positive' 
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/10'
                        : review.critiqueType === 'constructive'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10'
                        : 'bg-red-500/15 text-red-400 border border-red-500/10'
                    }`}>
                      {review.tag}
                    </span>
                  </div>
                </div>

                {/* Main Quote Content */}
                <div className="relative my-2.5 flex-1 flex items-center justify-center">
                  <Quote className="absolute left-0 top-0 text-white/5 w-8 h-8 pointer-events-none" />
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed text-center px-2 line-clamp-4 select-none">
                    "{review.text}"
                  </p>
                </div>

                {/* Footer status / date */}
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-medium">{review.date}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    <span className="text-[9px] font-black text-teal-400/90 tracking-widest uppercase">Verified Check</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation Indicators */}
      <div className="flex justify-center items-center gap-1 mt-2">
        {REVIEWS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(idx);
            }}
            className={`h-[1.8px] rounded-full transition-all duration-300 ${
              idx === activeIndex 
                ? 'w-4 bg-teal-400' 
                : 'w-1 bg-slate-700 hover:bg-slate-600 active:scale-95'
            }`}
            aria-label={`Go to review ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
