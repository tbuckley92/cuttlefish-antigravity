import { UserProfile, SIA, EvidenceItem, EvidenceType, EvidenceStatus, TrainingGrade, SupervisorProfile, UserRole, TraineeSummary } from './types';
import { INITIAL_PROFILE, INITIAL_SIAS, INITIAL_EVIDENCE } from './constants';

// Mock Supervisor Profiles
export const MOCK_SUPERVISORS: SupervisorProfile[] = [
  {
    id: 'sup1',
    name: 'Dr. James Wright',
    email: 'j.wright@nhs.net',
    role: UserRole.EducationalSupervisor
  },
  {
    id: 'sup2',
    name: 'Dr. Sarah Roberts',
    email: 's.roberts@nhs.net',
    role: UserRole.EducationalSupervisor
  },
  {
    id: 'sup3',
    name: 'Dr. Michael Chen',
    email: 'm.chen@nhs.net',
    role: UserRole.ARCPPanelMember,
    deanery: 'Thames Valley Deanery'
  }
];

// Mock Trainee Profiles
export const MOCK_TRAINEES: UserProfile[] = [
  {
    id: 'trainee1',
    name: 'Dr. Alex Carter',
    grade: TrainingGrade.ST4,
    location: 'Oxford',
    fte: 100,
    arcpMonth: 'June',
    cctDate: '2027-08-01',
    supervisorName: 'Dr. James Wright',
    supervisorEmail: 'j.wright@nhs.net',
    predictedSIAs: ['Oculoplastics', 'Ocular Motility'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery'
  },
  {
    id: 'trainee2',
    name: 'Dr. Emma Thompson',
    grade: TrainingGrade.ST3,
    location: 'Reading',
    fte: 100,
    arcpMonth: 'June',
    cctDate: '2028-08-01',
    supervisorName: 'Dr. Sarah Roberts',
    supervisorEmail: 's.roberts@nhs.net',
    predictedSIAs: ['Medical Retina', 'Glaucoma'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery'
  },
  {
    id: 'trainee3',
    name: 'Dr. David Patel',
    grade: TrainingGrade.ST5,
    location: 'Slough',
    fte: 100,
    arcpMonth: 'December',
    cctDate: '2026-12-01',
    supervisorName: 'Dr. James Wright',
    supervisorEmail: 'j.wright@nhs.net',
    predictedSIAs: ['Cataract Surgery', 'Vitreoretinal Surgery'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery'
  },
  {
    id: 'trainee4',
    name: 'Dr. Sophie Williams',
    grade: TrainingGrade.ST2,
    location: 'Milton Keynes',
    fte: 100,
    arcpMonth: 'June',
    cctDate: '2029-08-01',
    supervisorName: 'Dr. Sarah Roberts',
    supervisorEmail: 's.roberts@nhs.net',
    predictedSIAs: ['Cornea & Ocular Surface', 'Uveitis'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery'
  }
];

// Mock SIAs for each trainee
export const MOCK_TRAINEE_SIAS: Record<string, SIA[]> = {
  trainee1: [
    { id: 'sia1-1', specialty: "Oculoplastics", level: 2, supervisorName: "Dr. James Wright", supervisorEmail: "j.wright@nhs.net", supervisorInitials: "JW" },
    { id: 'sia1-2', specialty: "Medical Retina", level: 3, supervisorName: "Dr. Sarah Roberts", supervisorEmail: "s.roberts@nhs.net", supervisorInitials: "SR" },
    { id: 'sia1-3', specialty: "Cataract Surgery", level: 4, supervisorName: "Dr. James Wright", supervisorEmail: "j.wright@nhs.net", supervisorInitials: "JW" }
  ],
  trainee2: [
    { id: 'sia2-1', specialty: "Medical Retina", level: 2, supervisorName: "Dr. Sarah Roberts", supervisorEmail: "s.roberts@nhs.net", supervisorInitials: "SR" },
    { id: 'sia2-2', specialty: "Glaucoma", level: 3, supervisorName: "Dr. Sarah Roberts", supervisorEmail: "s.roberts@nhs.net", supervisorInitials: "SR" }
  ],
  trainee3: [
    { id: 'sia3-1', specialty: "Cataract Surgery", level: 3, supervisorName: "Dr. James Wright", supervisorEmail: "j.wright@nhs.net", supervisorInitials: "JW" },
    { id: 'sia3-2', specialty: "Vitreoretinal Surgery", level: 4, supervisorName: "Dr. James Wright", supervisorEmail: "j.wright@nhs.net", supervisorInitials: "JW" }
  ],
  trainee4: [
    { id: 'sia4-1', specialty: "Cornea & Ocular Surface", level: 1, supervisorName: "Dr. Sarah Roberts", supervisorEmail: "s.roberts@nhs.net", supervisorInitials: "SR" },
    { id: 'sia4-2', specialty: "Uveitis", level: 2, supervisorName: "Dr. Sarah Roberts", supervisorEmail: "s.roberts@nhs.net", supervisorInitials: "SR" }
  ]
};

// Mock Evidence for each trainee
export const MOCK_TRAINEE_EVIDENCE: Record<string, EvidenceItem[]> = {
  trainee1: [
    { id: 'ev1-1', type: EvidenceType.CbD, title: "Ptosis management case study", sia: "Oculoplastics", level: 2, date: "2024-03-15", status: EvidenceStatus.SignedOff },
    { id: 'ev1-2', type: EvidenceType.DOPs, title: "Basal cell carcinoma excision", sia: "Oculoplastics", level: 2, date: "2024-03-20", status: EvidenceStatus.Submitted },
    { id: 'ev1-3', type: EvidenceType.Reflection, title: "Clinic communication reflection", date: "2024-03-22", status: EvidenceStatus.Draft },
    { id: 'ev1-4', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Submitted }
  ],
  trainee2: [
    { id: 'ev2-1', type: EvidenceType.CbD, title: "Diabetic retinopathy case", sia: "Medical Retina", level: 2, date: "2024-03-10", status: EvidenceStatus.SignedOff },
    { id: 'ev2-2', type: EvidenceType.EPA, title: "Medical Retina EPA Level 2", sia: "Medical Retina", level: 2, date: "2024-03-25", status: EvidenceStatus.Submitted },
    { id: 'ev2-3', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Draft }
  ],
  trainee3: [
    { id: 'ev3-1', type: EvidenceType.OSATs, title: "Cataract surgery OSAT", sia: "Cataract Surgery", level: 3, date: "2024-03-18", status: EvidenceStatus.SignedOff },
    { id: 'ev3-2', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 3", sia: "Cataract Surgery", level: 3, date: "2024-03-28", status: EvidenceStatus.SignedOff },
    { id: 'ev3-3', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-12-01", status: EvidenceStatus.SignedOff }
  ],
  trainee4: [
    { id: 'ev4-1', type: EvidenceType.CbD, title: "Corneal ulcer management", sia: "Cornea & Ocular Surface", level: 1, date: "2024-03-12", status: EvidenceStatus.Draft },
    { id: 'ev4-2', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Draft }
  ]
};

// Helper function to get trainee summary
export const getTraineeSummary = (traineeId: string): TraineeSummary | null => {
  const profile = MOCK_TRAINEES.find(t => t.id === traineeId);
  if (!profile) return null;
  
  return {
    profile,
    sias: MOCK_TRAINEE_SIAS[traineeId] || [],
    allEvidence: MOCK_TRAINEE_EVIDENCE[traineeId] || []
  };
};

// Helper function to get all trainee summaries
export const getAllTraineeSummaries = (): TraineeSummary[] => {
  return MOCK_TRAINEES.map(trainee => ({
    profile: trainee,
    sias: MOCK_TRAINEE_SIAS[trainee.id!] || [],
    allEvidence: MOCK_TRAINEE_EVIDENCE[trainee.id!] || []
  }));
};

