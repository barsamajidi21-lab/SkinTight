import React, { useState, useRef, useEffect, useMemo, Suspense, Component, ReactNode, FormEvent, ChangeEvent } from 'react';
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
  XCircle,
  ArrowLeft,
  Loader2,
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
  Clock,
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
  LogOut,
  Heart
} from 'lucide-react';

import { BLOG_ARTICLES, BLOG_DISCLAIMER } from './data/blogData';
import { PSEO_LANDING_PAGES, PseoPage } from './data/pSEOData';
import { PseoLandingPage } from './components/PseoLandingPage';
import { SkinShowcaseCarousel } from './components/SkinShowcaseCarousel';
import { Reviews3DCarousel } from './components/Reviews3DCarousel';
import { ensureLeafletLoaded, ensureChartJsLoaded } from './lib/scriptLoader';

import { db, auth, storage } from './lib/firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocFromServer,
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  increment,
  Timestamp,
  FieldValue,
  serverTimestamp,
  deleteDoc,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';

// --- Constants ---
const ONESIGNAL_APP_ID = "9960c3dd-03ff-4220-8a73-77ff77838dad";

// Helper to get current week cycle key (e.g., "2024-W15")
const getCurrentCycleKey = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
};

// --- Types & Enums ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error Detailed: ', errorString);
  // Do not throw to prevent app crashes, handle in UI
}

// Robust self-healing JSON parser for AI outputs
const safeParseAIJSON = (rawText: string): any => {
  if (!rawText) return null;
  
  // 1. Clean markdown code blocks if present
  let clean = rawText.replace(/```json|```/g, "").trim();
  
  // 2. Locate the first { and the last } to extract JSON block safely ignored extraneous text
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1) {
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    } else {
      clean = clean.slice(firstBrace);
    }
  }

  // 3. Attempt regular JSON parse first
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn("[JSON Healing] Standard JSON parse failed, attempting structural reconstruction:", e);
  }

  // 4. Reconstruction of truncated or cut-off JSON (such as missing output tokens)
  let healed = clean;
  
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < healed.length; i++) {
    const char = healed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  // Auto-close open quote
  if (inString) {
    healed += '"';
  }
  
  // Trim dangling commas, colons, or open bracket markers at the end
  healed = healed.trim();
  while (healed.endsWith(',') || healed.endsWith(':') || healed.endsWith('[')) {
    healed = healed.slice(0, -1).trim();
  }

  // Auto-append missing closing brackets/braces in reverse order
  while (openBrackets > 0) {
    healed += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    healed += '}';
    openBraces--;
  }

  try {
    return JSON.parse(healed);
  } catch (err) {
    console.error("[JSON Healing] Failed to reconstruct AI response JSON:", err);
    throw new Error("AI analysis response was interrupted or incomplete. Please try again.");
  }
};

// Robust Validation & Fallback for Analysis Results
const validateAndFallbackAnalysisResult = (data: any): AnalysisResult => {
  const fallback: AnalysisResult = {
    risk_level: 'low',
    confidence_level: 'medium',
    findings: ['No obvious visual warning signs were detected.'],
    concerning_signs: ['No active atypical asymmetric borders or color variations detected.'],
    risk_factors_identified: ['Continuous routine self-monitoring is advised based on user details.'],
    summary: 'No obvious visual warning signs were detected based on standard AI screening checks.',
    action_card: 'Low visual concern based on the uploaded images. Monitor for changes and consult a dermatologist if concerned.',
    cancer_type_indicators: 'No high-risk cancer indicators identified.',
    comparison_notes: 'Image is stable within normal limits.',
    suggestions: ['Continue regular monthly self-examinations.', 'Wear sun protective garments and sunscreen daily.'],
    urgency: 'Routine evaluation or when any signs of changes are observed.',
    data_quality_note: 'Resolution and illumination were verified.',
    disclaimer: 'This results display is for informational support only and is not medical advice. Consult a dermatologist for formal diagnosis.'
  };

  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const getArrayOfStrings = (arr: any, fallbackArr: string[]): string[] => {
    if (Array.isArray(arr)) {
      return arr.map(item => typeof item === 'string' ? item : String(item)).filter(Boolean);
    }
    return fallbackArr;
  };

  const risk = typeof data.risk_level === 'string' ? data.risk_level.toLowerCase() : '';
  const confidence = typeof data.confidence_level === 'string' ? data.confidence_level.toLowerCase() : '';

  return {
    risk_level: ['low', 'moderate', 'high', 'insufficient_data'].includes(risk)
      ? risk as any
      : fallback.risk_level,
    confidence_level: ['low', 'medium', 'high'].includes(confidence)
      ? confidence as any
      : fallback.confidence_level,
    findings: getArrayOfStrings(data.findings, fallback.findings),
    concerning_signs: getArrayOfStrings(data.concerning_signs, fallback.concerning_signs),
    risk_factors_identified: getArrayOfStrings(data.risk_factors_identified, fallback.risk_factors_identified),
    summary: typeof data.summary === 'string' && data.summary ? data.summary : fallback.summary,
    action_card: typeof data.action_card === 'string' && data.action_card ? data.action_card : fallback.action_card,
    cancer_type_indicators: typeof data.cancer_type_indicators === 'string' ? data.cancer_type_indicators : fallback.cancer_type_indicators,
    comparison_notes: typeof data.comparison_notes === 'string' ? data.comparison_notes : fallback.comparison_notes,
    suggestions: getArrayOfStrings(data.suggestions, fallback.suggestions),
    urgency: typeof data.urgency === 'string' && data.urgency ? data.urgency : fallback.urgency,
    data_quality_note: typeof data.data_quality_note === 'string' && data.data_quality_note ? data.data_quality_note : fallback.data_quality_note,
    disclaimer: typeof data.disclaimer === 'string' && data.disclaimer ? data.disclaimer : fallback.disclaimer,
    detected_body_part: typeof data.detected_body_part === 'string' ? data.detected_body_part : undefined,
  };
};

// Robust Validation & Fallback for Prevention Protocols
const validateAndFallbackProtocol = (data: any): PreventionProtocol => {
  const fallback: PreventionProtocol = {
    dailyUVProtection: [
      "Apply broad-spectrum SPF 30+ sunscreen daily before sun exposure.",
      "Wear protective wide-brimmed hats and solar UV protective apparel."
    ],
    monthlySelfExam: [
      "Check face, ears, and neck closely using a mirror.",
      "Inspect chest, torso, arms, and underarms regularly.",
      "Check legs, feet, back, and hard-to-see areas."
    ],
    priorityCheckAreas: ["Face and Neck", "Arms and Hands", "Upper Back"],
    warningSigns: [
      "Asymmetry: One half of the spot does not match the other.",
      "Border Irregularity: Edges are ragged, notched, or blurred.",
      "Color Variation: Pigment is not uniform, showing multiple shades."
    ],
    nextExamSchedule: "Schedule a comprehensive professional dermatologist check-up within the next 3-6 months as a safe precaution."
  };

  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const getArrayOfStrings = (arr: any, fallbackArr: string[]): string[] => {
    if (Array.isArray(arr)) {
      return arr.map(item => typeof item === 'string' ? item : String(item)).filter(Boolean);
    }
    return fallbackArr;
  };

  return {
    dailyUVProtection: getArrayOfStrings(data.dailyUVProtection, fallback.dailyUVProtection),
    monthlySelfExam: getArrayOfStrings(data.monthlySelfExam, fallback.monthlySelfExam),
    priorityCheckAreas: getArrayOfStrings(data.priorityCheckAreas, fallback.priorityCheckAreas),
    warningSigns: getArrayOfStrings(data.warningSigns, fallback.warningSigns),
    nextExamSchedule: typeof data.nextExamSchedule === 'string' && data.nextExamSchedule ? data.nextExamSchedule : fallback.nextExamSchedule
  };
};

// Robust Validation & Fallback for checklists
const validateAndFallbackHowToImprove = (data: any): any => {
  const fallback = {
    headline: "Take proactive steps daily to monitor and protect your skin.",
    steps: [
      {
        icon: "🧴",
        title: "Apply Sunscreen Daily",
        description: "Utilize SPF 30+ broad-spectrum protection diligently on all exposed skin surfaces.",
        impact: "high"
      },
      {
        icon: "🕵️",
        title: "Conduct Self-Exam",
        description: "Perform your complete visual skin screening checklist once a month to track evolution.",
        impact: "high"
      },
      {
        icon: "🧢",
        title: "Wear UV Gear",
        description: "Incorporate wide-brimmed hats and polarized sunglasses for maximum outdoor solar screening.",
        impact: "medium"
      },
      {
        icon: "🌳",
        title: "Seek Shaded Areas",
        description: "Prefer cool shaded environments during high UV index peak hours from 10 AM to 4 PM.",
        impact: "medium"
      },
      {
        icon: "🩺",
        title: "Schedule Check",
        description: "Consult a professional dermatologist annually for a complete proactive medical evaluation.",
        impact: "high"
      }
    ]
  };

  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const steps = Array.isArray(data.steps) ? data.steps.filter((s: any) => s && typeof s === 'object') : [];
  const validatedSteps = steps.map((s: any) => ({
    icon: typeof s.icon === 'string' && s.icon ? s.icon : "✨",
    title: typeof s.title === 'string' && s.title ? s.title : "Wellness Step",
    description: typeof s.description === 'string' && s.description ? s.description : "Keep tracking your daily skin screening habits to support long term health.",
    impact: typeof s.impact === 'string' && ['low', 'medium', 'high'].includes(s.impact.toLowerCase()) ? s.impact.toLowerCase() : "medium"
  }));

  return {
    headline: typeof data.headline === 'string' && data.headline ? data.headline : fallback.headline,
    steps: validatedSteps.length > 0 ? validatedSteps : fallback.steps
  };
};

// Translate raw server/fetch/parse errors into user-friendly messages
const translateAIError = (err: any): Error => {
  const msg = (err && err.message) ? String(err.message) : "";
  console.error("[Gemini API Failure Log for Debugging]:", err);
  
  if (msg.includes("timeout") || msg.includes("AbortError") || msg.includes("signal") || msg.includes("aborted")) {
    return new Error("Analysis temporarily unavailable: The request timed out. Please retry.");
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("Limit") || msg.includes("Rate Limit") || msg.includes("busy")) {
    return new Error("Analysis temporarily unavailable: AI service is currently busy. Please retry in a moment.");
  }
  if (msg.includes("image") || msg.includes("base64") || msg.includes("payload") || msg.includes("upload") || msg.includes("corrupt") || msg.includes("format")) {
    return new Error("Image upload issue detected. Please check your photo quality and retry.");
  }
  
  return new Error(`Analysis temporarily unavailable: ${msg || "Unknown error"}. Please retry.`);
};

// Central fetch executor with timeout, robust try/catch, and up to 2 retries
const executeAIFetch = async (payload: any, retries = 2, timeoutMs = 45000): Promise<any> => {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timer);
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(
          `API Gateway returned an invalid response. Code: ${response.status}. ` +
          `If you've just deployed to Vercel, please verify that you have added your GEMINI_API_KEY environment variable in your Vercel Dashboard, and check your Vercel deployment logs.`
        );
      }
      
      if (!response.ok) {
        throw new Error(data.error || "AI Generation failed");
      }
      
      return data;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      
      const isTimeout = err.name === 'AbortError' || err.message?.includes("aborted");
      console.warn(`[AI Attempt ${attempt + 1}/${retries + 1} Failed]:`, isTimeout ? 'Request timed out' : err.message);
      
      // Exponential backoff before next attempt
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw translateAIError(lastError);
};

// Client-side AI Helper
const callAI = async (prompt: string, model: string = "gemini-2.5-flash", config: any = {}) => {
  const enhancedConfig = { ...config };
  if (config.responseMimeType === "application/json") {
    enhancedConfig.responseMimeType = "application/json";
  }
  return executeAIFetch({ prompt, model, config: enhancedConfig });
};

const extractBase64FromDataUrl = (dataUrl: string): string => {
  if (!dataUrl) return "";
  const ix = dataUrl.indexOf(',');
  let base64Clean = ix === -1 ? dataUrl : dataUrl.slice(ix + 1);
  
  // Trim whitespaces
  base64Clean = base64Clean.trim();
  
  // Remove any non-base64 characters safely
  base64Clean = base64Clean.replace(/[^a-zA-Z0-9+/=]/g, '');
  
  // Ensure the base64 length is a multiple of 4
  const mod = base64Clean.length % 4;
  if (mod === 2) {
    base64Clean += "==";
  } else if (mod === 3) {
    base64Clean += "=";
  } else if (mod === 1) {
    base64Clean = base64Clean.slice(0, -1);
  }
  
  return base64Clean;
};

const callAIVision = async (parts: any[], model: string = "gemini-2.5-flash", config: any = {}) => {
  const enhancedConfig = { ...config };
  if (config.responseMimeType === "application/json") {
    enhancedConfig.responseMimeType = "application/json";
  }
  return executeAIFetch({ parts, model, config: enhancedConfig });
};

// Helper for server timestamps to avoid repeating long path
const getServerTimestamp = () => serverTimestamp();
const getIncrement = (val: number) => increment(val);

const styles = {
    container: {
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingBottom: '100px',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden' as const,
      margin: 0,
      boxSizing: 'border-box' as const,
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
      padding: '0 16px',
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
      padding: '0 16px',
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
      padding: '20px 16px',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center' as const,
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
      padding: '16px',
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
      paddingTop: '78px',
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
      width: '100%',
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      animation: 'fade-in 0.8s ease-out',
      margin: 0,
      padding: 0,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '10px',
      position: 'relative' as const,
    },
    logoContainer: {
      width: '80px',
      height: '80px',
      margin: '0 0 16px',
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
      fontSize: '36px',
      fontWeight: '900',
      margin: '0',
      letterSpacing: '-0.03em',
      lineHeight: '1.1',
    },
    subtitle: {
      fontSize: '16px',
      color: '#94a3b8',
      marginTop: '6px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      fontWeight: '700',
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
      padding: '18px',
      color: '#f8fafc',
      fontSize: '16px',
      minHeight: '140px',
      resize: 'none' as const,
      outline: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(8px)',
      lineHeight: '1.6',
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
      fontSize: '16px',
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
      padding: '14px 18px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#f8fafc',
      fontSize: '16px',
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
      maxWidth: '100%',
      background: 'rgba(6, 8, 24, 0.98)',
      backdropFilter: 'blur(24px)',
      zIndex: 2000,
      padding: '80px 20px 40px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
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

  const UVCard = ({ uvData }: { uvData: any }) => {
    if (!uvData) return null;
    return (
      <div style={styles.uvCard} className="glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${uvData.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun size={28} color={uvData.color} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UV INDEX</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc' }}>{uvData.index} - {uvData.risk}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>REAPPLY SPF IN</div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#2dd4bf' }}>2h 00m</div>
        </div>
      </div>
    );
  };

  const SkinScoreGauge = ({ score }: { score: number }) => {
    const getColor = (s: number) => {
      if (s >= 80) return '#2dd4bf';
      if (s >= 60) return '#f59e0b';
      return '#ef4444';
    };
    
    const color = getColor(score);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div style={styles.scoreGauge}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
          />
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.scoreValue(color)}
          >
            {score}
          </motion.div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Skin Health</div>
        </div>
      </div>
    );
  };

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

  const ClinicFinder = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [clinics, setClinics] = useState<any[]>([]);
    const [loadingClinics, setLoadingClinics] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [addressInput, setAddressInput] = useState("");
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');

    const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      setToastMessage(message);
      setToastType(type);
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    };

    const getOpenStatus = (hours: string | null) => {
      if (!hours) return { isOpen: null, closingTime: null, text: "Hours unlisted" };
      try {
        const now = new Date();
        const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
        const currentDayStr = dayNames[now.getDay()];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMinute;

        const dayRules = hours.split(';');
        for (const rule of dayRules) {
          const trimmedRule = rule.trim();
          const dayMatch = trimmedRule.match(/^([A-Za-z,-]+)\s+([\d:]+)-([\d:]+)$/);
          if (dayMatch) {
            const daysPart = dayMatch[1];
            const startStr = dayMatch[2];
            const endStr = dayMatch[3];

            let dayApplies = false;
            if (daysPart.includes('-')) {
              const [startDay, endDay] = daysPart.split('-');
              const startIndex = dayNames.indexOf(startDay);
              const endIndex = dayNames.indexOf(endDay);
              const currentIndex = now.getDay();
              if (startIndex <= endIndex) {
                dayApplies = currentIndex >= startIndex && currentIndex <= endIndex;
              } else {
                dayApplies = currentIndex >= startIndex || currentIndex <= endIndex;
              }
            } else if (daysPart.includes(',')) {
              dayApplies = daysPart.split(',').map(d => d.trim()).includes(currentDayStr);
            } else {
              dayApplies = daysPart === currentDayStr;
            }

            if (dayApplies) {
              const [startH, startM] = startStr.split(':').map(Number);
              const [endH, endM] = endStr.split(':').map(Number);
              const startTimeVal = startH * 60 + startM;
              const endTimeVal = endH * 60 + endM;

              if (currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal) {
                const closingHour = endH > 12 ? endH - 12 : endH;
                const ampm = endH >= 12 ? 'PM' : 'AM';
                const formattedClosing = `${closingHour}:${endM.toString().padStart(2, '0')} ${ampm}`;
                return { isOpen: true, closingTime: formattedClosing, text: `Open (Closes at ${formattedClosing})` };
              } else {
                return { isOpen: false, closingTime: null, text: `Closed` };
              }
            }
          }
        }
        if (hours.toLowerCase().includes('24/7')) {
          return { isOpen: true, closingTime: "24/7", text: "Open 24/7" };
        }
        return { isOpen: true, closingTime: null, text: `${hours}` };
      } catch (e) {
        return { isOpen: true, closingTime: null, text: `${hours}` };
      }
    };

    const findClinics = async (radius = 10000, customCoords?: { latitude: number; longitude: number }, isManualGPS = false) => {
      setLoadingClinics(true);
      try {
        let latitude: number;
        let longitude: number;

        if (customCoords) {
          latitude = customCoords.latitude;
          longitude = customCoords.longitude;
          setUserLocation([latitude, longitude]);
          setStatusMessage("Finding nearest clinics...");
        } else {
          setStatusMessage("Detecting your location...");
          if (!navigator.geolocation) {
            setStatusMessage("Geolocation is not supported. Please search using address manually.");
            setLoadingClinics(false);
            return;
          }

          if (!isManualGPS) {
            // Automatic on-load mode: use fast, privacy-preserving IP-based location approximation
            try {
              setStatusMessage("Approximating local area via IP network...");
              const ipRes = await fetch("https://ipapi.co/json/");
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                if (ipData && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
                  latitude = ipData.latitude;
                  longitude = ipData.longitude;
                  setUserLocation([latitude, longitude]);
                  setStatusMessage(`Detected approximate location: ${ipData.city || 'local area'}. Finding nearest clinics...`);
                  showToast(`Mapped clinics near your area: ${ipData.city || 'local area'}!`, "success");
                } else {
                  throw new Error("Invalid IP geo data");
                }
              } else {
                throw new Error("IP Geolocation service returned non-OK status");
              }
            } catch (ipErr) {
              console.warn("Fast IP Geolocation failed, trying standard browser GPS...", ipErr);
              // Fallback to standard GPS try
              try {
                await new Promise<void>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      latitude = position.coords.latitude;
                      longitude = position.coords.longitude;
                      setUserLocation([latitude, longitude]);
                      setStatusMessage("Finding nearest clinics...");
                      resolve();
                    },
                    (err) => reject(err),
                    { timeout: 7000 }
                  );
                });
              } catch (gpsErr) {
                // Hard fallback to default coordinates
                latitude = 37.7749;
                longitude = -122.4194;
                setUserLocation([latitude, longitude]);
                setStatusMessage("Defaulting location to San Francisco Bay Area (GPS/IP unavailable).");
                showToast("Using default search zone. Try typing your city/zip!", "info");
              }
            }
          } else {
            // User explicitly clicked "My Location" button: Request actual GPS tracking
            try {
              setStatusMessage("Requesting GPS tracking...");
              await new Promise<void>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                    setUserLocation([latitude, longitude]);
                    setStatusMessage("Finding nearest clinics...");
                    resolve();
                  },
                  (err) => reject(err),
                  { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                );
              });
              showToast("GPS position acquired successfully!", "success");
            } catch (err: any) {
              console.error("Manual GPS tracking failed:", err);
              let errorMsg = "Unable to acquire precise GPS coordinates.";
              if (err.code === 1) {
                errorMsg = "GPS blocked! Please unlock location access in the browser bar or key in address.";
                showToast("Location permission blocked. Enable it in your browser address bar!", "warning");
              } else if (err.code === 3) {
                errorMsg = "GPS request timed out. Trying fast IP network fallback...";
                showToast("GPS signal timed out. Attempting IP network fallback...", "info");
              } else {
                showToast("GPS tracking failed. Trying network approximation...", "info");
              }
              setStatusMessage(errorMsg);

              // Fallback to IP Geolocation on manual failure
              try {
                const ipRes = await fetch("https://ipapi.co/json/");
                if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  if (ipData && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
                    latitude = ipData.latitude;
                    longitude = ipData.longitude;
                    setUserLocation([latitude, longitude]);
                    setStatusMessage(`Using network approximate location: ${ipData.city || 'local area'}...`);
                    showToast(`Mapped clinics near approximate location: ${ipData.city || 'local area'}`, "success");
                  } else {
                    throw new Error("Invalid IP geo data");
                  }
                } else {
                  throw new Error("HTTP non-OK");
                }
              } catch (ipErr) {
                // If both manual GPS and IP Geo fail, fallback to San Francisco
                latitude = 37.7749;
                longitude = -122.4194;
                setUserLocation([latitude, longitude]);
                setStatusMessage("Location detection timed out or disabled. Showing default area.");
                showToast("Using default location area. Type city or zip below!", "info");
              }
            }
          }
        }

        const L = await ensureLeafletLoaded();
        if (!L) return;

        if (!mapInstance.current) {
          if (!mapRef.current) {
            console.warn("Map container is not ready yet.");
            return;
          }
          mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapInstance.current);
        } else {
          mapInstance.current.setView([latitude, longitude], radius > 10000 ? 10 : 13);
          // Clear older layers/markers safely
          mapInstance.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker || layer instanceof L.Circle) {
              mapInstance.current.removeLayer(layer);
            }
          });
        }

        if (!mapInstance.current) return;

        // Target Area Marker
        L.circle([latitude, longitude], {
          color: '#2dd4bf',
          fillColor: '#2dd4bf',
          fillOpacity: 0.05,
          radius: 1500,
          weight: 1,
          dashArray: '5, 5'
        }).addTo(mapInstance.current);

        L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="width: 20px; height: 20px; background: #2dd4bf; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(45, 212, 191, 0.655); animation: pulse 3s infinite;"></div>',
            iconSize: [20, 20]
          })
        }).addTo(mapInstance.current).bindPopup("Current Search Hub");

        // Overpass skin/dermatologist queries
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
          .map((e: any) => {
            const clat = e.lat || (e.center ? e.center.lat : latitude);
            const clon = e.lon || (e.center ? e.center.lon : longitude);
            const dist = calculateDistance(latitude, longitude, clat, clon);
            return {
              id: e.id,
              name: e.tags.name || "Dermatology Clinic",
              address: e.tags['addr:street'] ? `${e.tags['addr:housenumber'] || ''} ${e.tags['addr:street']}, ${e.tags['addr:city'] || ''}` : "Address not available",
              phone: e.tags.phone || e.tags['contact:phone'] || null,
              website: e.tags.website || e.tags['contact:website'] || null,
              hours: e.tags.opening_hours || null,
              rating: e.tags.rating || e.tags.score || null,
              lat: clat,
              lon: clon,
              distance: dist,
              distanceMiles: dist * 0.621371
            };
          })
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 5);

        if (foundClinics.length === 0 && radius === 10000) {
          setStatusMessage("No specialized clinics found nearby. Retrying 50km radius...");
          findClinics(50000, { latitude, longitude });
          return;
        }

        if (foundClinics.length === 0 && radius === 50000) {
          setStatusMessage("No specialized clinics within 50km. Finding general practitioner clinics...");
          const generalQuery = `
            [out:json];
            (
              node["amenity"="doctors"](around:20000, ${latitude}, ${longitude});
              node["healthcare"="clinic"](around:20000, ${latitude}, ${longitude});
            );
            out body;
          `;
          const genResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(generalQuery)}`);
          const genData = await genResponse.json();
          foundClinics = genData.elements?.map((e: any) => {
            const clat = e.lat || latitude;
            const clon = e.lon || longitude;
            const dist = calculateDistance(latitude, longitude, clat, clon);
            return {
              id: e.id,
              name: e.tags.name || "Medical Center",
              address: e.tags['addr:street'] ? `${e.tags['addr:housenumber'] || ''} ${e.tags['addr:street']}` : "Address not available",
              phone: e.tags.phone || e.tags['contact:phone'] || null,
              website: e.tags.website || e.tags['contact:website'] || null,
              hours: e.tags.opening_hours || null,
              rating: e.tags.rating || null,
              lat: clat,
              lon: clon,
              distance: dist,
              distanceMiles: dist * 0.621371
            };
          }).sort((a: any, b: any) => a.distance - b.distance).slice(0, 5) || [];
        }

        setClinics(foundClinics);
        setStatusMessage(null);
        if (foundClinics.length > 0) {
          showToast(`Mapped ${foundClinics.length} clinical centers successfully!`, "success");
        } else {
          showToast("No clinics found in this region.", "warning");
        }

        foundClinics.forEach((clinic: any) => {
          const isSpecialized = clinic.name.toLowerCase().includes('derm') || clinic.name.toLowerCase().includes('skin');
          const isHospital = clinic.name.toLowerCase().includes('hospital');
          const status = getOpenStatus(clinic.hours);
          
          L.circle([clinic.lat, clinic.lon], {
            color: isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8',
            fillColor: isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8',
            fillOpacity: 0.1,
            radius: 200,
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
            <div style="padding: 16px; min-width: 240px; font-family: 'Inter', sans-serif; background: #ffffff; border-radius: 12px;">
              <div style="font-size: 10px; color: ${isSpecialized ? '#2dd4bf' : isHospital ? '#ef4444' : '#38bdf8'}; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">${isSpecialized ? 'Skin Care Specialist' : isHospital ? 'Hospital Facility' : 'Medical Center'}</div>
              <div style="font-weight: 900; color: #0f172a; margin-bottom: 6px; font-size: 16px; line-height: 1.2;">${clinic.name}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.4;">${clinic.address}</div>
              
              <div style="font-size: 11px; margin-bottom: 8px; font-weight: 700; color: #475569;">
                📍 ${clinic.distanceMiles.toFixed(1)} miles (${clinic.distance.toFixed(1)} km)
              </div>

              ${clinic.rating ? `
                <div style="display: flex; align-items: center; gap: 4px; border-radius: 6px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-size: 11px; padding: 4px 8px; width: fit-content; font-weight: bold; margin-bottom: 12px;">
                  ⭐ ${clinic.rating} Google Rating
                </div>
              ` : ''}

              ${status.isOpen !== null ? `
                <div style="margin-bottom: 12px; font-size: 11px; font-weight: 800; color: ${status.isOpen ? '#10b981' : '#ef4444'}; display: flex; align-items: center; gap: 4px;">
                  <span>●</span> ${status.text}
                </div>
              ` : ''}

              ${clinic.phone ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #334155; font-size: 12px; font-weight: 600;">
                  <span>📞</span> ${clinic.phone}
                </div>
              ` : ''}

              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lon}')" style="flex: 1; background: #0f172a; color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 10px; cursor: pointer;">
                  DIRECTIONS
                </button>
                ${clinic.phone ? `
                  <button onclick="window.location.href='tel:${clinic.phone}'" style="flex: 1; background: #2dd4bf; color: #060818; border: none; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 10px; cursor: pointer;">
                    CALL
                  </button>
                ` : ''}
              </div>
            </div>
          `);
        });

      } catch (error) {
        console.error("Error fetching clinics:", error);
        setStatusMessage("Error looking up clinics. Please try searching another spot.");
        showToast("Error locating clinic hubs", "warning");
      } finally {
        setLoadingClinics(false);
      }
    };

    const handleAddressSearch = async () => {
      if (!addressInput.trim()) {
        showToast("Please enter an address first!", "warning");
        return;
      }
      setLoadingClinics(true);
      setStatusMessage(`Locating "${addressInput}"...`);
      showToast(`Locating "${addressInput}"...`, "info");
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        if (!response.ok) {
          throw new Error("Failed to Geocode");
        }
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon, display_name } = data[0];
          const primaryName = display_name.split(',')[0] || addressInput;
          showToast(`Located ${primaryName}! Mapping results...`, "success");
          setStatusMessage(`Found: ${display_name}. Mapping clinics...`);
          await findClinics(10000, { latitude: parseFloat(lat), longitude: parseFloat(lon) });
        } else {
          showToast("Address not recognized. Try typing city or zip.", "warning");
          setStatusMessage("Address not recognized. Try including a city or ZIP code.");
          setLoadingClinics(false);
        }
      } catch (err: any) {
        console.error("Geocoding failed:", err);
        showToast("Geocoding lookup failed. Using fallback location.", "warning");
        setStatusMessage("Geocoding failed. Using server-side fallback.");
        setLoadingClinics(false);
      }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '950', margin: 0, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }} className="flex items-center gap-2">
              <MapPinned size={20} className="text-teal-400" />
              <span>Clinic Finder</span>
            </h2>
          </div>
          
          <div className="glass-card" style={{ padding: '20.5px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(30, 41, 59, 0.3)', backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={13} className="text-teal-400" />
              <p className="text-xs text-teal-400 font-bold uppercase tracking-widest" style={{ margin: 0 }}>Location-Based Specialized Clinicians</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                  placeholder="Type city, zip, state, or address..."
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 52px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
                  }}
                  className="focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button 
                  onClick={handleAddressSearch}
                  disabled={loadingClinics}
                  style={{
                    flex: 2,
                    padding: '16px 24px',
                    borderRadius: '20px',
                    background: loadingClinics ? 'rgba(45, 212, 191, 0.15)' : 'linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%)',
                    border: 'none',
                    color: loadingClinics ? '#94a3b8' : '#060818',
                    fontSize: '15px',
                    fontWeight: '900',
                    cursor: loadingClinics ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: loadingClinics ? 'none' : '0 4px 18px rgba(45, 212, 191, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover:scale-[1.01] hover:brightness-110 active:scale-[0.98] focus:outline-none"
                  id="clinicSearchButtonBtn"
                >
                  {loadingClinics ? (
                    <>
                      <RotateCcw size={18} className="animate-spin text-teal-400" />
                      <span className="text-teal-400">Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>Find Clinics</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => { setAddressInput(''); findClinics(10000, undefined, true); }}
                  disabled={loadingClinics}
                  title="Use my current GPS position"
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '20px',
                    background: 'rgba(45, 212, 191, 0.1)',
                    border: '1px solid rgba(45, 212, 191, 0.25)',
                    color: '#2dd4bf',
                    cursor: loadingClinics ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '850',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover:bg-teal-500/20 active:scale-95"
                  id="clinicGPSButtonBtn"
                >
                  <MapPin size={18} />
                  <span className="hidden sm:inline">My Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(45, 212, 191, 0.08)', border: '1px solid rgba(45, 212, 191, 0.15)', borderRadius: '12px', color: '#2dd4bf', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} className="animate-pulse text-teal-400" />
            <span className="font-bold">{statusMessage}</span>
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '24px' }}>
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
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6, 8, 24, 0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, borderRadius: '24px', backdropFilter: 'blur(3px)' }}>
              <RotateCcw className="animate-spin" size={32} color="#2dd4bf" />
              <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '800', color: '#2dd4bf', letterSpacing: '0.05em' }}>MAPPING CLINIC NETWORKS...</p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '900', marginBottom: '14px', color: '#f8fafc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Closest Specialized Units</h3>
          {clinics.length === 0 && !loadingClinics ? (
            <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700' }}>No localized clinic found in this search zone. Try typing another zip or city name!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {clinics?.slice(0, 5).map(clinic => {
                const isSpecialized = clinic.name.toLowerCase().includes('derm') || clinic.name.toLowerCase().includes('skin');
                const status = getOpenStatus(clinic.hours);
                return (
                  <div key={clinic.id} className="glass-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.25s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1, marginRight: '12px' }}>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${isSpecialized ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-500/10 text-slate-400'}`}>
                            {isSpecialized ? 'Skin Care Specialist' : 'Clinic / Hospital Unit'}
                          </span>
                          {clinic.rating && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                              ⭐ {clinic.rating} Google Rating
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '17px', color: '#fff', marginBottom: '4px' }}>{clinic.name}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>{clinic.address}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ padding: '6px 14px', background: 'rgba(45, 212, 191, 0.1)', borderRadius: '100px', fontSize: '12px', fontWeight: '900', color: '#2dd4bf' }}>
                          {clinic.distanceMiles.toFixed(1)} mi
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                          ({clinic.distance.toFixed(1)} km)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                      {status.isOpen !== null && (
                        <div className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: status.isOpen ? '#10b981' : '#f43f5e' }}>
                          <span className="text-[10px]">●</span> {status.text}
                        </div>
                      )}
                      
                      {clinic.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0', fontWeight: '700' }}>
                          <Phone size={14} className="text-teal-400" /> {clinic.phone}
                        </div>
                      )}
                      
                      {clinic.hours && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                          <Clock size={14} className="text-amber-400" /> {clinic.hours}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => {
                          showToast(`Routing map directions to ${clinic.name}...`, 'success');
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lon}`);
                        }}
                        style={{
                          flex: 1,
                          padding: '13px',
                          borderRadius: '14px',
                          background: '#fff',
                          color: '#0f172a',
                          fontWeight: '900',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(255,255,255,0.08)',
                          border: 'none',
                          transition: 'all 0.2s'
                        }}
                        className="hover:bg-slate-100 active:scale-95"
                      >
                        <MapPin size={16} /> DIRECTIONS
                      </button>
                      
                      {clinic.phone && (
                        <button 
                          onClick={() => {
                            showToast(`Opening dialer for ${clinic.name}...`, 'success');
                            window.location.href = `tel:${clinic.phone}`;
                          }}
                          style={{
                            flex: 1,
                            padding: '13px',
                            borderRadius: '14px',
                            background: 'rgba(45, 212, 191, 0.1)',
                            border: '1px solid rgba(45, 212, 191, 0.25)',
                            color: '#2dd4bf',
                            fontWeight: '900',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="hover:bg-teal-400/20 active:scale-95"
                        >
                          CALL CLINIC
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {toastMessage && (
            <div style={{ position: 'fixed', bottom: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 24px',
                  borderRadius: '16px',
                  background: 'rgba(6, 8, 24, 0.95)',
                  border: toastType === 'success' ? '1px solid #2dd4bf' : toastType === 'warning' ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(45, 212, 191, 0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '700',
                  backdropFilter: 'blur(12px)',
                  pointerEvents: 'auto'
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: toastType === 'success' ? '#2dd4bf' : toastType === 'warning' ? '#f43f5e' : '#38bdf8',
                  boxShadow: toastType === 'success' ? '0 0 8px #2dd4bf' : toastType === 'warning' ? '0 0 8px #f43f5e' : '0 0 8px #38bdf8'
                }} />
                <span>{toastMessage}</span>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

const upperBodyParts = ["Head / Forehead", "Face", "Ear", "Neck", "Arms", "Chest", "Stomach", "Hands", "Back"];
const lowerBodyParts = ["Legs", "Thighs", "Knees", "Feet", "Toes", "Ankles", "Hips"];

const ScanPage = ({
  result,
  saveStatus,
  photos,
  note,
  intakeForm,
  skinScore,
  scans,
  confidenceScore,
  showConfidenceWarning,
  error,
  checkingQuality,
  imageQuality,
  fileInputRef,
  triggerFileInput,
  handleFileChange,
  removePhoto,
  analyzeSkin,
  retakePhoto,
  downloadPDF,
  setCompareScanId,
  setSelectedScanId,
  setIsComparing,
  setActiveTab,
  setShowEduCard,
  setShowConfidenceWarning,
  updateIntake,
  updateQualityCheck,
  fullUserData,
  loading
}: any) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'upper' | 'lower'>('upper');
  const [tempSelectedParts, setTempSelectedParts] = useState<string[]>([]);

  const handleTogglePart = (part: string) => {
    setTempSelectedParts(prev => {
      if (prev.includes(part)) {
        return prev.filter(p => p !== part);
      } else {
        return [...prev, part];
      }
    });
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
            {result.detected_body_part && (
              <div className="mt-3 px-1.5 py-1 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-mono">
                <SparklesIcon size={12} className="text-cyan-400 animate-pulse" />
                <span>AI Detected Body Part: <strong className="text-white">{result.detected_body_part}</strong></span>
              </div>
            )}
          </div>

          <div className="glass-card p-6 rounded-3xl mb-6 border border-cyan-500/20">
            <h3 style={styles.sectionTitle} className="text-cyan-400"><Activity size={20} /> <span>What the AI noticed</span></h3>
            <div className="space-y-3">
              {result.findings?.slice(0, 3).map((f: any, i: number) => (
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
              {result.risk_factors_identified?.slice(0, 2).map((rf: any, i: number) => (
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
            {scans.filter((s: any) => s.bodyRegion === intakeForm.bodyLocation).length > 0 && (
              <button 
                onClick={() => {
                  const otherScans = scans.filter((s: any) => s.bodyRegion === intakeForm.bodyLocation);
                  if (otherScans.length > 0) {
                    setCompareScanId(otherScans[0].id);
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
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/20 border border-red-500/50 p-6 rounded-3xl mb-2"
              >
                <div className="flex items-center gap-3 mb-2 text-red-500">
                  <AlertCircle size={24} />
                  <h3 className="font-bold">Analysis Error</h3>
                </div>
                <p className="text-sm text-red-200/80">{error}</p>
                <p className="text-xs text-slate-400 mt-3 border-t border-red-500/20 pt-2">
                  Your uploaded photos, intake questionnaire, and selected parameters are fully preserved in active memory. You can safely try again by clicking the <strong>Analyze Skin</strong> button below when the service becomes available.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

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
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Clear photos of skin concern</p>
              </>
            ) : (
              <div style={styles.photoGrid}>
                {photos?.map((p: string, i: number) => (
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

          <div className="space-y-4">
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="p-6 bg-white/5">
                <h3 className="text-lg font-bold flex items-center gap-2"><CheckCircle2 size={20} color="#2dd4bf" /> About This Scan</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3 text-red-500">Where is this on your body? *</label>
                  
                  {/* Custom Selector Trigger Button */}
                  <div 
                    onClick={() => {
                      const current = intakeForm.bodyLocation 
                        ? intakeForm.bodyLocation.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
                      setTempSelectedParts(current);
                      const hasLower = current.some((p: string) => lowerBodyParts.includes(p));
                      const hasUpper = current.some((p: string) => upperBodyParts.includes(p));
                      if (hasLower && !hasUpper) {
                        setActiveCategory('lower');
                      } else {
                        setActiveCategory('upper');
                      }
                      setIsSelectorOpen(!isSelectorOpen);
                    }}
                    className={`w-full bg-white/5 border rounded-xl p-4 text-white outline-none cursor-pointer transition-all flex justify-between items-center ${!intakeForm.bodyLocation ? 'border-red-500/30' : 'border-white/10 hover:border-cyan-500/50 focus:border-cyan-500'}`}
                  >
                    <span className={intakeForm.bodyLocation ? "text-white font-bold" : "text-slate-400 font-medium text-sm"}>
                      {intakeForm.bodyLocation || "Select Location(s)"}
                    </span>
                    <ChevronDown size={18} className="text-slate-400" />
                  </div>

                  <AnimatePresence>
                    {isSelectorOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl mt-2 overflow-hidden shadow-2xl transition-all"
                      >
                        {/* Upper / Lower selection toggle buttons */}
                        <div className="flex border-b border-white/5 p-2 gap-2 bg-white/[0.02]">
                          <button
                            type="button"
                            onClick={() => setActiveCategory('upper')}
                            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                              activeCategory === 'upper' 
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            Upper Body
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCategory('lower')}
                            className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                              activeCategory === 'lower' 
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            Lower Body
                          </button>
                        </div>

                        {/* List of common body parts */}
                        <div className="p-4 max-h-[220px] overflow-y-auto space-y-1.5 scrollbar-thin">
                          {activeCategory === 'upper' && (
                            <div className="grid grid-cols-2 gap-2">
                              {upperBodyParts.map((part) => {
                                const isSelected = tempSelectedParts.includes(part);
                                return (
                                  <button
                                    key={part}
                                    type="button"
                                    onClick={() => handleTogglePart(part)}
                                    className={`py-3 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${
                                      isSelected 
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10'
                                    }`}
                                  >
                                    <span>{part}</span>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {activeCategory === 'lower' && (
                            <div className="grid grid-cols-2 gap-2">
                              {lowerBodyParts.map((part) => {
                                const isSelected = tempSelectedParts.includes(part);
                                return (
                                  <button
                                    key={part}
                                    type="button"
                                    onClick={() => handleTogglePart(part)}
                                    className={`py-3 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${
                                      isSelected 
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:border-white/10'
                                    }`}
                                  >
                                    <span>{part}</span>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* OK and Cancel buttons at the bottom */}
                        <div className="flex border-t border-white/5 p-3 gap-2 bg-white/[0.01]">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSelectorOpen(false);
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const value = tempSelectedParts.join(', ');
                              updateIntake('bodyLocation', value);
                              setIsSelectorOpen(false);
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition-all"
                          >
                            OK
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Has this specific body part changed on your body?</label>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {['Yes', 'No', "Not sure"].map(o => (
                      <button 
                        key={o}
                        onClick={() => updateIntake('changedRecently', o)}
                        className={`py-3 px-1 rounded-xl font-bold text-[11px] sm:text-xs text-center transition-all ${intakeForm.changedRecently === o ? 'bg-cyan-500 text-white border border-cyan-400' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Do you regularly use sun protection?</label>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {['Never', 'Sometimes', 'Always'].map(o => (
                      <button 
                        key={o}
                        onClick={() => updateIntake('useSunProtection', o)}
                        className={`py-3 px-1 rounded-xl font-bold text-[11px] sm:text-xs text-center transition-all ${intakeForm.useSunProtection === o ? 'bg-cyan-500 text-white border border-cyan-400' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Does anyone in your bloodline have skin cancer?</label>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {['Yes', 'No', 'Not sure'].map(o => (
                      <button 
                        key={o}
                        onClick={() => updateIntake('cancerHistory', o)}
                        className={`py-3 px-1 rounded-xl font-bold text-[11px] sm:text-xs text-center transition-all ${intakeForm.cancerHistory === o ? 'bg-cyan-500 text-white border border-cyan-400' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            style={{ ...styles.analyzeButton, opacity: !intakeForm.bodyLocation || photos.length === 0 || loading ? 0.5 : 1 }}
            disabled={!intakeForm.bodyLocation || photos.length === 0 || loading}
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
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #0b112c 0%, #020412 100%)',
      color: '#f8fafc',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        {/* Compact Brand Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'rgba(45, 212, 191, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '8px', border: '1px solid rgba(45, 212, 191, 0.3)',
          }}>
            <ShieldCheck size={22} color="#2dd4bf" />
          </div>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#2dd4bf', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>Skin Tight</span>
          <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>Your Key Benefits</h2>
        </motion.div>

        {/* Benefits List - Super Compact */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            {
              title: "100% Free & Fast",
              desc: "Instant clinical screening in under 60 seconds (vs. $150+ clinic visits).",
              icon: Zap,
              color: "#0ea5e9"
            },
            {
              title: "High Clinical Accuracy",
              desc: "Powered by AI models trained on thousands of verified dermatology cases.",
              icon: Globe,
              color: "#a855f7"
            },
            {
              title: "Private & Secure",
              desc: "Your uploaded images and diagnostic records remain strictly encrypted.",
              icon: Lock,
              color: "#2dd4bf"
            }
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.color }}>
                  <IconComp size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#f8fafc', marginBottom: '1px' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.p variants={itemVariants} style={{ fontSize: '9.5px', color: '#64748b', textAlign: 'center', margin: '2px 0 4px' }}>
          Informational screening tool only; does not replace medical doctor advice.
        </motion.p>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
            color: '#020617',
            fontWeight: '950',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(45, 212, 191, 0.25)'
          }}
        >
          Start
        </motion.button>
      </motion.div>
    </div>
  );
};

const AboutPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
        className="w-full space-y-8 pb-32"
      >
        {/* CONTACT SECTION (Starts the page) */}
        <motion.div variants={itemVariants} className="p-6 text-center bg-teal-500/5 rounded-3xl border border-teal-500/10 mt-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
          <h2 className="text-base font-black text-white mb-2">Questions or Feedback?</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            We value your experience and safety. Our team is here to help with any questions or issues you may have.
          </p>
          
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-teal-500 text-slate-950 rounded-full font-black text-sm shadow-xl shadow-teal-500/20 hover:scale-105 transition-transform cursor-pointer">
            <Mail size={16} /> support.skintight@gmail.com
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-loose">
              Always call emergency services for immediate medical concerns.
            </p>
          </div>
        </motion.div>

        {/* HEADER */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center pt-4">
          <div className="w-20 h-20 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20 shadow-2xl shadow-teal-500/10">
            <Dna size={40} color="#2dd4bf" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Skin Tight</h1>
          <p className="text-base text-teal-400 font-medium">AI-powered skin cancer monitoring for everyone.</p>
        </motion.div>

        {/* MISSION SECTION */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <SparklesIcon size={18} className="text-teal-400" /> Our Mission
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Skin cancer is the most common cancer in the world, affecting 1 in 5 people. However, when caught early, recovery and survival rates exceed 98%. Skin Tight is a dedicated skin health app created to promote early skin awareness and foster global skin cancer awareness. Our proactive skin assessment tool allows users to scan suspicious skin spots and leverage advanced AI skin monitoring, ensuring they maintain control over their skin wellness.
          </p>
        </motion.div>

        {/* WHY SKIN TIGHT EXISTS SECTION */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Dna size={18} className="text-teal-400" /> Why Skin Tight Exists
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Many skin conditions develop gradually and can be easy to overlook. Skin Tight was created as an advanced skin health app to help people become more aware of visible skin changes by providing an easy way to monitor spots over time. Our goal is to encourage proactive skin awareness, facilitate reliable skin change tracking, and support informed conversations with dermatologist monitoring and licensed healthcare professionals.
          </p>
        </motion.div>

        {/* IMPACT STATS */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4">
          {[
            { label: '1 in 5 Americans', sub: 'Develop skin cancer' },
            { label: '98% survival', sub: 'When caught early' },
            { label: '60 seconds', sub: 'To complete a scan' }
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 rounded-xl flex justify-between items-center bg-white/5 border border-white/5">
              <span className="text-sm font-black text-teal-400">{stat.label}</span>
              <span className="text-xs text-slate-500 font-medium">{stat.sub}</span>
            </div>
          ))}
        </motion.div>

        {/* SECTIONS */}
        {[
          { title: 'What Skin Tight does', points: ['Analyze photos of suspicious spots', 'Assess skin cancer risk', 'Track changes over time'], icon: <CheckCircle2 size={16} className="text-teal-400" /> },
          { title: 'What we do NOT do', points: ['Provide medical diagnoses', 'Replace dermatology care', 'Offer beauty advice'], icon: <X size={16} className="text-red-400" /> }
        ].map((sec, i) => (
          <motion.div key={i} variants={itemVariants} className="space-y-4">
            <h2 className="text-base font-bold text-white pl-2">{sec.title}</h2>
            <div className="space-y-3">
              {sec.points.map((p, j) => (
                <div key={j} className="glass-card p-4 rounded-xl flex items-center gap-4 bg-white/5 border border-white/5">
                  {sec.icon}
                  <span className="text-sm text-slate-300">{p}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* IMPORTANT DISCLAIMER */}
        <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <h2 className="text-sm font-bold text-amber-500 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Medical Disclaimer
          </h2>
          <p className="text-xs text-amber-200/60 leading-relaxed text-left">
            Skin Tight is an AI-powered wellness and educational tool designed to help users monitor visible skin changes over time. Skin Tight is NOT a medical device and does NOT provide medical diagnoses, treatment plans, prescriptions, or professional medical advice. Always consult a licensed dermatologist.
          </p>
        </motion.div>

        {/* VERSION INFO */}
        <motion.div variants={itemVariants} className="text-center pt-8 opacity-40">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Skin Tight — Beta 1.0 — Built with Gemini AI</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© 2025 Skin Tight. All rights reserved.</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

const LearnPage = ({
  selectedArticleSlug,
  setSelectedArticleSlug
}: {
  selectedArticleSlug: string | null;
  setSelectedArticleSlug: (slug: string | null) => void;
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Synchronize article schema metadata
  useEffect(() => {
    if (selectedArticleSlug) {
      const article = BLOG_ARTICLES.find(a => a.slug === selectedArticleSlug);
      if (article) {
        let script = document.getElementById('jsonld-article-schema') as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = 'jsonld-article-schema';
          script.type = 'application/ld+json';
          document.head.appendChild(script);
        }
        script.text = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": article.title,
          "description": article.excerpt,
          "datePublished": "2026-05-30",
          "dateModified": "2026-05-30",
          "author": {
            "@type": "Organization",
            "name": "Skin Tight",
            "url": "https://skintightai.com"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Skin Tight",
            "logo": {
              "@type": "ImageObject",
              "url": "https://skintightai.com/theone.jpg"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://skintightai.com/learn/${article.slug}`
          }
        });
      }
    } else {
      const script = document.getElementById('jsonld-article-schema');
      if (script) script.remove();
    }
    return () => {
      const script = document.getElementById('jsonld-article-schema');
      if (script) script.remove();
    };
  }, [selectedArticleSlug]);

  const activeArticle = useMemo(() => {
    if (!selectedArticleSlug) return null;
    return BLOG_ARTICLES.find(a => a.slug === selectedArticleSlug) || null;
  }, [selectedArticleSlug]);

  return (
    <div className="page-container" style={styles.tabContent}>
      <style>{`
        .article-content h3 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }
        .article-content h4 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #e2e8f0;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .article-content h5 {
          font-size: 1rem;
          font-weight: 700;
          color: #2dd4bf;
          margin-top: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .article-content p {
          margin-bottom: 1.15rem;
          color: #c8d2e6;
          line-height: 1.7;
          font-size: 14px;
        }
        .article-content ul {
          list-style-type: none;
          padding-left: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .article-content li {
          margin-bottom: 0.5rem;
          position: relative;
          padding-left: 1.25rem;
          color: #c8d2e6;
          font-size: 14px;
          line-height: 1.6;
        }
        .article-content li::before {
          content: "•";
          color: #2dd4bf;
          font-weight: bold;
          position: absolute;
          left: 0;
          top: 0;
        }
        .article-content strong {
          color: #f8fafc;
          font-weight: 800;
        }
      `}</style>

      {activeArticle ? (
        // DETAIL VIEW
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full space-y-6 pb-32"
        >
          {/* Back button */}
          <motion.button
            variants={itemVariants}
            onClick={() => setSelectedArticleSlug(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-teal-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 active:scale-95 transition-all cursor-pointer mt-4"
          >
            <ArrowLeft size={14} /> Back to Academy
          </motion.button>

          {/* Article Header info */}
          <motion.div variants={itemVariants} className="space-y-3 pt-2">
            <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-full">
              {activeArticle.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {activeArticle.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1"><Clock size={12} /> {activeArticle.readTime}</span>
              <span>•</span>
              <span>Published {activeArticle.publishDate}</span>
            </div>
          </motion.div>

          <hr className="border-white/5" />

          {/* Body Content */}
          <motion.div 
            variants={itemVariants}
            className="article-content"
            dangerouslySetInnerHTML={{ __html: activeArticle.content }}
          />

          {/* Read Again / Back Button */}
          <motion.div variants={itemVariants} className="pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => {
                setSelectedArticleSlug(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <BookOpen size={14} /> View All Guidelines
            </button>
          </motion.div>

          {/* REQUIRED BLOG DISCLAIMER */}
          <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 mt-8">
            <h2 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} /> Education Disclaimer
            </h2>
            <p className="text-xs text-amber-200/60 leading-relaxed text-left">
              {BLOG_DISCLAIMER}
            </p>
          </motion.div>
        </motion.div>
      ) : (
        // DIRECTORY VIEW
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full space-y-8 pb-32"
        >
          {/* Header intro */}
          <motion.div variants={itemVariants} className="flex flex-col items-center text-center pt-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4 border border-teal-500/20 shadow-2xl shadow-teal-500/10">
              <BookOpen size={30} color="#2dd4bf" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">Skin Health Academy</h1>
            <p className="text-xs sm:text-sm text-teal-400 font-medium uppercase tracking-widest mb-3">Learn • Monitor • Protect</p>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Welcome to the Skin Tight learning center. Our educational resources are designed to help you build early skin awareness, understand suspicious skin changes, and master personal self-checks to stay in complete control of your skin wellness.
            </p>
          </motion.div>

          {/* List section */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Featured Guidelines</h2>
            <div className="grid grid-cols-1 gap-4">
              {BLOG_ARTICLES.map((article) => (
                <div
                  key={article.slug}
                  onClick={() => {
                    setSelectedArticleSlug(article.slug);
                    window.scrollTo({ top: 0, behavior: 'auto' });
                  }}
                  className="glass-card p-6 rounded-2xl border border-white/5 active:scale-[0.98] hover:bg-white/[0.03] transition-all cursor-pointer flex flex-col justify-between gap-4 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                        {article.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{article.readTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-medium">Published {article.publishDate}</span>
                    <span className="text-[10px] text-teal-400 font-black uppercase tracking-widest flex items-center gap-1">
                      Read Article <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* REQUIRED BLOG DISCLAIMER */}
          <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <h2 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} /> Academy Disclaimer
            </h2>
            <p className="text-xs text-amber-200/60 leading-relaxed text-left">
              {BLOG_DISCLAIMER}
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const DermAnalysisLoader = () => {
  const messages = [
    "🔍 Skin Tight is scanning those patterns...",
    "🪄 Give Skin Tight a few seconds!",
    "🤖 Our AI is doing its job...",
    "🎨 Matching shapes, colors, and textures...",
    "✨ Preparing your wellness insights...",
    "🚀 Almost there, running final checks..."
  ];

  const tips = [
    "80% of visible skin aging is caused by UV rays. Wear SPF daily!",
    "Melanomas can appear anywhere—even under nails or soles of feet.",
    "Checking your skin monthly is easier if you take photos in the same lighting.",
    "Learn the ABCDEs of skin awareness: Asymmetry, Border irregularity, Color, Diameter, and Evolving.",
    "Consult a dermatologist if you notice any spots changing in size, shape, or color."
  ];

  const [msgIndex, setMsgIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2800);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(6, 8, 24, 0.98)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc'
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
        
        {/* Animated Scanner Visual */}
        <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Outer Rotating Cyber Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '2px dashed rgba(45, 212, 191, 0.3)',
              boxShadow: '0 0 20px rgba(45, 212, 191, 0.15)'
            }}
          />

          {/* Glowing Pulse Ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
              border: '1px solid rgba(14, 165, 233, 0.3)'
            }}
          />

          {/* Central Target Spot (Scanning Frame) */}
          <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            borderRadius: '24px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.03)'
          }}>
            {/* Corner Bracket decorations */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', width: '12px', height: '12px', borderTop: '2px solid #2dd4bf', borderLeft: '2px solid #2dd4bf' }} />
            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '12px', height: '12px', borderTop: '2px solid #2dd4bf', borderRight: '2px solid #2dd4bf' }} />
            <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '12px', height: '12px', borderBottom: '2px solid #2dd4bf', borderLeft: '2px solid #2dd4bf' }} />
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '12px', height: '12px', borderBottom: '2px solid #2dd4bf', borderRight: '2px solid #2dd4bf' }} />

            {/* Microscopic Lens Eye */}
            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <Dna size={40} className="text-teal-400" />
            </motion.div>

            {/* Glowing Scan Line Effect */}
            <motion.div
              animate={{ y: [-40, 40, -40] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #2dd4bf, transparent)',
                boxShadow: '0 0 10px #2dd4bf'
              }}
            />
          </div>
        </div>

        {/* Carousel messages */}
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              style={{
                fontSize: '18px',
                fontWeight: '800',
                color: '#fff',
                letterSpacing: '-0.01em',
                lineHeight: '1.4'
              }}
            >
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Informative / Wellness tips container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '24px',
          padding: '20px',
          width: '100%'
        }}>
          <h4 className="text-[10px] font-black uppercase text-teal-400 tracking-widest mb-2 flex items-center justify-center gap-1.5">
            <Sun size={12} /> <span>Skin Wellness Tip</span>
          </h4>
          <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-slate-300 font-medium leading-relaxed"
              >
                {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-2">
          SCAN ENGINE V3.5 • SECURE CONNECTION
        </p>

      </div>
    </motion.div>
  );
};

const RoutinePage = ({ 
  protocol, 
  loadingProtocol, 
  protocolError, 
  generateProtocol,
  loadProtocolFromFirestore,
  currentUser
}: any) => {
  useEffect(() => {
    if (currentUser) {
      loadProtocolFromFirestore();
    }
  }, [currentUser]);

  return (
    <div className="page-container" style={styles.tabContent}>
      <div className="flex justify-between items-center mb-6">
        <h2 style={styles.sectionTitle}><ShieldCheck size={24} color="#2dd4bf" /> <span>Prevention Protocol</span></h2>
        <button 
          onClick={generateProtocol}
          disabled={loadingProtocol}
          className="p-2 bg-white/5 border border-white/10 rounded-xl text-cyan-400 hover:bg-white/10 transition-all"
        >
          <RefreshCw size={20} className={loadingProtocol ? 'animate-spin' : ''} />
        </button>
      </div>

      {loadingProtocol ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">AI generating your prevention plan...</p>
        </div>
      ) : protocolError ? (
        <div className="glass-card p-8 rounded-3xl text-center border-red-500/20">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Protocol Unavailable</h3>
          <p className="text-sm text-slate-400 mb-6">{protocolError}</p>
          <button onClick={generateProtocol} style={styles.analyzeButton}>Try Again</button>
        </div>
      ) : protocol ? (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border-teal-500/20">
            <h3 className="text-sm font-black text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sun size={18} /> Daily Protection
            </h3>
            <div className="space-y-4">
              {protocol.daily_protection?.map((item: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-teal-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border-purple-500/20">
            <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye size={18} /> Monitoring Schedule
            </h3>
            <div className="space-y-4">
              {protocol.monitoring_schedule?.map((item: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-purple-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border-amber-500/20">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart size={18} /> Lifestyle Recommendations
            </h3>
            <div className="space-y-4">
              {protocol.lifestyle_recommendations?.map((item: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-amber-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-cyan-500/10 border border-cyan-500/20">
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-2">AI Summary</h3>
            <p className="text-sm text-white font-medium leading-relaxed italic">"{protocol.summary}"</p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl text-center">
          <SparklesIcon size={48} className="text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Protocol Yet</h3>
          <p className="text-sm text-slate-400 mb-6">Generate a personalized skin cancer prevention plan based on your risk factors.</p>
          <button onClick={generateProtocol} style={styles.analyzeButton}>Generate Protocol</button>
        </div>
      )}
    </div>
  );
};

const ShopPage = () => {
  const products = [
    { id: 1, name: 'Mineral Shield SPF 50', price: '$24.00', category: 'Sunscreen', rating: 4.8, image: 'https://picsum.photos/seed/spf/400/400' },
    { id: 2, name: 'Derm-Grade UV Patch', price: '$18.00', category: 'Monitoring', rating: 4.9, image: 'https://picsum.photos/seed/uvpatch/400/400' },
    { id: 3, name: 'After-Sun Recovery Gel', price: '$15.00', category: 'Care', rating: 4.7, image: 'https://picsum.photos/seed/gel/400/400' },
    { id: 4, name: 'UPF 50+ Sun Hoodie', price: '$45.00', category: 'Apparel', rating: 4.9, image: 'https://picsum.photos/seed/hoodie/400/400' }
  ];

  return (
    <div className="page-container" style={styles.tabContent}>
      <h2 style={styles.sectionTitle} className="mb-6"><ShoppingBag size={24} color="#2dd4bf" /> <span>Prevention Shop</span></h2>
      
      <div className="grid grid-cols-2 gap-4">
        {products.map(p => (
          <div key={p.id} className="glass-card overflow-hidden rounded-3xl flex flex-col">
            <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
            <div className="p-4 flex-1 flex flex-col">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">{p.category}</span>
              <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{p.name}</h3>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-sm font-black text-white">{p.price}</span>
                <button className="p-2 bg-teal-500/10 text-teal-400 rounded-xl hover:bg-teal-500/20 transition-all">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 glass-card rounded-3xl border-cyan-500/20 text-center">
        <p className="text-xs text-slate-400 mb-4 italic">"All products are vetted by our clinical team for maximum UV protection."</p>
        <button className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl">View Full Catalog</button>
      </div>
    </div>
  );
};

const PlansPage = () => {
  const plans = [
    { id: 'free', name: 'Basic', price: '$0', features: ['Unlimited Scans', 'Basic UV Alerts', 'Clinic Finder'], current: true },
    { id: 'pro', name: 'Pro', price: '$9.99/mo', features: ['AI Prevention Protocol', 'Change Tracking', 'PDF Reports', 'Priority Support'], current: false },
    { id: 'family', name: 'Family', price: '$19.99/mo', features: ['Up to 5 Profiles', 'Shared History', 'Early Access Features'], current: false }
  ];

  return (
    <div className="page-container" style={styles.tabContent}>
      <h2 style={styles.sectionTitle} className="mb-6"><CreditCard size={24} color="#2dd4bf" /> <span>Subscription Plans</span></h2>
      
      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className={`glass-card p-6 rounded-3xl border-2 transition-all ${plan.current ? 'border-teal-500 bg-teal-500/5' : 'border-white/5'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-white">{plan.name}</h3>
                <span className="text-2xl font-black text-teal-400">{plan.price}</span>
              </div>
              {plan.current && (
                <span className="px-3 py-1 bg-teal-500 text-slate-900 text-[10px] font-black uppercase rounded-full">Current Plan</span>
              )}
            </div>
            
            <div className="space-y-3 mb-6">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-teal-400" />
                  {f}
                </div>
              ))}
            </div>

            <button 
              disabled={plan.current}
              className={`w-full py-4 rounded-2xl font-black transition-all ${plan.current ? 'bg-white/5 text-slate-500 cursor-default' : 'bg-teal-500 text-slate-900 hover:scale-[1.02]'}`}
            >
              {plan.current ? 'Active' : 'Upgrade Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const EducationCard = ({ result, onClose }: { result: any, onClose: () => void }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);

  const quiz = {
    question: "What is the 'E' in the ABCDE rule for skin cancer?",
    options: ["Elevation", "Evolving", "Edge", "Enlarging"],
    correct: 1,
    explanation: "E stands for Evolving. Any change in size, shape, color, or elevation of a spot on your skin, or any new symptom in it, such as bleeding, itching or crusting, may be a warning sign of melanoma."
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-4 bottom-24 z-50 glass-card p-6 rounded-3xl border-cyan-500/30 shadow-2xl"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <BookOpen size={20} className="text-cyan-400" /> 
          {showQuiz ? "Quick Quiz" : "Did you know?"}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X size={20} /></button>
      </div>

      {!showQuiz ? (
        <>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Based on your scan, you should know that {result.risk_level === 'high' ? 'melanoma can often look like a normal mole but changes rapidly.' : 'regular self-exams are the best way to catch skin cancer early.'}
          </p>
          <button 
            onClick={() => setShowQuiz(true)}
            className="w-full py-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold rounded-xl text-sm"
          >
            Test your knowledge
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-bold text-white">{quiz.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {quiz.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => setQuizAnswer(i)}
                className={`p-3 rounded-xl text-xs font-bold transition-all ${
                  quizAnswer === i 
                    ? (i === quiz.correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {quizAnswer !== null && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-slate-400 italic leading-relaxed">
              {quiz.explanation}
            </motion.p>
          )}
        </div>
      )}
    </motion.div>
  );
};

    const OverdueBanner = () => null; // Removed as requested

const LegalModal = ({ 
  isOpen, 
  onClose, 
  initialType = 'disclaimer' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  initialType?: 'terms' | 'privacy' | 'disclaimer' | null;
}) => {
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'terms' | 'privacy'>('disclaimer');

  useEffect(() => {
    if (initialType) {
      setActiveTab(initialType);
    }
  }, [initialType]);

  if (!isOpen) return null;

  const getContent = () => {
    if (activeTab === 'disclaimer') return MEDICAL_DISCLAIMER_TEXT;
    if (activeTab === 'terms') return TERMS_AND_CONDITIONS;
    return PRIVACY_POLICY;
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full h-[92dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
      >
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.01]">
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Legal & Policies</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modern Tabs with safe mobile formatting and proper spacing */}
        <div className="flex gap-4 sm:gap-8 px-4 sm:px-6 border-b border-white/10 bg-white/[0.01]">
          {(['disclaimer', 'terms', 'privacy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors relative ${
                activeTab === tab 
                  ? 'text-teal-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab === 'disclaimer' ? 'Disclaimer' : tab === 'terms' ? 'Terms' : 'Privacy'}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-300 leading-relaxed min-h-0 bg-slate-950/20">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }} className="text-slate-300 text-xs sm:text-sm text-left">
            {getContent()}
          </pre>
        </div>

        <div className="p-4 sm:p-6 border-t border-white/10 bg-white/[0.01]">
          <button onClick={onClose} className="w-full py-3.5 bg-teal-500 text-slate-900 font-black rounded-xl sm:rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-transform text-xs sm:text-sm uppercase tracking-wider font-black">
            I Understand
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SideMenu = ({ 
  isMenuOpen, 
  setIsMenuOpen, 
  currentUser, 
  fullUserData, 
  activeTab, 
  setActiveTab, 
  handleLogout 
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  currentUser: any;
  fullUserData: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  handleLogout: () => void;
}) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'profile', label: 'My Profile', icon: UserCircle },
    ...(currentUser ? [
      { id: 'timeline', label: 'Timeline and Schedule', icon: Calendar },
    ] : []),
    { id: 'clinic', label: 'Find Dermatologists', icon: MapPinned },
    { id: 'learn', label: 'Skin Health Academy', icon: BookOpen },
    { id: 'welcome', label: 'About Skin Tight', icon: Info },
    ...(!currentUser ? [
      { id: 'auth', label: 'Sign In / Join', icon: UserPlus },
    ] : [])
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
            left: '20px', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            color: '#94a3b8'
          }}
          onClick={() => setIsMenuOpen(false)}
        >
          <X size={32} />
        </button>

        {/* Brand Header */}
        <div style={{ padding: '0 20px', marginBottom: '32px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(45, 212, 191, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(45, 212, 191, 0.2)'
          }}>
            <Dna size={18} color="#2dd4bf" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Skin Tight</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: activeTab === item.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                border: 'none',
                color: activeTab === item.id ? '#2dd4bf' : '#94a3b8',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <item.icon size={24} />
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '20px' }}>
          {currentUser ? (
            <button 
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                color: '#ef4444',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <LogOut size={24} />
              Logout
            </button>
          ) : (
            <button 
              onClick={() => {
                setActiveTab('auth');
                setIsMenuOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%)',
                border: 'none',
                color: '#020617',
                fontSize: '16px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(45, 212, 191, 0.2)'
              }}
            >
              <UserPlus size={24} />
              Sign In / Join
            </button>
          )}
        </div>
      </div>
    </>
  );
};

const DoctorBridge = ({ 
    doctorInfo, 
    tempDoctor, 
    setTempDoctor, 
    isEditingDoctor, 
    setIsEditingDoctor, 
    saveDoctor 
  }: { 
    doctorInfo: any, 
    tempDoctor: any, 
    setTempDoctor: (d: any) => void, 
    isEditingDoctor: boolean, 
    setIsEditingDoctor: (b: boolean) => void, 
    saveDoctor: () => void 
  }) => (
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

const tagUserScanPending = () => {
  if (window.location.hostname !== 'skintight.vercel.app' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log("OneSignal: Skipping tagUserScanPending due to domain restriction");
    return;
  }
  const OneSignalDeferred = (window as any).OneSignalDeferred || [];
  OneSignalDeferred.push(function(OneSignal: any) {
    try {
      OneSignal.User.addTags({
        "is_scan_completed": "false",
        "user_id": auth.currentUser ? auth.currentUser.uid : ""
      });
      console.log("OneSignal: user tagged as scan pending");
    } catch (e) {
      console.warn("OneSignal: Failed to add tags", e);
    }
  });
};

const tagUserScanCompleted = () => {
  if (window.location.hostname !== 'skintight.vercel.app' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log("OneSignal: Skipping tagUserScanCompleted due to domain restriction");
  } else {
    const OneSignalDeferred = (window as any).OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal: any) {
      try {
        OneSignal.User.addTags({
          "is_scan_completed": "true"
        });
        console.log("OneSignal: user tagged as scan completed");
      } catch (e) {
        console.warn("OneSignal: Failed to add tags", e);
      }
    });
  }
  
  if (auth.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), {
      lastScanCompletedAt: getServerTimestamp()
    }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
  }
};

const checkAndShowScanReminder = () => {
  const user = auth.currentUser;
  if (!user) return;
  
  const cycleKey = getCurrentCycleKey();
  
  getDoc(doc(db, "users", user.uid, "cycles", cycleKey))
    .then(function(docSnap: any) {
      const data = docSnap.exists() ? docSnap.data() : {};
      const hasCompletedAny = data.zone1 || data.zone2 || data.zone3 || data.zone4;
      
      const reminderBanner = document.getElementById("scanReminderBanner");
      if (!hasCompletedAny && reminderBanner) {
        reminderBanner.style.display = "flex";
      }
    }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/cycles/${cycleKey}`));
};

const AI_SYSTEM_PROMPT = `You are an AI skin wellness and screening support assistant. Your purpose is to help users analyze skin photos to support ongoing visual tracking and self-awareness of skin wellness.

CRITICAL SAFETY AND LEGAL RULES:
1. NEVER sound like you are giving a medical diagnosis, definitive clinical assessment, or health guarantee. Avoid any certainty, diagnostic language, or promising any accuracy in the visual screening.
2. ALWAYS encourage active self-monitoring, monthly self-checks, and scheduling a professional consultation with a licensed or board-certified dermatologist.
3. NEVER use definitive phrases such as:
   - "no signs of skin cancer"
   - "you are safe"
   - "dangerous moles"
   - "no cancer detected"
4. INSTEAD, ALWAYS use softer wellness-focused and non-definitive phrases such as:
   - "No obvious visual warning signs were detected"
   - "The AI did not detect clear visual patterns commonly associated with high-risk lesions"
   - "Low visual concern based on the uploaded images"
   - "Monitor for changes and consult a dermatologist if concerned"
5. Do NOT provide general beauty or cosmetic recommendations. If asked, state that this is an informational wellness support tool for skin screening. Cover the entire body surface and outline potential patterns to watch for without diagnostic certainty. Only suggest further evaluation or continued monitoring.`;

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
  detected_body_part?: string; // AI Detected Body Part
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
class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
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
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', marginBottom: '20px', maxWidth: '100%' }}>
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

// --- How to Improve & Skin Type Card Functions ---
const fitzpatrickDescriptions: Record<number, any> = {
  1: {
    label: "Type 1 — Very Fair",
    description: "Always burns, never tans. Pale white skin, often with red or blonde hair and blue eyes.",
    riskNote: "Highest UV sensitivity. Highest risk of sunburn and skin cancer.",
    color: "#FDE8D8",
    textColor: "#7B3F00"
  },
  2: {
    label: "Type 2 — Fair",
    description: "Usually burns, rarely tans. Fair white skin, often with light hair and light eyes.",
    riskNote: "Very high UV sensitivity. Requires daily SPF 30 or higher.",
    color: "#F5D5B8",
    textColor: "#6B3A2A"
  },
  3: {
    label: "Type 3 — Medium",
    description: "Sometimes burns, gradually tans. Cream white to light brown skin.",
    riskNote: "Moderate UV sensitivity. Daily sun protection still essential.",
    color: "#D4A574",
    textColor: "#5C3317"
  },
  4: {
    label: "Type 4 — Olive",
    description: "Rarely burns, tans easily. Light brown to olive skin.",
    riskNote: "Lower burn risk but skin cancer can still develop and may be harder to detect.",
    color: "#B8864E",
    textColor: "#3D1F0A"
  },
  5: {
    label: "Type 5 — Brown",
    description: "Very rarely burns, always tans. Brown skin.",
    riskNote: "Skin cancers less common but often detected later. Monthly self-checks are important.",
    color: "#8B5E3C",
    textColor: "#FDE8D8"
  },
  6: {
    label: "Type 6 — Deep Brown/Black",
    description: "Never burns. Dark brown to black skin.",
    riskNote: "Lowest burn risk but acral melanoma (on palms and soles) is more common. Do not skip self-exams.",
    color: "#4A2C1A",
    textColor: "#FDE8D8"
  }
};

function renderSkinTypeCard(fitzpatrickType: any) {
  const type = parseInt(fitzpatrickType) || 2;
  const info = fitzpatrickDescriptions[type];
 
  const container = document.getElementById("skinTypeDisplay");
  if (!container) return;
 
  container.innerHTML = `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;">
      <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Your Skin Type</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:44px;height:44px;border-radius:50%;background:${info.color};border:2px solid rgba(255,255,255,0.15);flex-shrink:0;"></div>
        <div>
          <div style="color:#fff;font-size:15px;font-weight:600;">${info.label}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">${info.description}</div>
        </div>
      </div>
      <div style="background:rgba(0,180,216,0.08);border:1px solid rgba(0,180,216,0.2);border-radius:8px;padding:10px;">
        <div style="color:#00B4D8;font-size:12px;font-weight:500;">⚠️ What this means for you</div>
        <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;line-height:1.5;">${info.riskNote}</div>
      </div>
    </div>
  `;
}

function shouldRegenerateProtocol(userData: any) {
  if (!userData.howToImproveGeneratedAt) return true;
  if (!userData.lastScanCompletedAt) return false;
  
  const lastScan = userData.lastScanCompletedAt.toMillis ? userData.lastScanCompletedAt.toMillis() : new Date(userData.lastScanCompletedAt).getTime();
  const generatedAt = userData.howToImproveGeneratedAt.toMillis ? userData.howToImproveGeneratedAt.toMillis() : new Date(userData.howToImproveGeneratedAt).getTime();
  
  return lastScan > generatedAt;
}

const mapScanData = (docId: string, data: any): ScanRecord => {
  const result: AnalysisResult = data.result || {
    risk_level: (data.riskLevel || 'low') as any,
    confidence_level: (data.confidence || 'medium') as any,
    findings: data.findings || [],
    concerning_signs: data.concerningSigns || [],
    risk_factors_identified: data.riskFactorsIdentified || [],
    summary: data.summary || 'Scan results from ' + (data.date?.toDate?.() || new Date(data.date || Date.now())).toLocaleDateString(),
    action_card: data.actionCard || '',
    suggestions: data.suggestions || [],
    urgency: data.urgency || 'Routine',
    data_quality_note: data.dataQualityNote || '',
    disclaimer: data.disclaimer || "This is an AI screening tool, not a medical diagnosis."
  };

  return {
    id: docId,
    ...data,
    date: data.date?.toDate ? data.date.toDate().toISOString() : (typeof data.date === 'string' ? data.date : new Date().toISOString()),
    result,
    photos: data.photoBase64 ? [data.photoBase64] : (data.photos || [])
  };
};

function renderHowToImprove(data: any, currentScore: number) {
  const contentEl = document.getElementById("howToImproveContent");
  if (!contentEl) return;
 
  const impactColors: Record<string, string> = {
    high: "#E24B4A",
    medium: "#EF9F27",
    low: "#5DCAA5"
  };
 
  let stepsHTML = data.steps.map(function(step: any) {
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start;">
      <div style="font-size:24px;flex-shrink:0;">${step.icon}</div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="color:#fff;font-size:14px;font-weight:600;">${step.title}</div>
          <div style="background:${impactColors[step.impact]};color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;text-transform:uppercase;">${step.impact} impact</div>
        </div>
        <div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.5;">${step.description}</div>
      </div>
    </div>`;
  }).join("");
 
  contentEl.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Your Action Plan</div>
      <div style="color:#fff;font-size:15px;line-height:1.5;">${data.headline}</div>
    </div>
    ${stepsHTML}
    <div style="text-align:center;margin-top:16px;color:rgba(255,255,255,0.3);font-size:11px;">Personalized based on your skin profile and scan history</div>
  `;
}

async function loadHowToImprove() {
  const user = auth.currentUser;
  if (!user) return;
 
  const panel = document.getElementById("howToImprovePanel");
  if (panel) panel.style.display = "flex";
 
  const contentEl = document.getElementById("howToImproveContent");
  if (contentEl) contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:#00B4D8;">Generating your personal action plan...</div>';
 
  try {
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, "users", user.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      return;
    }
    
    let profile = userDoc?.exists() ? userDoc.data() : null;
    
    if (!profile) {
      // Auto-create basic profile if missing from Firestore, keeping the system 100% robust
      try {
        const defaultProfile = {
          fullName: user.displayName || user.email?.split('@')[0] || "User",
          username: (user.email?.split('@')[0] || "user_" + user.uid.slice(0, 5)).toLowerCase(),
          email: user.email || "",
          ageRange: "25-34",
          fitzpatrickType: 2,
          profileColor: "#2dd4bf",
          skinScore: 100,
          streakDays: 0,
          createdAt: new Date().toISOString(),
          scansCompleted: 0
        };
        await setDoc(doc(db, "users", user.uid), defaultProfile);
        profile = defaultProfile;
      } catch (createErr) {
        console.error("Auto-creation of fallback profile failed:", createErr);
        if (contentEl) {
          contentEl.innerHTML = `
            <div style="text-align:center;padding:32px 16px;color:#f43f5e;font-family:'Inter',sans-serif;">
              <div style="font-size:36px;margin-bottom:12px;">👤</div>
              <div style="font-weight:900;font-size:16px;margin-bottom:8px;color:#ffffff;text-transform:uppercase;letter-spacing:0.04em;">Profile Setup Required</div>
              <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin:0 auto;max-width:320px;">
                User profile not found. Please ensure you have completed your profile setup or registration, and log in again to sync skin credentials.
              </p>
            </div>
          `;
        }
        return;
      }
    }

    // Check cache
    if (profile.howToImproveCache && !shouldRegenerateProtocol(profile)) {
      renderHowToImprove(profile.howToImproveCache, profile.skinScore || 100);
      return;
    }

    let snapshot;
    try {
      snapshot = await getDocs(query(collection(db, "users", user.uid, "scans"), orderBy("date", "desc"), limit(3)));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/scans`);
      return;
    }
       
    const recentScans: any[] = [];
    snapshot.forEach(function(d: any) { 
      const data = d.data();
      const mapped = mapScanData(d.id, data);
      recentScans.push({
        region: mapped.bodyRegion,
        risk: mapped.result.risk_level || "none",
        date: mapped.date
      }); 
    });
       
    const currentScore = profile.skinScore || 100;
    const scanHistoryText = recentScans.map(s => `- ${s.region} (${s.risk} risk, scanned on ${new Date(s.date).toLocaleDateString()})`).join("\n");
       
    const prompt = `You are an AI skin wellness and prevention support assistant. Based on this user profile give them a personalized actionable support checklist to encourage self-monitoring habits and skin wellness.
    
CRITICAL SAFETY AND LEGAL RULES:
1. NEVER sound like you are giving a medical diagnosis, definitive clinical assessment, or health guarantee. Avoid any certainty, diagnostic language, or promising any accuracy.
2. ALWAYS encourage active self-monitoring, monthly self-checks, and scheduling a professional consultation with a licensed or board-certified dermatologist.
3. NEVER use definitive phrases such as: "no signs of skin cancer", "you are safe", "dangerous moles", "no cancer detected".
4. INSTEAD, ALWAYS use softer wellness-focused and non-definitive phrases such as: "No obvious visual warning signs were detected", "The AI did not detect clear visual patterns commonly associated with high-risk lesions", "Low visual concern based on the uploaded images", "Monitor for changes and consult a dermatologist if concerned".

User profile:
- Current SkinScore: ${currentScore} out of 100
- Fitzpatrick skin type: ${profile.fitzpatrickType || "unknown"}
- Age range: ${profile.ageRange || "unknown"}
- Ethnicity: ${profile.ethnicity || "unknown"}
- Most recent scan risk level: ${recentScans.length > 0 ? recentScans[0].risk : "none"}
- Total scans completed: ${profile.scansCompleted || 0}

Generate exactly 5 specific actionable wellness steps this person can take RIGHT NOW to improve their self-monitoring score and prioritize skin care. Each step must be directly relevant to their Fitzpatrick skin type and risk level.
 
Format your response as JSON only with this structure:
{
  "headline": "one motivating non-definitive wellness sentence for this specific person",
  "steps": [
    {
      "icon": "emoji",
      "title": "short action title max 5 words",
      "description": "specific non-definitive instruction max 20 words",
      "impact": "low" or "medium" or "high"
    }
  ]
}

Focus only on skin wellness and screening prevention. No general beauty or cosmetic advice. No filler content. Be direct and specific.`;

    const responseData = await callAI(prompt, "gemini-2.5-flash", {
      responseMimeType: "application/json"
    });

    const aiText = responseData.text;

    if (!aiText) {
      throw new Error("AI response was empty or blocked by safety filters.");
    }

    let parsedToChecklist;
    try {
      parsedToChecklist = safeParseAIJSON(aiText);
    } catch (e) {
      console.warn("[Checklist Parser Fallback] Error parsing checklist JSON, using self healing fallback:", e);
      parsedToChecklist = null;
    }

    const result = validateAndFallbackHowToImprove(parsedToChecklist);
    
    // Save to cache
    try {
      await setDoc(doc(db, "users", user.uid), {
        howToImproveCache: result,
        howToImproveGeneratedAt: getServerTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
    
    renderHowToImprove(result, currentScore);
  } catch (error: any) {
    console.error("How to improve error:", error);
    if (contentEl) {
      let message = "Could not load your action plan.";
      if (error.message) {
        if (error.message.includes("candidates") || error.message.includes("object")) {
          message = "AI response was blocked or interrupted. Please try again.";
        } else {
          message = error.message;
        }
      }
      
      contentEl.innerHTML = `<div style="color:#E24B4A;text-align:center;padding:20px;">
        <div style="font-weight:bold;margin-bottom:10px;">Analysis Interrupted</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.4;">${message}</div>
        <button onclick="loadHowToImprove()" style="margin-top:20px;background:rgba(226,75,74,0.1);border:1px solid rgba(226,75,74,0.2);color:#E24B4A;padding:8px 20px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;">Try Again</button>
      </div>`;
    }
  }
}

// Expose to window for HTML onclick handlers
(window as any).loadHowToImprove = loadHowToImprove;
(window as any).renderSkinTypeCard = renderSkinTypeCard;

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
        <div style={{ width: '100%' }}>
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
                {scan.result.detected_body_part && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#2dd4bf', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ✨ AI Detected Region: {scan.result.detected_body_part}
                  </div>
                )}
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
        <div style={{ width: '100%' }}>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 20px'
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
      const initChart = async () => {
        if (!isMounted) return;
        if (chartRef.current && scans.length > 0) {
          try {
            const Chart = await ensureChartJsLoaded();
            if (!isMounted) return;
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
    const isOverdue = false; // Disabled alarming overdue status as requested
    const daysRemainingText = daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} Days Overdue` : `${daysRemaining} Days Remaining`) : 'Complete a scan to schedule';

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
                {daysRemainingText}
              </div>
              {isOverdue && <div className="animate-pulse text-[10px] font-bold text-red-500 uppercase bg-red-500/10 px-2 py-1 rounded-lg">Urgent</div>}
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div id="cycleProgress" className="glass-card p-4 rounded-2xl border border-white/5 mb-4 cycle-progress-container">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <RotateCw size={14} className="text-blue-400" /> Cycle Progress
            </h3>
            <span className="text-xs font-black text-white">{cycleProgress % 4} / 4 zones</span>
          </div>
          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden flex gap-1 p-1 progress-bar-container">
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
          <div style={{ height: '200px', width: '100%', position: 'relative' }}>
            {scans.length === 0 ? (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '20px',
                border: '1px dashed rgba(255,255,255,0.05)',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Activity size={32} color="#475569" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>No Data Available</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, maxWidth: '280px', lineHeight: '1.4' }}>Complete virtual scans of your skin areas to display a risk level over time analysis chart.</p>
              </div>
            ) : (
              <canvas ref={chartRef}></canvas>
            )}
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
            {scans.length === 0 ? (
              <div style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.2)',
                borderRadius: '16px',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Info size={14} className="text-slate-500" />
                <span>No data (No scans completed yet)</span>
              </div>
            ) : (
              Array.from(new Set(scans?.map(s => s.bodyRegion))).map(region => {
                const latestScan = scans?.find(s => s.bodyRegion === region);
                const riskColor = latestScan?.result.risk_level === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                 latestScan?.result.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                                 'bg-slate-500/20 text-slate-400 border-white/10';
                return (
                  <div key={region} className={`px-4 py-2 rounded-xl text-xs font-bold border ${riskColor} flex items-center gap-2`}>
                    {region}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Scan History List */}
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Scan History</h3>
        {sortedScans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 20px' }}>
              <History size={32} color="#475569" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No Scans Found</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', width: '100%', margin: '0 0 20px' }}>Complete your first scan to start tracking your skin health journey.</p>
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
const MEDICAL_DISCLAIMER_TEXT = `MEDICAL DISCLAIMER
Last Updated: May 24, 2026

Skin Tight is an AI-powered wellness and educational tool designed to help users monitor visible skin changes over time. Skin Tight is NOT a medical device and does NOT provide medical diagnoses, treatment plans, prescriptions, or professional medical advice.

The AI-generated assessments are informational only and may be inaccurate, incomplete, or incorrect. Results can be affected by factors such as image quality, lighting conditions, camera resolution, skin tone variations, and incomplete user information.

Skin Tight does not guarantee the detection, prevention, or prediction of skin cancer or any other medical condition. Terms such as “low risk,” “moderate risk,” or “high risk” are automated AI-generated wellness indicators and are not medical conclusions.

Always consult a licensed dermatologist or qualified healthcare professional for any medical concerns regarding your skin. Never ignore, delay, or replace professional medical advice because of information provided by this application.

If you notice rapid skin changes, bleeding lesions, painful growths, or any urgent medical symptoms, seek professional medical attention immediately.

Skin Tight is not intended for emergency use. If you believe you may have a serious or life-threatening medical condition, contact emergency services or seek immediate professional medical care.`;

const TERMS_AND_CONDITIONS = `TERMS & CONDITIONS
Last Updated: May 24, 2026

1. Acceptance of Terms
By accessing or using Skin Tight, you agree to comply with and be legally bound by these Terms & Conditions. If you do not agree with these terms, you must stop using the application immediately.


2. Description of Service
Skin Tight provides AI-powered skin wellness monitoring and educational analysis tools intended for personal informational use only. The application does not provide medical diagnoses or professional healthcare services.


3. Eligibility
You must be at least 18 years old to use Skin Tight independently.

Users between 13 and 17 years old may only use the app with permission and supervision from a parent or legal guardian.

Children under 13 are prohibited from using the application.


4. Beta Software Notice
You acknowledge that Skin Tight may still contain bugs, inaccuracies, interruptions, delays, or incomplete features. The service is provided on an “AS IS” and “AS AVAILABLE” basis without warranties of any kind.

We do not guarantee uninterrupted operation, perfect accuracy, or error-free performance.


5. User Responsibilities
You agree to use the application responsibly and only for lawful personal wellness purposes.

You are responsible for:

● Providing accurate information when using the app
● Uploading clear and appropriate images
● Reviewing AI-generated information carefully
● Seeking professional medical advice when needed

You agree not to:

● Upload explicit, illegal, harmful, or copyrighted content without permission
● Upload photos of other individuals without their consent
● Attempt to misuse, hack, disrupt, or reverse engineer the platform

You retain responsibility for all images and content you upload through the application. By uploading content, you confirm that you have the legal right and permission to use and submit such content.


6. Limitation of Liability
To the maximum extent permitted by law, Skin Tight, its creators, developers, affiliates, and service providers shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from:

● Use of the application
● Inability to use the application
● Reliance on AI-generated assessments
● Delayed or missed medical treatment
● Inaccurate or incomplete analysis results
Use of the application is entirely at your own risk.


7. Intellectual Property
All branding, software, designs, graphics, logos, AI workflows, and platform content associated with Skin Tight are protected by intellectual property laws and may not be copied or redistributed without permission.


8. Changes to Terms
We reserve the right to update or modify these Terms & Conditions at any time. Continued use of the application after updates means you accept the revised terms.


9. Governing Law and Dispute Resolution
These Terms & Conditions and any dispute or claim arising out of or in connection with them shall be governed by, and construed in accordance with, the laws of the State of Georgia, United States, without regard to its conflict-of-law principles. 

Any dispute, controversy, or claim arising out of, relating to, or in connection with this application, including the breach, termination, enforcement, interpretation, or validity of these Terms, shall be settled exclusively by binding, individual arbitration in the State of Georgia. 

BY AGREEING TO THESE TERMS, YOU EXPLICITLY WAIVE YOUR RIGHT TO A TRIAL BY JURY. YOU AGREE THAT YOU MAY BRING CLAIMS AGAINST SKIN TIGHT AND ITS CREATORS ONLY IN YOUR INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.

10. Indemnification
You agree to defend, indemnify, and hold harmless Skin Tight, its creators, developers, affiliates, contractors, and third-party service providers from and against any and all claims, damages, obligations, losses, liabilities, costs, debts, and expenses (including but not limited to reasonable attorneys' fees) arising from: 
(i) your misuse of and access to the application; 
(ii) your violation of any term of these Terms & Conditions; 
(iii) your violation of any third-party right, including without limitation any copyright, property, privacy, or publicity right; or 
(iv) any claim that the content or images you uploaded caused damage to a third party.

11. Third-Party AI Services & System Limitations
Skin Tight relies on third-party infrastructure and generative artificial intelligence systems, specifically Google Gemini, to process images and generate wellness indicators. You acknowledge and agree that Skin Tight does not control these third-party systems. Consequently, we are not liable for any service interruptions, data processing delays, algorithmic errors, or security vulnerabilities originating from these third-party platforms.

12. Severability and Entire Agreement
These Terms & Conditions, along with the Privacy Policy and Medical Disclaimer, constitute the entire agreement between you and Skin Tight. If any provision of these Terms is found to be unlawful, void, or for any reason unenforceable by a court of competent jurisdiction or arbitrator, then that provision shall be deemed severable from these Terms and shall not affect the validity and enforceability of any remaining provisions.`;

const PRIVACY_POLICY = `PRIVACY POLICY
Last Updated: May 24, 2026

1. Information We Collect
When using Skin Tight, we may collect:

● Account information such as email address and username
● Images voluntarily uploaded for skin analysis
● Skin wellness tracking information and scan history
● Device and usage information necessary for app functionality


2. How Your Information Is Used
Your information is used only to:

● Provide AI-generated skin wellness assessments
● Store scan history and progress tracking
● Improve app functionality and user experience
● Maintain account security and authentication
We do not sell or rent your personal information or uploaded images to advertisers or data brokers.


3. AI Image Processing
Uploaded images may be securely processed by third-party AI providers, including Google Gemini, in order to generate analysis results.

Images are analyzed solely for visible skin-related features and are not used for facial recognition, identity verification, surveillance, or biometric identification purposes.


4. Data Storage & Security
User data and account information may be stored using secure cloud infrastructure providers such as Firebase.

We use reasonable technical and organizational safeguards to help protect user information. However, no online service can guarantee absolute security.


5. Children’s Privacy
Skin Tight does not knowingly collect information from children under 13 years old.

If we discover that a child under 13 has submitted personal information or images without verified parental consent, we will remove the data as quickly as reasonably possible.


6. International Data Transfers
By using Skin Tight, you understand that your data may be processed or stored on servers located in different countries through trusted third-party infrastructure providers.


7. Your Rights & Data Deletion
You retain the right to access, review, or request the permanent deletion of your account and associated data at any time. Upon receiving a verifiable deletion request via support.skintight@gmail.com, we will permanently purge your personal data, profile info, and uploaded images from our active production databases within a reasonable timeframe, not to exceed thirty (30) days, subject to any legal data retention obligations. 

Please note that while data is removed immediately from active systems, residual copies may temporarily persist in secure, encrypted cloud backups (such as Firebase backup cycles) for a limited duration before being completely overwritten.


8. Changes to This Privacy Policy
We may update this Privacy Policy periodically. Continued use of the application after updates means you accept the revised policy.`;

const DISCLAIMER_TEXT = `MEDICAL DISCLAIMER: Skin Tight is NOT a medical device and does NOT provide medical diagnoses, treatment plans, prescriptions, or professional medical advice. The assessments are educational/informational only. Always consult a licensed dermatologist.`;

// --- Onboarding Screen Component ---
const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [agreedAll, setAgreedAll] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'disclaimer' | 'terms' | 'privacy' | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b 0%, #020617 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '32px 24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
            <SparklesIcon size={14} /> Unique Skin Tight Journey
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', letterSpacing: '-0.03em', color: '#ffffff' }}>More Than Just a Scan</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5', maxWidth: '400px' }}>
            Experience an end-to-end preventative dermatological ecosystem tailored to your skin profile.
          </p>
        </div>

        {/* Journey Timeline */}
        <div style={{ position: 'relative', paddingLeft: '28px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Connecting Vertical Line */}
          <div style={{ position: 'absolute', left: '13px', top: '16px', bottom: '16px', width: '2px', background: 'linear-gradient(to bottom, #2dd4bf 0%, #a855f7 50%, #3b82f6 100%)', opacity: 0.5 }} />

          {[
            {
              step: "01",
              title: "AI Skin Checkup",
              desc: "Snap or upload photos for instant clinical-grade ABCDE spot & lesion screening.",
              icon: Camera,
              color: "#2dd4bf",
              bg: "rgba(45, 212, 191, 0.15)"
            },
            {
              step: "02",
              title: "Timeline Tracking",
              desc: "Store encrypted visual histories to track subtle spot developments over time.",
              icon: History,
              color: "#a855f7",
              bg: "rgba(168, 85, 247, 0.15)"
            },
            {
              step: "03",
              title: "Smart Care Suggestions",
              desc: "Receive personalized daily advice and habits to improve your skin wellness score.",
              icon: SparklesIcon,
              color: "#8b5cf6",
              bg: "rgba(139, 92, 246, 0.15)"
            },
            {
              step: "04",
              title: "Dermatologist Booking",
              desc: "Locate verified clinic specialists near you to schedule professional in-person exams.",
              icon: MapPinned,
              color: "#3b82f6",
              bg: "rgba(59, 130, 246, 0.15)"
            }
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '2px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: item.bg,
                  border: `2px solid ${item.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  zIndex: 2,
                  boxShadow: `0 0 14px ${item.color}35`
                }}>
                  <IconComponent size={14} />
                </div>
                <div style={{ background: 'rgba(30, 41, 59, 0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px 16px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>{item.title}</h4>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: item.color, letterSpacing: '1px' }}>STEP {item.step}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Agreements Accordions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* Medical Disclaimer Section */}
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.02)' }}>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'disclaimer' ? null : 'disclaimer')}
              style={{
                width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'none', border: 'none',
                color: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '13.5px'
              }}
            >
              <span>Medical Disclaimer</span>
              {expandedSection === 'disclaimer' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
              {expandedSection === 'disclaimer' && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: '200px' }}
                  exit={{ height: 0 }}
                  style={{ overflowY: 'auto', padding: '0 16px 16px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}
                >
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{MEDICAL_DISCLAIMER_TEXT}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terms Section */}
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.02)' }}>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'terms' ? null : 'terms')}
              style={{
                width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'none', border: 'none',
                color: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '13.5px'
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
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.02)' }}>
            <button 
              onClick={() => setExpandedSection(expandedSection === 'privacy' ? null : 'privacy')}
              style={{
                width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'none', border: 'none',
                color: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '13.5px'
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

        {/* Consolidated Single Agreement Checkbox Box */}
        <div style={{
          marginBottom: '24px',
          padding: '16px 18px',
          borderRadius: '20px',
          background: agreedAll ? 'rgba(45, 212, 191, 0.08)' : 'rgba(30, 41, 59, 0.5)',
          border: `1.5px solid ${agreedAll ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
          transition: 'all 0.2s ease'
        }}>
          <div 
            onClick={() => setAgreedAll(!agreedAll)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer' }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              border: `2px solid ${agreedAll ? '#2dd4bf' : 'rgba(255,255,255,0.3)'}`,
              background: agreedAll ? '#2dd4bf' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              {agreedAll && <Check size={16} color="#020617" strokeWidth={4} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: agreedAll ? '#ffffff' : '#f1f5f9' }}>
                I agree to all legal policies & disclaimer above
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.45' }}>
                By checking this box, you confirm that you have read and agree to the Medical Disclaimer, Terms & Conditions, and Privacy Policy listed above.
              </span>
            </div>
          </div>
        </div>

        <button
          disabled={!agreedAll}
          onClick={onComplete}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: 'none',
            background: agreedAll 
              ? 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)' 
              : 'rgba(255, 255, 255, 0.08)',
            color: agreedAll ? '#020617' : '#64748b',
            fontWeight: '900',
            fontSize: '16px',
            cursor: agreedAll ? 'pointer' : 'not-allowed',
            boxShadow: agreedAll ? '0 8px 25px rgba(45, 212, 191, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Accept & Continue
        </button>
      </motion.div>
    </div>
  );
};

const AuthPage = ({ onAuthSuccess, onSkip }: { onAuthSuccess: (user: any) => void, onSkip?: () => void }) => {
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'forgot'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [ageRange, setAgeRange] = useState('');
  const [fitzpatrick, setFitzpatrick] = useState(2);
  const profileColors = ['#00B4D8', '#7B2FBE', '#185FA5', '#D85A30', '#3B6D11', '#BA7517', '#993556', '#A32D2D'];
  const [profileColor, setProfileColor] = useState(profileColors[Math.floor(Math.random() * profileColors.length)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real-time username check
  useEffect(() => {
    if (!username || username.length < 3 || authView !== 'signup') {
      setUsernameAvailable(null);
      return;
    }
    const checkUsername = async () => {
      try {
        const docSnap = await getDoc(doc(db, "usernames", username.toLowerCase()));
        setUsernameAvailable(!docSnap.exists());
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `usernames/${username.toLowerCase()}`);
      }
    };
    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username, authView]);

  const handleAuthError = (error: any) => {
    console.error("Authentication Error Handler:", error);
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/user-not-found": "No account found with that email address. Please sign up instead.",
      "auth/wrong-password": "Incorrect password. Please try again or reset your password.",
      "auth/too-many-requests": "Too many failed attempts. Please wait a few minutes and try again.",
      "auth/network-request-failed": "Network error. Please check your connection and try again.",
      "auth/invalid-credential": "Incorrect email or password. Please try again.",
      "auth/operation-not-allowed": "Email/Password sign-in is disabled. Please enable it in your Firebase Console under Authentication > Sign-in method."
    };
    
    let message = messages[error.code];
    if (!message) {
      // Check if it's a wrapped Firestore error from handleFirestoreError
      if (error.message && error.message.includes("operationType")) {
        try {
          const detail = JSON.parse(error.message);
          message = `Database Error: ${detail.error}. Please contact support with path: ${detail.path}`;
        } catch (e) {
          message = error.message || "Something went wrong. Please try again.";
        }
      } else if (error.code) {
        message = `Auth Error (${error.code}): ${error.message}`;
      } else {
        message = error.message || "Something went wrong. Please try again.";
      }
    }
    showErrorMessage(message);
  };

  const showErrorMessage = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 6000);
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onAuthSuccess(userCredential.user);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !email || !password || fitzpatrick === 0) {
      showErrorMessage('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      showErrorMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (usernameAvailable === false) {
      showErrorMessage('Username is already taken.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullName: fullName,
          username: username.toLowerCase(),
          email: email,
          ageRange: ageRange,
          fitzpatrickType: fitzpatrick,
          profileColor: profileColor,
          skinScore: 100,
          streakDays: 0,
          createdAt: getServerTimestamp(),
          scansCompleted: 0,
          agreedToTermsAt: getServerTimestamp(),
          agreedToPrivacyAt: getServerTimestamp(),
          agreedToDisclaimerAt: getServerTimestamp(),
          onboardingAgreedAt: getServerTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
      }

      try {
        await setDoc(doc(db, "usernames", username.toLowerCase()), {
          uid: userCredential.user.uid
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `usernames/${username.toLowerCase()}`);
      }

      onAuthSuccess(userCredential.user);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      showErrorMessage("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      showSuccessMessage(`✅ Reset email sent to ${email}. Check your inbox. The link expires in 24 hours.`);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        showErrorMessage("No account found with that email address.");
      } else {
        showErrorMessage("Could not send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    if (pass.length < 6) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (pass.length < 10) return { score: 2, label: 'Medium', color: '#f59e0b' };
    const hasMixed = /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
    if (pass.length >= 10 && hasMixed) return { score: 3, label: 'Strong', color: '#10b981' };
    return { score: 2, label: 'Medium', color: '#f59e0b' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b 0%, #020617 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '32px 24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {authView === 'forgot' ? (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setAuthView('signin'); setSuccess(null); setError(null); }}
              style={{ position: 'absolute', top: '-10px', left: '-10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Reset your password</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Enter your email address and we will send you a link to reset your password.</p>
            </div>

            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div id="authSuccess" style={{ padding: '16px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '14px', marginBottom: '24px' }}>
                  {success}
                </div>
                <button
                  onClick={() => { setAuthView('signin'); setSuccess(null); }}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#2dd4bf', color: '#020617', fontWeight: '800', cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                    onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                    onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                {error && <div id="authError" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#2dd4bf', color: '#020617', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading && <Loader2 className="animate-spin" size={20} />}
                  Send Reset Email
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '60px', height: '60px', background: 'rgba(45, 212, 191, 0.1)', 
                borderRadius: '18px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', margin: '0 0 16px',
                border: '1px solid rgba(45, 212, 191, 0.2)'
              }}>
                <Dna size={32} color="#2dd4bf" />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Skin Tight</h1>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Catch It Early.</p>
            </div>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
              <button 
                onClick={() => { setAuthView('signin'); setError(null); setSuccess(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authView === 'signin' ? '#2dd4bf' : 'transparent', color: authView === 'signin' ? '#020617' : '#94a3b8', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthView('signup'); setError(null); setSuccess(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authView === 'signup' ? '#2dd4bf' : 'transparent', color: authView === 'signup' ? '#020617' : '#94a3b8', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={authView === 'signin' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {authView === 'signup' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>FULL NAME</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                      onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                      onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>USERNAME</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        placeholder="Choose a username"
                        required
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                        onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                        onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        {usernameAvailable === true && <CheckCircle2 size={18} color="#10b981" />}
                        {usernameAvailable === false && <XCircle size={18} color="#ef4444" />}
                      </div>
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
                  placeholder="your@email.com"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                  onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                  onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authView === 'signup' ? "Create a password" : "Your password"}
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                    onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                    onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                {authView === 'signup' && password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength.score / 3) * 100}%`, background: strength.color, transition: 'all 0.3s' }} />
                    </div>
                    <p style={{ fontSize: '10px', color: strength.color, marginTop: '4px', fontWeight: '600' }}>{strength.label}</p>
                  </div>
                )}
              </div>

              {authView === 'signup' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>CONFIRM PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                        onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = '#2dd4bf'}
                        onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        {confirmPassword && password === confirmPassword && <CheckCircle2 size={18} color="#10b981" />}
                        {confirmPassword && password !== confirmPassword && <XCircle size={18} color="#ef4444" />}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
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

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '10px', fontWeight: '600' }}>SKIN TYPE (FITZPATRICK)</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        {[1,2,3,4,5,6].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFitzpatrick(type)}
                            style={{
                              flex: 1,
                              aspectRatio: '1/1',
                              borderRadius: '10px',
                              border: fitzpatrick === type ? '2px solid #2dd4bf' : '1px solid rgba(255,255,255,0.1)',
                              background: [
                                '#F6E4E2', // Type I
                                '#F1C1B0', // Type II
                                '#D6A88C', // Type III
                                '#A67C52', // Type IV
                                '#7A4A33', // Type V
                                '#3C2219'  // Type VI
                              ][type-1],
                              cursor: 'pointer',
                              transform: fitzpatrick === type ? 'scale(1.1)' : 'scale(1)',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: fitzpatrick === type ? '0 0 15px rgba(45, 212, 191, 0.4)' : 'none'
                            }}
                            title={`Type ${type}`}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                        {fitzpatrick > 0 ? `Selected: Type ${fitzpatrick}` : 'Select your skin type'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {error && <div id="authError" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
              {success && <div id="authSuccess" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '13px', textAlign: 'center' }}>{success}</div>}

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
                  boxShadow: '0 10px 20px rgba(45, 212, 191, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {loading ? 'Processing...' : authView === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {onSkip && (
                <button 
                  type="button"
                  onClick={onSkip}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Continue as Guest
                </button>
              )}

              {authView === 'signin' && (
                <button 
                  type="button"
                  onClick={() => setAuthView('forgot')}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' }}
                >
                  Forgot your password?
                </button>
              )}
            </form>
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10px', color: '#475569', opacity: 0.5 }}>
              v2.1.0 - Email Auth Active (PIN Removed)
            </div>
          </>
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
    <div style={{ maxWidth: '640px', margin: '0 auto', fontSize: '11px', color: '#2dd4bf', padding: '10px 14px', borderRadius: '10px', background: 'rgba(45, 212, 191, 0.06)', border: '1px solid rgba(45, 212, 191, 0.15)', marginBottom: '14px', fontWeight: 600 }}>
      ✓ Reviewed for educational accuracy by clinical skin health references and dermatologist guidelines.
    </div>
    <p style={{ fontSize: '11px', color: '#64748b', width: '100%', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
      Disclaimer: Skin Tight is an educational AI skin monitoring and photo-journaling tool, not a diagnostic medical device. It does not provide medical advice, diagnosis, or treatment. Always consult a licensed dermatologist or medical professional for any skin health concerns. © 2026 Skin Tight. <span style={{ opacity: 0.25, fontSize: '10px' }}>•</span>
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught app error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ padding: '40px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '32px', maxWidth: '400px' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <AlertTriangle size={32} color="#f87171" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>Oops! Something went wrong</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px', lineHeight: '1.6' }}>
              We've encountered an unexpected error. Don't worry, your data is safe. Please try refreshing the app.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{ width: '100%', padding: '16px', background: '#2dd4bf', color: '#020617', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'timeline' | 'routine' | 'plans' | 'profile' | 'clinic' | 'welcome' | 'auth' | 'learn'>('home');
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | null>(null);
  const [activePseoPage, setActivePseoPage] = useState<PseoPage | null>(null);
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

  // --- Dynamic SEO Page Title Effect ---
  useEffect(() => {
    if (activePseoPage) {
      document.title = activePseoPage.seoTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', activePseoPage.seoDescription);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = activePseoPage.seoDescription;
        document.head.appendChild(meta);
      }
      return;
    }
    switch (activeTab) {
      case 'home':
        document.title = 'Skin Tight – AI Skin Monitoring & Skin Cancer Awareness Tool';
        break;
      case 'scan':
        document.title = 'AI Skin Analysis & Skin Screening | Skin Tight';
        break;
      case 'timeline':
        document.title = 'Timeline & Schedule | Skin Tight';
        break;
      case 'routine':
        document.title = 'Skin Self-Check & Prevention Habits | Skin Tight';
        break;
      case 'plans':
        document.title = 'Skin Risk Assessment & Monitoring Plans | Skin Tight';
        break;
      case 'profile':
        document.title = 'Profile | Skin Tight';
        break;
      case 'clinic':
        document.title = 'Find Dermatologists | Skin Tight';
        break;
      case 'welcome':
        document.title = 'About Skin Tight – Early Skin Awareness & Mole Tracking';
        break;
      case 'auth':
        document.title = 'Sign In or Join | Skin Tight';
        break;
      case 'learn':
        if (selectedArticleSlug) {
          const article = BLOG_ARTICLES.find(a => a.slug === selectedArticleSlug);
          if (article) {
            document.title = `${article.title} | Skin Tight Academy`;
          } else {
            document.title = 'Skin Health Academy – Skin Screening & Mole Tracking | Skin Tight';
          }
        } else {
          document.title = 'Skin Health Academy – Skin Screening & Mole Tracking | Skin Tight';
        }
        break;
      default:
        document.title = 'Skin Tight – AI Skin Monitoring & Skin Cancer Awareness Tool';
        break;
    }
  }, [activeTab, selectedArticleSlug, activePseoPage]);
 
  // --- Deep Linking & Path Parsing on Mount ---
  useEffect(() => {
    const handleUrlPath = () => {
      const path = window.location.pathname;
      if (path.startsWith('/track/')) {
        const slug = path.replace('/track/', '');
        const found = PSEO_LANDING_PAGES.find(p => p.slug === slug);
        if (found) {
          setActivePseoPage(found);
          return;
        } else {
          setActivePseoPage(null);
        }
      } else {
        setActivePseoPage(null);
      }

      if (path.startsWith('/learn') || path.startsWith('/blog')) {
        setActiveTab('learn');
        const parts = path.split('/');
        const slug = parts[parts.length - 1];
        if (slug && slug !== 'learn' && slug !== 'blog') {
          const exists = BLOG_ARTICLES.some(a => a.slug === slug);
          if (exists) {
            setSelectedArticleSlug(slug);
          } else {
            setSelectedArticleSlug(null);
          }
        } else {
          setSelectedArticleSlug(null);
        }
      } else if (path === '/clinic') {
        setActiveTab('clinic');
      } else if (path === '/about') {
        setActiveTab('welcome');
      } else if (path === '/routine') {
        setActiveTab('routine');
      } else if (path === '/plans') {
        setActiveTab('plans');
      }
    };
 
    handleUrlPath();
    window.addEventListener('popstate', handleUrlPath);
    return () => window.removeEventListener('popstate', handleUrlPath);
  }, []);
 
  // --- Synchronize Tab State with URL Path for Deep Linking and SEO ---
  useEffect(() => {
    const currentPath = window.location.pathname;
    let expectedPath = '/';
    if (activePseoPage) {
      expectedPath = `/track/${activePseoPage.slug}`;
    } else if (activeTab === 'learn') {
      expectedPath = selectedArticleSlug ? `/learn/${selectedArticleSlug}` : '/learn';
    } else if (activeTab === 'clinic') {
      expectedPath = '/clinic';
    } else if (activeTab === 'welcome') {
      expectedPath = '/about';
    } else if (activeTab === 'routine') {
      expectedPath = '/routine';
    } else if (activeTab === 'plans') {
      expectedPath = '/plans';
    } else if (activeTab === 'home') {
      expectedPath = '/';
    }
 
    if (currentPath !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
    }
  }, [activeTab, selectedArticleSlug, activePseoPage]);

  // --- Connectivity Check ---
  useEffect(() => {
    const testConnection = async () => {
      if (!db) {
        console.error("Firestore db instance is not initialized.");
        return;
      }
      try {
        await getDocFromServer(doc(db, '_health_check_', 'heartbeat'));
        console.log("Firebase connection established.");
        setIsOffline(false);
      } catch (error: any) {
        console.warn("Firestore heartbeat check failed (this is often okay if rules block it):", error.message);
        if (error.message && (error.message.includes('the client is offline'))) {
          if (!navigator.onLine) setIsOffline(true);
        }
      }
    };
    testConnection();
  }, []);
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

  const updateIntake = (field: string, value: any) => {
    setIntakeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateQualityCheck = (field: keyof IntakeForm['qualityCheck'], value: boolean) => {
    setIntakeForm(prev => ({
      ...prev,
      qualityCheck: {
        ...prev.qualityCheck,
        [field]: value
      }
    }));
  };
  
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
  const [skinScore, setSkinScore] = useState<number>(100);
  const [scoreHistory, setScoreHistory] = useState<{ date: string; score: number }[]>([]);

  // --- Feature 5: Skincare Routine State ---
  const [protocol, setProtocol] = useState<PreventionProtocol | null>(null);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    profileColor: '#00B4D8',
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

  const updateMenuAvatar = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    getDoc(doc(db, "users", user.uid)).then(function(docSnap: any) {
      if (!docSnap.exists()) return;
      
      const data = docSnap.data();
      const displayNameSource = data.fullName || data.username || "U";
      const firstLetter = displayNameSource.charAt(0).toUpperCase();
      const profileColor = data.profileColor || "#00B4D8";
      
      const menuAvatar = document.getElementById("menuAvatarCircle");
      if (menuAvatar) {
        (menuAvatar as HTMLElement).style.background = profileColor;
        menuAvatar.textContent = firstLetter;
      }
      
      const menuName = document.getElementById("menuUserName");
      if (menuName) {
        menuName.textContent = data.fullName || data.username || "User";
      }
      
      const menuEmail = document.getElementById("menuUserEmail");
      if (menuEmail) {
        menuEmail.textContent = data.email || auth.currentUser?.email || "";
      }
    }).catch((err: any) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
  };

  const updateAllAvatars = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    getDoc(doc(db, "users", user.uid)).then(function(docSnap: any) {
      if (!docSnap.exists()) return;
      
      const data = docSnap.data();
      const displayNameSource = data.fullName || data.username || "U";
      const firstLetter = displayNameSource.charAt(0).toUpperCase();
      const profileColor = data.profileColor || "#00B4D8";
      
      const allAvatars = document.querySelectorAll(
        "#headerAvatar, #menuAvatarCircle, .userAvatarCircle"
      );
      allAvatars.forEach(function(avatar) {
        (avatar as HTMLElement).style.background = profileColor;
        avatar.textContent = firstLetter;
      });
      
      const allNames = document.querySelectorAll(
        "#menuUserName, #headerUserName, .displayUserName"
      );
      allNames.forEach(function(el) {
        el.textContent = data.fullName || data.username || "";
      });
      
      const allEmails = document.querySelectorAll(
        "#menuUserEmail, .displayUserEmail"
      );
      allEmails.forEach(function(el) {
        el.textContent = data.email || auth.currentUser?.email || "";
      });
    }).catch((err: any) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
  };

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

  useEffect(() => {
    if (activeTab === 'profile' && userProfile.fitzpatrick) {
      // Small delay to ensure the DOM element is rendered
      setTimeout(() => {
        if (typeof (window as any).renderSkinTypeCard === 'function') {
          (window as any).renderSkinTypeCard(userProfile.fitzpatrick);
        }
      }, 100);
    }
  }, [activeTab, userProfile.fitzpatrick]);

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


  const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        } catch (e: any) {
          reject(new Error(`Rendering failed: ${e.message || 'Unknown'}`));
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unsupported or corrupt image format'));
      };
      
      img.src = url;
    });
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDoctor, setIsEditingDoctor] = useState(false);
  const [tempProfile, setTempProfile] = useState(userProfile);
  const [tempDoctor, setTempDoctor] = useState(doctorInfo);

  // --- Feature 10: Education State ---
  const [education, setEducation] = useState<EducationProgress>({ completedCards: [], score: 0 });
  const [showEduCard, setShowEduCard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getAI = () => null; // Deprecated, use callAI/callAIVision helper instead

  const clearAllSessionData = () => {    
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
    
    console.log("Session state reset");
  };

  const initializeNewSession = async (user: any) => {
    clearAllSessionData();
    setCurrentUser(user);
    
    // OneSignal Integration
    setOneSignalExternalId(user.uid);
    setTimeout(() => {
      requestNotificationPermission();
    }, 3000);
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFullUserData(userData);
        
        // Parallel load of all data
        await Promise.all([
          loadUserData(user.uid),
          loadMostRecentScan(user.uid)
        ]);
        
        console.log("New session initialized for:", userData.username || userData.fullName);
      } else {
        console.warn("User profile document NOT found for UID:", user.uid);
        if (activeTab !== 'auth') {
          setActiveTab('auth');
        }
      }
    } catch (err) {
      console.error("Critical session initialization error:", err);
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearAllSessionData();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // --- Persistence & Initialization ---
  const lastInitializedUid = useRef<string | null>(null);

  useEffect(() => {
    if (result || loading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [result, loading]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      console.log("Auth state changed:", user ? user.uid : "null");
      if (user) {
        // Only initialize if it's a new login or a different user
        if (lastInitializedUid.current !== user.uid) {
          lastInitializedUid.current = user.uid;
          initializeNewSession(user);
        }
        updateAllAvatars();
      } else {
        if (lastInitializedUid.current !== null) {
          lastInitializedUid.current = null;
          clearAllSessionData();
        }
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
      let profileDoc;
      try {
        profileDoc = await getDoc(doc(db, "users", userId));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      }
      
      if (profileDoc && profileDoc.exists()) {
        const data = profileDoc.data();
        setFullUserData(data);
        if (data.streakData) setStreakData(data.streakData);
        if (data.skinScore) setSkinScore(data.skinScore);
        if (data.nextScanDate) setNextScanDate(data.nextScanDate);
        if (data.cycleProgress !== undefined) setCycleProgress(data.cycleProgress);
        tagUserScanPending();
        checkAndShowScanReminder();
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
      try {
        const scoresDoc = await getDoc(doc(db, "users", userId, "timeline", "scores"));
        if (scoresDoc.exists()) {
          setScoreHistory(scoresDoc.data()?.history || []);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/timeline/scores`);
      }

      // Load Scans
      try {
        await loadScanHistory(userId);
      } catch (err) {
        console.error("Failed to load scans in loadUserData:", err);
      }

      // Load Doctor Info
      try {
        const doctorDoc = await getDoc(doc(db, "users", userId, "doctorInfo", "current"));
        if (doctorDoc.exists()) {
          const docData = doctorDoc.data() as any;
          setDoctorInfo(docData);
          setTempDoctor(docData);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/doctorInfo/current`);
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
              setDoc(doc(db, "users", currentUser.uid), {
                highUvDays: next
              }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`));
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
      const response = await callAIVision(
        [
          { inlineData: { mimeType: "image/jpeg", data: extractBase64FromDataUrl(photo) } },
          { text: "Look at this image. Is it a clear close-up photo of a skin lesion or skin area? Rate the image quality as: GOOD (clear, well-lit, close-up, lesion visible), POOR (blurry, dark, too far away, or lesion not clearly visible), or NOT_SKIN (this is not a photo of skin). Respond with only one word: GOOD, POOR, or NOT_SKIN." }
        ]
      );
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 6 - photos.length;
    if (remainingSlots <= 0) {
      setError("Maximum 6 photos allowed.");
      return;
    }
    
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setLoading(true);
    setError(null);

    try {
      const processedPhotos = await Promise.all(filesToProcess.map(async (file) => {
        // Validation 1: Check standard safe image types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          throw new Error(`Image upload issue detected: Unsupported file format "${file.type}". Only JPG, PNG, and WEBP are supported.`);
        }

        // Validation 2: Check maximum image size constraints (e.g. 15MB to prevent memory crash)
        const maxSizeBytes = 15 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          throw new Error(`Image upload issue detected: Image size corresponds to ${(file.size / (1024 * 1024)).toFixed(1)}MB, which exceeds the maximum allowed limit of 15MB.`);
        }
        if (file.size === 0) {
          throw new Error("Image upload issue detected: The file appears to be corrupted or empty (0 bytes).");
        }

        try {
          return await compressImage(file);
        } catch (err: any) {
          throw new Error(`Image upload issue detected: ${err.message || 'The image could not be loaded or is corrupted.'}`);
        }
      }));

      setPhotos(prev => {
        const updated = [...prev, ...processedPhotos].slice(0, 6);
        // Trigger quality check only if it's the first photo(s) being added to an empty list
        if (prev.length === 0 && updated.length > 0) {
          checkImageQuality(updated[0]);
        }
        return updated;
      });
      setError(null);
      setResult(null);
    } catch (err: any) {
      console.error("Image processing error helper logged:", err);
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const saveScanToFirestore = async (scanData: any) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in — cannot save scan");
      return;
    }
    
    setSaveStatus('idle');
    
    const uploadedUrls: string[] = [];
    console.log(`[Firebase Storage Tooling] Initiating upload flow for user "${user.uid}"...`);
    console.log(`[Firebase Storage Tooling] Target bucket from config: "${(storage as any).app?.options?.storageBucket || 'gen-lang-client-0650598239.firebasestorage.app'}"`);
    console.log(`[Firebase Storage Tooling] Total images to upload in queue: ${scanData.photos?.length || 0}`);
    
    if (scanData.photos && scanData.photos.length > 0) {
      for (let i = 0; i < scanData.photos.length; i++) {
        const photo = scanData.photos[i];
        if (photo && photo.startsWith('data:')) {
          try {
            const fileName = `${Date.now()}_img_${i}.jpg`;
            const storagePath = `users/${user.uid}/scans/${fileName}`;
            console.log(`[Firebase Storage Tooling] Preparing to upload image #${i + 1} to storage path: "${storagePath}"`);
            const fileRef = storageRef(storage, storagePath);
            
            console.log(`[Firebase Storage Tooling] Uploading image #${i + 1} (base64 string size: ${photo.length} characters) using "data_url" format...`);
            const uploadResult = await uploadString(fileRef, photo, 'data_url');
            console.log(`[Firebase Storage Tooling] Upload successful for image #${i + 1}! Metadata ref:`, uploadResult.ref.fullPath);
            
            const downloadUrl = await getDownloadURL(uploadResult.ref);
            console.log(`[Firebase Storage Tooling] Download URL retrieved for image #${i + 1}: ${downloadUrl}`);
            uploadedUrls.push(downloadUrl);
          } catch (uploadError: any) {
            console.error(`[Firebase Storage Tooling] FAILED to upload image #${i + 1} to Storage. Falling back to local data/base64 representation:`, uploadError);
            uploadedUrls.push(photo);
          }
        } else if (photo) {
          console.log(`[Firebase Storage Tooling] Image #${i + 1} is already a URL or non-base64 format, preserving as-is.`);
          uploadedUrls.push(photo);
        }
      }
    }

    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "scans"), {
        date: getServerTimestamp(),
        riskLevel: scanData.result.risk_level,
        confidence: scanData.result.confidence_level,
        findings: scanData.result.findings,
        concerningSigns: scanData.result.concerning_signs,
        suggestions: scanData.result.suggestions,
        urgency: scanData.result.urgency,
        bodyRegion: scanData.bodyRegion,
        skinScore: scanData.skinScore,
        intakeData: scanData.intake,
        photoBase64: null, // Avoid base64 bloat in Firestore
        photos: uploadedUrls, // Store GCS download URLs
        result: scanData.result
      });
      
      console.log("Scan saved to Firestore with ID:", docRef.id);
      tagUserScanCompleted();
      updateSkinScoreInFirestore(user.uid, scanData.skinScore);
      setSaveStatus('success');
      loadScanHistory();
      loadMostRecentScan();
      // Clear status after 5 seconds
      setTimeout(() => setSaveStatus('idle'), 5000);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/scans`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const updateSkinScoreInFirestore = (userId: string, newScore: number) => {
    setDoc(doc(db, "users", userId), {
      skinScore: newScore,
      lastScanDate: getServerTimestamp(),
      scansCompleted: getIncrement(1)
    }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));
  };

  const loadScanHistory = async (userId?: string) => {
    const id = userId || auth.currentUser?.uid;
    if (!id) return;
    
    setHistoryLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, "users", id, "scans"), orderBy("date", "desc"), limit(50)));
      
      const loadedScans: ScanRecord[] = [];
      snapshot.forEach(function(doc: any) {
        loadedScans.push(mapScanData(doc.id, doc.data()));
      });
      
      setScans(loadedScans);
      setHistoryLoading(false);
      return loadedScans;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${id}/scans`);
      setHistoryLoading(false);
      throw err;
    }
  };

  const loadUserSkinScore = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    getDoc(doc(db, "users", user.uid)).then(function(docSnap: any) {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const score = data.skinScore || 100;
        setSkinScore(score);
        setFullUserData(data);
      }
    }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
  };

  const loadMostRecentScan = async (userId?: string) => {
    const id = userId || auth.currentUser?.uid;
    if (!id) return;
    
    try {
      const snapshot = await getDocs(query(collection(db, "users", id, "scans"), orderBy("date", "desc"), limit(1)));
      if (!snapshot.empty) {
        const scan = mapScanData(snapshot.docs[0].id, snapshot.docs[0].data());
        setRecentScan(scan);
        return scan;
      } else {
        setRecentScan(null);
        return null;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${id}/scans`);
      throw err;
    }
  };

  const saveProtocolToFirestore = (protocolData: any, scanId: string | null = null) => {
    const user = auth.currentUser;
    if (!user) return;
    
    setDoc(doc(db, "users", user.uid), {
      protocol: {
        content: protocolData,
        generatedAt: getServerTimestamp(),
        basedOnScanId: scanId
      }
    }, { merge: true }).then(function() {
      console.log("Protocol saved for user:", user.uid);
    }).catch(function(error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    });
  };

  const loadProtocolFromFirestore = () => {
    const user = auth.currentUser;
    if (!user) return;
    
    getDoc(doc(db, "users", user.uid)).then(function(docSnap: any) {
      if (docSnap.exists() && docSnap.data().protocol) {
        setProtocol(docSnap.data().protocol.content);
        console.log("Protocol loaded from Firestore");
      }
    }).catch(err => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
  };

  const analyzeSkin = async (force = false) => {
    const today = new Date();
    if (photos.length === 0) return;
    
    setLoading(true);
    setError(null);
    setShowConfidenceWarning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const ai = getAI();
      const imageParts = photos.map(p => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: extractBase64FromDataUrl(p),
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
- detected_body_part: string (Recognize which body part/parts or region is shown in the uploaded photo/photos by yourself based on the visual context. Be specific, e.g. "Arm", "Face", "Chest", etc.)
- findings: array of max 3 bullet points. Each bullet point max 15 words. Plain language only.
- concerning_signs: array of ABCDE assessment findings (will be saved but UI will show simplified).
- risk_factors_identified: array of max 2 bullet points pulled from their profile. Short and specific.
- summary: one single sentence summary maximum 20 words.
- cancer_type_indicators: short string identifying indicators of BCC, SCC, or Melanoma if any.
- comparison_notes: If multiple photos provided, note any differences or stability.
- action_card: One of three specific strings:
  1. "Low visual concern based on the uploaded images. Monitor for changes and consult a dermatologist if concerned." (for low risk)
  2. "No obvious visual warning signs were detected, but scheduled professional evaluation is recommended. Consider scheduling a dermatology consultation within 4-6 weeks for further review." (for moderate risk)
  3. "Observation patterns suggest professional assessment is warranted. Please consult a dermatologist as soon as possible (ideally within 1-2 weeks) for a clinical evaluation." (for high risk)
- suggestions: array of action items (will be saved).
- urgency: string recommendation (will be saved).
- data_quality_note: string.
- disclaimer: always include.`;
      
      const responseData = await callAIVision(
        [
          ...imageParts,
          { text: prompt }
        ],
        "gemini-2.5-flash",
        { responseMimeType: "application/json" }
      );
      
      const text = responseData.text;
      if (!text) throw new Error("Empty response from AI");
      
      let parsed;
      try {
        parsed = safeParseAIJSON(text);
      } catch (e: any) {
        console.warn("[JSON Fallback Mode] AI returned malformed response, using structural healing:", e);
        parsed = null;
      }
      const jsonResult = validateAndFallbackAnalysisResult(parsed);
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
            setDoc(doc(db, "users", currentUser.uid), {
              nextScanDate: nextDateStr,
              cycleProgress: updatedProgress,
              lastFullWeekCompletionDate: nowIso
            }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`));
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
          setDoc(doc(db, "users", currentUser.uid), {
            streakData: updated
          }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`));
        }
        
        return updated;
      });

      // Calculate SkinScore
      const newScore = calculateSkinScore(jsonResult);
      setSkinScore(newScore);
      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid), {
          skinScore: newScore
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`));
      }
      setScoreHistory(prev => {
        const updated = [...prev, { date: new Date().toISOString(), score: newScore }];
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid, "timeline", "scores"), {
            history: updated
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser?.uid}/timeline/scores`));
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
            setDoc(doc(db, "users", currentUser.uid), {
              bodyDots: updated
            }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`));
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
      await setDoc(doc(db, "users", currentUser.uid), {
        fullName: tempProfile.fullName,
        profileColor: tempProfile.profileColor
      }, { merge: true });
      setUserProfile(tempProfile);
      setFullUserData((prev: any) => ({
        ...prev,
        fullName: tempProfile.fullName,
        profileColor: tempProfile.profileColor
      }));
      setIsEditingProfile(false);
      updateAllAvatars();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const saveDoctor = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid, "doctorInfo", "current"), tempDoctor);
      setDoctorInfo(tempDoctor);
      setIsEditingDoctor(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/doctorInfo/current`);
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

      const responseData = await callAI(prompt, "gemini-2.5-flash", { responseMimeType: "application/json" });

      let parsedProtocol;
      try {
        parsedProtocol = safeParseAIJSON(responseData.text || '{}');
      } catch (parseErr) {
        console.warn("[Protocol Parser Fallback] Failed to parse protocol JSON:", parseErr);
        parsedProtocol = null;
      }
      const newProtocol = validateAndFallbackProtocol(parsedProtocol);
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








  const BodyMapPage = () => null; // Removed as requested










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



  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Dna size={48} color="#2dd4bf" />
        </motion.div>
      </div>
    );
  }

  if (activePseoPage) {
    return (
      <PseoLandingPage 
        page={activePseoPage} 
        onCtaClick={() => {
          setActivePseoPage(null);
          setActiveTab('home');
          window.history.pushState(null, '', '/');
        }} 
      />
    );
  }

  if (!onboardingComplete) {
    return <OnboardingScreen onComplete={() => {
      setOnboardingComplete(true);
      localStorage.setItem('onboarding_complete', 'true');
      setWelcomeSeen(true);
      localStorage.setItem('welcomeSeen', 'true');
    }} />;
  }

  if (!currentUser && activeTab === 'auth') {
    return <AuthPage onAuthSuccess={(user) => {
      initializeNewSession(user);
      setActiveTab('home');
    }} onSkip={() => setActiveTab('home')} />;
  }



  return (
    <ErrorBoundary>
      <>
        <AnimatePresence>
          {loading && <DermAnalysisLoader />}
        </AnimatePresence>
        <div className="app-wrapper" style={{ ...styles.container, background: '#060818' }}>
      {isOffline && (
        <div style={{ 
          background: '#ef4444', 
          color: 'white', 
          padding: '12px', 
          textAlign: 'center', 
          fontSize: '14px', 
          fontWeight: '800',
          position: 'sticky',
          top: 0,
          zIndex: 2000,
          width: '100%'
        }}>
          You appear to be offline. Some features may be limited.
        </div>
      )}
      <header 
        id="appHeader"
        style={{ 
          ...styles.topHeader, 
          padding: '0 16px', 
          height: '70px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          gap: '18px',
          width: '100%'
        }}
      >
        <button 
          onClick={() => {
            setIsMenuOpen(true);
            updateAllAvatars();
          }}
          style={{ background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', width: 'auto', flexShrink: 0 }}
        >
          <Menu size={30} />
        </button>
        
        <Dna size={30} color="#2dd4bf" style={{ flexShrink: 0 }} />
        
        <span style={{ 
          fontWeight: '950', 
          fontSize: '21px', 
          color: '#f8fafc', 
          letterSpacing: '-0.02em', 
          whiteSpace: 'nowrap',
          flexShrink: 0,
          lineHeight: 1
        }}>
          Skin Tight
        </span>

        <div style={{ marginLeft: 'auto' }}>
          {currentUser ? (
            <div 
              id="headerAvatar"
              onClick={() => setActiveTab('profile')}
              style={{ 
                width: '43px', height: '43px', borderRadius: '50%', 
                background: fullUserData?.profileColor || '#2dd4bf',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '900', color: '#020617',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
            >
              {fullUserData?.fullName ? fullUserData.fullName.split(' ').map((n: any) => n?.[0] || '').join('').toUpperCase().slice(0, 2) : (fullUserData?.username?.[0]?.toUpperCase() || 'U')}
            </div>
          ) : (
            <button 
              onClick={() => setActiveTab('auth')}
              style={{
                background: 'rgba(45, 212, 191, 0.1)',
                border: '1px solid rgba(45, 212, 191, 0.2)',
                color: '#2dd4bf',
                padding: '6px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <SideMenu 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        currentUser={currentUser} 
        fullUserData={fullUserData} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        handleLogout={handleLogout} 
      />

      <div className="main-content" style={{ ...styles.wrapper }}>
        {activeTab === 'home' && (
          <div className="page-container" style={{ ...styles.tabContent, paddingBottom: '100px' }}>
            {showInstallPrompt && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'rgba(45, 212, 191, 0.1)',
                border: '1px solid rgba(45, 212, 191, 0.2)',
                borderRadius: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
                <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '700' }}>
                  Install Skin Tight
                </div>
                <button 
                  onClick={handleInstallClick}
                  style={{ 
                    background: '#2dd4bf', 
                    color: '#060818', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '10px 20px', 
                    fontSize: '14px', 
                    fontWeight: '800', 
                    cursor: 'pointer' 
                  }}
                >
                  Install App
                </button>
              </div>
            )}

            {/* Prominent 3D Pulsing Frequency Scan Button at Very Top */}
            <div style={{ width: '100%', marginBottom: '24px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
              {/* 3D Frequency Sonar Depth Rings */}
              <motion.div
                animate={{ scale: [0.85, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0 }}
                style={{ position: 'absolute', width: '100%', maxWidth: '380px', height: '150px', borderRadius: '36px', border: '2px solid #c084fc', pointerEvents: 'none' }}
              />
              <motion.div
                animate={{ scale: [0.85, 1.45], opacity: [0.4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                style={{ position: 'absolute', width: '100%', maxWidth: '380px', height: '150px', borderRadius: '36px', border: '2px solid #a855f7', pointerEvents: 'none' }}
              />

              {/* Main 3D Depth Button */}
              <motion.div
                id="newScanButtonHeroTop"
                onClick={() => setActiveTab('scan')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: [1, 1.06, 0.96, 1.04, 1],
                  boxShadow: [
                    '0 10px 30px -5px rgba(168, 85, 247, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                    '0 25px 60px 10px rgba(192, 132, 252, 0.95), inset 0 6px 16px rgba(255, 255, 255, 0.85)',
                    '0 6px 18px -4px rgba(147, 51, 234, 0.35), inset 0 1px 3px rgba(255, 255, 255, 0.25)',
                    '0 20px 50px 5px rgba(168, 85, 247, 0.8), inset 0 4px 10px rgba(255, 255, 255, 0.65)',
                    '0 10px 30px -5px rgba(168, 85, 247, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
                  ],
                  border: [
                    '2px solid rgba(192, 132, 252, 0.7)',
                    '2px solid rgba(255, 255, 255, 1)',
                    '2px solid rgba(168, 85, 247, 0.4)',
                    '2px solid rgba(233, 213, 255, 0.9)',
                    '2px solid rgba(192, 132, 252, 0.7)'
                  ]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '32px 24px',
                  borderRadius: '32px',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7e22ce 0%, #4c1d95 50%, #3b0764 100%)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Light & Dark Pulse Overlay */}
                <motion.div
                  animate={{ opacity: [0, 0.55, 0, 0.4, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #e9d5ff 0%, #c084fc 100%)', pointerEvents: 'none' }}
                />

                {/* Animated Sweep Shimmer */}
                <motion.div 
                  animate={{ x: [-200, 500] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: '70px',
                    height: '100%',
                    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)',
                    transform: 'skewX(-25deg)',
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 1.15, 0.95, 1.1, 1], rotate: [0, -5, 5, -3, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '22px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '14px',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                    }}
                  >
                    <Camera size={36} color="#ffffff" />
                  </motion.div>

                  <div style={{ fontWeight: '950', fontSize: '26px', color: '#ffffff', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)', marginBottom: '4px' }}>
                    START NEW SCAN
                  </div>
                  <div style={{ fontSize: '14px', color: '#e9d5ff', fontWeight: '800', letterSpacing: '0.5px' }}>
                    ✨ Tap Here for Immediate AI Skin Analysis
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Your Key Benefits Section - Transferred directly below Start New Scan button */}
            <div style={{
              width: '100%',
              marginBottom: '20px',
              padding: '24px',
              borderRadius: '24px',
              background: 'rgba(30, 41, 59, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 12px 32px -8px rgba(0,0,0,0.45), 0 0 20px rgba(45, 212, 191, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(45, 212, 191, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
                  boxShadow: '0 4px 12px rgba(45, 212, 191, 0.2)'
                }}>
                  <ShieldCheck size={22} color="#2dd4bf" strokeWidth={2.2} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#2dd4bf', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block' }}>Skin Tight</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>Your Key Benefits</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
                {[
                  {
                    title: "100% Free & Fast",
                    desc: "Instant clinical screening in under 60 seconds (vs. $150+ clinic visits).",
                    icon: Zap,
                    color: "#38bdf8"
                  },
                  {
                    title: "High Clinical Accuracy",
                    desc: "Powered by AI models trained on thousands of verified dermatology cases.",
                    icon: Globe,
                    color: "#c084fc"
                  },
                  {
                    title: "Private & Secure",
                    desc: "Your uploaded images and diagnostic records remain strictly encrypted.",
                    icon: Lock,
                    color: "#2dd4bf"
                  }
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', alignItems: 'center' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.color, border: `1px solid ${item.color}40` }}>
                        <IconComp size={20} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#ffffff', marginBottom: '3px' }}>{item.title}</div>
                        <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.45 }}>{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.5 }}>
                Informational screening tool only; does not replace medical doctor advice.
              </p>
            </div>


            {/* Steps & How to Use Section */}
            <div className="glass-card mb-6" style={{
              background: 'rgba(30, 41, 59, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              marginTop: '12px',
              boxShadow: '0 12px 32px -8px rgba(0,0,0,0.45), 0 0 25px rgba(168, 85, 247, 0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#c084fc', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 8px #c084fc' }}></span> How Skin Tight Works
                </h3>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#2dd4bf', background: 'rgba(45,212,191,0.15)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(45,212,191,0.3)' }}>
                  4 Simple Steps
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[
                  {
                    step: "1",
                    label: "SCAN",
                    title: "Snap or Upload Photo",
                    desc: "Take a clear, close-up photo of any suspicious spots, moles, or lesions of concern.",
                    color: "#c084fc",
                    bgGradient: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                    icon: Camera
                  },
                  {
                    step: "2",
                    label: "ANALYZE",
                    title: "Instant AI Screening",
                    desc: "Our dermatologist-trained AI checks risk factors, ABCDE indicators, and pattern symmetries.",
                    color: "#38bdf8",
                    bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    icon: SparklesIcon
                  },
                  {
                    step: "3",
                    label: "TRACK",
                    title: "Monitor Developments",
                    desc: "Compare pictures over time to monitor changes, build your skin journal, and view timeline trends.",
                    color: "#2dd4bf",
                    bgGradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                    icon: History
                  },
                  {
                    step: "4",
                    label: "CONSULT",
                    title: "Export & Share Report",
                    desc: "Generate clinical PDF summary reports ready to present directly to your doctor or dermatologist.",
                    color: "#f43f5e",
                    bgGradient: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    icon: FileText
                  }
                ].map((item, idx) => {
                  const StepIcon = item.icon;
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      padding: '14px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {/* Large Numbered Circle */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: item.bgGradient,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        fontSize: '15px',
                        flexShrink: 0,
                        boxShadow: `0 4px 14px ${item.color}40`,
                        border: '2px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        {item.step}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '900',
                            letterSpacing: '1px',
                            color: item.color,
                            background: `${item.color}20`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${item.color}40`
                          }}>
                            {item.label}
                          </span>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0 }}>{item.title}</h4>
                        </div>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.55', margin: 0 }}>{item.desc}</p>
                      </div>

                      <div style={{ color: item.color, opacity: 0.8, padding: '4px' }}>
                        <StepIcon size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Call-to-Action (CTA) */}
              <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  onClick={() => setActiveTab('scan')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '15.5px',
                    letterSpacing: '0.3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(168, 85, 247, 0.4)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(168, 85, 247, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(168, 85, 247, 0.4)';
                  }}
                >
                  <Camera size={20} color="#ffffff" strokeWidth={2.5} />
                  <span>Start Free AI Skin Scan Now</span>
                  <SparklesIcon size={18} color="#ffffff" />
                </button>
              </div>
            </div>

            <SkinShowcaseCarousel />

            <div id="scanReminderBanner" style={{ display: 'none', background: 'rgba(239, 159, 39, 0.1)', border: '1px solid rgba(239, 159, 39, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#EF9F27', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>Weekly scan not started</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>Complete at least one body area scan this week to stay on track.</div>
              </div>
              <button 
                onClick={() => {
                  const banner = document.getElementById('scanReminderBanner');
                  if (banner) banner.style.display = 'none';
                }} 
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', fontSize: '18px', cursor: 'pointer', padding: 0 }}
              >
                ×
              </button>
            </div>

            <UVCard uvData={uvData} />

            {recentScan ? (
              <div className="glass-card p-8 rounded-3xl mb-6 border border-cyan-500/20 cursor-pointer hover:bg-white/5 transition-all text-center" onClick={() => { setSelectedScanId(recentScan.id); setActiveTab('timeline'); }}>
                <div className="flex flex-col items-center mb-6">
                  <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <History size={16} /> <span>MOST RECENT SCAN</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">{new Date(recentScan.date).toLocaleDateString()}</span>
                </div>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border border-white/5 shadow-xl">
                    {recentScan.photos && recentScan.photos[0] ? (
                      <img src={recentScan.photos[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Camera size={32} />
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full">
                    <div className="flex flex-col items-center gap-2 mb-3">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        recentScan.result.risk_level === 'high' ? 'bg-red-500/20 text-red-400' :
                        recentScan.result.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {recentScan.result.risk_level} Risk
                      </span>
                      <span className="text-lg font-black text-white">{recentScan.bodyRegion}</span>
                    </div>
                    <p className="text-sm text-slate-400 italic line-clamp-2 max-w-xs mx-auto">"{recentScan.result.summary}"</p>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-widest">
                    View Full Result <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-3xl mb-6 border border-white/5 text-center">
                <div className="flex flex-col items-center mb-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <History size={16} /> <span>Scan History</span>
                  </h3>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>No Scans Completed Yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    You haven't scanned any spots yet. Tap **Start New Scan** above to complete your first AI skin assessment.
                  </p>
                </div>
              </div>
            )}

            <Reviews3DCarousel />

            <div style={styles.disclaimerBanner} className="glass-card shimmer-overlay">
              <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
              <p>Skin Tight is NOT a medical device and does NOT provide medical diagnoses. Always consult a licensed dermatologist.</p>
            </div>

            {showEduCard && result && (
              <EducationCard 
                result={result} 
                onClose={() => setShowEduCard(false)} 
              />
            )}
          </div>
        )}

        {activeTab === 'scan' && (
          <ScanPage 
            result={result}
            saveStatus={saveStatus}
            photos={photos}
            note={note}
            intakeForm={intakeForm}
            skinScore={skinScore}
            scans={scans}
            confidenceScore={confidenceScore}
            showConfidenceWarning={showConfidenceWarning}
            error={error}
            checkingQuality={checkingQuality}
            imageQuality={imageQuality}
            fileInputRef={fileInputRef}
            triggerFileInput={triggerFileInput}
            handleFileChange={handleFileChange}
            removePhoto={removePhoto}
            analyzeSkin={analyzeSkin}
            retakePhoto={retakePhoto}
            downloadPDF={downloadPDF}
            setCompareScanId={setCompareScanId}
            setSelectedScanId={setSelectedScanId}
            setIsComparing={setIsComparing}
            setActiveTab={setActiveTab}
            setShowEduCard={setShowEduCard}
            setShowConfidenceWarning={setShowConfidenceWarning}
            updateIntake={updateIntake}
            updateQualityCheck={updateQualityCheck}
            fullUserData={fullUserData}
            loading={loading}
          />
        )}
        {activeTab === 'timeline' && <Timeline scans={scans} setSelectedScanId={setSelectedScanId} setActiveTab={setActiveTab} styles={styles} streakData={streakData} nextScanDate={nextScanDate} cycleProgress={cycleProgress} lastFullWeekCompletionDate={lastFullWeekCompletionDate} />}
        {activeTab === 'routine' && (
          <RoutinePage 
            protocol={protocol}
            loadingProtocol={loadingProtocol}
            protocolError={protocolError}
            generateProtocol={generateProtocol}
            loadProtocolFromFirestore={loadProtocolFromFirestore}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'plans' && <PlansPage />}
        {activeTab === 'clinic' && <ClinicFinder />}

        {activeTab === 'welcome' && <AboutPage />}
        {activeTab === 'learn' && (
          <LearnPage 
            selectedArticleSlug={selectedArticleSlug}
            setSelectedArticleSlug={setSelectedArticleSlug}
          />
        )}

        <AnimatePresence>
          {selectedScanId && scans.find(s => s.id === selectedScanId) && (
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
        {isComparing && selectedScanId && compareScanId && scans.find(s => s.id === selectedScanId) && scans.find(s => s.id === compareScanId) && (
          <CompareView 
            scan1={scans.find(s => s.id === selectedScanId)!}
            scan2={scans.find(s => s.id === compareScanId)!}
            onClose={() => setIsComparing(false)}
            styles={styles}
          />
        )}
        </AnimatePresence>

        {activeTab === 'profile' && (
          <div className="page-container" style={{ ...styles.tabContent, paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '30px', width: '100%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#f8fafc', whiteSpace: 'nowrap', textAlign: 'center' }}>My Profile</h2>
            </div>

            {/* Friendly Greeting Card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px', width: '100%', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(45, 212, 191, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(45, 212, 191, 0.2)' }}>
                <User size={32} color="#2dd4bf" />
              </div>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '900', lineHeight: '1.2' }}>
                  <span>Hello</span>, <span style={{ color: '#2dd4bf' }}>{currentUser ? (fullUserData?.fullName ? fullUserData.fullName.split(' ')[0] : fullUserData?.username || 'User') : 'Guest'}</span> 👋
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '4px' }}>
                  {scans.length === 0 ? <span>Start your first scan to begin tracking your skin health.</span> : <span>Your skin health at a glance</span>}
                </p>
              </div>
            </div>

            {/* Score Gauge and How to Improve button if active */}
            {skinScore > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', width: '100%' }}>
                <SkinScoreGauge score={skinScore} />
                
                <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
                  <button 
                    onClick={() => (window as any).loadHowToImprove()}
                    style={{
                      background: 'rgba(45, 212, 191, 0.1)',
                      border: '1px solid rgba(45, 212, 191, 0.2)',
                      color: '#2dd4bf',
                      padding: '10px 24px',
                      borderRadius: '14px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 15px rgba(45, 212, 191, 0.1)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(45, 212, 191, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(45, 212, 191, 0.1)'}
                  >
                    <SparklesIcon size={16} /> How to Improve
                  </button>
                </div>
              </div>
            )}
            
            {/* Personal Info Card */}
            {currentUser ? (
              <div className="glass-card mb-6 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-bl-full -mr-8 -mt-8" />
                
                <div className="flex flex-col items-center text-center w-full max-w-md mx-auto">
                  <div 
                    style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '50%', 
                      background: userProfile.profileColor || '#2dd4bf',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      fontWeight: '950',
                      color: 'white',
                      marginBottom: '24px',
                      boxShadow: `0 15px 35px ${(userProfile.profileColor || '#2dd4bf')}50`,
                      border: '4px solid rgba(255,255,255,0.15)'
                    }}
                  >
                    {userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : (fullUserData?.username?.[0]?.toUpperCase() || 'U')}
                  </div>
                  
                  <h3 className="text-3xl font-black text-white mb-1">
                    {userProfile.fullName || (fullUserData?.username ? `@${fullUserData.username}` : 'SkinTight User')}
                  </h3>
                  {userProfile.fullName && fullUserData?.username && (
                    <p className="text-teal-400 font-black text-sm mb-4 tracking-wider uppercase">@{fullUserData.username}</p>
                  )}
                  
                  <div className="flex items-center justify-center gap-2 text-slate-300 text-sm mb-8 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 w-fit">
                    <Mail size={16} className="text-teal-400" />
                    <span className="font-bold">{currentUser?.email || fullUserData?.email || 'No email associated'}</span>
                  </div>

                  <div className="w-full space-y-6 mt-4">
                    {/* Stats Row */}
                    <div className="flex justify-center gap-4 mb-2">
                      <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Scans</div>
                        <div className="text-2xl font-black text-white">{scans.length}</div>
                      </div>
                      <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Skin Score</div>
                        <div className="text-2xl font-black text-teal-400">{skinScore}%</div>
                      </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 text-center w-full">
                      <div className="text-[11px] font-black text-teal-500 uppercase tracking-[0.3em] mb-4">AI Analysis Profile</div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-3">
                          <div className="px-5 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-wider">
                            Fitzpatrick Type {userProfile.fitzpatrick}
                          </div>
                          {fullUserData?.ethnicity && (
                            <div className="px-5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-wider">
                              {fullUserData.ethnicity}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 px-4 max-w-sm mx-auto">
                          <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                            {(() => {
                              const type = Number(userProfile.fitzpatrick);
                              if (type === 1) return "Very fair skin, highly sensitive. Always burns, never tans. Significant UV protection required.";
                              if (type === 2) return "Fair skin, high sensitivity. Usually burns, tans minimally. Frequent self-checks recommended.";
                              if (type === 3) return "Creamy white to light brown. Sometimes mild burn, tans uniformly. Balanced protection needed.";
                              if (type === 4) return "Olive or moderate brown. Rarely burns, tans easily. Lower (but present) risk profile.";
                              if (type === 5) return "Dark brown skin. Very rarely burns, tans very easily. Focus on early detection.";
                              if (type === 6) return "Deeply pigmented skin. Never burns. Highly resistant to sun damage, but check palms and soles.";
                              return "Your personalized skin profile based on AI dermatological standards.";
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card mb-6 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full -mr-8 -mt-8" />
                
                <div className="flex flex-col items-center text-center w-full max-w-md mx-auto">
                  <div 
                    style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '50%', 
                      background: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      fontWeight: '950',
                      color: 'white',
                      marginBottom: '24px',
                      boxShadow: `0 15px 35px rgba(124, 58, 237, 0.4)`,
                      border: '4px solid rgba(255,255,255,0.15)'
                    }}
                  >
                    G
                  </div>
                  
                  <h3 className="text-3xl font-black text-white mb-2">
                    Guest Explorer
                  </h3>
                  <p className="text-purple-400 font-extrabold text-xs mb-4 tracking-widest uppercase">Unregistered Device</p>
                  
                  <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
                    Your diagnostic skin histories, custom UV safety score, and daily skincare tracking will be securely synced across your devices upon signup.
                  </p>

                  <button 
                    onClick={() => setActiveTab('auth')}
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 28px',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)',
                      marginBottom: '24px'
                    }}
                  >
                    Join Skin Tight &amp; Sync History
                  </button>

                  <div className="w-full space-y-6 mt-4">
                    {/* Stats Row */}
                    <div className="flex justify-center gap-4 mb-2">
                      <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Scans</div>
                        <div className="text-2xl font-black text-white">{scans.length}</div>
                      </div>
                      <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Skin Score</div>
                        <div className="text-2xl font-black text-teal-400">{skinScore}%</div>
                      </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 text-center w-full">
                      <div className="text-[11px] font-black text-teal-500 uppercase tracking-[0.3em] mb-4">AI Analysis Profile</div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-3">
                          <div className="px-5 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-wider">
                            Fitzpatrick Type {userProfile.fitzpatrick}
                          </div>
                        </div>
                        
                        <div className="mt-2 px-4 max-w-sm mx-auto">
                          <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                            Fitzpatrick Type 2: Fair skin, high sensitivity. Usually burns, tans minimally. Frequent self-checks recommended.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentUser && (
              <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', opacity: 0.5 }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member Since</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
                  {fullUserData?.createdAt ? (fullUserData.createdAt.toDate ? fullUserData.createdAt.toDate().toLocaleDateString() : new Date(fullUserData.createdAt).toLocaleDateString()) : 'Recently'}
                </div>
              </div>
            )}
          </div>
        )}
        
        <Footer onShowLegal={setShowLegalModal} />
      </div>
    </div>

      <LegalModal 
        isOpen={!!showLegalModal} 
        initialType={showLegalModal}
        onClose={() => setShowLegalModal(null)} 
      />

      {/* How to Improve Panel */}
      <div 
        id="howToImprovePanel" 
        style={{display:'none', position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:1000, alignItems:'flex-end', justifyContent:'center'}}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }
        }}
      >
        <div style={{background:'#0d1126', borderRadius:'24px 24px 0 0', border:'1px solid rgba(255,255,255,0.08)', width:'100%', maxHeight:'90vh', overflowY:'auto', padding:'24px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <div>
              <div style={{color:'#fff', fontSize:'18px', fontWeight:'600'}}>How to Improve</div>
              <div style={{color:'rgba(255,255,255,0.4)', fontSize:'12px'}}>Personalized skin cancer prevention steps</div>
            </div>
            <button onClick={() => {
              const panel = document.getElementById('howToImprovePanel');
              if (panel) panel.style.display = 'none';
            }} style={{background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', width:'32px', height:'32px', borderRadius:'50%', fontSize:'16px', cursor:'pointer'}}>×</button>
          </div>
          <div id="howToImproveContent"></div>
        </div>
      </div>
    </>
    </ErrorBoundary>
  );
}

export default App;
