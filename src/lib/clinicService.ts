import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
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
  TriageColor 
} from '../types/clinic';
import { DEFAULT_DRAFT_RULES_CONFIG, evaluateTriageRules } from './triageRulesEngine';
import { IntakeForm } from '../App';
import { AI_SUMMARY_ENABLED } from '../config/compliance';

// Standard Preloaded Fake Test Clinic
export const TEST_CLINIC: Clinic = {
  id: 'austin-derm-associates',
  name: 'Austin Dermatology & Skin Surgery Center',
  address: '1201 W 38th St, Suite 400, Austin, TX 78705',
  phone: '(512) 555-0198',
  email: 'triage@austindermsurgery.com',
  urgentInstruction: 'Offer the next available urgent slot and notify the triage nurse immediately.',
  yellowInstruction: 'Schedule standard in-person consultation within 2–3 weeks.',
  greenInstruction: 'Schedule routine periodic preventive skin check.',
  activeRulesVersion: 'v1.0-DRAFT',
};

// Initial Seed Cases for Test Clinic
const INITIAL_SEED_CASES: ClinicCase[] = [
  {
    id: 'case_red_101',
    clinicId: 'austin-derm-associates',
    patientName: 'Robert Vance',
    patientEmail: 'r.vance@example.com',
    patientPhone: '(512) 555-2341',
    patientAgeRange: '60+',
    dateSubmitted: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    color: 'red',
    why: [
      'Bleeding without injury reported',
      'Sore or spot not healing for more than 3–4 weeks',
      'Spot growing or changing over weeks to a few months',
    ],
    rulesVersion: 'v1.0-DRAFT',
    photos: ['https://picsum.photos/seed/derm1/400/400'],
    answers: {
      bodyLocation: 'Right Forearm',
      exactBodyLocation: 'Dorsal forearm near wrist',
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
    patientSummary: 'Patient reports persistent 5-week lesion on right forearm with spontaneous bleeding and gradual size increase. Prior history of BCC in 2022.',
    status: 'new',
  },
  {
    id: 'case_yel_102',
    clinicId: 'austin-derm-associates',
    patientName: 'Elena Rostova',
    patientEmail: 'elena.rostova@example.com',
    patientPhone: '(512) 555-8842',
    patientAgeRange: '40-59',
    dateSubmitted: new Date(Date.now() - 150 * 60 * 1000).toISOString(), // 2.5 hours ago
    color: 'yellow',
    why: [
      'New spot reported by patient',
      'Itching, pain, or tenderness present',
      'Personal or family history of skin cancer',
    ],
    rulesVersion: 'v1.0-DRAFT',
    photos: ['https://picsum.photos/seed/derm2/400/400'],
    answers: {
      bodyLocation: 'Upper Back',
      exactBodyLocation: 'Left scapular area',
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
    patientSummary: 'Patient noticed new pigmented spot on left upper back ~3 months ago with intermittent itching. Family history of melanoma in maternal aunt.',
    status: 'new',
  },
  {
    id: 'case_grn_103',
    clinicId: 'austin-derm-associates',
    patientName: 'Marcus Chen',
    patientEmail: 'm.chen@example.com',
    patientPhone: '(512) 555-7123',
    patientAgeRange: '20-39',
    dateSubmitted: new Date(Date.now() - 360 * 60 * 1000).toISOString(), // 6 hours ago
    color: 'green',
    why: [
      'No acute changes, no symptoms, negative oncology history, all fields complete',
    ],
    rulesVersion: 'v1.0-DRAFT',
    photos: ['https://picsum.photos/seed/derm3/400/400'],
    answers: {
      bodyLocation: 'Left Shoulder',
      exactBodyLocation: 'Anterior left deltoid',
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
      sunburnOrTanningHistory: 'None / regular daily SPF use',
      immuneSuppressing: 'No',
    },
    patientSummary: 'Routine periodic check of stable lifelong mole on left shoulder. No reported symptoms or family history of skin cancer.',
    status: 'new',
  },
];

// In-Memory cache for seamless local state syncing
let localCasesCache: ClinicCase[] = [...INITIAL_SEED_CASES];
let localAuditLogs: ClinicAuditLog[] = [
  {
    id: 'log-seed-1',
    clinicId: 'austin-derm-associates',
    action: 'rules_update',
    staffEmail: 'admin@austindermsurgery.com',
    staffName: 'Dr. Sarah Jenkins, MD',
    staffRole: 'clinic_admin',
    details: 'Initial starter rules loaded: v1.0-DRAFT (Pending physician review)',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'log-seed-2',
    clinicId: 'austin-derm-associates',
    action: 'patient_intake_submit',
    caseId: 'case_red_101',
    patientName: 'Robert Vance',
    staffEmail: 'system@skintight.clinical',
    staffRole: 'system',
    details: 'Digital intake submitted by patient. Triage score assigned: RED (3 rules triggered).',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

let localRulesConfig: RulesConfig = { ...DEFAULT_DRAFT_RULES_CONFIG };

/**
 * Log a strict audit trail event.
 * Write-only for staff; neither staff nor admins can modify or delete audit logs.
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

  localAuditLogs.unshift(newLog);

  // Try saving to Firestore if available
  try {
    if (db) {
      await addDoc(collection(db, 'clinics', clinicId, 'auditLogs'), {
        ...newLog,
        serverTime: serverTimestamp(),
      });
    }
  } catch (err) {
    // Audit log kept in secure memory
  }

  return newLog;
}

/**
 * Fetch all audit logs for a clinic
 */
export async function getClinicAuditLogs(clinicId: string): Promise<ClinicAuditLog[]> {
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
 * Fetch Clinic Cases sorted Red → Yellow → Green, newest first within each color
 */
export async function getClinicCases(clinicId: string): Promise<ClinicCase[]> {
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

  // Sort Red -> Yellow -> Green, newest first
  const colorWeight: Record<TriageColor, number> = { red: 3, yellow: 2, green: 1 };

  return cases.sort((a, b) => {
    const aColor = a.override?.overriddenColor || a.color;
    const bColor = b.override?.overriddenColor || b.color;
    const diff = colorWeight[bColor] - colorWeight[aColor];
    if (diff !== 0) return diff;
    return new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime();
  });
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
  const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Upload photos to private Cloud Storage path: /clinics/{clinicId}/cases/{caseId}/photos/{photoId}.jpg
  const uploadedStoragePaths: string[] = [];
  if (photosBase64 && photosBase64.length > 0) {
    for (let i = 0; i < photosBase64.length; i++) {
      const photo = photosBase64[i];
      if (photo && photo.startsWith('data:')) {
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

  // Evaluate Rules Engine (Transparent, no AI verdicts)
  const evaluation = evaluateTriageRules(answers, localRulesConfig);

  // Build deterministic patient summary
  const summaryText = `Patient logged a spot at ${answers.bodyLocation || 'skin'}${answers.exactBodyLocation ? ` (${answers.exactBodyLocation})` : ''}, noticed ${answers.lesionFirstNoticedDate || 'date not specified'}. Evolution: ${answers.newOrChanged || 'Unspecified'}. Symptoms: ${[answers.bleeding, answers.painOrSensation, answers.nonHealing].filter(Boolean).join(', ') || 'None reported'}.`;

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
    photos: uploadedStoragePaths.length > 0 ? uploadedStoragePaths : (photosBase64.length > 0 ? photosBase64 : ['https://picsum.photos/seed/dermnew/400/400']),
    answers,
    patientSummary: summaryText,
    isPhoneIntake: meta.isPhoneIntake,
    intakeStaffName: meta.staffName,
    status: 'new',
  };

  localCasesCache.unshift(newCase);

  // Persist to Firestore
  try {
    if (db) {
      await setDoc(doc(db, 'clinics', clinicId, 'cases', caseId), newCase);
    }
  } catch {
    // Retained in memory cache
  }

  // Record Audit Trail
  await logClinicAudit(clinicId, {
    action: meta.isPhoneIntake ? 'phone_intake_submit' : 'patient_intake_submit',
    caseId,
    patientName,
    staffEmail: meta.staffEmail || 'patient.intake@portal.skintight',
    staffName: meta.staffName || 'Online Patient Portal',
    staffRole: meta.isPhoneIntake ? 'clinic_staff' : 'system',
    details: `${meta.isPhoneIntake ? 'Phone script' : 'Patient web'} intake completed. Triage score: ${evaluation.color.toUpperCase()} (${evaluation.why.join('; ')}).`,
  });

  return newCase;
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
  const targetCase = localCasesCache.find(c => c.id === caseId);
  if (!targetCase) throw new Error('Case not found');

  const originalColor = targetCase.override?.overriddenColor || targetCase.color;

  const overrideData = {
    originalColor: targetCase.color,
    overriddenColor: newColor,
    reason,
    overriddenBy: staffName,
    timestamp: new Date().toISOString(),
  };

  targetCase.override = overrideData;

  // Update in Firestore
  try {
    if (db) {
      await updateDoc(doc(db, 'clinics', clinicId, 'cases', caseId), {
        override: overrideData,
      });
    }
  } catch {
    // Updated in memory
  }

  // Audit log
  await logClinicAudit(clinicId, {
    action: 'case_override',
    caseId,
    patientName: targetCase.patientName,
    staffEmail,
    staffName,
    staffRole: 'clinic_staff',
    details: `Triage category manually overridden from ${originalColor.toUpperCase()} to ${newColor.toUpperCase()}. Mandatory clinician reason: "${reason}"`,
  });

  return targetCase;
}

/**
 * Get current active rules configuration for clinic
 */
export async function getClinicRules(clinicId: string): Promise<RulesConfig> {
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
 * Save updated rules configuration with physician approval record
 */
export async function saveClinicRules(
  clinicId: string,
  updatedConfig: RulesConfig,
  staffEmail: string,
  staffName: string
): Promise<RulesConfig> {
  localRulesConfig = {
    ...updatedConfig,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (db) {
      await setDoc(doc(db, 'clinics', clinicId, 'rules', 'current'), localRulesConfig);
      // Also store in version history subcollection
      await setDoc(doc(db, 'clinics', clinicId, 'rulesHistory', updatedConfig.version), localRulesConfig);
    }
  } catch {
    // Saved in memory
  }

  // Audit log
  await logClinicAudit(clinicId, {
    action: 'rules_update',
    staffEmail,
    staffName,
    staffRole: 'clinic_admin',
    details: `Rules version updated to ${updatedConfig.version} (${updatedConfig.label}). Physician approval: ${updatedConfig.approvedBy || 'Pending'} on ${updatedConfig.approvedDate || 'Pending'}. Total active rules: ${updatedConfig.rules.filter(r => r.enabled).length}`,
  });

  return localRulesConfig;
}
