
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
  MSF = 'MSF',
  ARCPPrep = 'ARCP Preparation'
}

export enum EvidenceStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  SignedOff = 'COMPLETE'
}

export enum UserRole {
  Trainee = 'Trainee',
  EducationalSupervisor = 'EducationalSupervisor',
  ARCPPanelMember = 'ARCPPanelMember'
}

export enum ARCPOutcome {
  Outcome1 = 'Outcome 1',
  Outcome2 = 'Outcome 2',
  Outcome3 = 'Outcome 3',
  Outcome4 = 'Outcome 4',
  Outcome5 = 'Outcome 5',
  Outcome6 = 'Outcome 6',
  Outcome7 = 'Outcome 7',
  Outcome8 = 'Outcome 8',
  Outcome9 = 'Outcome 9',
  Outcome10 = 'Outcome 10',
  Outcome10_1 = 'Outcome 10.1',
  Outcome10_1_FIT = 'Outcome 10.1 (FIT)'
}

export enum ARCPReviewType {
  InterimReview = 'Interim Review',
  FullARCP = 'Full ARCP'
}

export interface PDPGoal {
  id: string;
  title: string;
  actions: string;
  targetDate: string;
  successCriteria: string;
  status?: 'IN PROGRESS' | 'COMPLETE';
}

export interface UserProfile {
  id?: string; // Add ID for multi-trainee support
  name: string;
  grade: TrainingGrade;
  location: string;
  fte: number;
  arcpMonth: string;
  cctDate: string;
  supervisorName: string;
  supervisorEmail: string;
  predictedSIAs: string[];
  pdpGoals: PDPGoal[];
  deanery?: string; // Default: "Thames Valley Deanery"
  arcpOutcome?: ARCPOutcome; // Selected ARCP outcome
  curriculumCatchUpPDF?: string; // URL or file reference for uploaded PDF
  curriculumCatchUpCompletions?: Record<string, boolean>; // Map of completed boxes (key format: "column-level")
}

export interface SIA {
  id: string;
  specialty: string;
  level: number;
  supervisorInitials?: string;
  supervisorName?: string;
  supervisorEmail?: string;
}

export type MSFRole = 
  | 'Consultant' 
  | 'Trainee/Fellow' 
  | 'Senior nurse, theatre' 
  | 'Senior nurse, OPD' 
  | 'Outpatient staff' 
  | 'Medical secretary';

export interface MSFRespondent {
  id: string;
  name: string;
  email: string;
  role: MSFRole;
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
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  // MSF specific
  msfRespondents?: MSFRespondent[];
  // Dynamic fields for specific types
  projectTitle?: string;
  provider?: string;
  location?: string;
  hours?: string;
  procedureType?: string;
  role?: string;
  // Form-specific data for PDF generation
  epaFormData?: {
    comments: Record<string, string>;
    grading: Record<string, string>;
    entrustment: string;
    supervisorName: string;
    supervisorEmail: string;
    linkedEvidence: Record<string, string[]>;
  };
  gsatFormData?: {
    comments: Record<string, string>;
    linkedEvidence: Record<string, string[]>;
  };
  dopsFormData?: {
    caseDescription: string;
    assessorName: string;
    assessorEmail: string;
    assessorStatus: string;
    difficulty: string;
    prevAttempts: string;
    setting: string;
    grading: Record<number, string>;
    overallAssessment: string;
    strengths: string;
    improvements: string;
  };
  osatsFormData?: {
    operationDetails: string;
    assessorName: string;
    assessorEmail: string;
    assessorStatus: string;
    difficulty: string;
    procedureCount: string;
    setting: string;
    grading: Record<number, string>;
    overallAssessment: string;
    strengths: string;
    improvements: string;
  };
  cbdFormData?: {
    clinicalScenario: string;
    assessorName: string;
    assessorEmail: string;
    diagnosis: string;
    difficulty: string;
    overallAssessment: string;
  };
  crsFormData?: {
    crsType: string;
    caseDescription: string;
    assessorName: string;
    assessorEmail: string;
  };
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
  status: EvidenceStatus;
  includeCurriculum: boolean;
  linkedEvidence: Record<string, string[]>; // reqIndex -> evidenceIds
  comments: Record<string, string>; // reqIndex -> commentText
}

export interface SupervisorProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole.EducationalSupervisor | UserRole.ARCPPanelMember;
  deanery?: string; // For ARCP Panel Members
}

export interface TraineeSummary {
  profile: UserProfile;
  sias: SIA[];
  allEvidence: EvidenceItem[];
}
