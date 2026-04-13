import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, useGLTF, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightCircle, 
  RotateCcw,
  RotateCw,
  Zap,
  Dna,
  ShieldCheck,
  X,
  Plus,
  History,
  Map as MapIcon,
  Users,
  User,
  Home,
  Bell,
  Sun,
  Activity,
  Sparkles as SparklesIcon,
  Stethoscope,
  Settings,
  Globe,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Share2,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  Edit3,
  Map,
  MapPin,
  ExternalLink,
  UserPlus,
  Menu,
  CreditCard,
  ShoppingBag,
  LayoutDashboard,
  Calendar,
  UserCircle,
  MapPinned,
  MessageSquare,
  Search,
  ArrowRight,
  Star,
  Check,
  Lock,
  Crown,
  Gem,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  Maximize2,
  Minimize2,
  LogOut
} from 'lucide-react';

// --- Constants ---
const firebaseConfig = {
  apiKey: "AIzaSyAjRB6aTxd-1w65vZfNrhytNtNYLm4vA-g",
  authDomain: "skintight-fefe4.firebaseapp.com",
  projectId: "skintight-fefe4",
  storageBucket: "skintight-fefe4.firebasestorage.app",
  messagingSenderId: "392837262380",
  appId: "1:392837262380:web:907c312220168dd800f589"
};

// Initialize Firebase (using compat mode as requested)
if (!(window as any).firebase.apps.length) {
  (window as any).firebase.initializeApp(firebaseConfig);
}
const auth = (window as any).firebase.auth();
const db = (window as any).firebase.firestore();

const AI_SYSTEM_PROMPT = `You are a specialist AI skin cancer screening assistant. Your ONLY purpose is to help users identify suspicious skin lesions, moles, spots or growths that may indicate skin cancer or pre-cancerous conditions. You do NOT provide general skincare advice, beauty recommendations, anti-aging tips, cosmetic suggestions or general dermatology advice unrelated to skin cancer risk. If a user asks about anything outside of skin cancer screening, detection, prevention or monitoring, respond with: 'This app is specifically designed for skin cancer screening and monitoring. For general skincare advice please consult a dermatologist or skincare professional.' Always focus on: suspicious lesion analysis, ABCDE criteria assessment, skin cancer type identification, UV damage risk, monitoring frequency recommendations, and when to see a dermatologist urgently. Cover the entire body surface — not just the face. Any part of the skin on any body area can develop skin cancer and deserves equal attention.`;

// --- Types ---
interface AnalysisResult {
  risk_level: 'low' | 'moderate' | 'high' | 'insufficient_data';
  confidence_level: 'low' | 'medium' | 'high';
  findings: string[]; // Visual Observations
  concerning_signs: string[]; // ABCDE Assessment
  risk_factors_identified: string[]; // Patient Risk Factors
  summary: string;
  action_card: string;
  cancer_type_indicators?: string; // Cancer Type Indicators
  comparison_notes?: string; // Compared to Last Scan
  suggestions: string[]; // Recommended Next Steps
  urgency: string; // When to See a Doctor
  data_quality_note: string;
  disclaimer: string;
}

interface IntakeForm {
  // Section 1 (Read-only from profile)
  ageRange: string;
  ethnicity: string;
  fitzpatrick: number;
  // Section 2
  concernType: string;
  duration: string;
  changedRecently: string;
  whatChanged: string[];
  appearance: string[];
  bodyLocation: string;
  sensation: string;
  size: string;
  // Section 3
  dailySunExposure: string;
  severeSunburns: string;
  useSunProtection: string;
  // Section 4
  cancerHistory: string;
  cancerTypes: string[];
  atypicalMoles: string;
  isImmunocompromised: string;
  // Section 5
  qualityCheck: {
    clear: boolean;
    lighting: boolean;
    fillsFrame: boolean;
    uploaded: boolean;
  };
}

interface PreventionProtocol {
  dailyUVProtection: string[];
  monthlySelfExam: string[];
  priorityCheckAreas: string[];
  warningSigns: string[];
  nextExamSchedule: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastScanMonth: string; // YYYY-MM
}

interface BodyDot {
  id: string;
  region: string;
  risk: string;
  position: [number, number, number];
}

interface ScanRecord {
  id: string;
  date: string;
  photos: string[];
  note: string;
  result: AnalysisResult;
  bodyRegion: string;
  skinScore: number;
  intake?: IntakeForm;
}


interface BodyDot {
  id: string;
  region: string;
  risk: string;
  position: [number, number, number];
}

interface UVData {
  index: number;
  time: string;
  risk: string;
  color: string;
}

interface SkincareRoutine {
  morning: { step: string; action: string; product?: string }[];
  evening: { step: string; action: string; product?: string }[];
  spfRecommendation: string;
  ingredientsToAvoid: string[];
}

interface EducationProgress {
  completedCards: string[];
  score: number;
}

// --- Constants ---
const ageRanges = ["Under 18", "18-25", "26-35", "36-45", "46-55", "56-65", "Over 65"];
const ethnicities = ["White/Caucasian", "Hispanic/Latino", "Black/African American", "East Asian", "South Asian", "Middle Eastern/North African", "Mixed/Multiracial", "Other"];
const hairColors = ["Black", "Dark Brown", "Light Brown", "Blonde", "Red/Auburn", "Gray/White"];
const eyeColors = ["Brown", "Hazel", "Green", "Blue", "Gray"];
const durations = ["Just noticed it", "Less than 1 month", "1-3 months", "3-6 months", "6-12 months", "More than 1 year", "I've always had it"];
const bodyLocations = ["face", "neck", "arms", "hands", "chest", "upper_body", "back"];
const sizes = ["Smaller than a pencil eraser", "About the size of a pencil eraser", "Larger than a pencil eraser"];
const tanningBedUses = ["Never", "Used in the past stopped now", "Currently use occasionally", "Currently use regularly"];
const sunscreenUses = ["Never", "Sometimes", "Always"];
const spfs = ["Less than 15", "SPF 15-29", "SPF 30-49", "SPF 50 or higher"];
const cancerTypes = ["Melanoma", "Basal Cell Carcinoma", "Squamous Cell Carcinoma", "Not sure what type"];
const medicalConditions = ["Diabetes", "Autoimmune disease", "Lupus or psoriasis", "Organ transplant", "HIV or immunosuppressed", "Taking immunosuppressant medications", "Undergoing chemotherapy or radiation", "Albinism", "None of the above"];
const molesCounts = ["Less than 10", "10-25", "26-50", "51-100", "More than 100"];
const lastExams = ["Never had one", "More than 2 years ago", "1-2 years ago", "Within the last year", "Within the last 6 months"];
const whatChangedOptions = ["Size getting bigger", "Color changing", "Shape changing", "Became raised or bumpy", "Started bleeding", "Started itching or hurting", "Developed a crust or scab", "Surface texture changed"];
const appearanceOptions = ["Flat and dark", "Raised and bumpy", "Shiny or pearly", "Scaly or rough", "Open sore or wound", "Has multiple colors", "Has irregular edges", "Looks like a mole", "Looks like a freckle", "Looks red or inflamed"];

const fitzpatrickTypes = [
  { id: 1, color: '#F9E4D4', desc: 'Always burns never tans' },
  { id: 2, color: '#F3D2B8', desc: 'Usually burns rarely tans' },
  { id: 3, color: '#E1AD87', desc: 'Sometimes burns gradually tans' },
  { id: 4, color: '#C58C59', desc: 'Rarely burns tans easily' },
  { id: 5, color: '#965A38', desc: 'Very rarely burns tans darkly' },
  { id: 6, color: '#4B2C20', desc: 'Never burns always dark' }
];

// --- Error Boundary for 3D Models ---
class ModelErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    console.error("3D Model Load Error:", error);
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', padding: '20px', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
        <div style={{ fontWeight: '900', letterSpacing: '2px' }}>LOAD ERROR</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', marginBottom: '20px', maxWidth: '240px' }}>
          UNABLE TO LOAD 3D ASSETS. THIS MAY BE DUE TO NETWORK RESTRICTIONS OR TEMPORARY SERVICE OUTAGE. PLEASE TRY RETRYING OR REFRESHING THE PAGE.
        </div>
        <button 
          onClick={() => this.setState({ hasError: false })}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          RETRY CONNECTION
        </button>
      </div>
    );
    return this.props.children;
  }
}

// --- Holographic Shader Material ---
const HolographicMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x0044FF) },
    uGlowColor: { value: new THREE.Color(0x00D9FF) },
    uPulse: { value: 1.0 },
    uSelected: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uPulse;
    uniform float uSelected;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
      float scanline = sin(vWorldPosition.y * 80.0 - uTime * 4.0) * 0.1 + 0.9;
      float pulse = (sin(uTime * 2.0) * 0.1 + 0.9) * uPulse;
      vec3 color = mix(uColor, uGlowColor, fresnel);
      float alpha = (fresnel * 0.8 + 0.1) * scanline * pulse;
      if (uSelected > 0.5) {
        color = mix(color, vec3(1.0, 1.0, 1.0), 0.5);
        alpha += 0.2;
      }
      gl_FragColor = vec4(color, alpha);
    }
  `
};

// --- Scan Detail Component ---
  const ScanDetail = ({ scan, onClose, onCompare, onDownload, styles }: { scan: ScanRecord, onClose: () => void, onCompare?: () => void, onDownload: (photos: string[], result: AnalysisResult) => void, styles: any }) => {
    const riskColor = scan.result.risk_level === 'high' ? '#ef4444' : scan.result.risk_level === 'moderate' ? '#f59e0b' : '#10b981';
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(10px)',
          zIndex: 100, overflowY: 'auto', padding: '20px'
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '8px', color: 'white', cursor: 'pointer' }}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Scan Analysis</h2>
            <div style={{ width: '40px' }} />
          </div>

          <div className="glass-card p-6 rounded-3xl mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{new Date(scan.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>{scan.bodyRegion}</h3>
              </div>
              <div style={{ 
                padding: '6px 12px', borderRadius: '10px', background: `${riskColor}22`, color: riskColor, 
                border: `1px solid ${riskColor}44`, fontSize: '12px', fontWeight: '900' 
              }}>
                {scan.result.risk_level.toUpperCase()} RISK
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {scan.photos?.map((photo, i) => (
                <img key={i} src={photo || undefined} alt={`Scan ${i}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.05)' }} />
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#2dd4bf', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} /> CLINICAL FINDINGS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scan.result.findings?.map((f, i) => (
                  <div key={i} style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid rgba(45, 212, 191, 0.3)' }}>{f}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#a855f7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> CONCERNING SIGNS
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {scan.result.concerning_signs?.map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(168, 85, 247, 0.2)' }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#3b82f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SparklesIcon size={16} /> AI SUGGESTIONS
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>
                {scan.result.suggestions?.map((s, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>{s}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: '16px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>URGENCY LEVEL</div>
              <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>{scan.result.urgency}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#2dd4bf', color: '#060818', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => onDownload(scan.photos, scan.result)}
              >
                <Download size={18} /> EXPORT PDF
              </button>
              {onCompare && (
                <button 
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #2dd4bf', background: 'transparent', color: '#2dd4bf', fontWeight: '800', cursor: 'pointer' }}
                  onClick={onCompare}
                >
                  COMPARE
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: '1.5', padding: '0 20px' }}>
            {scan.result.disclaimer}
          </div>
        </div>
      </motion.div>
    );
  };

  // --- Compare View Component ---
  const CompareView = ({ scan1, scan2, onClose, styles }: { scan1: ScanRecord, scan2: ScanRecord, onClose: () => void, styles: any }) => {
    const getScore = (result: any) => {
      let score = 100;
      if (result.risk_level === 'high') score -= 50;
      else if (result.risk_level === 'moderate') score -= 25;
      score -= (result.concerning_signs?.length || 0) * 5;
      return Math.max(0, score);
    };

    const score1 = getScore(scan1.result);
    const score2 = getScore(scan2.result);
    
    // Calculate percentage change relative to the previous scan (scan2)
    // If score2 is 0, we avoid division by zero
    const diff = score1 - score2;
    const percentChange = score2 !== 0 ? (diff / score2) * 100 : (diff > 0 ? 100 : 0);
    const improved = diff > 0;
    const stable = diff === 0;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: '#060818', zIndex: 110, overflowY: 'auto', padding: '20px'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '8px', color: 'white', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Evolution Comparison</h2>
            <div style={{ width: '40px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card p-6 rounded-3xl">
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginBottom: '8px' }}>PREVIOUS: {new Date(scan2.date).toLocaleDateString()}</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '4px' }}>{score2}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>HEALTH SCORE</div>
              <div style={{ 
                marginTop: '12px',
                padding: '4px 8px', borderRadius: '6px', background: scan2.result.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: scan2.result.risk_level === 'high' ? '#ef4444' : '#10b981', fontSize: '10px', fontWeight: '900', textAlign: 'center'
              }}>
                {scan2.result.risk_level.toUpperCase()} RISK
              </div>
            </div>
            <div className="glass-card p-6 rounded-3xl" style={{ border: '1px solid #2dd4bf' }}>
              <div style={{ fontSize: '10px', color: '#2dd4bf', fontWeight: '800', marginBottom: '8px' }}>LATEST: {new Date(scan1.date).toLocaleDateString()}</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '4px' }}>{score1}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>HEALTH SCORE</div>
              <div style={{ 
                marginTop: '12px',
                padding: '4px 8px', borderRadius: '6px', background: scan1.result.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: scan1.result.risk_level === 'high' ? '#ef4444' : '#10b981', fontSize: '10px', fontWeight: '900', textAlign: 'center'
              }}>
                {scan1.result.risk_level.toUpperCase()} RISK
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[32px] mb-6 text-center" style={{ border: '1px solid rgba(45, 212, 191, 0.2)' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '20px', 
              background: stable ? 'rgba(148, 163, 184, 0.1)' : improved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              {stable ? <Activity size={32} color="#94a3b8" /> : improved ? <TrendingUp size={32} color="#10b981" /> : <TrendingDown size={32} color="#ef4444" />}
            </div>
            
            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
              {stable ? 'Status Stable' : improved ? 'Condition Improved' : 'Condition Declined'}
            </h3>
            
            <div style={{ fontSize: '48px', fontWeight: '900', color: stable ? '#94a3b8' : improved ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
              {stable ? '0%' : `${Math.abs(Math.round(percentChange))}%`}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
              {stable 
                ? "No significant changes detected in skin health metrics." 
                : improved 
                  ? `Your skin health score has increased by ${Math.round(percentChange)}% since your last scan.`
                  : `Your skin health score has decreased by ${Math.abs(Math.round(percentChange))}% since your last scan.`}
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#2dd4bf" /> Detailed Comparison
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px' }}>FINDINGS EVOLUTION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>PREVIOUS</div>
                    {scan2.result.findings?.[0] || 'No findings recorded'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#f8fafc', lineHeight: '1.4', fontWeight: '600', padding: '12px', background: 'rgba(45, 212, 191, 0.05)', borderRadius: '12px', border: '1px solid rgba(45, 212, 191, 0.1)' }}>
                    <div style={{ fontSize: '10px', color: '#2dd4bf', marginBottom: '4px' }}>LATEST</div>
                    {scan1.result.findings?.[0] || 'No findings recorded'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const WEEK_DEFINITIONS = [
    { 
      label: "Face + Neck", 
      required: [
        { id: "face", label: "Face", regions: ["face"] },
        { id: "neck", label: "Neck", regions: ["neck"] }
      ]
    },
    { 
      label: "Arms + Hands", 
      required: [
        { id: "arms", label: "Arms", regions: ["arms"] },
        { id: "hands", label: "Hands", regions: ["hands"] }
      ]
    },
    { 
      label: "Chest & Upper Body", 
      required: [
        { id: "chest", label: "Chest", regions: ["chest"] },
        { id: "upper_body", label: "Upper Body", regions: ["upper_body"] }
      ]
    },
    { 
      label: "Back / Review", 
      required: [
        { id: "back", label: "Back", regions: ["back"] }
      ]
    }
  ];

// --- Timeline Component ---
  interface TimelineProps {
    scans: ScanRecord[];
    setSelectedScanId: (id: string | null) => void;
    setActiveTab: (tab: any) => void;
    styles: any;
    streakData: StreakData;
    nextScanDate: string | null;
    cycleProgress: number;
    lastFullWeekCompletionDate: string | null;
  }

  const Timeline = ({ scans, setSelectedScanId, setActiveTab, styles, streakData, nextScanDate, cycleProgress, lastFullWeekCompletionDate }: TimelineProps) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
      let isMounted = true;
      const initChart = () => {
        if (!isMounted) return;
        if (chartRef.current && scans.length > 0 && (window as any).Chart) {
          try {
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
              if (chartInstance.current) {
                chartInstance.current.destroy();
              }

              const sortedScansForChart = [...scans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              const labels = sortedScansForChart.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
              const data = sortedScansForChart.map(s => {
                if (s.result?.risk_level === 'high') return 3;
                if (s.result?.risk_level === 'moderate') return 2;
                if (s.result?.risk_level === 'low') return 1;
                return 0;
              });

              chartInstance.current = new (window as any).Chart(ctx, {
                type: 'line',
                data: {
                  labels,
                  datasets: [{
                    label: 'Risk Level',
                    data,
                    borderColor: '#2dd4bf',
                    backgroundColor: 'rgba(45, 212, 191, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2dd4bf',
                    pointBorderColor: '#060818',
                    pointBorderWidth: 2,
                    pointRadius: 4
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 4,
                      ticks: {
                        stepSize: 1,
                        callback: (value: any) => {
                          if (value === 3) return 'High';
                          if (value === 2) return 'Mod';
                          if (value === 1) return 'Low';
                          return '';
                        },
                        color: '#94a3b8',
                        font: { size: 10, weight: 'bold' }
                      },
                      grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                      ticks: { color: '#94a3b8', font: { size: 10 } },
                      grid: { display: false }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1e293b',
                      titleColor: '#f8fafc',
                      bodyColor: '#94a3b8',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      padding: 12,
                      displayColors: false
                    }
                  }
                }
              });
            }
          } catch (err) {
            console.error("Chart initialization failed:", err);
          }
        }
      };

      const timer = setTimeout(initChart, 500);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }, [scans]);

    const sortedScans = [...scans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getDaysRemaining = () => {
      if (!nextScanDate) return null;
      const diff = new Date(nextScanDate).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const daysRemaining = getDaysRemaining();
    const isOverdue = daysRemaining !== null && daysRemaining < 0;

    // Weekly Rotation Logic
    const currentWeekIndex = cycleProgress % 4;
    const currentWeek = WEEK_DEFINITIONS[currentWeekIndex];
    
    // Check which parts of the current week are completed
    // Scans since the last full week completion
    const scansSinceLastCompletion = scans.filter(s => {
      if (!lastFullWeekCompletionDate) return true;
      // Use a small buffer to avoid issues with same-day timestamps if needed, 
      // but the user said "DO NOT allow multiple weeks to be completed in one day"
      // so we can just compare dates.
      return new Date(s.date).getTime() > new Date(lastFullWeekCompletionDate).getTime();
    });

    const completionStatus = currentWeek.required.map(req => {
      const isDone = scansSinceLastCompletion.some(s => req.regions.includes(s.bodyRegion));
      return { ...req, isDone };
    });

    const isWeekFullyComplete = completionStatus.every(s => s.isDone);
    const missingParts = completionStatus.filter(s => !s.isDone).map(s => s.label);
    
    const nextWeekIndex = (currentWeekIndex + 1) % 4;
    const nextWeek = WEEK_DEFINITIONS[nextWeekIndex];

    return (
      <div className="page-container" style={styles.tabContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Timeline & Schedule</h2>
        </div>

        {/* Weekly Rotation Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 zone-cards-grid">
          {/* Current Status Card */}
          <div className={`glass-card p-6 rounded-3xl border ${isWeekFullyComplete ? 'border-teal-500/30 bg-teal-500/5' : 'border-white/5'} relative overflow-hidden zone-card`}>
            <div className="absolute -right-4 -top-4 opacity-10">
              <Activity size={120} color={isWeekFullyComplete ? '#2dd4bf' : '#94a3b8'} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${isWeekFullyComplete ? 'bg-teal-500/20' : 'bg-slate-500/20'} flex items-center justify-center`}>
                <Activity size={20} className={isWeekFullyComplete ? 'text-teal-500' : 'text-slate-400'} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">This Week's Focus Area</h3>
                <p className="text-xl font-black text-white">{currentWeek.label}</p>
              </div>
            </div>
            
            {/* Required Areas Display */}
            <div className="space-y-2 mb-4">
              {completionStatus.map(status => (
                <div key={status.id} className="flex items-center gap-2 text-sm">
                  {status.isDone ? (
                    <CheckCircle2 size={16} className="text-teal-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500">⏳</div>
                  )}
                  <span className={status.isDone ? "text-teal-400 font-bold" : "text-slate-400"}>
                    {status.label} {status.isDone ? "" : "Required"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {isWeekFullyComplete ? (
                <div>
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-sm mb-1">
                    <CheckCircle2 size={16} /> This week's check is complete.
                  </div>
                  <p className="text-xs text-slate-400">
                    Next check: {nextScanDate ? new Date(nextScanDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'} ({nextWeek.label})
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Scan anytime if you notice a new or changing spot.</p>
                </div>
              ) : (
                <div className="text-amber-400 font-bold text-sm">
                  Partial completion — {missingParts.join(" & ")} scan required to finish this week.
                </div>
              )}
            </div>
          </div>

          {/* Next Scan Card */}
          <div className={`glass-card p-6 rounded-3xl border ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'} relative overflow-hidden zone-card`}>
            <div className="absolute -right-4 -top-4 opacity-10">
              <Calendar size={120} color={isOverdue ? '#ef4444' : '#2dd4bf'} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${isOverdue ? 'bg-red-500/20' : 'bg-teal-500/20'} flex items-center justify-center`}>
                <Calendar size={20} className={isOverdue ? 'text-red-500' : 'text-teal-500'} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Next Scan Due</h3>
                <p className={`text-2xl font-black ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                  {nextScanDate ? new Date(nextScanDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not Scheduled'}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                {daysRemaining !== null ? (isOverdue ? `${Math.abs(daysRemaining)} Days Overdue` : `${daysRemaining} Days Remaining`) : 'Complete a scan to schedule'}
              </div>
              {isOverdue && <div className="animate-pulse text-[10px] font-bold text-red-500 uppercase bg-red-500/10 px-2 py-1 rounded-lg">Urgent</div>}
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div id="cycleProgress" className="glass-card p-6 rounded-3xl border border-white/5 mb-6 cycle-progress-container">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <RotateCw size={18} className="text-blue-400" /> Cycle Progress
            </h3>
            <span className="text-sm font-black text-white">{cycleProgress % 4} / 4 zones completed</span>
          </div>
          <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden flex gap-1 p-0.5 progress-bar-container">
            {[1, 2, 3, 4].map(step => (
              <div 
                key={step} 
                className={`h-full flex-1 rounded-full transition-all duration-500 ${(cycleProgress % 4) >= step ? 'bg-gradient-to-r from-teal-400 to-cyan-400' : 'bg-white/5'}`}
              />
            ))}
          </div>
        </div>

        {/* Risk Trend Chart */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" /> Risk Trend Analysis
          </h3>
          <div style={{ height: '200px', width: '100%' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Monitoring Protocol Section (Updated) */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-400" /> Monitoring Protocol
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Weekly Guided Check', desc: 'Each week, scan specific required areas of your body to monitor for unusual changes.', icon: <RotateCw size={20} />, color: '#2dd4bf' },
              { title: 'Instant Scan', desc: 'Scan immediately if you notice any new or changing spots.', icon: <Zap size={20} />, color: '#f59e0b' },
              { title: 'Annual Professional Exam', desc: 'Full-body clinical exam by a dermatologist.', icon: <User size={20} />, color: '#3b82f6' }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${item.color}20`, color: item.color }}>
                  {item.icon}
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Regions Section (Updated) */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-red-400" /> Active Regions & History
          </h3>
          <div className="mb-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Current Focus</div>
            <div className="px-4 py-2 rounded-xl text-xs font-bold border border-teal-500/30 bg-teal-500/20 text-teal-400 inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              {currentWeek.label}
            </div>
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Previously Scanned</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(scans?.map(s => s.bodyRegion))).map(region => {
              const latestScan = scans?.find(s => s.bodyRegion === region);
              const riskColor = latestScan?.result.risk_level === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                               latestScan?.result.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                               'bg-slate-500/20 text-slate-400 border-white/10';
              return (
                <div key={region} className={`px-4 py-2 rounded-xl text-xs font-bold border ${riskColor} flex items-center gap-2`}>
                  {region}
                </div>
              );
            })}
            {scans.length === 0 && <p className="text-xs text-slate-500 italic">No history yet.</p>}
          </div>
        </div>
        
        {/* Scan History List */}
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Scan History</h3>
        {sortedScans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <History size={32} color="#475569" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No Scans Found</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '240px', margin: '0 auto' }}>Complete your first scan to start tracking your skin health journey.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedScans.map(scan => (
              <div 
                key={scan.id} 
                className="glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => setSelectedScanId(scan.id)}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <img src={scan.photos?.[0] || undefined} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{scan.bodyRegion}</div>
                    <div style={{ 
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '900',
                      background: scan.result.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : scan.result.risk_level === 'moderate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: scan.result.risk_level === 'high' ? '#ef4444' : scan.result.risk_level === 'moderate' ? '#f59e0b' : '#10b981'
                    }}>
                      {scan.result.risk_level.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(scan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <ChevronRight size={20} color="#475569" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

// --- Legal Text Constants ---
const TERMS_AND_CONDITIONS = `Terms & Conditions
Last Updated: April 8, 2026

1. Acceptance of Terms
By accessing or using this application, you agree to be bound by these Terms & Conditions. If you do not agree, you must not use the app.

2. Description of Service
This application provides AI-powered skin analysis tools intended for general informational and wellness purposes only. The app is not a medical device and does not provide medical diagnoses, treatment, or professional medical advice.

3. Not Medical Advice
THE CONTENT PROVIDED BY THIS APP IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. ALWAYS SEEK THE ADVICE OF YOUR PHYSICIAN OR OTHER QUALIFIED HEALTH PROVIDER WITH ANY QUESTIONS YOU MAY HAVE REGARDING A MEDICAL CONDITION.

4. User Responsibilities
You are responsible for the quality of images uploaded. Poor quality images may result in inaccurate analysis. You agree to use the app only for its intended purpose.

5. Limitation of Liability
To the maximum extent permitted by law, the developers of this app shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service.

6. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the app constitutes acceptance of the updated terms.`;

const PRIVACY_POLICY = `Privacy Policy
Last Updated: April 8, 2026

1. Information We Collect
We collect photos you upload for analysis and information you provide in the intake forms. This data is processed by AI models to provide wellness insights.

2. How We Use Information
Your data is used solely to provide the skin analysis service and improve the app's functionality. We do not sell your personal data to third parties.

3. Data Storage
Data is stored locally on your device and may be processed on secure servers. We implement industry-standard security measures to protect your information.

4. Third-Party Services
We use AI services (like Google Gemini) to process images. These services are bound by their own privacy policies regarding data handling.

5. Your Rights
You can delete your data at any time by clearing the app's local storage or deleting the application.

6. Consent
By using the app, you consent to the collection and processing of your data as described in this policy.`;

const DISCLAIMER_TEXT = `Disclaimer: This application is an AI-powered wellness and informational tool only. It is NOT a medical device and does NOT provide medical advice, diagnosis, or treatment. Always consult with a healthcare professional for any medical concerns.`;

// --- Onboarding Screen Component ---
const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'terms' | 'privacy' | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b 0%, #020617 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '500px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '80px', height: '80px', background: 'rgba(45, 212, 191, 0.1)', 
            borderRadius: '24px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 24px',
            border: '1px solid rgba(45, 212, 191, 0.2)'
          }}>
            <ShieldCheck size={40} color="#2dd4bf" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.02em' }}>Welcome</h1>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '16px' }}>
            Your AI-powered wellness and informational skin analysis tool. Let's get started by reviewing our policies.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {/* Terms Section */}
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'terms' ? null : 'terms')}
              style={{
                width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: 'none',
                color: '#f8fafc', cursor: 'pointer', fontWeight: '600'
              }}
            >
              <span>Terms & Conditions</span>
              {expandedSection === 'terms' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
              {expandedSection === 'terms' && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: '200px' }}
                  exit={{ height: 0 }}
                  style={{ overflowY: 'auto', padding: '0 16px 16px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}
                >
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{TERMS_AND_CONDITIONS}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Privacy Section */}
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'privacy' ? null : 'privacy')}
              style={{
                width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: 'none',
                color: '#f8fafc', cursor: 'pointer', fontWeight: '600'
              }}
            >
              <span>Privacy Policy</span>
              {expandedSection === 'privacy' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
              {expandedSection === 'privacy' && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: '200px' }}
                  exit={{ height: 0 }}
                  style={{ overflowY: 'auto', padding: '0 16px 16px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}
                >
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{PRIVACY_POLICY}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={agreedTerms} 
              onChange={(e) => setAgreedTerms(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#2dd4bf' }}
            />
            <span>I agree to the Terms & Conditions</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={agreedPrivacy} 
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#2dd4bf' }}
            />
            <span>I agree to the Privacy Policy</span>
          </label>
        </div>

        <button
          disabled={!agreedTerms || !agreedPrivacy}
          onClick={onComplete}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: 'none',
            background: agreedTerms && agreedPrivacy ? '#2dd4bf' : 'rgba(255, 255, 255, 0.05)',
            color: agreedTerms && agreedPrivacy ? '#020617' : '#475569',
            fontWeight: '800',
            fontSize: '16px',
            cursor: agreedTerms && agreedPrivacy ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease'
          }}
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
};

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [sex, setSex] = useState('');
  const [fitzpatrick, setFitzpatrick] = useState(0);
  const [profileColor, setProfileColor] = useState('#2dd4bf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPin, setShowForgotPin] = useState(false);

  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join('');
    if (fullPin.length < 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("Attempting sign in for:", email);
      await auth.signInWithEmailAndPassword(email, fullPin + "@skinscanai.com");
      console.log("Sign in successful");
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect PIN. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with that email. Please sign up.');
      } else {
        setError('Sign in failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join('');
    if (fullPin.length < 4) {
      setError('Please choose a 4-digit PIN.');
      return;
    }
    if (!fullName || !username || !email || !ageRange || !sex || fitzpatrick === 0) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Check username uniqueness
      const usernameDoc = await db.collection("usernames").doc(username.toLowerCase()).get();
      if (usernameDoc.exists) {
        setError('Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      const userCredential = await auth.createUserWithEmailAndPassword(email, fullPin + "@skinscanai.com");
      const userId = userCredential.user.uid;

      await db.collection("users").doc(userId).set({
        fullName,
        username,
        email,
        ageRange,
        sex,
        fitzpatrickType: fitzpatrick,
        profileColor,
        skinScore: 100,
        streakDays: 0,
        createdAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(),
        scansCompleted: 0
      });

      await db.collection("usernames").doc(username.toLowerCase()).set({
        uid: userId
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b 0%, #020617 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '500px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '60px', height: '60px', background: 'rgba(45, 212, 191, 0.1)', 
            borderRadius: '18px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 16px',
            border: '1px solid rgba(45, 212, 191, 0.2)'
          }}>
            <Dna size={32} color="#2dd4bf" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Skin Tight</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Secure clinical skin monitoring</p>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('signin')}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'signin' ? '#2dd4bf' : 'transparent', color: activeTab === 'signin' ? '#020617' : '#94a3b8', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Sign In
          </button>
          <button 
            onClick={() => setActiveTab('signup')}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'signup' ? '#2dd4bf' : 'transparent', color: activeTab === 'signup' ? '#020617' : '#94a3b8', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={activeTab === 'signin' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'signup' && (
            <>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>FULL NAME</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>USERNAME</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>4-DIGIT PIN</label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {pin?.map((digit, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="password"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  style={{
                    width: '60px',
                    height: '70px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `2px solid ${pin[i] ? '#2dd4bf' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: '800',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>Choose a 4-digit PIN you will remember. Like an ATM code.</p>
          </div>

          {activeTab === 'signup' && (
            <>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>AGE RANGE</label>
                  <select 
                    value={ageRange} 
                    onChange={(e) => setAgeRange(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  >
                    <option value="">Select</option>
                    {ageRanges.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>SEX</label>
                  <select 
                    value={sex} 
                    onChange={(e) => setSex(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '10px', fontWeight: '600' }}>FITZPATRICK SKIN TYPE</label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  {fitzpatrickTypes.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFitzpatrick(t.id)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: t.color,
                        border: fitzpatrick === t.id ? '3px solid #2dd4bf' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={t.desc}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '10px', fontWeight: '600' }}>PROFILE COLOR</label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  {['#2dd4bf', '#a855f7', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProfileColor(c)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: c,
                        border: profileColor === c ? '3px solid white' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: '#2dd4bf',
              color: '#020617',
              fontWeight: '800',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '12px',
              boxShadow: '0 10px 20px rgba(45, 212, 191, 0.2)'
            }}
          >
            {loading ? 'Processing...' : activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          {activeTab === 'signin' && (
            <button 
              type="button"
              onClick={() => setShowForgotPin(true)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot your PIN?
            </button>
          )}
        </form>

        {showForgotPin && (
          <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>Enter your email address and we will show you a PIN reset option.</p>
            <p style={{ fontSize: '12px', color: '#2dd4bf', fontWeight: '600' }}>For security, please create a new account with the same email address. Your scan history can be recovered by contacting support.</p>
            <button onClick={() => setShowForgotPin(false)} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Close</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Footer = ({ onShowLegal }: { onShowLegal: (type: 'terms' | 'privacy' | 'disclaimer') => void }) => (
  <footer style={{
    padding: '32px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    marginTop: 'auto',
    textAlign: 'center'
  }}>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>
      <button onClick={() => onShowLegal('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Terms</button>
      <button onClick={() => onShowLegal('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Privacy</button>
      <button onClick={() => onShowLegal('disclaimer')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Disclaimer</button>
    </div>
    <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
      Informational and wellness tool only. Not medical advice. © 2026 AI Skin Analysis.
    </p>
  </footer>
);

// --- OneSignal Helpers ---
const OneSignalDeferred = (window as any).OneSignalDeferred || [];

function requestNotificationPermission() {
  if ((window as any).OneSignal) {
    OneSignalDeferred.push(function(OneSignal: any) {
      OneSignal.Notifications.requestPermission();
    });
  }
}

function setOneSignalExternalId(userId: string) {
  OneSignalDeferred.push(function(OneSignal: any) {
    OneSignal.login(userId);
  });
}

function App() {
  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'timeline' | 'routine' | 'plans' | 'profile' | 'clinic' | 'welcome'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; type: 'warning' | 'info' | 'alert'; read: boolean; date: string }[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | 'disclaimer' | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastScanMonth: '' });
  const [nextScanDate, setNextScanDate] = useState<string | null>(null);
  const [cycleProgress, setCycleProgress] = useState<number>(0);
  const [lastFullWeekCompletionDate, setLastFullWeekCompletionDate] = useState<string | null>(null);
  const [bannerDismissedDate, setBannerDismissedDate] = useState<string | null>(null);

  const [protocolExpanded, setProtocolExpanded] = useState(false);

  // --- Firebase Auth State ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- Existing State ---
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [imageQuality, setImageQuality] = useState<'GOOD' | 'POOR' | 'NOT_SKIN' | null>(null);
  const [checkingQuality, setCheckingQuality] = useState(false);
  
  const [intakeForm, setIntakeForm] = useState<IntakeForm>({
    ageRange: '',
    ethnicity: '',
    fitzpatrick: 0,
    concernType: '',
    duration: '',
    changedRecently: '',
    whatChanged: [],
    appearance: [],
    bodyLocation: '',
    sensation: '',
    size: '',
    dailySunExposure: '',
    severeSunburns: '',
    useSunProtection: '',
    cancerHistory: '',
    cancerTypes: [],
    atypicalMoles: '',
    isImmunocompromised: '',
    qualityCheck: {
      clear: false,
      lighting: false,
      fillsFrame: false,
      uploaded: false
    }
  });
  
  const [showConfidenceWarning, setShowConfidenceWarning] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState(0);

  // --- Feature 1: Timeline State ---
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [compareScanId, setCompareScanId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recentScan, setRecentScan] = useState<ScanRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- Feature 3: UV State ---
  const [uvData, setUvData] = useState<UVData | null>(null);
  const [highUvDays, setHighUvDays] = useState<number>(0);

  // --- Feature 4: SkinScore State ---
  const [skinScore, setSkinScore] = useState<number>(80);
  const [scoreHistory, setScoreHistory] = useState<{ date: string; score: number }[]>([]);

  // --- Feature 5: Skincare Routine State ---
  const [protocol, setProtocol] = useState<PreventionProtocol | null>(null);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    profileColor: '#2dd4bf',
    age: 25,
    fitzpatrick: 2,
    conditions: '',
    products: ''
  });

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>('male');
  const [bodyDots, setBodyDots] = useState<BodyDot[]>([]);

  // --- Feature 7: Doctor State ---
  const [doctorInfo, setDoctorInfo] = useState({
    name: '',
    clinic: '',
    email: '',
    phone: '',
    notes: [] as { date: string; note: string }[]
  });

  // --- Feature 8: Settings State ---
  const [skinOfColorMode, setSkinOfColorMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const installedHandler = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };


  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDoctor, setIsEditingDoctor] = useState(false);
  const [tempProfile, setTempProfile] = useState(userProfile);
  const [tempDoctor, setTempDoctor] = useState(doctorInfo);

  // --- Feature 10: Education State ---
  const [education, setEducation] = useState<EducationProgress>({ completedCards: [], score: 0 });
  const [showEduCard, setShowEduCard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const clearAllSessionData = () => {
    const keysToKeep = ["skinScanAccounts", "appLanguage", "welcomeSeen", "termsAccepted"];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset state
    setPhotos([]);
    setNote('');
    setResult(null);
    setError(null);
    setImageQuality(null);
    setCheckingQuality(false);
    setIntakeForm({
      ageRange: '',
      ethnicity: '',
      fitzpatrick: 0,
      concernType: '',
      duration: '',
      changedRecently: '',
      whatChanged: [],
      appearance: [],
      bodyLocation: '',
      sensation: '',
      size: '',
      dailySunExposure: '',
      severeSunburns: '',
      useSunProtection: '',
      cancerHistory: '',
      cancerTypes: [],
      atypicalMoles: '',
      isImmunocompromised: '',
      qualityCheck: { clear: false, lighting: false, fillsFrame: false, uploaded: false }
    });
    setScans([]);
    setSelectedScanId(null);
    setCompareScanId(null);
    setIsComparing(false);
    setRecentScan(null);
    setSkinScore(80);
    setScoreHistory([]);
    setProtocol(null);
    setFullUserData(null);
    setCurrentUser(null);
    
    console.log("Session data cleared for sign out");
  };

  const initializeNewSession = (user: any) => {
    clearAllSessionData();
    setCurrentUser(user);
    
    // OneSignal Integration
    setOneSignalExternalId(user.uid);
    setTimeout(() => {
      requestNotificationPermission();
    }, 3000);
    
    db.collection("users").doc(user.uid).get().then((doc: any) => {
      if (doc.exists) {
        const userData = doc.data();
        setFullUserData(userData);
        loadUserData(user.uid);
        loadMostRecentScan();
        console.log("New session initialized for:", userData.username || userData.fullName);
      }
    });
  };

  // --- Persistence & Initialization ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      console.log("Auth state changed:", user ? user.uid : "null");
      if (user) {
        initializeNewSession(user);
      } else {
        clearAllSessionData();
      }
      setAuthLoading(false);
    });

    // Load non-sensitive settings from localStorage
    const savedWelcome = localStorage.getItem('welcomeSeen');
    if (savedWelcome === 'true') setWelcomeSeen(true);

    const savedOnboarding = localStorage.getItem('onboarding_complete');
    if (savedOnboarding === 'true') setOnboardingComplete(true);

    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setSkinOfColorMode(settings.skinOfColorMode);
    }

    const savedBannerDismissed = localStorage.getItem('banner_dismissed_date');
    if (savedBannerDismissed) setBannerDismissedDate(savedBannerDismissed);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      // Load Profile & Settings
      const profileDoc = await db.collection("users").doc(userId).get();
      if (profileDoc.exists) {
        const data = profileDoc.data();
        setFullUserData(data);
        if (data.streakData) setStreakData(data.streakData);
        if (data.skinScore) setSkinScore(data.skinScore);
        if (data.nextScanDate) setNextScanDate(data.nextScanDate);
        if (data.cycleProgress !== undefined) setCycleProgress(data.cycleProgress);
        if (data.lastFullWeekCompletionDate) setLastFullWeekCompletionDate(data.lastFullWeekCompletionDate);
        if (data.protocol) setProtocol(data.protocol);
        if (data.education) setEducation(data.education);
        if (data.highUvDays) setHighUvDays(data.highUvDays);
        if (data.bodyDots) setBodyDots(data.bodyDots);
        
        const profile = {
          fullName: data.fullName || '',
          profileColor: data.profileColor || '#2dd4bf',
          age: data.ageRange || 25,
          fitzpatrick: data.fitzpatrickType || 2,
          conditions: data.conditions || '',
          products: data.products || ''
        };
        setUserProfile(profile);
        setTempProfile(profile);
      }

      // Load Score History
      const scoresDoc = await db.collection("users").doc(userId).collection("timeline").doc("scores").get();
      if (scoresDoc.exists) {
        setScoreHistory(scoresDoc.data()?.history || []);
      }

      // Load Scans
      const scansSnapshot = await db.collection("users").doc(userId).collection("scans").orderBy("date", "desc").get();
      const loadedScans = scansSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate().toISOString() || new Date().toISOString()
      }));
      setScans(loadedScans);

      // Load Doctor Info
      const doctorDoc = await db.collection("users").doc(userId).collection("doctorInfo").doc("current").get();
      if (doctorDoc.exists) {
        const docData = doctorDoc.data();
        setDoctorInfo(docData);
        setTempDoctor(docData);
      }

    } catch (err) {
      console.error("Error loading user data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify({ skinOfColorMode }));
  }, [skinOfColorMode]);

  const fetchUVData = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=uv_index_max&timezone=auto`);
        const data = await response.json();
        const uvIndex = data.daily?.uv_index_max?.[0] || 0;
        
        let risk = 'Low';
        let color = '#10b981';
        if (uvIndex >= 3) { risk = 'Moderate'; color = '#f59e0b'; }
        if (uvIndex >= 6) { risk = 'High'; color = '#ef4444'; }
        if (uvIndex >= 8) { risk = 'Very High'; color = '#8b5cf6'; }
        if (uvIndex >= 11) { risk = 'Extreme'; color = '#ec4899'; }

        setUvData({ index: uvIndex, time: new Date().toLocaleTimeString(), risk, color });

        if (uvIndex >= 6) {
          setNotifications(prev => [...prev, { 
            id: Date.now().toString(), 
            text: "🔆 High UV today — reapply sunscreen now.", 
            type: 'warning',
            read: false,
            date: new Date().toISOString()
          }]);
          
          setHighUvDays(prev => {
            const next = prev + 1;
            if (currentUser) {
              db.collection("users").doc(currentUser.uid).update({
                highUvDays: next
              });
            }
            return next;
          });
        }
      } catch (err) {
        console.error("UV fetch error", err);
      }
    });
  };

  useEffect(() => {
    const score = calculateConfidenceScore();
    setConfidenceScore(score);
  }, [photos, intakeForm]);

  const calculateConfidenceScore = () => {
    let score = 0;
    // Photos: 45% total
    if (photos.length >= 1) score += 30;
    if (photos.length >= 2) score += 15;
    
    // Section 1: 10% (Auto-filled from profile)
    score += 10;
    
    // Section 2: 15%
    const section2Complete = !!(intakeForm.duration && intakeForm.changedRecently && intakeForm.bodyLocation);
    if (section2Complete) score += 15;
    
    // Section 3: 15%
    const section3Complete = !!(intakeForm.dailySunExposure && intakeForm.severeSunburns && intakeForm.useSunProtection);
    if (section3Complete) score += 15;
    
    // Section 4: 15%
    const section4Complete = !!(intakeForm.cancerHistory && intakeForm.atypicalMoles && intakeForm.isImmunocompromised);
    if (section4Complete) score += 15;
    
    return score;
  };

  const checkImageQuality = async (photo: string) => {
    setCheckingQuality(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: photo.split(',')[1],
                },
              },
              {
                text: "Look at this image. Is it a clear close-up photo of a skin lesion or skin area? Rate the image quality as: GOOD (clear, well-lit, close-up, lesion visible), POOR (blurry, dark, too far away, or lesion not clearly visible), or NOT_SKIN (this is not a photo of skin). Respond with only one word: GOOD, POOR, or NOT_SKIN.",
              },
            ],
          },
        ],
      });
      const result = response.text.trim().toUpperCase() as 'GOOD' | 'POOR' | 'NOT_SKIN';
      setImageQuality(result);
    } catch (err: any) {
      console.error("Quality check error:", err);
      if (err.message?.includes("429") || err.status === 429 || err.message?.includes("quota")) {
        setError("AI service is currently busy (Rate Limit). Please wait a minute and try again.");
      }
    } finally {
      setCheckingQuality(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 6 - photos.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const photoData = reader.result as string;
          setPhotos(prev => [...prev, photoData].slice(0, 6));
          setError(null);
          setResult(null);
          
          // Trigger quality check for the first photo uploaded in this batch
          if (photos.length === 0) {
            checkImageQuality(photoData);
          }
        };
        reader.readAsDataURL(file as File);
      });
    }
    // Reset input so same file can be picked again if removed
    if (e.target) e.target.value = '';
  };

  const triggerFileInput = () => {
    if (photos.length >= 6) return;
    fileInputRef.current?.click();
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const retakePhoto = () => {
    setPhotos([]);
    setResult(null);
    setError(null);
    setImageQuality(null);
    setIntakeForm({
      ageRange: '',
      ethnicity: '',
      fitzpatrick: 0,
      concernType: '',
      duration: '',
      changedRecently: '',
      whatChanged: [],
      appearance: [],
      bodyLocation: '',
      sensation: '',
      size: '',
      dailySunExposure: '',
      severeSunburns: '',
      useSunProtection: '',
      cancerHistory: '',
      cancerTypes: [],
      atypicalMoles: '',
      isImmunocompromised: '',
      qualityCheck: {
        clear: false,
        lighting: false,
        fillsFrame: false,
        uploaded: false
      }
    });
  };

  const saveScanToFirestore = (scanData: any) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in — cannot save scan");
      return;
    }
    
    setSaveStatus('idle');
    
    db.collection("users").doc(user.uid).collection("scans").add({
      date: (window as any).firebase.firestore.FieldValue.serverTimestamp(),
      riskLevel: scanData.result.risk_level,
      confidence: scanData.result.confidence_level,
      findings: scanData.result.findings,
      concerningSigns: scanData.result.concerning_signs,
      suggestions: scanData.result.suggestions,
      urgency: scanData.result.urgency,
      bodyRegion: scanData.bodyRegion,
      skinScore: scanData.skinScore,
      intakeData: scanData.intake,
      photoBase64: scanData.photos[0] || null,
      result: scanData.result
    }).then(function(docRef: any) {
      console.log("Scan saved to Firestore with ID:", docRef.id);
      updateSkinScoreInFirestore(user.uid, scanData.skinScore);
      setSaveStatus('success');
      loadScanHistory();
      loadMostRecentScan();
      // Clear status after 5 seconds
      setTimeout(() => setSaveStatus('idle'), 5000);
    }).catch(function(error: any) {
      console.error("Error saving scan to Firestore:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    });
  };

  const updateSkinScoreInFirestore = (userId: string, newScore: number) => {
    db.collection("users").doc(userId).update({
      skinScore: newScore,
      lastScanDate: (window as any).firebase.firestore.FieldValue.serverTimestamp(),
      scansCompleted: (window as any).firebase.firestore.FieldValue.increment(1)
    });
  };

  const loadScanHistory = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setHistoryLoading(true);
    
    db.collection("users").doc(user.uid).collection("scans")
      .orderBy("date", "desc")
      .limit(50)
      .get()
      .then(function(snapshot: any) {
        if (snapshot.empty) {
          setScans([]);
          setHistoryLoading(false);
          return;
        }
        
        const loadedScans: ScanRecord[] = [];
        snapshot.forEach(function(doc: any) {
          const data = doc.data();
          loadedScans.push({ 
            id: doc.id, 
            ...data,
            date: data.date?.toDate().toISOString() || new Date().toISOString(),
            result: data.result || {
              risk_level: data.riskLevel,
              confidence_level: data.confidence,
              findings: data.findings,
              concerning_signs: data.concerningSigns,
              suggestions: data.suggestions,
              urgency: data.urgency,
              disclaimer: "This is an AI screening tool, not a medical diagnosis."
            },
            photos: data.photoBase64 ? [data.photoBase64] : (data.photos || [])
          });
        });
        
        setScans(loadedScans);
        setHistoryLoading(false);
      })
      .catch(function(error: any) {
        console.error("Error loading scans:", error);
        setHistoryLoading(false);
      });
  };

  const loadUserSkinScore = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("users").doc(user.uid).get().then(function(doc: any) {
      if (doc.exists) {
        const data = doc.data();
        const score = data.skinScore || 100;
        setSkinScore(score);
        setFullUserData(data);
      }
    });
  };

  const loadMostRecentScan = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("users").doc(user.uid).collection("scans")
      .orderBy("date", "desc")
      .limit(1)
      .get()
      .then(function(snapshot: any) {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const scan = { 
            id: snapshot.docs[0].id, 
            ...data,
            date: data.date?.toDate().toISOString() || new Date().toISOString(),
            result: data.result || {
              risk_level: data.riskLevel,
              confidence_level: data.confidence,
              findings: data.findings,
              concerning_signs: data.concerningSigns,
              suggestions: data.suggestions,
              urgency: data.urgency,
              disclaimer: "This is an AI screening tool, not a medical diagnosis."
            },
            photos: data.photoBase64 ? [data.photoBase64] : (data.photos || [])
          };
          setRecentScan(scan as ScanRecord);
        } else {
          setRecentScan(null);
        }
      });
  };

  const saveProtocolToFirestore = (protocolData: any, scanId: string | null = null) => {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("users").doc(user.uid).set({
      protocol: {
        content: protocolData,
        generatedAt: (window as any).firebase.firestore.FieldValue.serverTimestamp(),
        basedOnScanId: scanId
      }
    }, { merge: true }).then(function() {
      console.log("Protocol saved for user:", user.uid);
    }).catch(function(error: any) {
      console.error("Error saving protocol:", error);
    });
  };

  const loadProtocolFromFirestore = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("users").doc(user.uid).get().then(function(doc: any) {
      if (doc.exists && doc.data().protocol) {
        setProtocol(doc.data().protocol.content);
        console.log("Protocol loaded from Firestore");
      }
    });
  };

  const analyzeSkin = async (force = false) => {
    const today = new Date();
    if (photos.length === 0) return;
    
    const score = calculateConfidenceScore();
    if (score < 50) {
      setError("Insufficient information for analysis. Please upload at least one clear photo and complete the required sections. The AI needs enough data to give you a safe and accurate assessment. Guessing from limited information could be dangerous.");
      return;
    }
    
    if (score < 80 && !force) {
      setShowConfidenceWarning(true);
      return;
    }

    setLoading(true);
    setError(null);
    setShowConfidenceWarning(false);
    try {
      const imageParts = photos.map(p => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: p.split(',')[1],
        },
      }));

      const fitzpatrickDescriptions = [
        "",
        "Always burns never tans",
        "Usually burns rarely tans",
        "Sometimes burns gradually tans",
        "Rarely burns tans easily",
        "Very rarely burns tans darkly",
        "Never burns always dark"
      ];
      
      const prompt = `${AI_SYSTEM_PROMPT}
You are an expert AI dermatology screening assistant. Analyze the provided skin images together with the patient profile.
Format your response as clear simple language that a 16 year old can understand. No medical jargon. If you must use a medical term explain it immediately in plain words in parentheses. Keep each section short — maximum 3 sentences or 3 bullet points per section. Be direct and honest. Do not over-explain.

PATIENT PROFILE:
Age range: ${fullUserData?.ageRange || 'Not provided'}
Ethnicity: ${fullUserData?.ethnicity || 'Not provided'}
Fitzpatrick skin type: Type ${fullUserData?.fitzpatrick || 'Not provided'}

ABOUT THE SKIN SPOT:
Duration: ${intakeForm.duration}
Recent changes: ${intakeForm.changedRecently}
Location: ${intakeForm.bodyLocation}

Respond ONLY with valid JSON with these fields:
- risk_level: "low", "moderate", or "high"
- confidence_level: "low", "medium", or "high"
- findings: array of max 3 bullet points. Each bullet point max 15 words. Plain language only.
- concerning_signs: array of ABCDE assessment findings (will be saved but UI will show simplified).
- risk_factors_identified: array of max 2 bullet points pulled from their profile. Short and specific.
- summary: one single sentence summary maximum 20 words.
- action_card: One of three specific strings:
  1. "No immediate action needed. Monitor this spot monthly and see a dermatologist for your annual check." (for low risk)
  2. "Schedule a dermatologist appointment within the next 4-6 weeks. Not urgent but do not ignore it." (for moderate risk)
  3. "See a dermatologist as soon as possible — within 1-2 weeks. Do not wait." (for high risk)
- suggestions: array of action items (will be saved).
- urgency: string recommendation (will be saved).
- data_quality_note: string.
- disclaimer: always include.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              ...imageParts,
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              risk_level: { type: Type.STRING, description: "low, moderate, high, or insufficient_data" },
              confidence_level: { type: Type.STRING, description: "low, medium, or high" },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              concerning_signs: { type: Type.ARRAY, items: { type: Type.STRING } },
              risk_factors_identified: { type: Type.ARRAY, items: { type: Type.STRING } },
              cancer_type_indicators: { type: Type.STRING },
              comparison_notes: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              urgency: { type: Type.STRING },
              data_quality_note: { type: Type.STRING },
              disclaimer: { type: Type.STRING },
            },
            required: ["risk_level", "confidence_level", "findings", "concerning_signs", "risk_factors_identified", "cancer_type_indicators", "comparison_notes", "suggestions", "urgency", "data_quality_note", "disclaimer"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const jsonResult = JSON.parse(text) as AnalysisResult;
      setResult(jsonResult);

      // Calculate Next Scan Date (Weekly Rotation)
      const currentWeekIndex = cycleProgress % 4;
      const currentWeek = WEEK_DEFINITIONS[currentWeekIndex];
      
      // Check which parts of the current week are completed
      // Scans since the last full week completion
      const scansSinceLastCompletion = scans.filter(s => {
        if (!lastFullWeekCompletionDate) return true;
        return new Date(s.date).getTime() > new Date(lastFullWeekCompletionDate).getTime();
      });

      // Include the current scan in the check
      const currentScanRegion = intakeForm.bodyLocation || 'Unspecified';
      const allScansForCheck = [...scansSinceLastCompletion, { bodyRegion: currentScanRegion, date: new Date().toISOString() }];

      const completionStatus = currentWeek.required.map(req => {
        return allScansForCheck.some(s => req.regions.includes(s.bodyRegion));
      });

      const isNowFullyComplete = completionStatus.every(s => s === true);

      if (isNowFullyComplete) {
        // Check if we already completed a week today
        const todayStr = today.toISOString().split('T')[0];
        const lastCompletionDateStr = lastFullWeekCompletionDate ? new Date(lastFullWeekCompletionDate).toISOString().split('T')[0] : null;

        if (todayStr !== lastCompletionDateStr) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 7);
          const nextDateStr = nextDate.toISOString().split('T')[0];
          setNextScanDate(nextDateStr);

          const updatedProgress = cycleProgress + 1;
          setCycleProgress(updatedProgress);
          const nowIso = new Date().toISOString();
          setLastFullWeekCompletionDate(nowIso);

          if (currentUser) {
            db.collection("users").doc(currentUser.uid).update({
              nextScanDate: nextDateStr,
              cycleProgress: updatedProgress,
              lastFullWeekCompletionDate: nowIso
            });
          }
        }
      }
      
      // Update Streaks
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      setStreakData(prev => {
        let newStreak = prev.currentStreak;
        if (prev.lastScanMonth !== currentMonth) {
          // Check if it's the consecutive month
          const lastDate = prev.lastScanMonth ? new Date(prev.lastScanMonth + '-01') : null;
          const isConsecutive = lastDate && (today.getMonth() - lastDate.getMonth() + (12 * (today.getFullYear() - lastDate.getFullYear()))) === 1;
          
          if (isConsecutive || !prev.lastScanMonth) {
            newStreak += 1;
          } else if (lastDate && (today.getMonth() - lastDate.getMonth() + (12 * (today.getFullYear() - lastDate.getFullYear()))) > 1) {
            newStreak = 1;
          }
        }
        const updated = {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.longestStreak),
          lastScanMonth: currentMonth
        };
        
        if (currentUser) {
          db.collection("users").doc(currentUser.uid).update({
            streakData: updated
          });
        }
        
        return updated;
      });

      // Calculate SkinScore
      const newScore = calculateSkinScore(jsonResult);
      setSkinScore(newScore);
      if (currentUser) {
        db.collection("users").doc(currentUser.uid).update({
          skinScore: newScore
        });
      }
      setScoreHistory(prev => {
        const updated = [...prev, { date: new Date().toISOString(), score: newScore }];
        if (currentUser) {
          db.collection("users").doc(currentUser.uid).collection("timeline").doc("scores").set({
            history: updated
          });
        }
        return updated;
      });

      // Save to Timeline
      const newScan: ScanRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        photos: [...photos],
        note: note,
        result: jsonResult,
        bodyRegion: intakeForm.bodyLocation || 'Unspecified',
        skinScore: newScore,
        intake: { ...intakeForm }
      };
      
      saveScanToFirestore(newScan);
      
      // Update body dots for map
      if (intakeForm.bodyLocation) {
        const isMale = bodyGender === 'male';
        const torsoWidth = isMale ? 1.2 : 1.0;
        const armOffset = torsoWidth / 2 + 0.15;
        const legOffset = 0.3;
        
        const posMap: Record<string, [number, number, number]> = {
          "face": [0, 2.8, 0],
          "neck": [0, 2.45, 0],
          "chest": [0, 1.9, 0],
          "upper_body": [0, 1.2, 0],
          "arms": [armOffset, 1.4, 0],
          "hands": [armOffset, 0.8, 0],
          "back": [0, 1.5, -0.2]
        };

        const newDot: BodyDot = {
          id: Date.now().toString(),
          region: intakeForm.bodyLocation,
          risk: jsonResult.risk_level,
          position: posMap[intakeForm.bodyLocation] || [0, 0, 0]
        };
        setBodyDots(prev => {
          const updated = [...prev, newDot];
          if (currentUser) {
            db.collection("users").doc(currentUser.uid).update({
              bodyDots: updated
            });
          }
          return updated;
        });
      }

      // Compare with previous scan of same region
      const prevScan = scans.find(s => s.bodyRegion === newScan.bodyRegion);
      if (prevScan && jsonResult.risk_level === 'high') {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          text: `The spot on your ${newScan.bodyRegion} has changed since your last scan.`,
          type: 'alert',
          read: false,
          date: new Date().toISOString()
        }]);
      }

      setScans(prev => [newScan, ...prev]);
      setShowEduCard(true);

    } catch (err: any) {
      console.error("Analysis error:", err);
      if (err.message?.includes("429") || err.status === 429 || err.message?.includes("quota")) {
        setError("AI service is currently busy (Rate Limit). Please wait a minute and try again.");
      } else {
        setError(err.message || "AI analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSkinScore = (analysisResult: AnalysisResult) => {
    let currentScore = skinScore;
    let change = 0;
    
    if (analysisResult.risk_level === 'low') {
      // +2 to +5 increase for low risk
      change = Math.floor(Math.random() * 4) + 2;
    } else if (analysisResult.risk_level === 'moderate') {
      // -5 to -10 decrease for moderate risk
      change = -(Math.floor(Math.random() * 6) + 5);
    } else if (analysisResult.risk_level === 'high') {
      // -15 to -25 decrease for high risk
      change = -(Math.floor(Math.random() * 11) + 15);
    }
    
    const newScore = Math.max(0, Math.min(100, currentScore + change));
    return newScore;
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    try {
      await db.collection("users").doc(currentUser.uid).update({
        fullName: tempProfile.fullName,
        profileColor: tempProfile.profileColor
      });
      setUserProfile(tempProfile);
      setFullUserData((prev: any) => ({
        ...prev,
        fullName: tempProfile.fullName,
        profileColor: tempProfile.profileColor
      }));
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const saveDoctor = async () => {
    if (!currentUser) return;
    try {
      await db.collection("users").doc(currentUser.uid).collection("doctorInfo").doc("current").set(tempDoctor);
      setDoctorInfo(tempDoctor);
      setIsEditingDoctor(false);
    } catch (err) {
      console.error("Error saving doctor info:", err);
    }
  };
  const generateProtocol = async () => {
    setLoadingProtocol(true);
    setProtocolError(null);
    try {
      const prompt = `${AI_SYSTEM_PROMPT}
Generate a personalized "Skin Cancer Prevention Protocol" for a ${userProfile.age} year old with Fitzpatrick type ${userProfile.fitzpatrick} skin. 
The output must ONLY contain cancer prevention and monitoring content, nothing cosmetic.
STRICT LENGTH LIMITS:
- Write each bullet point in maximum 10 words. Be direct. No filler words. Think of it like a doctor giving quick instructions.
- dailyUVProtection: EXACTLY 2 bullet points. Most important sunscreen recommendation and one critical UV habit.
- monthlySelfExam: EXACTLY 3 steps. The 3 most important body areas to check.
- warningSigns: EXACTLY 3 signs. The 3 ABCDE criteria most relevant.
- nextExamSchedule: ONE clear sentence with a specific timeframe. (High risk: 2 weeks, Moderate: 4-6 weeks, Low: 6-12 months).
Format as JSON: { "dailyUVProtection": ["string"], "monthlySelfExam": ["string"], "priorityCheckAreas": ["string"], "warningSigns": ["string"], "nextExamSchedule": "string" }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Using correct model name from skill
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const protocolData = JSON.parse(response.text || '{}');
      const newProtocol = {
        dailyUVProtection: protocolData.dailyUVProtection || [],
        monthlySelfExam: protocolData.monthlySelfExam || [],
        priorityCheckAreas: protocolData.priorityCheckAreas || [],
        warningSigns: protocolData.warningSigns || [],
        nextExamSchedule: protocolData.nextExamSchedule || ""
      };
      setProtocol(newProtocol);
      saveProtocolToFirestore(newProtocol);
    } catch (err: any) {
      console.error("Protocol generation error:", err);
      if (err.message?.includes("429") || err.status === 429 || err.message?.includes("quota")) {
        setProtocolError("AI service is currently busy (Rate Limit). Please wait a minute and try again.");
      } else {
        setProtocolError("Failed to generate protocol. Please try again later.");
      }
    } finally {
      setLoadingProtocol(false);
    }
  };


  // --- Feature 6: Family Vault Component ---

  // --- Feature 7: Doctor Bridge Component ---
  const ClinicFinder = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [clinics, setClinics] = useState<any[]>([]);
    const [loadingClinics, setLoadingClinics] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    useEffect(() => {
      findClinics();
    }, []);

    const findClinics = (radius = 10000) => {
      if (!navigator.geolocation) {
        setStatusMessage("Geolocation is not supported by your browser");
        return;
      }

      setLoadingClinics(true);
      setStatusMessage("Detecting your location...");
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setStatusMessage("Finding nearest clinics...");

        if (!(window as any).L) return;
        const L = (window as any).L;

        if (!mapInstance.current && mapRef.current) {
          mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapInstance.current);
        } else if (mapInstance.current) {
          mapInstance.current.setView([latitude, longitude], radius > 10000 ? 10 : 13);
        }

        // User Marker
        L.circle([latitude, longitude], {
          color: '#00B4D8',
          fillColor: '#00B4D8',
          fillOpacity: 0.1,
          radius: 500, // 500 meters
          weight: 2,
          dashArray: '5, 5'
        }).addTo(mapInstance.current);

        L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="width: 20px; height: 20px; background: #00B4D8; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px #00B4D8;"></div>',
            iconSize: [20, 20]
          })
        }).addTo(mapInstance.current).bindPopup("You are here");

        try {
          const query = `
            [out:json];
            (
              node["amenity"="doctors"]["healthcare:speciality"="dermatology"](around:${radius}, ${latitude}, ${longitude});
              way["amenity"="doctors"]["healthcare:speciality"="dermatology"](around:${radius}, ${latitude}, ${longitude});
              node["healthcare"="clinic"](around:${radius}, ${latitude}, ${longitude});
              node["amenity"="clinic"](around:${radius}, ${latitude}, ${longitude});
              node["amenity"="hospital"](around:${radius}, ${latitude}, ${longitude});
            );
            out body;
            >;
            out skel qt;
          `;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          let foundClinics = data.elements
            .filter((e: any) => e.tags && (e.tags.name || e.tags['addr:street']))
            .map((e: any) => ({
              id: e.id,
              name: e.tags.name || "Dermatology Clinic",
              address: e.tags['addr:street'] ? `${e.tags['addr:housenumber'] || ''} ${e.tags['addr:street']}, ${e.tags['addr:city'] || ''}` : "Address not available",
              lat: e.lat || (e.center ? e.center.lat : latitude),
              lon: e.lon || (e.center ? e.center.lon : longitude),
              distance: calculateDistance(latitude, longitude, e.lat || (e.center ? e.center.lat : latitude), e.lon || (e.center ? e.center.lon : longitude))
            }))
            .sort((a: any, b: any) => a.distance - b.distance);

          if (foundClinics.length === 0 && radius === 10000) {
            setStatusMessage("No specialized clinics found nearby. Expanding search to 50km...");
            findClinics(50000);
            return;
          }

          if (foundClinics.length === 0 && radius === 50000) {
            setStatusMessage("No specialized clinics found within 50km. Showing general medical centers.");
            const generalQuery = `
              [out:json];
              (
                node["amenity"="doctors"](around:20000, ${latitude}, ${longitude});
                node["healthcare"="clinic"](around:20000, ${latitude}, ${longitude});
              );
              out body 5;
            `;
            const genResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(generalQuery)}`);
            const genData = await genResponse.json();
            foundClinics = genData.elements?.map((e: any) => ({
              id: e.id,
              name: e.tags.name || "Medical Center",
              address: e.tags['addr:street'] ? `${e.tags['addr:housenumber'] || ''} ${e.tags['addr:street']}` : "Address not available",
              lat: e.lat,
              lon: e.lon,
              distance: calculateDistance(latitude, longitude, e.lat, e.lon)
            })).sort((a: any, b: any) => a.distance - b.distance);
          }

          setClinics(foundClinics);
          setStatusMessage(null);

          foundClinics.forEach((clinic: any) => {
            const isSpecialized = clinic.name.toLowerCase().includes('derm') || clinic.name.toLowerCase().includes('skin');
            const isHospital = clinic.name.toLowerCase().includes('hospital');
            
            // Add a sonar-style circle around the clinic
            const circle = L.circle([clinic.lat, clinic.lon], {
              color: isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8',
              fillColor: isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8',
              fillOpacity: 0.1,
              radius: 200, // 200 meters
              weight: 1,
              className: 'sonar-circle'
            }).addTo(mapInstance.current);

            const marker = L.marker([clinic.lat, clinic.lon], {
              icon: L.divIcon({
                className: 'clinic-marker',
                html: `
                  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: 0; background: ${isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8'}; border-radius: 50%; opacity: 0.3; animation: pulse 2s infinite;"></div>
                    <div style="width: 12px; height: 12px; background: ${isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8'}; border: 2px solid white; border-radius: 50%; z-index: 1;"></div>
                  </div>
                `,
                iconSize: [24, 24]
              })
            }).addTo(mapInstance.current);

            marker.bindPopup(`
              <div style="padding: 12px; min-width: 180px; font-family: 'Inter', sans-serif;">
                <div style="font-size: 10px; color: ${isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8'}; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">${isSpecialized ? 'Specialized Care' : isHospital ? 'Hospital' : 'Medical Center'}</div>
                <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; font-size: 14px;">${clinic.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">${clinic.address}</div>
                <div style="display: flex; gap: 8px;">
                  <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lon}')" style="flex: 1; background: #0f172a; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 700; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    DIRECTIONS
                  </button>
                  <button style="flex: 1; background: #2dd4bf; color: #060818; border: none; padding: 8px; border-radius: 8px; font-weight: 700; font-size: 10px; cursor: pointer;">
                    BOOK
                  </button>
                </div>
              </div>
            `);
          });

        } catch (error) {
          console.error("Error fetching clinics:", error);
          setStatusMessage("Error fetching clinics. Please try again.");
        } finally {
          setLoadingClinics(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        setStatusMessage("Please enable location access to find clinics.");
        setLoadingClinics(false);
      });
    };

    useEffect(() => {
      findClinics();
      return () => {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }, []);

    return (
      <div className="page-container" style={styles.tabContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Clinic Finder</h2>
          <button 
            onClick={() => findClinics()}
            style={{ padding: '8px 16px', borderRadius: '12px', background: '#00B4D8', border: 'none', color: 'white', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <MapPin size={16} />
            Refresh
          </button>
        </div>

        {statusMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(0, 180, 216, 0.1)', border: '1px solid rgba(0, 180, 216, 0.2)', borderRadius: '12px', color: '#00B4D8', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} className="animate-pulse" />
            {statusMessage}
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div 
            ref={mapRef} 
            style={{ 
              height: '350px', 
              width: '100%', 
              borderRadius: '24px', 
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(15, 23, 42, 0.5)'
            }} 
          />
          {loadingClinics && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6, 8, 24, 0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, borderRadius: '24px' }}>
              <RotateCcw className="animate-spin" size={32} color="#00B4D8" />
              <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>Locating nearby clinics...</p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Closest Clinics</h3>
          {clinics.length === 0 && !loadingClinics ? (
            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
              <p style={{ color: '#64748b', fontSize: '14px' }}>No clinics found in your area.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clinics?.slice(0, 3).map(clinic => (
                <div key={clinic.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{clinic.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{clinic.address}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#00B4D8' }}>{clinic.distance.toFixed(1)} km</div>
                    <button style={{ background: 'transparent', border: 'none', color: '#2dd4bf', fontSize: '12px', fontWeight: '700', padding: 0, marginTop: '4px' }}>DETAILS</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const DoctorBridge = () => (
    <div style={styles.tabContent}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>My Dermatologist</h2>
        <button 
          onClick={() => {
            setTempDoctor(doctorInfo);
            setIsEditingDoctor(!isEditingDoctor);
          }}
          style={{ background: 'none', border: 'none', color: '#2dd4bf', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
        >
          {isEditingDoctor ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {isEditingDoctor ? (
        <div className="glass-card p-6 rounded-3xl mb-6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>DOCTOR NAME</label>
              <input 
                type="text" 
                style={styles.input} 
                value={tempDoctor.name} 
                onChange={e => setTempDoctor({...tempDoctor, name: e.target.value})}
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>CLINIC NAME</label>
              <input 
                type="text" 
                style={styles.input} 
                value={tempDoctor.clinic} 
                onChange={e => setTempDoctor({...tempDoctor, clinic: e.target.value})}
                placeholder="City Dermatology"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>EMAIL</label>
              <input 
                type="email" 
                style={styles.input} 
                value={tempDoctor.email} 
                onChange={e => setTempDoctor({...tempDoctor, email: e.target.value})}
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PHONE</label>
              <input 
                type="tel" 
                style={styles.input} 
                value={tempDoctor.phone} 
                onChange={e => setTempDoctor({...tempDoctor, phone: e.target.value})}
                placeholder="+1 234 567 890"
              />
            </div>
            <button style={styles.analyzeButton} onClick={saveDoctor}>Save Doctor Info</button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-3xl mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(45, 212, 191, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} color="#2dd4bf" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px' }}>{doctorInfo.name || "Add Doctor Info"}</div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>{doctorInfo.clinic || "No clinic specified"}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Phone size={16} /> Call
            </button>
            <button style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Mail size={16} /> Email
            </button>
          </div>
        </div>
      )}
      <button 
        style={styles.analyzeButton}
        onClick={() => alert("Full Medical Report Generated. Ready to share.")}
      >
        <FileText size={20} /> Generate Doctor Report
      </button>
    </div>
  );

  const UVCard = () => {
    if (!uvData) return null;
    return (
      <div style={styles.uvCard} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${uvData.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun size={24} color={uvData.color} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>UV INDEX</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>{uvData.index} - {uvData.risk}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>REAPPLY SPF IN</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#2dd4bf' }}>2h 00m</div>
        </div>
      </div>
    );
  };

  // --- Feature 4: SkinScore Gauge Component ---
  const SkinScoreGauge = ({ score }: { score: number }) => {
    const getColor = (s: number) => {
      if (s >= 85) return '#2dd4bf';
      if (s >= 70) return '#fbbf24';
      if (s >= 50) return '#f87171';
      return '#ef4444';
    };

    const getMessage = (s: number) => {
      if (scans.length === 0) return <span>Perfect score. No known risk detected yet. Complete your first scan to begin tracking.</span>;
      if (s >= 85) return <span>Excellent — keep monitoring monthly</span>;
      if (s >= 70) return <span>Good — a few areas to improve</span>;
      if (s >= 50) return <span>Fair — review your protocol</span>;
      return <span>Action needed — see a dermatologist</span>;
    };

    return (
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="96" cy="96" r="88" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
            <motion.circle 
              cx="96" cy="96" r="88" 
              stroke={getColor(score)} 
              strokeWidth="12" 
              fill="none"
              strokeDasharray={553}
              initial={{ strokeDashoffset: 553 }}
              animate={{ strokeDashoffset: 553 - (553 * score) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-white">{score}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SkinScore™</span>
          </div>
        </div>
        <p className="text-center text-sm font-bold text-slate-300 mt-4 px-6">{getMessage(score)}</p>
        <button 
          onClick={() => setActiveTab('routine')}
          className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-cyan-400 hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ShieldCheck size={14} />
          <span>How to Improve</span>
        </button>
      </div>
    );
  };

  const SideMenu = () => {
    const menuItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'timeline', label: 'Timeline and Schedule', icon: Calendar },
      { id: 'profile', label: 'My Profile', icon: UserCircle },
      { id: 'clinic', label: 'Find Dermatologists', icon: MapPinned },
      { id: 'welcome', label: 'About Skin Tight', icon: Info },
    ];

    return (
      <>
        {/* Backdrop */}
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1999,
            opacity: isMenuOpen ? 1 : 0,
            pointerEvents: isMenuOpen ? 'auto' : 'none',
            transition: 'opacity 0.4s ease'
          }}
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div style={{
          ...styles.sideMenu,
          transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)'
        }}>
          <button 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              color: '#94a3b8'
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            <X size={32} />
          </button>

          {currentUser && (
            <div style={{ marginBottom: '32px', padding: '0 20px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '20px', 
                background: 'linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                fontSize: '24px',
                fontWeight: '800',
                color: 'white',
                boxShadow: '0 8px 16px rgba(45, 212, 191, 0.2)'
              }}>
                {currentUser.displayName?.charAt(0) || 'U'}
              </div>
              <div style={{ fontWeight: '800', fontSize: '20px', color: '#f8fafc' }}>{currentUser.displayName}</div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>{currentUser.email}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map(item => (
              <div 
                key={item.id} 
                style={styles.menuItem(activeTab === item.id)}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMenuOpen(false);
                }}
              >
                <item.icon size={24} />
                <span>{item.label}</span>
              </div>
            ))}
            
            <div 
              style={{ ...styles.menuItem(false), marginTop: '20px', color: '#ef4444' }}
              onClick={() => {
                clearAllSessionData();
                auth.signOut();
                setIsMenuOpen(false);
              }}
            >
              <LogOut size={24} />
              <span>Sign Out</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const updateIntake = (field: keyof IntakeForm, value: any) => {
    setIntakeForm(prev => ({ ...prev, [field]: value }));
  };

  const ScanPage = () => {
    const [currentSection, setCurrentSection] = useState(1);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'Sun Exposure History': true,
      'Medical History': true
    });

    const toggleSection = (title: string, sectionNum: number) => {
      setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
      if (sectionNum) setCurrentSection(sectionNum);
    };

    const updateQualityCheck = (field: keyof IntakeForm['qualityCheck'], value: boolean) => {
      setIntakeForm(prev => ({
        ...prev,
        qualityCheck: { ...prev.qualityCheck, [field]: value }
      }));
    };

    const toggleMultiSelect = (field: 'whatChanged' | 'appearance' | 'cancerTypes' | 'medicalConditions', value: string) => {
      setIntakeForm(prev => {
        const current = prev[field] as string[];
        const updated = current.includes(value) 
          ? current.filter(v => v !== value) 
          : [...current, value];
        return { ...prev, [field]: updated };
      });
    };

    const allQualityChecked = intakeForm.qualityCheck.clear && 
                             intakeForm.qualityCheck.lighting && 
                             intakeForm.qualityCheck.fillsFrame && 
                             intakeForm.qualityCheck.uploaded &&
                             photos.length > 0;

    const ConfidenceMeter = ({ score }: { score: number }) => {
      const getColor = () => {
        if (score < 50) return '#ef4444';
        if (score < 80) return '#f59e0b';
        return '#2dd4bf';
      };

      return (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-2xl mb-6 border border-white/5"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">Section {currentSection} of 4</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Form Completeness</span>
            </div>
            <span className="text-sm font-black" style={{ color: getColor() }}>{score}%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.5 }}
              className="h-full"
              style={{ backgroundColor: getColor() }}
            />
          </div>
        </motion.div>
      );
    };

    return (
      <div className="page-container" style={styles.tabContent}>
        {result ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.resultCard}
          >
            <div className="flex items-center gap-2 mb-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              <Info size={12} className="text-slate-400" />
              Skin cancer screening assessment — Not a medical diagnosis
            </div>
            
            <div className="mb-6">
              <div style={styles.riskBadge(result.risk_level)}>
                {result.risk_level === 'high' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span>
                  {result.risk_level === 'high' ? 'HIGH RISK' : result.risk_level === 'moderate' ? 'MODERATE RISK' : 'LOW RISK'}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-3 px-1">{result.summary}</p>
            </div>

            <div className="glass-card p-6 rounded-3xl mb-6 border border-cyan-500/20">
              <h3 style={styles.sectionTitle} className="text-cyan-400"><Activity size={20} /> <span>What the AI noticed</span></h3>
              <div className="space-y-3">
                {result.findings?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-200 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1.5" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-6 rounded-3xl mb-6 border ${
              result.risk_level === 'high' ? 'bg-red-500/10 border-red-500/30' :
              result.risk_level === 'moderate' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${
                result.risk_level === 'high' ? 'text-red-400' :
                result.risk_level === 'moderate' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                <AlertCircle size={18} /> <span>Do you need to act?</span>
              </h3>
              <p className="text-sm font-bold text-white leading-relaxed">{result.action_card}</p>
            </div>

            <div className="glass-card p-6 rounded-3xl mb-6 border border-purple-500/20">
              <h3 style={styles.sectionTitle} className="text-purple-400"><ShieldCheck size={20} /> <span>Your personal risk factors</span></h3>
              <div className="space-y-3">
                {result.risk_factors_identified?.slice(0, 2).map((rf, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-200 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                    {rf}
                  </div>
                ))}
              </div>
            </div>

            {saveStatus === 'success' && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center gap-3 mb-6 animate-bounce">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">Scan saved to your account</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-3 mb-6">
                <AlertTriangle size={20} className="text-red-400" />
                <span className="text-sm font-bold text-red-300">Error saving scan. Please try again.</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button style={styles.analyzeButton} onClick={() => downloadPDF()}>
                <Download size={20} /> Download PDF Report
              </button>
              {scans.filter(s => s.bodyRegion === intakeForm.bodyLocation).length > 0 && (
                <button 
                  onClick={() => {
                    const otherScans = scans.filter(s => s.bodyRegion === intakeForm.bodyLocation);
                    if (otherScans.length > 0) {
                      setCompareScanId(otherScans[0].id);
                      // We need a temporary ScanRecord for the current result to compare
                      const currentScan: ScanRecord = {
                        id: 'current',
                        date: new Date().toISOString(),
                        photos: [...photos],
                        note: note,
                        result: result!,
                        bodyRegion: intakeForm.bodyLocation || 'Unspecified',
                        skinScore: skinScore,
                        intake: { ...intakeForm }
                      };
                      // Actually, it's better to just use the latest scan from the list if it was just added
                      // But analyzeSkin adds it to the list, so it should be there.
                      setSelectedScanId(scans[0].id);
                      setIsComparing(true);
                    }
                  }}
                  className="w-full py-4 bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-teal-500/20 transition-all"
                >
                  <History size={20} /> Compare with Previous
                </button>
              )}
              <button 
                onClick={retakePhoto}
                className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <RotateCcw size={20} /> Retake Assessment
              </button>
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ConfidenceMeter score={confidenceScore} />
            
            {/* Confidence Warning */}
            <AnimatePresence>
              {showConfidenceWarning && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-500/20 border border-amber-500/50 p-6 rounded-3xl mb-2"
                >
                  <div className="flex items-center gap-3 mb-2 text-amber-500">
                    <AlertTriangle size={24} />
                    <h3 className="font-bold">Limited data provided</h3>
                  </div>
                  <p className="text-sm text-amber-200/80 mb-4">
                    The AI will attempt analysis but accuracy may be reduced. We strongly recommend completing more sections for a reliable result.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowConfidenceWarning(false)}
                      className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl text-sm"
                    >
                      Complete More Info
                    </button>
                    <button 
                      onClick={() => analyzeSkin(true)}
                      className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl text-sm"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {(error || confidenceScore < 50) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/20 border border-red-500/50 p-6 rounded-3xl mb-2"
                >
                  <div className="flex items-center gap-3 mb-2 text-red-500">
                    <AlertCircle size={24} />
                    <h3 className="font-bold">Insufficient information</h3>
                  </div>
                  <p className="text-sm text-red-200/80">
                    {confidenceScore < 50 
                      ? "More data is needed for a safe and accurate assessment. Please complete more sections of the intake form and upload clear photos to reach at least 50% completeness."
                      : error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo Upload Section */}
            <div 
              style={styles.uploadZone}
              onClick={triggerFileInput}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                multiple 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              {photos.length === 0 ? (
                <>
                  <Camera size={48} color="#2dd4bf" style={{ marginBottom: '12px' }} />
                  <p style={{ fontWeight: '700' }}>Capture or Upload Photos</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Up to 6 clear photos</p>
                </>
              ) : (
                <div style={styles.photoGrid}>
                  {photos?.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={p} style={styles.photoThumbnail} />
                      <button style={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removePhoto(i); }}><X size={14} /></button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <div style={{ ...styles.photoThumbnail, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px dashed #2dd4bf' }}>
                      <Plus size={24} color="#2dd4bf" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image Quality Feedback */}
            {checkingQuality && (
              <div className="flex items-center gap-2 text-sm text-cyan-400 animate-pulse px-2">
                <RefreshCw size={16} className="animate-spin" />
                AI checking image quality...
              </div>
            )}
            {imageQuality === 'POOR' && (
              <div className="bg-amber-500/20 border border-amber-500/50 p-4 rounded-2xl text-sm text-amber-200">
                This photo appears blurry or poorly lit. For accurate analysis please retake the photo in good natural lighting with the camera close to the skin.
              </div>
            )}
            {imageQuality === 'NOT_SKIN' && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-sm text-red-200">
                This does not appear to be a photo of skin. Please upload a clear photo of the skin area you want analyzed.
              </div>
            )}

            {/* Intake Form Sections */}
            <div className="space-y-4">
              {/* SECTION 1: Your Profile */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-white/5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><User size={20} color="#2dd4bf" /> SECTION 1 — Your Profile</h3>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Auto-filled</span>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                      Age: {fullUserData?.ageRange || 'Not set'}
                    </div>
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300 flex items-center gap-2">
                      Skin Type: {fullUserData?.fitzpatrickType ? `Type ${fullUserData.fitzpatrickType}` : 'Not set'}
                      {fullUserData?.fitzpatrickType && (
                        <div 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '3px', 
                            background: fitzpatrickTypes.find(t => t.id === fullUserData.fitzpatrickType)?.color 
                          }} 
                        />
                      )}
                    </div>
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                      {fullUserData?.ethnicity || 'Ethnicity not set'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    From your profile · <button onClick={() => setActiveTab('profile')} className="text-cyan-400 hover:underline font-bold">Edit</button>
                  </p>
                </div>
              </div>

              {/* SECTION 2: About This Skin Spot */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-white/5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><MapPin size={20} color="#a855f7" /> SECTION 2 — About This Skin Spot</h3>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Required</span>
                </div>
                <div className="p-6 bg-amber-500/10 border-b border-amber-500/20">
                  <p className="text-xs text-amber-200/80 leading-relaxed italic">
                    <span className="font-bold text-amber-400">Note:</span> These questions help our AI provide a more accurate assessment based on clinical risk factors.
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Where exactly on your body is it? <span className="text-red-500">*</span></label>
                    <select 
                      className={`w-full bg-white/5 border rounded-xl p-4 text-white outline-none transition-all ${!intakeForm.bodyLocation ? 'border-red-500/30' : 'border-white/10 focus:border-cyan-500'}`}
                      value={intakeForm.bodyLocation}
                      onChange={(e) => updateIntake('bodyLocation', e.target.value)}
                    >
                      <option value="" disabled>Select Location</option>
                      {bodyLocations.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">How long have you had this spot?</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-all"
                      value={intakeForm.duration}
                      onChange={(e) => updateIntake('duration', e.target.value)}
                    >
                      <option value="" disabled>Select Duration</option>
                      {durations.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Has it changed recently?</label>
                    <div className="flex gap-2">
                      {['Yes', 'No', "Not sure"].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('changedRecently', o)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${intakeForm.changedRecently === o ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Sun History */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-white/5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Sun size={20} color="#f59e0b" /> SECTION 3 — Sun History</h3>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Required</span>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">How much sun exposure do you get daily?</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-all"
                      value={intakeForm.dailySunExposure}
                      onChange={(e) => updateIntake('dailySunExposure', e.target.value)}
                    >
                      <option value="" disabled>Select Exposure</option>
                      <option value="Mostly indoors" className="bg-slate-900">Mostly indoors</option>
                      <option value="Moderate (30 min to 2 hours)" className="bg-slate-900">Moderate (30 min to 2 hours)</option>
                      <option value="High (more than 2 hours outdoors)" className="bg-slate-900">High (more than 2 hours outdoors)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Have you ever had severe blistering sunburns?</label>
                    <div className="flex gap-2">
                      {['Never', 'Once or twice', 'Many times'].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('severeSunburns', o)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all ${intakeForm.severeSunburns === o ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Do you regularly use sun protection?</label>
                    <div className="flex gap-2">
                      {['Never', 'Sometimes', 'Always'].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('useSunProtection', o)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all ${intakeForm.useSunProtection === o ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Medical History */}
              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-white/5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Activity size={20} color="#ef4444" /> SECTION 4 — Medical History</h3>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Required</span>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Have you or a blood relative had skin cancer?</label>
                    <div className="flex flex-wrap gap-2">
                      {['Yes (me)', 'Yes (family member)', 'Yes (both)', 'No'].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('cancerHistory', o)}
                          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-xs transition-all ${intakeForm.cancerHistory === o ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {intakeForm.cancerHistory !== 'No' && intakeForm.cancerHistory !== '' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Which type?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Melanoma', 'Basal Cell Carcinoma', 'Squamous Cell Carcinoma', 'Not sure'].map(type => (
                          <button 
                            key={type}
                            onClick={() => {
                              const current = intakeForm.cancerTypes;
                              if (current.includes(type)) {
                                updateIntake('cancerTypes', current.filter(t => t !== type));
                              } else {
                                updateIntake('cancerTypes', [...current, type]);
                              }
                            }}
                            className={`py-3 px-4 rounded-xl font-bold text-[10px] transition-all ${intakeForm.cancerTypes.includes(type) ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Do you have many unusual or atypical moles?</label>
                    <div className="flex gap-2">
                      {['Yes', 'No', 'Not sure'].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('atypicalMoles', o)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all ${intakeForm.atypicalMoles === o ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Are you immunocompromised or on immunosuppressant medications?</label>
                    <div className="flex gap-2">
                      {['Yes', 'No', 'Not sure'].map(o => (
                        <button 
                          key={o}
                          onClick={() => updateIntake('isImmunocompromised', o)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all ${intakeForm.isImmunocompromised === o ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Image Quality Confirmation */}
              <div className="glass-card rounded-3xl overflow-hidden border-2 border-cyan-500/30">
                <div className="p-6 flex justify-between items-center bg-cyan-500/10">
                  <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck size={20} color="#2dd4bf" /> SECTION 5 — Image Quality Confirmation</h3>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Required</span>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { id: 'clear', label: "The photo is clear and in focus" },
                    { id: 'lighting', label: "The lighting is good — no shadows" },
                    { id: 'fillsFrame', label: "The spot fills most of the frame" },
                    { id: 'uploaded', label: "I have uploaded at least one photo" }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => updateQualityCheck(item.id as any, !intakeForm.qualityCheck[item.id as keyof IntakeForm['qualityCheck']])}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-medium transition-all ${intakeForm.qualityCheck[item.id as keyof IntakeForm['qualityCheck']] ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${intakeForm.qualityCheck[item.id as keyof IntakeForm['qualityCheck']] ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                        {intakeForm.qualityCheck[item.id as keyof IntakeForm['qualityCheck']] && <Check size={14} color="white" />}
                      </div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Sufficiency</span>
                <span className={`text-xs font-black ${confidenceScore >= 70 ? 'text-emerald-400' : 'text-cyan-400'}`}>{confidenceScore}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${confidenceScore}%` }}
                  className={`h-full ${confidenceScore >= 70 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                />
              </div>
              {confidenceScore < 70 && (
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Complete more sections to reach 70% sufficiency for AI analysis.
                </p>
              )}
            </div>

            <button 
              style={{ ...styles.analyzeButton, opacity: confidenceScore < 70 || !intakeForm.bodyLocation || loading ? 0.5 : 1 }}
              disabled={confidenceScore < 70 || !intakeForm.bodyLocation || loading}
              onClick={() => analyzeSkin()}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <SparklesIcon size={20} />
                  Analyze Now
                </>
              )}
            </button>
            {confidenceScore < 70 && (
              <p className="text-center text-xs text-red-400 font-bold animate-pulse">
                Please complete the intake form and confirm image quality to reach 70% sufficiency.
              </p>
            )}
            {!intakeForm.bodyLocation && confidenceScore >= 70 && (
              <p className="text-center text-xs text-red-400 font-bold animate-pulse">
                Please select body location to continue
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const WelcomePage = ({ onComplete }: { onComplete: () => void }) => {
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2 }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: '#060818',
        color: '#f8fafc',
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ maxWidth: '500px', width: '100%' }}
        >
          <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px',
              background: 'rgba(45, 212, 191, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px', border: '1px solid rgba(45, 212, 191, 0.2)',
              boxShadow: '0 0 20px rgba(45, 212, 191, 0.2)'
            }}>
              <Dna size={40} color="#2dd4bf" className="animate-pulse" />
            </div>
            <h1 style={{ fontSize: '14px', fontWeight: '900', color: '#2dd4bf', letterSpacing: '4px', textTransform: 'uppercase' }}>Skin Tight</h1>
          </motion.div>

          <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '48px', fontWeight: '900', marginBottom: '12px', lineHeight: 1.1 }}>Catch It Early.</h2>
            <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.4 }}>AI-powered skin cancer monitoring for everyone.</p>
          </motion.div>

          <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            {[
              { icon: '🌍', number: '1 in 5', text: 'Americans will develop skin cancer in their lifetime.' },
              { icon: '📈', number: '98%+', text: 'Detected early, skin cancer survival rates exceed 98%.' },
              { icon: '⏱️', number: '60s', text: 'Early detection starts with a 60-second scan.' }
            ].map((card, i) => (
              <div key={i} className="glass-card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '24px' }}>{card.icon}</span>
                <div>
                  <span style={{ fontWeight: '900', fontSize: '18px', color: '#f8fafc', display: 'block' }}>{card.number}</span>
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>{card.text}</span>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#2dd4bf', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>What Skin Tight does:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Analyzes photos of suspicious moles, spots and lesions',
                'Assesses skin cancer risk using clinical ABCDE criteria',
                'Tracks changes over time and alerts you when to see a doctor'
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                  <CheckCircle2 size={18} color="#2dd4bf" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>What Skin Tight does NOT do:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Diagnose skin cancer — only a doctor can do that',
                'Replace professional dermatology care',
                'Provide general skincare or beauty advice'
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
                  <X size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.p variants={itemVariants} style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: 1.6, marginBottom: '40px' }}>
            Skin Tight is a wellness monitoring tool currently in beta testing. It uses AI vision trained on clinical dermatology guidelines to help you identify suspicious spots earlier. It is not a medical device and does not provide medical diagnoses. Always consult a licensed board-certified dermatologist for any skin concerns.
          </motion.p>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
            style={{
              width: '100%',
              padding: '20px',
              borderRadius: '24px',
              border: 'none',
              background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
              color: '#020617',
              fontWeight: '900',
              fontSize: '18px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(45, 212, 191, 0.3)'
            }}
          >
            Get Started
          </motion.button>
        </motion.div>
      </div>
    );
  };

  const BodyMapPage = () => null; // Removed as requested

  const AboutPage = () => {
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    };

    return (
      <div className="page-container" style={styles.tabContent}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto space-y-12 pb-20"
        >
          {/* HEADER */}
          <motion.div variants={itemVariants} className="flex flex-col items-center text-center pt-8">
            <div style={{
              width: '100px', height: '100px', borderRadius: '30px',
              background: 'rgba(45, 212, 191, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px', border: '1px solid rgba(45, 212, 191, 0.2)',
              boxShadow: '0 0 30px rgba(45, 212, 191, 0.3)'
            }}>
              <Dna size={50} color="#2dd4bf" className="animate-pulse" />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc', marginBottom: '8px' }}>Skin Tight</h1>
            <p style={{ fontSize: '18px', color: '#2dd4bf', fontWeight: '600' }}>AI-powered skin cancer monitoring for everyone.</p>
          </motion.div>

          {/* MISSION SECTION */}
          <motion.div variants={itemVariants} className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <SparklesIcon size={20} className="text-teal-400" /> Our Mission
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm">
              Skin cancer is the most common cancer in the world. One in five Americans will develop it in their lifetime — yet when caught early, survival rates exceed 98%. Skin Tight exists for one reason: to help people catch it early. We built an AI screening tool trained on clinical dermatology guidelines from the American Academy of Dermatology, the Skin Cancer Foundation, and Yale and Brown University research — so that anyone with a smartphone can monitor suspicious spots on their skin and know when to see a doctor before it is too late.
            </p>
          </motion.div>

          {/* IMPACT STATS */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '1 in 5', sub: 'Americans develop skin cancer' },
              { label: '98%', sub: 'survival rate when caught early' },
              { label: '60 sec', sub: 'to complete a scan' }
            ].map((stat, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl text-center">
                <div className="text-2xl font-black text-teal-400 mb-1">{stat.label}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{stat.sub}</div>
              </div>
            ))}
          </motion.div>

          {/* WHAT WE DO SECTION */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-black text-white px-2">What Skin Tight does</h2>
            <div className="space-y-3">
              {[
                'Analyzes photos of suspicious moles, spots and skin lesions using AI vision',
                'Assesses skin cancer risk using the clinical ABCDE criteria used by dermatologists',
                'Tracks changes in your skin over time and tells you when to see a doctor'
              ].map((point, i) => (
                <div key={i} className="glass-card p-4 rounded-2xl flex items-start gap-4">
                  <CheckCircle2 size={20} className="text-teal-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* WHAT WE DO NOT DO SECTION */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-black text-white px-2">What Skin Tight does NOT do</h2>
            <div className="space-y-3">
              {[
                'Diagnose skin cancer — only a licensed dermatologist can do that',
                'Replace professional medical care or dermatology appointments',
                'Provide general skincare, beauty or cosmetic advice'
              ].map((point, i) => (
                <div key={i} className="glass-card p-4 rounded-2xl flex items-start gap-4 border-red-500/10">
                  <X size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-400">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* IMPORTANT DISCLAIMER SECTION */}
          <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20">
            <h2 className="text-lg font-black text-amber-500 mb-4 flex items-center gap-2">
              <AlertTriangle size={24} /> Important Notice
            </h2>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              Skin Tight is a wellness monitoring tool currently in beta testing. It uses AI vision to help identify potentially suspicious skin changes earlier. It is NOT a medical device, does NOT provide medical diagnoses, and should NEVER be used as a substitute for professional medical advice. Always consult a licensed board-certified dermatologist for any skin concern. If you notice a rapidly changing, bleeding or painful lesion seek medical attention immediately regardless of what this app says.
            </p>
          </motion.div>

          {/* CLINICAL SOURCES SECTION */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-black text-white px-2">Built on Clinical Research</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'American Academy of Dermatology — Clinical Practice Guidelines',
                'The Skin Cancer Foundation — ABCDE Detection Framework',
                'Yale School of Medicine — Melanoma in Situ Research',
                'Brown University — Dermatology and Cutaneous Oncology'
              ].map((source, i) => (
                <div key={i} className="glass-card p-4 rounded-2xl flex items-center gap-4">
                  <FileText size={20} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-300">{source}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CONTACT SECTION */}
          <motion.div variants={itemVariants} className="glass-card p-8 rounded-3xl text-center">
            <h2 className="text-lg font-black text-white mb-4">Questions or Feedback</h2>
            <p className="text-sm text-slate-400 mb-6">
              Skin Tight is actively being developed. If you have feedback, encounter an issue, or want to partner with us reach out at:
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold mb-6">
              <Mail size={18} /> contact@skinscanai.com
            </div>
            <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest">
              For medical emergencies always call 911 or visit your nearest emergency room.
            </p>
          </motion.div>

          {/* VERSION INFO */}
          <motion.div variants={itemVariants} className="text-center space-y-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Skin Tight — Beta Version 1.0 — Built with Gemini AI</p>
            <p className="text-[10px] text-slate-700">© 2025 Skin Tight. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>
    );
  };

  const RoutinePage = () => {
    useEffect(() => {
      loadProtocolFromFirestore();
    }, []);

    return (
      <div className="page-container" style={styles.tabContent}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Daily UV Protection</h2>
        
        <div className="glass-card p-6 rounded-3xl mb-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
            <p className="text-xs text-amber-200 font-medium italic">Note: This protocol is generated by AI based on your Fitzpatrick type and scan history. It is for monitoring only and does not replace a professional clinical exam.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(45, 212, 191, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#2dd4bf" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px' }}>Daily UV Protection</div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>Personalized monitoring & protection</div>
            </div>
          </div>

          {!protocol ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Complete a scan to generate your protocol</p>
              {protocolError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {protocolError}
                </div>
              )}
              <button style={styles.analyzeButton} onClick={generateProtocol} disabled={loadingProtocol}>
                {loadingProtocol ? 'Loading...' : 'Analyze Now'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
                  <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sun size={12} /> <span>Daily UV Protection</span>
                  </h3>
                  <div className="space-y-2">
                    {protocol.dailyUVProtection.map((step, i) => (
                      <div key={i} className="text-xs text-slate-200 flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                  <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Eye size={12} /> <span>Monthly Self-Exam</span>
                  </h3>
                  <div className="space-y-2">
                    {protocol.monthlySelfExam.map((item, i) => (
                      <div key={i} className="text-xs text-purple-200 flex gap-2">
                        <CheckCircle2 size={12} className="text-purple-500 shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                  <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={12} /> <span>Warning Signs</span>
                  </h3>
                  <div className="space-y-2">
                    {protocol.warningSigns.map((sign, i) => (
                      <div key={i} className="text-xs text-red-200 flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
                        {sign}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Next Professional Exam</h4>
                <p className="text-sm font-bold text-white">{protocol.nextExamSchedule}</p>
              </div>

              {protocolError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                  {protocolError}
                </div>
              )}

              <div className="space-y-6 pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Priority Check Areas</h4>
                  <ul className="space-y-1">
                    {protocol.priorityCheckAreas.map((area, i) => (
                      <li key={i} className="text-xs text-amber-200/70 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500" /> {area}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 italic">This protocol is generated based on your Fitzpatrick type {userProfile.fitzpatrick} profile and recent scan history. Always consult a dermatologist for a clinical evaluation.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ShopPage = () => {
    const products = [
      { name: 'Mineral Sunscreen SPF 50+', price: '$24.99', category: 'Protection', image: 'https://picsum.photos/seed/sunscreen/400/400', desc: 'Broad-spectrum physical barrier' },
      { name: 'UV Detection Stickers', price: '$12.99', category: 'Monitoring', image: 'https://picsum.photos/seed/uvsticker/400/400', desc: 'Visual indicator for reapplication' },
      { name: 'Dermatoscope Lite', price: '$45.00', category: 'Monitoring', image: 'https://picsum.photos/seed/lens/400/400', desc: '10x magnification for clear photos' },
      { name: 'UPF 50+ Sun Hat', price: '$34.99', category: 'Protection', image: 'https://picsum.photos/seed/hat/400/400', desc: 'Maximum coverage for face & neck' }
    ];

    return (
      <div style={styles.tabContent}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Prevention Shop</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {products.map((p, i) => (
            <div key={i} style={styles.shopCard}>
              <img src={p.image} referrerPolicy="no-referrer" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '16px', marginBottom: '12px' }} />
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#2dd4bf', textTransform: 'uppercase', marginBottom: '4px' }}>{p.category}</div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', height: '32px', overflow: 'hidden' }}>{p.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '800', color: '#f8fafc' }}>{p.price}</div>
                <button style={{ background: '#2dd4bf', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}><ShoppingBag size={16} color="#060818" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PlansPage = () => {
    const plans = [
      { 
        name: 'Free', 
        price: '$0', 
        color: '#94a3b8', 
        features: ['3 Scans per month', 'Basic AI Analysis', 'Body Map Tracking', 'UV Index Alerts'],
        active: true
      },
      { 
        name: 'Pro', 
        price: '$9.99/mo', 
        color: '#00B4D8', 
        features: ['Unlimited Scans', 'Advanced ABCDE Analysis', 'Family Vault (3 members)', 'PDF Doctor Reports', 'AI Routine Generation'],
        active: false,
        popular: true
      },
      { 
        name: 'Elite', 
        price: '$19.99/mo', 
        color: '#a855f7', 
        features: ['Everything in Pro', 'Unlimited Family Members', 'Priority AI Processing', 'Direct Dermatologist Chat', 'Early Access Features'],
        active: false
      }
    ];

    return (
      <div className="page-container" style={styles.tabContent}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Upgrade Your Health</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Choose the plan that fits your family's needs.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {plans.map(plan => (
            <div key={plan.name} style={styles.planCard(plan.active, plan.color)}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#00B4D8', color: 'white', padding: '4px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: plan.color }}>{plan.name}</h3>
                  <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px' }}>{plan.price}</div>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${plan.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {plan.name === 'Free' ? <Zap size={24} color={plan.color} /> : plan.name === 'Pro' ? <Crown size={24} color={plan.color} /> : <Gem size={24} color={plan.color} />}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#cbd5e1' }}>
                    <Check size={16} color={plan.color} />
                    {f}
                  </div>
                ))}
              </div>
              <button style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '16px', 
                border: 'none', 
                background: plan.active ? 'rgba(255,255,255,0.05)' : plan.color,
                color: plan.active ? '#94a3b8' : 'white',
                fontWeight: '700',
                cursor: 'pointer'
              }}>
                {plan.active ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Feature 10: Education Card Component ---
  const EducationCard = () => {
    if (!result || !showEduCard) return null;
    
    const quiz = {
      question: "What is the 'A' in the ABCDE melanoma framework?",
      options: ["Age", "Asymmetry", "Appearance", "Area"],
      answer: 1
    };

    return (
      <div style={styles.eduCard} className="shimmer-overlay">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BookOpen size={20} color="#2dd4bf" />
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Learn About This</h4>
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.5' }}>
          {result.risk_level === 'high' ? 
            "High risk findings often show irregular borders or multiple colors. These are key indicators that a lesion needs professional evaluation." :
            "Low risk spots are typically symmetric and uniform in color. However, any new or changing spot should be monitored monthly."}
        </p>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#2dd4bf', marginBottom: '4px' }}>DAILY TIP</div>
          <div style={{ fontSize: '13px', color: '#f8fafc' }}>Apply SPF 30+ even on cloudy days. 80% of UV rays pass through clouds.</div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>{quiz.question}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {quiz.options.map((opt, i) => (
              <button 
                key={i}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: '12px' }}
                onClick={() => {
                  if (i === quiz.answer) {
                    setEducation(prev => {
                      const updated = { ...prev, completedCards: [...prev.completedCards, Date.now().toString()], score: prev.score + 10 };
                      if (currentUser) {
                        db.collection("users").doc(currentUser.uid).update({
                          education: updated
                        });
                      }
                      return updated;
                    });
                    setShowEduCard(false);
                  }
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };
  const downloadPDF = (scanPhotos?: string[], scanResult?: AnalysisResult) => {
    const currentPhotos = scanPhotos || photos;
    const currentResult = scanResult || result;
    
    if (!currentResult || currentPhotos.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("Skin Tight Analysis Report", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 28);
    doc.text(`Photos Analyzed: ${currentPhotos.length}`, 20, 33);
    
    // Confidence Level
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Assessment Confidence:", 20, 43);
    const confColor = currentResult.confidence_level === 'high' ? [16, 185, 129] : currentResult.confidence_level === 'medium' ? [245, 158, 11] : [239, 68, 68];
    doc.setTextColor(confColor[0], confColor[1], confColor[2]);
    doc.text(currentResult.confidence_level.toUpperCase(), 75, 43);

    // Risk Level
    doc.setTextColor(0, 0, 0);
    doc.text("Risk Level:", 20, 50);
    const riskColor = currentResult.risk_level === 'high' ? [239, 68, 68] : currentResult.risk_level === 'moderate' ? [245, 158, 11] : [16, 185, 129];
    doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.text(currentResult.risk_level.toUpperCase(), 50, 50);
    
    // Intake Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Patient Intake Summary", 20, 65);
    doc.setFontSize(10);
    doc.text(`Age: ${intakeForm.ageRange} | Ethnicity: ${intakeForm.ethnicity}`, 20, 72);
    doc.text(`Location: ${intakeForm.bodyLocation} | Duration: ${intakeForm.duration}`, 20, 77);
    doc.text(`Recent Changes: ${intakeForm.changedRecently}`, 20, 82);
    
    let y = 92;
    
    const addSection = (title: string, items: string[], color: number[] = [0, 0, 0]) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 20, y);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      y += 7;
      items.forEach(item => {
        const splitItem = doc.splitTextToSize(`• ${item}`, pageWidth - 40);
        if (y + (splitItem.length * 5) > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(splitItem, 20, y);
        y += splitItem.length * 5 + 2;
      });
      y += 5;
    };
    
    addSection("Findings:", currentResult.findings, [45, 212, 191]);
    addSection("Concerning Signs:", currentResult.concerning_signs, [239, 68, 68]);
    addSection("Risk Factors Identified:", currentResult.risk_factors_identified, [168, 85, 247]);
    addSection("Personalized Suggestions:", currentResult.suggestions, [59, 130, 246]);
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text("Urgency:", 20, y);
    doc.setFontSize(10);
    doc.text(currentResult.urgency, 20, y + 7);
    
    y += 20;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const splitDisclaimer = doc.splitTextToSize(`Disclaimer: ${currentResult.disclaimer}`, pageWidth - 40);
    doc.text(splitDisclaimer, 20, y);
    
    // Add images on next pages
    currentPhotos.forEach((p, index) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Captured Image ${index + 1}:`, 20, 20);
      try {
        doc.addImage(p, 'JPEG', 20, 30, pageWidth - 40, (pageWidth - 40) * (4/3));
      } catch (e) {
        doc.text("Image could not be rendered in PDF.", 20, 40);
      }
    });
    
    doc.save(`SkinScan_Report_${new Date().getTime()}.pdf`);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: '20px 20px 100px',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden' as const,
    },
    navBar: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '70px',
      background: 'rgba(6, 8, 24, 0.8)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 10px',
      zIndex: 1000,
    },
    navItem: (active: boolean) => ({
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '4px',
      color: active ? '#2dd4bf' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
    }),
    navLabel: {
      fontSize: '10px',
      fontWeight: '600',
    },
    badge: {
      position: 'absolute' as const,
      top: '-4px',
      right: '-4px',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#ef4444',
      border: '1px solid #060818',
    },
    topHeader: {
      position: 'sticky' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(6, 8, 24, 0.8)',
      backdropFilter: 'blur(12px)',
      zIndex: 900,
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    uvCard: {
      width: '100%',
      padding: '16px',
      borderRadius: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(30, 41, 59, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginBottom: '16px',
    },
    scoreGauge: {
      width: '180px',
      height: '180px',
      margin: '20px auto',
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreValue: (color: string) => ({
      fontSize: '48px',
      fontWeight: '800',
      color: color,
      textShadow: `0 0 20px ${color}44`,
    }),
    timelineItem: {
      display: 'flex',
      gap: '16px',
      padding: '16px',
      borderRadius: '20px',
      background: 'rgba(30, 41, 59, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginBottom: '12px',
      cursor: 'pointer',
    },
    bodyMapContainer: {
      width: '100%',
      height: '400px',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '24px',
      overflow: 'hidden',
      position: 'relative' as const,
    },
    familyCard: {
      padding: '16px',
      borderRadius: '20px',
      background: 'rgba(30, 41, 59, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
      cursor: 'pointer',
    },
    routineStep: {
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(30, 41, 59, 0.2)',
      borderLeft: '4px solid #2dd4bf',
      marginBottom: '12px',
    },
    eduCard: {
      padding: '20px',
      borderRadius: '24px',
      background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(168, 85, 247, 0.1))',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginTop: '20px',
    },
    chartContainer: {
      width: '100%',
      height: '200px',
      marginTop: '16px',
    },
    notificationBell: {
      position: 'relative' as const,
      cursor: 'pointer',
    },
    notificationDot: {
      position: 'absolute' as const,
      top: '-2px',
      right: '-2px',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: '#ef4444',
      border: '2px solid #060818',
    },
    tabContent: {
      flex: 1,
      width: '100%',
      paddingBottom: '90px', // Space for nav bar
    },
    regionBadge: {
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      background: 'rgba(45, 212, 191, 0.2)',
      color: '#2dd4bf',
      display: 'inline-block',
      marginBottom: '8px',
    },
    comparisonView: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginTop: '12px',
    },
    comparisonLabel: {
      fontSize: '10px',
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      marginBottom: '4px',
      textAlign: 'center' as const,
    },
    wrapper: {
      maxWidth: '480px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      animation: 'fade-in 0.8s ease-out',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '10px',
      position: 'relative' as const,
    },
    logoContainer: {
      width: '80px',
      height: '80px',
      margin: '0 auto 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      background: 'rgba(45, 212, 191, 0.1)',
      border: '1px solid rgba(45, 212, 191, 0.2)',
      position: 'relative' as const,
    },
    logoGlow: {
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, transparent 70%)',
      animation: 'pulse-glow 3s infinite',
    },
    title: {
      fontSize: '32px',
      fontWeight: '800',
      margin: '0',
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: '14px',
      color: '#94a3b8',
      marginTop: '4px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      fontWeight: '600',
    },
    disclaimerBanner: {
      padding: '12px 16px',
      borderRadius: '12px',
      fontSize: '12px',
      borderLeft: '4px solid #f59e0b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      lineHeight: '1.4',
    },
    uploadZone: {
      width: '100%',
      height: '160px',
      borderRadius: '24px',
      overflow: 'hidden',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      border: '2px dashed rgba(45, 212, 191, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'rgba(30, 41, 59, 0.2)',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      width: '100%',
      maxHeight: '340px',
      overflowY: 'auto' as const,
      padding: '4px',
    },
    photoThumbnail: {
      width: '100%',
      aspectRatio: '1/1',
      borderRadius: '16px',
      objectFit: 'cover' as const,
      border: '1px solid rgba(45, 212, 191, 0.4)',
      boxShadow: '0 0 10px rgba(45, 212, 191, 0.2)',
      animation: 'fade-in 0.5s ease',
    },
    removeBtn: {
      position: 'absolute' as const,
      top: '8px',
      right: '8px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: 'rgba(239, 68, 68, 0.8)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
      zIndex: 10,
    },
    counterBadge: {
      position: 'absolute' as const,
      top: '12px',
      right: '16px',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '700',
      background: 'rgba(45, 212, 191, 0.2)',
      color: '#2dd4bf',
      border: '1px solid rgba(45, 212, 191, 0.3)',
    },
    inputGroup: {
      position: 'relative' as const,
      width: '100%',
    },
    label: (active: boolean) => ({
      position: 'absolute' as const,
      left: '16px',
      top: active ? '-10px' : '16px',
      fontSize: active ? '12px' : '14px',
      color: active ? '#2dd4bf' : '#94a3b8',
      background: active ? '#060818' : 'transparent',
      padding: active ? '0 4px' : '0',
      transition: 'all 0.2s ease',
      pointerEvents: 'none' as const,
      fontWeight: active ? '600' : '400',
    }),
    textarea: {
      width: '100%',
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '16px',
      color: '#f8fafc',
      fontSize: '14px',
      minHeight: '120px',
      resize: 'none' as const,
      outline: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(8px)',
    },
    analyzeButton: {
      width: '100%',
      padding: '16px',
      borderRadius: '16px',
      border: 'none',
      fontWeight: '700',
      fontSize: '16px',
      cursor: 'pointer',
      color: '#060818',
      background: 'linear-gradient(45deg, #2dd4bf, #a855f7, #38bdf8)',
      backgroundSize: '200% 200%',
      animation: 'button-gradient 5s infinite ease, pulse-soft 2s infinite',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      transition: 'transform 0.2s',
    },
    loadingOverlay: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '16px',
      padding: '40px 0',
    },
    dnaHelix: {
      fontSize: '48px',
      color: '#2dd4bf',
      animation: 'dna-spin 2s linear infinite',
    },
    resultCard: {
      marginTop: '8px',
      animation: 'slide-up 0.6s ease-out',
    },
    riskBadge: (level: string) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 20px',
      borderRadius: '999px',
      fontSize: '14px',
      fontWeight: '800',
      textTransform: 'uppercase' as const,
      background: 
        level === 'high' ? 'rgba(239, 68, 68, 0.2)' : 
        level === 'moderate' ? 'rgba(245, 158, 11, 0.2)' : 
        level === 'low' ? 'rgba(16, 185, 129, 0.2)' : 
        'rgba(148, 163, 184, 0.2)',
      color: 
        level === 'high' ? '#ef4444' : 
        level === 'moderate' ? '#f59e0b' : 
        level === 'low' ? '#10b981' : 
        '#94a3b8',
      border: `1px solid ${
        level === 'high' ? '#ef4444' : 
        level === 'moderate' ? '#f59e0b' : 
        level === 'low' ? '#10b981' : 
        '#94a3b8'
      }`,
      boxShadow: `0 0 20px ${
        level === 'high' ? 'rgba(239, 68, 68, 0.3)' : 
        level === 'moderate' ? 'rgba(245, 158, 11, 0.3)' : 
        level === 'low' ? 'rgba(16, 185, 129, 0.3)' : 
        'rgba(148, 163, 184, 0.3)'
      }`,
      marginBottom: '24px',
    }),
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      margin: '24px 0 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#f8fafc',
    },
    listItem: {
      display: 'flex',
      gap: '12px',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#cbd5e1',
      lineHeight: '1.5',
      animation: 'fade-in 0.5s ease forwards',
    },
    pillBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      background: 'rgba(168, 85, 247, 0.2)',
      color: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.3)',
    },
    inputLabel: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#94a3b8',
      marginBottom: '6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
    },
    footer: {
      marginTop: '40px',
      textAlign: 'center' as const,
      padding: '20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    },
    sideMenu: {
      position: 'fixed' as const,
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '400px',
      background: 'rgba(6, 8, 24, 0.95)',
      backdropFilter: 'blur(24px)',
      zIndex: 2000,
      padding: '80px 30px 40px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      overflowY: 'auto' as const,
      WebkitOverflowScrolling: 'touch' as const,
    },
    menuItem: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px 20px',
      borderRadius: '16px',
      color: active ? '#2dd4bf' : '#cbd5e1',
      background: active ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
      borderLeft: active ? '4px solid #2dd4bf' : '4px solid transparent',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    planCard: (active: boolean, color: string) => ({
      padding: '24px',
      borderRadius: '24px',
      background: 'rgba(30, 41, 59, 0.3)',
      border: `2px solid ${active ? color : 'rgba(255, 255, 255, 0.05)'}`,
      boxShadow: active ? `0 0 30px ${color}33` : 'none',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
      transform: active ? 'scale(1.02)' : 'scale(1)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    }),
    shopCard: {
      background: 'rgba(30, 41, 59, 0.3)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    }
  };

  const OverdueBanner = () => {
    if (!nextScanDate) return null;
    const diff = new Date(nextScanDate).getTime() - new Date().getTime();
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;
    
    // Check if dismissed today
    const today = new Date().toISOString().split('T')[0];
    if (bannerDismissedDate === today) return null;

    if (!isOverdue) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Skin Scan Overdue</h4>
            <p className="text-xs text-red-200/70">It has been over {Math.abs(daysRemaining)} days since your last scheduled scan.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('scan')}
            className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl"
          >
            Scan Now
          </button>
          <button 
            onClick={() => {
              setBannerDismissedDate(today);
              localStorage.setItem('banner_dismissed_date', today);
            }}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    );
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Dna size={48} color="#2dd4bf" />
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  if (!onboardingComplete) {
    return <OnboardingScreen onComplete={() => {
      setOnboardingComplete(true);
      localStorage.setItem('onboarding_complete', 'true');
    }} />;
  }

  if (!welcomeSeen) {
    return <WelcomePage onComplete={() => {
      setWelcomeSeen(true);
      localStorage.setItem('welcomeSeen', 'true');
    }} />;
  }

  const LegalModal = () => {
    if (!showLegalModal) return null;
    
    let title = "";
    let content = "";
    
    if (showLegalModal === 'terms') {
      title = "Terms & Conditions";
      content = TERMS_AND_CONDITIONS;
    } else if (showLegalModal === 'privacy') {
      title = "Privacy Policy";
      content = PRIVACY_POLICY;
    } else {
      title = "Disclaimer";
      content = DISCLAIMER_TEXT;
    }

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            maxWidth: '600px', width: '100%', maxHeight: '80vh',
            background: '#0f172a', borderRadius: '24px', padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>{title}</h2>
            <button onClick={() => setShowLegalModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{content}</pre>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="app-wrapper" style={{ ...styles.container, background: '#060818', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {isOffline && (
        <div style={{ 
          background: '#ef4444', 
          color: 'white', 
          padding: '8px', 
          textAlign: 'center', 
          fontSize: '12px', 
          fontWeight: '700',
          position: 'sticky',
          top: 0,
          zIndex: 2000
        }}>
          You appear to be offline. Some features may be limited.
        </div>
      )}
      <header style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setIsMenuOpen(true)}
            style={{ background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dna size={24} color="#2dd4bf" />
            <span style={{ fontWeight: '800', fontSize: '18px', color: '#f8fafc' }}>Skin Tight</span>
          </div>
          {/* Profile icon moved next to the name with space as requested */}
          {fullUserData && (
            <div 
              onClick={() => setActiveTab('profile')}
              style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: fullUserData.profileColor || '#2dd4bf',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '800', color: '#020617',
                cursor: 'pointer',
                marginLeft: '12px' // Space between name and profile icon
              }}
            >
              {fullUserData.fullName ? fullUserData.fullName.split(' ').map((n: any) => n?.[0] || '').join('').toUpperCase() : (fullUserData.username?.[0]?.toUpperCase() || 'U')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Empty right side to keep the left side grouped */}
        </div>
      </header>

      <SideMenu />

      <div className="main-content" style={styles.wrapper}>
        <OverdueBanner />
        {activeTab === 'home' && (
          <div className="page-container" style={styles.tabContent}>
            {showInstallPrompt && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'rgba(45, 212, 191, 0.1)',
                border: '1px solid rgba(45, 212, 191, 0.2)',
                borderRadius: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600' }}>
                  Install Skin Tight
                </div>
                <button 
                  onClick={handleInstallClick}
                  style={{ 
                    background: '#2dd4bf', 
                    color: '#060818', 
                    border: 'none', 
                    borderRadius: '10px', 
                    padding: '8px 16px', 
                    fontSize: '12px', 
                    fontWeight: '800', 
                    cursor: 'pointer' 
                  }}
                >
                  Install App
                </button>
              </div>
            )}
            <div style={{ 
              marginBottom: '24px', 
              position: 'relative', 
              overflow: 'hidden', 
              borderRadius: '24px',
              padding: '24px',
              background: 'rgba(30, 41, 59, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: '#2dd4bf',
                  filter: 'blur(40px)',
                  zIndex: 0
                }}
              />
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '900', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #2dd4bf 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                zIndex: 1,
                margin: 0
              }} >Catch It Early.</h1>
              <p style={{ 
                fontSize: '14px', 
                color: '#94a3b8', 
                margin: '4px 0 0',
                position: 'relative',
                zIndex: 1
              }}>Scan suspicious spots. Track changes. Know when to act.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>
                  <span>Hello</span>, <span style={{ color: '#2dd4bf' }}>{fullUserData?.fullName ? fullUserData.fullName.split(' ')[0] : fullUserData?.username || 'User'}</span> 👋
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {scans.length === 0 ? <span>Start your first scan to begin tracking your skin health.</span> : <span>Your skin health at a glance</span>}
                </p>
              </div>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(45, 212, 191, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#2dd4bf" />
              </div>
            </div>

            <UVCard />
            
            {skinScore > 0 && <SkinScoreGauge score={skinScore} />}

            {recentScan && (
              <div className="glass-card p-6 rounded-3xl mb-6 border border-cyan-500/20 cursor-pointer hover:bg-white/5 transition-all" onClick={() => { setSelectedScanId(recentScan.id); setActiveTab('timeline'); }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} /> <span>MOST RECENT SCAN</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">{new Date(recentScan.date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-white/5 shrink-0">
                    {recentScan.photos && recentScan.photos[0] ? (
                      <img src={recentScan.photos[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Camera size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        recentScan.result.risk_level === 'high' ? 'bg-red-500/20 text-red-400' :
                        recentScan.result.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {recentScan.result.risk_level} Risk
                      </span>
                      <span className="text-xs font-bold text-slate-300 truncate">{recentScan.bodyRegion}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 italic">"{recentScan.result.summary}"</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-600 shrink-0" />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="glass-card p-4 rounded-2xl cursor-pointer hover:bg-white/5 transition-all" onClick={() => setActiveTab('scan')}>
                <Camera size={24} color="#2dd4bf" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', fontSize: '14px' }}>New Scan</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Analyze skin concerns</div>
              </div>
            </div>

            <div style={styles.disclaimerBanner} className="glass-card shimmer-overlay">
              <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
              <p>This is an AI screening tool, not a medical diagnosis. Consult a licensed dermatologist for professional evaluation.</p>
            </div>

            <EducationCard />
          </div>
        )}

        {activeTab === 'scan' && <ScanPage />}
        {activeTab === 'timeline' && <Timeline scans={scans} setSelectedScanId={setSelectedScanId} setActiveTab={setActiveTab} styles={styles} streakData={streakData} nextScanDate={nextScanDate} cycleProgress={cycleProgress} lastFullWeekCompletionDate={lastFullWeekCompletionDate} />}
        {activeTab === 'routine' && <RoutinePage />}
        {activeTab === 'plans' && <PlansPage />}
        {activeTab === 'clinic' && <ClinicFinder />}

        {activeTab === 'welcome' && <AboutPage />}

        <AnimatePresence>
          {selectedScanId && (
            <ScanDetail 
              scan={scans.find(s => s.id === selectedScanId)!} 
              onClose={() => setSelectedScanId(null)}
              onDownload={downloadPDF}
              onCompare={scans.filter(s => s.bodyRegion === scans.find(sc => sc.id === selectedScanId)?.bodyRegion).length > 1 ? () => {
                const currentScan = scans.find(s => s.id === selectedScanId)!;
                const otherScans = scans.filter(s => s.bodyRegion === currentScan.bodyRegion && s.id !== currentScan.id);
                if (otherScans.length > 0) {
                  setCompareScanId(otherScans[0].id);
                  setIsComparing(true);
                }
              } : undefined}
              styles={styles}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComparing && selectedScanId && compareScanId && (
            <CompareView 
              scan1={scans.find(s => s.id === selectedScanId)!}
              scan2={scans.find(s => s.id === compareScanId)!}
              onClose={() => setIsComparing(false)}
              styles={styles}
            />
          )}
        </AnimatePresence>

        {activeTab === 'profile' && (
          <div className="page-container" style={styles.tabContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>My Profile</h2>
              {!isEditingProfile && (
                <button 
                  onClick={() => {
                    setTempProfile(userProfile);
                    setIsEditingProfile(true);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: 'rgba(45, 212, 191, 0.1)', 
                    border: '1px solid rgba(45, 212, 191, 0.2)', 
                    color: '#2dd4bf', 
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '14px', 
                    fontWeight: '700', 
                    cursor: 'pointer' 
                  }}
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
            </div>
            
            {/* Personal Info Card */}
            <div className="glass-card p-8 rounded-[32px] mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-bl-full -mr-8 -mt-8" />
              
              <div className="flex flex-col items-center text-center">
                <div 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: userProfile.profileColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    fontWeight: '900',
                    color: 'white',
                    marginBottom: '20px',
                    boxShadow: `0 10px 25px ${userProfile.profileColor}40`,
                    border: '4px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {userProfile.fullName ? userProfile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                </div>
                
                <h3 className="text-2xl font-black text-white mb-1">{userProfile.fullName || 'Anonymous User'}</h3>
                <p className="text-slate-400 font-bold text-sm mb-4">@{fullUserData?.username || 'user'}</p>
                
                <div className="flex items-center gap-2 text-slate-300 text-sm mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  <Mail size={14} className="text-teal-400" />
                  {fullUserData?.email || 'No email set'}
                </div>

                <div className="w-full grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Member Since</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar size={14} className="text-teal-400" />
                      {fullUserData?.createdAt ? (fullUserData.createdAt.toDate ? fullUserData.createdAt.toDate().toLocaleDateString() : new Date(fullUserData.createdAt).toLocaleDateString()) : 'Recently'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Skin Type</div>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase">Type {userProfile.fitzpatrick}</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase">{fullUserData?.ethnicity || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <AnimatePresence>
              {isEditingProfile && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="glass-card p-8 rounded-[32px] mb-6 border border-teal-500/20"
                >
                  <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                    <Settings size={20} className="text-teal-400" /> Edit Your Details
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        value={tempProfile.fullName} 
                        onChange={e => setTempProfile({...tempProfile, fullName: e.target.value})}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Profile Color</label>
                      <div className="flex flex-wrap gap-3">
                        {['#2dd4bf', '#a855f7', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981'].map(color => (
                          <button 
                            key={color}
                            onClick={() => setTempProfile({...tempProfile, profileColor: color})}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%', 
                              background: color,
                              border: tempProfile.profileColor === color ? '3px solid white' : '2px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              transform: tempProfile.profileColor === color ? 'scale(1.1)' : 'scale(1)',
                              transition: 'all 0.2s',
                              boxShadow: tempProfile.profileColor === color ? `0 0 15px ${color}80` : 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 py-4 bg-white/5 text-slate-400 font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        style={styles.analyzeButton} 
                        className="flex-1"
                        onClick={saveProfile}
                      >
                        <Save size={20} /> Save Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <Footer onShowLegal={setShowLegalModal} />
      </div>

      <LegalModal />
    </div>
  );
}

export default App;
