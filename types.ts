
export enum TrainingGrade {
  ST1 = 'ST1',
  ST2 = 'ST2',
  ST3 = 'ST3',
  ST4 = 'ST4',
  ST5 = 'ST5',
  ST6 = 'ST6',
  ST7 = 'ST7',
}

export enum EvidenceType {
  CbD = 'CbD',
  DOPs = 'DOPs',
  OSATs = 'OSATs',
  Reflection = 'Reflection',
  CRS = 'CRS',
  Other = 'Other',
  EPA = 'EPA',
  GSAT = 'GSAT',
  QIP = 'Quality Improvement and Audit',
  Award = 'Prizes/Awards',
  Course = 'Courses',
  SignificantEvent = 'Significant Event',
  Research = 'Research',
  Leadership = 'Leadership, management and teamwork',
  Logbook = 'Eye Logbook',
  Additional = 'Additional evidence',
  Compliment = 'Compliments',
  MSF = 'MSF'
}

export enum EvidenceStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Complete = 'Complete',
  SignedOff = 'Signed Off', // Deprecating in favor of PRD 'Complete'
  Active = 'Active',
  Closed = 'Closed'
}

export interface UserProfile {
  name: string;
  grade: TrainingGrade;
  location: string;
  fte: number;
  arcpMonth: string;
  cctDate: string;
  supervisorName: string;
  supervisorEmail: string;
  predictedSIAs: string[];
}

export interface SIA {
  id: string;
  specialty: string;
  level: number;
  supervisorInitials?: string;
  supervisorName?: string;
  supervisorEmail?: string;
}

export interface MSFRespondent {
  id: string;
  name: string;
  email: string;
  role: 'Doctor' | 'Nurse' | 'AHP' | 'Non-clinical';
  status: 'Awaiting response' | 'Completed';
  inviteSent: boolean;
  lastReminded?: string;
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  sia?: string;
  level?: number;
  date: string;
  status: EvidenceStatus;
  notes?: string;
  // MSF specific
  msfRespondents?: MSFRespondent[];
  // Dynamic fields for specific types
  projectTitle?: string;
  provider?: string;
  location?: string;
  hours?: string;
  procedureType?: string;
  role?: string;
}

export interface CurriculumRequirement {
  specialty: string;
  domain: string;
  formType: string;
  level: number;
  requirement: string;
}

export interface EPAForm {
  id: string;
  sia: string;
  level: number;
  date: string;
  supervisorId: string;
  status: 'Draft' | 'Submitted';
  includeCurriculum: boolean;
  linkedEvidence: Record<string, string[]>; // reqIndex -> evidenceIds
  comments: Record<string, string>; // reqIndex -> commentText
}
