import { IntakeForm } from '../App';

export type TriageColor = 'red' | 'yellow' | 'green';

export interface TriageRule {
  id: string;
  color: TriageColor;
  name: string;
  description: string;
  whyText: string;
  predicateKey: string;
  enabled: boolean;
}

export interface RulesConfig {
  version: string;
  label: string; // "DRAFT — pending physician approval"
  approvedBy: string | null;
  approvedDate: string | null;
  updatedAt: string;
  rules: TriageRule[];
  safetyDefault: 'yellow';
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  urgentInstruction: string;   // For RED cases
  yellowInstruction: string;   // For YELLOW cases
  greenInstruction: string;    // For GREEN cases
  activeRulesVersion: string;
}

export interface CaseOverride {
  originalColor: TriageColor;
  overriddenColor: TriageColor;
  reason: string;
  overriddenBy: string;
  timestamp: string;
}

export interface ClinicCase {
  id: string;
  clinicId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAgeRange?: string;
  dateSubmitted: string;
  color: TriageColor;
  why: string[];
  rulesVersion: string;
  photos: string[]; // Private Cloud Storage paths (/clinics/{clinicId}/cases/{caseId}/photos/{photoId}.jpg)
  answers: Partial<IntakeForm>;
  patientSummary: string;
  override?: CaseOverride;
  isPhoneIntake?: boolean;
  intakeStaffName?: string;
  status: 'new' | 'reviewed' | 'scheduled' | 'archived';
}

export type AuditAction = 
  | 'case_view' 
  | 'case_edit' 
  | 'case_override' 
  | 'case_pdf_download' 
  | 'rules_update'
  | 'phone_intake_submit'
  | 'patient_intake_submit';

export interface ClinicAuditLog {
  id: string;
  clinicId: string;
  action: AuditAction;
  caseId?: string;
  patientName?: string;
  staffEmail: string;
  staffName?: string;
  staffRole: 'clinic_staff' | 'clinic_admin' | 'system';
  details: string;
  timestamp: string;
}
