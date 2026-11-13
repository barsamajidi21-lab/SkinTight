import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { ref as storageRef, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';
import {
  Clinic,
  ClinicCase,
  ClinicAuditLog,
  RulesConfig,
  TriageColor,
  CaseStatus,
  DemoRequestPayload
} from '../types/clinic';
import { DEFAULT_DRAFT_RULES_CONFIG, evaluateTriageRules } from './triageRulesEngine';
import { IntakeForm } from '../App';

import demoSpotRedImg from '../assets/images/demo_spot_red_1794534364042.jpg';
import demoSpotYellowImg from '../assets/images/demo_spot_yellow_1794534364252.jpg';
import demoSpotGreenImg from '../assets/images/demo_spot_green_1794534367271.jpg';

// Real Clinic Configuration (authenticated multi-tenant workspace)
export const TEST_CLINIC: Clinic = {
  id: 'clinic-a',
  name: 'Dermatology Practice A',
  address: 'Suite 100, Medical Plaza',
  phone: '(555) 010-0198',
  email: 'triage@clinic-a.example.com',
  urgentInstruction: 'Offer the next available urgent slot and notify the triage nurse immediately.',
  yellowInstruction: 'Schedule standard in-person consultation within 2–3 weeks.',
  greenInstruction: 'Schedule routine periodic skin check.',
  activeRulesVersion: 'v1.0-DRAFT',
  isDemo: false,
};

// Completely Separate Demo Clinic Configuration (fictional in-memory sandbox)
export const DEMO_CLINIC: Clinic = {
  id: 'demo-practice',
  name: 'Demo Dermatology Practice',
  address: 'Interactive Demo Environment (Fictional Data)',
  phone: '(555) 010-0000',
  email: 'demo@skintightai.example',
  urgentInstruction: 'Offer the next available urgent slot and notify the triage nurse immediately.',
  yellowInstruction: 'Schedule standard in-person visit within 2–3 weeks.',
  greenInstruction: 'Schedule routine periodic skin check.',
  activeRulesVersion: 'v1.0-DRAFT',
  isDemo: true,
};

export const DEMO_CLINIC_ID = DEMO_CLINIC.id;

export function isDemoClinic(clinicId?: string): boolean {
  return clinicId === DEMO_CLINIC_ID;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

function createInitialRealCases(): ClinicCase[] {
  return [
    {
      id: 'case_red_101',
      clinicId: 'clinic-a',
      patientName: 'Patient R.',
      patientEmail: 'patient.r@example.com',
      patientPhone: '(555) 010-2341',
      patientAgeRange: '60+',
      dateSubmitted: minsAgo(165),
      color: 'red',
      why: [
        'Bleeding without injury reported',
        'Sore or spot not healing for more than 3–4 weeks',
        'Spot growing or changing over weeks to a few months',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotRedImg],
      answers: {
        bodyLocation: 'Right Forearm',
        exactBodyLocation: 'Back of forearm near wrist',
        lesionFirstNoticedDate: '5 weeks ago',
        newOrChanged: 'Existing spot that changed',
        changeTimePeriod: 'Over weeks to a few months',
        colorChange: 'Dark brown and pink crusting',
        sizeChange: 'Growing larger (now ~7mm)',
        bleeding: 'Yes, without injury',
        nonHealing: 'Yes (> 3-4 weeks)',
        painOrSensation: 'Tenderness and mild itching',
        personalCancerHistory: 'Basal Cell Carcinoma (2022)',
        familyCancerHistory: 'No family history',
        sunburnOrTanningHistory: 'Frequent sunburns during outdoor work',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Patient reports a 5-week spot on the right forearm with spontaneous bleeding and gradual growth. Prior history of BCC (2022).',
      status: 'new',
    },
    {
      id: 'case_yel_102',
      clinicId: 'clinic-a',
      patientName: 'Patient E.',
      patientEmail: 'patient.e@example.com',
      patientPhone: '(555) 010-8842',
      patientAgeRange: '40-59',
      dateSubmitted: minsAgo(240),
      color: 'yellow',
      why: [
        'New spot reported by patient',
        'Itching, pain, or tenderness reported',
        'Personal or family history of skin cancer',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotYellowImg],
      answers: {
        bodyLocation: 'Upper Back',
        exactBodyLocation: 'Left shoulder blade area',
        lesionFirstNoticedDate: '3 months ago',
        newOrChanged: 'New spot',
        changeTimePeriod: 'Stable over months',
        colorChange: 'Uniform light brown',
        sizeChange: 'Approximately 4mm, unchanged',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'Intermittent itching',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'Melanoma in maternal aunt',
        sunburnOrTanningHistory: 'Occasional sunburns as a teen',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Patient noticed a new brown spot on the left upper back ~3 months ago with occasional itching. Family history of melanoma.',
      status: 'new',
    },
    {
      id: 'case_grn_103',
      clinicId: 'clinic-a',
      patientName: 'Patient M.',
      patientEmail: 'patient.m@example.com',
      patientPhone: '(555) 010-7123',
      patientAgeRange: '20-39',
      dateSubmitted: hoursAgo(6),
      color: 'green',
      why: [
        'No change, no symptoms, no personal or family history of skin cancer, and all required answers are complete',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotGreenImg],
      answers: {
        bodyLocation: 'Left Shoulder',
        exactBodyLocation: 'Front left shoulder',
        lesionFirstNoticedDate: 'Lifelong mole',
        newOrChanged: 'Existing spot unchanged',
        changeTimePeriod: 'Unchanged for years',
        colorChange: 'Uniform brown',
        sizeChange: 'Stable ~3mm',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'None',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'No family history',
        sunburnOrTanningHistory: 'Regular daily SPF use',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Routine check of a stable lifelong mole on the left shoulder. No reported symptoms or skin cancer history.',
      status: 'new',
    },
  ];
}

function createInitialDemoCases(): ClinicCase[] {
  return [
    {
      id: 'demo_case_01',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient A.',
      patientEmail: 'patient.a@example.com',
      patientPhone: '(555) 010-0101',
      patientAgeRange: '60+',
      dateSubmitted: hoursAgo(5.5),
      color: 'red',
      why: [
        'Bleeding without injury reported',
        'Sore or spot not healing for more than 3–4 weeks',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotRedImg],
      answers: {
        bodyLocation: 'Right Forearm',
        exactBodyLocation: 'Outer forearm above wrist',
        lesionFirstNoticedDate: '6 weeks ago',
        newOrChanged: 'Existing spot that changed',
        changeTimePeriod: 'Over weeks to a few months',
        colorChange: 'Dark brown with pink center',
        sizeChange: 'Growing larger (~7mm)',
        bleeding: 'Yes, without injury',
        nonHealing: 'Yes (> 3-4 weeks)',
        painOrSensation: 'Tenderness',
        personalCancerHistory: 'Basal Cell Carcinoma (2021)',
        familyCancerHistory: 'No family history',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient reports a 6-week spot on the right forearm that bled without injury and has not healed.',
      status: 'new',
    },
    {
      id: 'demo_case_02',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient B.',
      patientEmail: 'patient.b@example.com',
      patientPhone: '(555) 010-0102',
      patientAgeRange: '40-59',
      dateSubmitted: hoursAgo(26),
      color: 'red',
      why: [
        'New dark or multicolored spot in an adult over 40',
        'Personal history of melanoma and a new or changing spot',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotRedImg, demoSpotYellowImg],
      answers: {
        bodyLocation: 'Upper Back',
        exactBodyLocation: 'Right shoulder blade',
        lesionFirstNoticedDate: '1 month ago',
        newOrChanged: 'New spot',
        changeTimePeriod: 'Over weeks to a few months',
        colorChange: 'Dark black / Multicolor',
        sizeChange: 'Growing wider',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'None reported',
        personalCancerHistory: 'Melanoma',
        familyCancerHistory: 'Melanoma in first-degree relative',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient age 40–59 with prior melanoma history reporting a new multi-colored spot on the upper back.',
      status: 'reviewed',
      reviewedAt: hoursAgo(23),
      statusUpdatedBy: 'Nurse R., RN',
    },
    {
      id: 'demo_case_03',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient C.',
      patientEmail: 'patient.c@example.com',
      patientPhone: '(555) 010-0103',
      patientAgeRange: '40-59',
      dateSubmitted: hoursAgo(11),
      color: 'yellow',
      why: [
        'New spot reported by patient',
        'Itching, pain, or tenderness reported',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotYellowImg],
      answers: {
        bodyLocation: 'Chest',
        exactBodyLocation: 'Left upper chest',
        lesionFirstNoticedDate: '2 months ago',
        newOrChanged: 'New spot',
        changeTimePeriod: 'Over weeks to a few months',
        colorChange: 'Uniform light brown',
        sizeChange: 'About 4mm',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'Itching',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'No family history',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient reports a new itchy light-brown spot on the upper chest noticed ~2 months ago.',
      status: 'new',
    },
    {
      id: 'demo_case_04',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient D.',
      patientEmail: 'patient.d@example.com',
      patientPhone: '(555) 010-0104',
      patientAgeRange: '20-39',
      dateSubmitted: hoursAgo(50),
      color: 'yellow',
      why: [
        'Changed spot without red-flag features',
        'Personal or family history of skin cancer',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotYellowImg],
      answers: {
        bodyLocation: 'Lower Back',
        exactBodyLocation: 'Mid-lumbar area',
        lesionFirstNoticedDate: '1 year ago',
        newOrChanged: 'Existing spot that changed',
        changeTimePeriod: 'Slowly over a year or more',
        colorChange: 'Slightly darker tan',
        sizeChange: '5mm',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'None reported',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'Melanoma in extended relative',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient notes slight darkening of an existing lower-back mole over a year. Family history of skin cancer.',
      override: {
        originalColor: 'green',
        overriddenColor: 'yellow',
        reason: 'Staff upgraded from Green after patient clarified family melanoma history on follow-up call.',
        overriddenBy: 'Nurse R., RN',
        timestamp: hoursAgo(47),
      },
      status: 'scheduled',
      reviewedAt: hoursAgo(48),
      scheduledAt: hoursAgo(45),
      statusUpdatedBy: 'Staff K.',
    },
    {
      id: 'demo_case_05',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient E.',
      patientEmail: 'patient.e@example.com',
      patientPhone: '(555) 010-0105',
      patientAgeRange: '40-59',
      dateSubmitted: hoursAgo(195), // ~8 days ago (previous week)
      color: 'red',
      why: ['Bleeding without injury reported'],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotRedImg],
      answers: {
        bodyLocation: 'Neck',
        exactBodyLocation: 'Left side of neck',
        lesionFirstNoticedDate: '3 weeks ago',
        newOrChanged: 'New spot',
        changeTimePeriod: 'Rapidly over days/weeks',
        colorChange: 'Pink / pearly',
        sizeChange: 'Growing',
        bleeding: 'Yes, without injury',
        nonHealing: 'Crusting and reforming',
        painOrSensation: 'Tenderness',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'No family history',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo phone intake for a crusting neck spot that bled spontaneously.',
      isPhoneIntake: true,
      intakeStaffName: 'Staff K.',
      status: 'closed',
      reviewedAt: hoursAgo(193.5),
      scheduledAt: hoursAgo(191),
      closedAt: hoursAgo(150),
      statusUpdatedBy: 'Dr. J., MD',
    },
    {
      id: 'demo_case_06',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient F.',
      patientEmail: 'patient.f@example.com',
      patientPhone: '(555) 010-0106',
      patientAgeRange: '20-39',
      dateSubmitted: hoursAgo(3.2),
      color: 'green',
      why: [
        'No change, no symptoms, no personal or family history of skin cancer, and all required answers are complete',
      ],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotGreenImg],
      answers: {
        bodyLocation: 'Left Shoulder',
        exactBodyLocation: 'Upper outer left arm',
        lesionFirstNoticedDate: 'Since childhood',
        newOrChanged: 'Existing spot unchanged',
        changeTimePeriod: 'Has not changed',
        colorChange: 'Uniform light brown',
        sizeChange: '3mm',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'None reported',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'No family history',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient requesting a baseline photo log for a stable childhood mole on the left shoulder.',
      status: 'new',
    },
    {
      id: 'demo_case_07',
      clinicId: DEMO_CLINIC_ID,
      patientName: 'Patient G.',
      patientEmail: 'patient.g@example.com',
      patientPhone: '(555) 010-0107',
      patientAgeRange: '20-39',
      dateSubmitted: hoursAgo(210), // ~8.75 days ago (previous week)
      color: 'yellow',
      why: ['Required answer missing or "not sure"'],
      rulesVersion: 'v1.0-DRAFT',
      photos: [demoSpotGreenImg],
      answers: {
        bodyLocation: 'Legs',
        exactBodyLocation: 'Right calf',
        lesionFirstNoticedDate: 'Not sure',
        newOrChanged: 'Not sure',
        changeTimePeriod: 'Not sure',
        colorChange: 'Uniform brown',
        bleeding: 'None reported',
        nonHealing: 'None reported',
        painOrSensation: 'None reported',
        personalCancerHistory: 'No personal history',
        familyCancerHistory: 'Not sure',
        immuneSuppressing: 'No',
      },
      patientSummary: 'Fictional demo patient unsure when spot appeared on right calf. Assigned Yellow per safety default.',
      override: {
        originalColor: 'yellow',
        overriddenColor: 'green',
        reason: 'Confirmed stable benign-appearing spot timeline on phone check-in; scheduled routine exam.',
        overriddenBy: 'Dr. J., MD',
        timestamp: hoursAgo(206),
      },
      status: 'scheduled',
      reviewedAt: hoursAgo(207),
      scheduledAt: hoursAgo(204),
      statusUpdatedBy: 'Nurse R., RN',
    },
  ];
}

function createInitialDemoAuditLogs(): ClinicAuditLog[] {
  return [
    {
      id: 'demo_log_1',
      clinicId: DEMO_CLINIC_ID,
      action: 'rules_update',
      staffEmail: 'admin@demo.example',
      staffName: 'Dr. J., MD',
      staffRole: 'clinic_admin',
      details: 'Starter draft rules loaded: v1.0-DRAFT (Pending physician approval).',
      timestamp: hoursAgo(240),
    },
    {
      id: 'demo_log_2',
      clinicId: DEMO_CLINIC_ID,
      action: 'case_override',
      caseId: 'demo_case_04',
      patientName: 'Patient D.',
      staffEmail: 'nurse.r@demo.example',
      staffName: 'Nurse R., RN',
      staffRole: 'clinic_staff',
      details: 'Category changed from GREEN to YELLOW. Reason: "Staff upgraded from Green after patient clarified family melanoma history on follow-up call."',
      timestamp: hoursAgo(47),
    },
    {
      id: 'demo_log_3',
      clinicId: DEMO_CLINIC_ID,
      action: 'case_status_change',
      caseId: 'demo_case_02',
      patientName: 'Patient B.',
      staffEmail: 'nurse.r@demo.example',
      staffName: 'Nurse R., RN',
      staffRole: 'clinic_staff',
      details: 'Case status changed from NEW to REVIEWED.',
      timestamp: hoursAgo(23),
    },
  ];
}

// Isolated in-memory stores for Real Clinics vs Demo Sandbox
let localCasesCache: ClinicCase[] = createInitialRealCases();
let localAuditLogs: ClinicAuditLog[] = [
  {
    id: 'log-seed-1',
    clinicId: 'clinic-a',
    action: 'rules_update',
    staffEmail: 'admin@clinic-a.example.com',
    staffName: 'Dr. J., MD',
    staffRole: 'clinic_admin',
    details: 'Initial starter rules loaded: v1.0-DRAFT (Pending physician approval)',
    timestamp: hoursAgo(24),
  },
];
let localRulesConfig: RulesConfig = { ...DEFAULT_DRAFT_RULES_CONFIG };
let localRulesHistory: RulesConfig[] = [{ ...DEFAULT_DRAFT_RULES_CONFIG }];

let demoCasesStore: ClinicCase[] = createInitialDemoCases();
let demoAuditLogsStore: ClinicAuditLog[] = createInitialDemoAuditLogs();
let demoRulesStore: RulesConfig = { ...DEFAULT_DRAFT_RULES_CONFIG };
let demoRulesHistoryStore: RulesConfig[] = [{ ...DEFAULT_DRAFT_RULES_CONFIG }];

export function resetDemoData(): {
  cases: ClinicCase[];
  rules: RulesConfig;
  logs: ClinicAuditLog[];
} {
  demoCasesStore = createInitialDemoCases();
  demoAuditLogsStore = createInitialDemoAuditLogs();
  demoRulesStore = { ...DEFAULT_DRAFT_RULES_CONFIG, updatedAt: new Date().toISOString() };
  demoRulesHistoryStore = [{ ...demoRulesStore }];
  return {
    cases: sortClinicCases(demoCasesStore),
    rules: demoRulesStore,
    logs: [...demoAuditLogsStore],
  };
}

function sortClinicCases(cases: ClinicCase[]): ClinicCase[] {
  // Default sort: Red first, then Yellow, then Green; within each color, longest waiting first
  const colorWeight: Record<TriageColor, number> = { red: 3, yellow: 2, green: 1 };
  return [...cases].sort((a, b) => {
    const aColor = a.override?.overriddenColor || a.color;
    const bColor = b.override?.overriddenColor || b.color;
    const diff = colorWeight[bColor] - colorWeight[aColor];
    if (diff !== 0) return diff;
    return new Date(a.dateSubmitted).getTime() - new Date(b.dateSubmitted).getTime();
  });
}

/**
 * Log a strict audit trail event. Write-only.
 */
export async function logClinicAudit(
  clinicId: string,
  entry: Omit<ClinicAuditLog, 'id' | 'clinicId' | 'timestamp'>
): Promise<ClinicAuditLog> {
  const newLog: ClinicAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    clinicId,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  if (isDemoClinic(clinicId)) {
    demoAuditLogsStore.unshift(newLog);
    return newLog;
  }

  localAuditLogs.unshift(newLog);

  try {
    if (db) {
      await addDocToClinicCollection(clinicId, 'auditLogs', {
        ...newLog,
        serverTime: serverTimestamp(),
      });
    }
  } catch {
    // Kept in memory cache
  }

  return newLog;
}

async function addDocToClinicCollection(clinicId: string, subcollection: string, payload: any) {
  if (isDemoClinic(clinicId)) return;
  await setDoc(doc(db, 'clinics', clinicId, subcollection, payload.id), payload);
}

/**
 * Fetch all audit logs for a clinic
 */
export async function getClinicAuditLogs(clinicId: string): Promise<ClinicAuditLog[]> {
  if (isDemoClinic(clinicId)) {
    return [...demoAuditLogsStore].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  try {
    if (db) {
      const q = query(collection(db, 'clinics', clinicId, 'auditLogs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreLogs: ClinicAuditLog[] = [];
        snap.forEach(d => {
          firestoreLogs.push({ id: d.id, ...d.data() } as ClinicAuditLog);
        });
        return firestoreLogs;
      }
    }
  } catch {
    // Fall back to local logs
  }
  return localAuditLogs.filter(l => l.clinicId === clinicId);
}

/**
 * Fetch Clinic Cases sorted Red -> Yellow -> Green, longest waiting first within each color
 */
export async function getClinicCases(clinicId: string): Promise<ClinicCase[]> {
  if (isDemoClinic(clinicId)) {
    return sortClinicCases(demoCasesStore);
  }

  let cases: ClinicCase[] = [];

  try {
    if (db) {
      const snap = await getDocs(collection(db, 'clinics', clinicId, 'cases'));
      if (!snap.empty) {
        snap.forEach(d => {
          cases.push({ id: d.id, ...d.data() } as ClinicCase);
        });
      }
    }
  } catch {
    // Use local cache
  }

  if (cases.length === 0) {
    cases = localCasesCache.filter(c => c.clinicId === clinicId);
  }

  return sortClinicCases(cases);
}

/**
 * Submit a new Clinic Case (From Patient Intake Link or Phone Script)
 */
export async function submitClinicCase(
  clinicId: string,
  patientName: string,
  answers: Partial<IntakeForm>,
  photosBase64: string[],
  meta: {
    patientEmail?: string;
    patientPhone?: string;
    isPhoneIntake?: boolean;
    staffName?: string;
    staffEmail?: string;
  }
): Promise<ClinicCase> {
  const isDemo = isDemoClinic(clinicId);
  const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const uploadedStoragePaths: string[] = [];
  if (photosBase64 && photosBase64.length > 0) {
    for (let i = 0; i < photosBase64.length; i++) {
      const photo = photosBase64[i];
      if (!isDemo && photo && photo.startsWith('data:')) {
        try {
          const photoId = `photo_${Date.now()}_${i}.jpg`;
          const path = `clinics/${clinicId}/cases/${caseId}/photos/${photoId}`;
          const fileRef = storageRef(storage, path);
          await uploadString(fileRef, photo, 'data_url');
          uploadedStoragePaths.push(path);
        } catch {
          uploadedStoragePaths.push(photo);
        }
      } else if (photo) {
        uploadedStoragePaths.push(photo);
      }
    }
  }

  const activeRules = isDemo ? demoRulesStore : localRulesConfig;
  const evaluation = evaluateTriageRules(answers, activeRules);

  const summaryText = `Patient logged a spot at ${answers.bodyLocation || 'skin'}${answers.exactBodyLocation ? ` (${answers.exactBodyLocation})` : ''}, noticed ${answers.lesionFirstNoticedDate || 'date not specified'}. Status: ${answers.newOrChanged || 'Unspecified'}. Symptoms: ${[answers.bleeding, answers.painOrSensation, answers.nonHealing].filter(Boolean).join(', ') || 'None reported'}.`;

  const newCase: ClinicCase = {
    id: caseId,
    clinicId,
    patientName,
    patientEmail: meta.patientEmail,
    patientPhone: meta.patientPhone,
    patientAgeRange: answers.ageRange,
    dateSubmitted: new Date().toISOString(),
    color: evaluation.color,
    why: evaluation.why,
    rulesVersion: evaluation.rulesVersion,
    photos: uploadedStoragePaths,
    answers,
    patientSummary: summaryText,
    isPhoneIntake: meta.isPhoneIntake,
    intakeStaffName: meta.staffName,
    status: 'new',
  };

  if (isDemo) {
    demoCasesStore.unshift(newCase);
  } else {
    localCasesCache.unshift(newCase);
    try {
      if (db) {
        await setDoc(doc(db, 'clinics', clinicId, 'cases', caseId), newCase);
      }
    } catch {
      // Retained in memory cache
    }
  }

  await logClinicAudit(clinicId, {
    action: meta.isPhoneIntake ? 'phone_intake_submit' : 'patient_intake_submit',
    caseId,
    patientName,
    staffEmail: meta.staffEmail || 'patient.intake@portal.skintight',
    staffName: meta.staffName || 'Online Patient Intake',
    staffRole: meta.isPhoneIntake ? 'clinic_staff' : 'system',
    details: `${meta.isPhoneIntake ? 'Phone script' : 'Patient intake link'} completed. Category assigned: ${evaluation.color.toUpperCase()} (${evaluation.why.join('; ')}).`,
  });

  return newCase;
}

/**
 * Update case status: New -> Reviewed -> Scheduled -> Closed
 */
export async function updateCaseStatus(
  clinicId: string,
  caseId: string,
  newStatus: CaseStatus,
  staffName: string,
  staffEmail: string,
  staffRole: 'clinic_staff' | 'clinic_admin' = 'clinic_staff'
): Promise<ClinicCase> {
  const isDemo = isDemoClinic(clinicId);
  const store = isDemo ? demoCasesStore : localCasesCache;
  const targetCase = store.find(c => c.id === caseId);
  if (!targetCase) throw new Error('Case not found');

  const previousStatus = targetCase.status;
  const nowIso = new Date().toISOString();

  targetCase.status = newStatus;
  targetCase.statusUpdatedBy = staffName;
  if (newStatus === 'reviewed' && !targetCase.reviewedAt) {
    targetCase.reviewedAt = nowIso;
  } else if (newStatus === 'scheduled') {
    if (!targetCase.reviewedAt) targetCase.reviewedAt = nowIso;
    if (!targetCase.scheduledAt) targetCase.scheduledAt = nowIso;
  } else if (newStatus === 'closed') {
    if (!targetCase.reviewedAt) targetCase.reviewedAt = nowIso;
    if (!targetCase.scheduledAt) targetCase.scheduledAt = nowIso;
    targetCase.closedAt = nowIso;
  }

  if (!isDemo) {
    try {
      if (db) {
        await updateDoc(doc(db, 'clinics', clinicId, 'cases', caseId), {
          status: targetCase.status,
          statusUpdatedBy: staffName,
          ...(targetCase.reviewedAt ? { reviewedAt: targetCase.reviewedAt } : {}),
          ...(targetCase.scheduledAt ? { scheduledAt: targetCase.scheduledAt } : {}),
          ...(targetCase.closedAt ? { closedAt: targetCase.closedAt } : {}),
        });
      }
    } catch {
      // Updated in memory
    }
  }

  await logClinicAudit(clinicId, {
    action: 'case_status_change',
    caseId,
    patientName: targetCase.patientName,
    staffEmail,
    staffName,
    staffRole,
    details: `Case status changed from ${previousStatus.toUpperCase()} to ${newStatus.toUpperCase()}.`,
  });

  return { ...targetCase };
}

/**
 * Override the rule-assigned color with a mandatory reason
 */
export async function overrideCaseColor(
  clinicId: string,
  caseId: string,
  newColor: TriageColor,
  reason: string,
  staffName: string,
  staffEmail: string
): Promise<ClinicCase> {
  const isDemo = isDemoClinic(clinicId);
  const store = isDemo ? demoCasesStore : localCasesCache;
  const targetCase = store.find(c => c.id === caseId);
  if (!targetCase) throw new Error('Case not found');

  const previousColor = targetCase.override?.overriddenColor || targetCase.color;

  const overrideData = {
    originalColor: targetCase.color,
    overriddenColor: newColor,
    reason,
    overriddenBy: staffName,
    timestamp: new Date().toISOString(),
  };

  targetCase.override = overrideData;

  if (!isDemo) {
    try {
      if (db) {
        await updateDoc(doc(db, 'clinics', clinicId, 'cases', caseId), {
          override: overrideData,
        });
      }
    } catch {
      // Updated in memory
    }
  }

  await logClinicAudit(clinicId, {
    action: 'case_override',
    caseId,
    patientName: targetCase.patientName,
    staffEmail,
    staffName,
    staffRole: 'clinic_staff',
    details: `Category manually changed from ${previousColor.toUpperCase()} to ${newColor.toUpperCase()}. Staff reason: "${reason}"`,
  });

  return { ...targetCase };
}

/**
 * Get current active rules configuration for clinic
 */
export async function getClinicRules(clinicId: string): Promise<RulesConfig> {
  if (isDemoClinic(clinicId)) {
    return demoRulesStore;
  }

  try {
    if (db) {
      const snap = await getDoc(doc(db, 'clinics', clinicId, 'rules', 'current'));
      if (snap.exists()) {
        return snap.data() as RulesConfig;
      }
    }
  } catch {
    // Return local config
  }
  return localRulesConfig;
}

/**
 * Get version history of rules for clinic
 */
export async function getClinicRulesHistory(clinicId: string): Promise<RulesConfig[]> {
  if (isDemoClinic(clinicId)) {
    return [...demoRulesHistoryStore];
  }

  try {
    if (db) {
      const snap = await getDocs(collection(db, 'clinics', clinicId, 'rulesHistory'));
      if (!snap.empty) {
        const list: RulesConfig[] = [];
        snap.forEach(d => list.push(d.data() as RulesConfig));
        return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    }
  } catch {
    // Fall back to local history
  }
  return [...localRulesHistory];
}

/**
 * Save updated rules configuration with physician approval record
 */
export async function saveClinicRules(
  clinicId: string,
  updatedConfig: RulesConfig,
  staffEmail: string,
  staffName: string
): Promise<RulesConfig> {
  const savedConfig: RulesConfig = {
    ...updatedConfig,
    updatedAt: new Date().toISOString(),
  };

  if (isDemoClinic(clinicId)) {
    demoRulesStore = savedConfig;
    demoRulesHistoryStore.unshift(savedConfig);
  } else {
    localRulesConfig = savedConfig;
    localRulesHistory.unshift(savedConfig);

    try {
      if (db) {
        await setDoc(doc(db, 'clinics', clinicId, 'rules', 'current'), savedConfig);
        await setDoc(doc(db, 'clinics', clinicId, 'rulesHistory', savedConfig.version), savedConfig);
      }
    } catch {
      // Saved in memory
    }
  }

  await logClinicAudit(clinicId, {
    action: 'rules_update',
    staffEmail,
    staffName,
    staffRole: 'clinic_admin',
    details: `Rules updated to ${savedConfig.version} (${savedConfig.label}). Physician approval: ${savedConfig.approvedBy || 'Pending'} on ${savedConfig.approvedDate || 'Pending'}. Active rules: ${savedConfig.rules.filter(r => r.enabled).length}`,
  });

  return savedConfig;
}

/**
 * Submit Clinic B2B Demo Request to Firestore /demoRequests and backend email relay
 */
export async function submitDemoRequest(payload: DemoRequestPayload): Promise<{ emailSent: boolean; message: string }> {
  const requestId = `demo_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const docPayload = {
    name: payload.name.trim(),
    practiceName: payload.practiceName.trim(),
    role: payload.role.trim(),
    workEmail: payload.workEmail.trim(),
    phone: payload.phone.trim(),
    message: (payload.message || '').trim(),
    createdAt: new Date().toISOString(),
  };

  const firestorePromise = db
    ? Promise.race([
        setDoc(doc(db, 'demoRequests', requestId), docPayload),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]).catch(() => undefined)
    : Promise.resolve();

  const apiPromise = fetch('/api/demo-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docPayload),
  })
    .then(async (resp) => {
      if (resp.ok) {
        const data = await resp.json();
        return { emailSent: !!data.emailSent, message: data.message || 'Demo request received.' };
      }
      return null;
    })
    .catch(() => null);

  const [, apiResult] = await Promise.all([firestorePromise, apiPromise]);
  if (apiResult) {
    return apiResult;
  }

  return { emailSent: false, message: 'Thank you. Your demo request has been saved for follow-up.' };
}
