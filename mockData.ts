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
    arcpDate: '2026-06-15',
    arcpInterimFull: 'Full ARCP',
    supervisorName: 'Dr. James Wright',
    supervisorEmail: 'j.wright@nhs.net',
    supervisorGmc: '1234567',
    predictedSIAs: ['Oculoplastics', 'Ocular Motility'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery',
    frcophthPart1: true,
    frcophthPart2Written: false,
    frcophthPart2Viva: false,
    refractionCertificate: true
  },
  {
    id: 'trainee2',
    name: 'Dr. Emma Thompson',
    grade: TrainingGrade.ST3,
    location: 'Reading',
    fte: 100,
    arcpMonth: 'July',
    cctDate: '2029-07-01',
    arcpDate: '2026-07-15',
    arcpInterimFull: 'Full ARCP',
    supervisorName: 'Dr. Emily Watson',
    supervisorEmail: 'e.watson@nhs.net',
    supervisorGmc: '3456789',
    predictedSIAs: ['Medical Retina', 'Uveitis'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery',
    frcophthPart1: false,
    frcophthPart2Written: false,
    frcophthPart2Viva: false,
    refractionCertificate: false
  },
  {
    id: 'trainee3',
    name: 'Dr. David Patel',
    grade: TrainingGrade.ST5,
    location: 'Slough',
    fte: 100,
    arcpMonth: 'February',
    cctDate: '2028-02-01',
    arcpDate: '2026-02-15',
    arcpInterimFull: 'Interim Review',
    supervisorName: 'Dr. Benny Smith',
    supervisorEmail: 'testbenny@nhs.net',
    supervisorGmc: '123456',
    predictedSIAs: ['Cataract Surgery', 'Cornea'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery',
    frcophthPart1: true,
    frcophthPart2Written: false,
    frcophthPart2Viva: true,
    refractionCertificate: true
  },
  {
    id: 'trainee4',
    name: 'Dr. Sophie Williams',
    grade: TrainingGrade.ST2,
    location: 'Milton Keynes',
    fte: 100,
    arcpMonth: 'June',
    cctDate: '2029-08-01',
    arcpDate: '2026-06-25',
    supervisorName: 'Dr. Sarah Roberts',
    supervisorEmail: 's.roberts@nhs.net',
    supervisorGmc: '2345678',
    predictedSIAs: ['Cornea & Ocular Surface', 'Uveitis'],
    pdpGoals: [],
    deanery: 'Thames Valley Deanery',
    frcophthPart1: false,
    frcophthPart2Written: false,
    frcophthPart2Viva: false,
    refractionCertificate: false
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

// Mock Evidence for each trainee (Thames Valley Deanery)
export const MOCK_TRAINEE_EVIDENCE: Record<string, EvidenceItem[]> = {
  trainee1: [
    // EPAs
    { id: 'ev1-1', type: EvidenceType.EPA, title: "Oculoplastics EPA Level 1", sia: "Oculoplastics", level: 1, date: "2024-01-15", status: EvidenceStatus.SignedOff },
    { id: 'ev1-2', type: EvidenceType.EPA, title: "Oculoplastics EPA Level 2", sia: "Oculoplastics", level: 2, date: "2024-03-20", status: EvidenceStatus.SignedOff },
    { id: 'ev1-3', type: EvidenceType.EPA, title: "Medical Retina EPA Level 1", sia: "Medical Retina", level: 1, date: "2024-02-10", status: EvidenceStatus.SignedOff },
    { id: 'ev1-4', type: EvidenceType.EPA, title: "Medical Retina EPA Level 2", sia: "Medical Retina", level: 2, date: "2024-04-05", status: EvidenceStatus.SignedOff },
    { id: 'ev1-5', type: EvidenceType.EPA, title: "Medical Retina EPA Level 3", sia: "Medical Retina", level: 3, date: "2024-06-15", status: EvidenceStatus.Submitted },
    { id: 'ev1-6', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 1", sia: "Cataract Surgery", level: 1, date: "2023-11-20", status: EvidenceStatus.SignedOff },
    { id: 'ev1-7', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 2", sia: "Cataract Surgery", level: 2, date: "2024-02-28", status: EvidenceStatus.SignedOff },
    { id: 'ev1-8', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 3", sia: "Cataract Surgery", level: 3, date: "2024-05-10", status: EvidenceStatus.SignedOff },
    { id: 'ev1-9', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 4", sia: "Cataract Surgery", level: 4, date: "2024-08-01", status: EvidenceStatus.Submitted },
    // Additional Evidence
    { id: 'ev1-10', type: EvidenceType.CbD, title: "Ptosis management case study", sia: "Oculoplastics", level: 2, date: "2024-03-15", status: EvidenceStatus.SignedOff },
    { id: 'ev1-11', type: EvidenceType.DOPs, title: "Basal cell carcinoma excision", sia: "Oculoplastics", level: 2, date: "2024-03-20", status: EvidenceStatus.SignedOff },
    { id: 'ev1-12', type: EvidenceType.Reflection, title: "Clinic communication reflection", date: "2024-03-22", status: EvidenceStatus.SignedOff },
    { id: 'ev1-13', type: EvidenceType.QIP, title: "Cataract pathway efficiency audit", date: "2024-04-10", status: EvidenceStatus.SignedOff },
    { id: 'ev1-14', type: EvidenceType.Course, title: "Microsurgery skills course", date: "2024-02-15", status: EvidenceStatus.SignedOff },
    { id: 'ev1-15', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Submitted }
  ],
  trainee2: [
    // EPAs
    { id: 'ev2-1', type: EvidenceType.EPA, title: "Medical Retina EPA Level 1", sia: "Medical Retina", level: 1, date: "2024-01-10", status: EvidenceStatus.SignedOff },
    { id: 'ev2-2', type: EvidenceType.EPA, title: "Medical Retina EPA Level 2", sia: "Medical Retina", level: 2, date: "2024-03-25", status: EvidenceStatus.SignedOff },
    { id: 'ev2-3', type: EvidenceType.EPA, title: "Glaucoma EPA Level 1", sia: "Glaucoma", level: 1, date: "2024-02-05", status: EvidenceStatus.SignedOff },
    { id: 'ev2-4', type: EvidenceType.EPA, title: "Glaucoma EPA Level 2", sia: "Glaucoma", level: 2, date: "2024-04-20", status: EvidenceStatus.SignedOff },
    { id: 'ev2-5', type: EvidenceType.EPA, title: "Glaucoma EPA Level 3", sia: "Glaucoma", level: 3, date: "2024-06-10", status: EvidenceStatus.Submitted },
    { id: 'ev2-6', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 1", sia: "Cataract Surgery", level: 1, date: "2024-01-25", status: EvidenceStatus.SignedOff },
    { id: 'ev2-7', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 2", sia: "Cataract Surgery", level: 2, date: "2024-05-15", status: EvidenceStatus.Submitted },
    // Additional Evidence
    { id: 'ev2-8', type: EvidenceType.CbD, title: "Diabetic retinopathy case", sia: "Medical Retina", level: 2, date: "2024-03-10", status: EvidenceStatus.SignedOff },
    { id: 'ev2-9', type: EvidenceType.Reflection, title: "Breaking bad news reflection", date: "2024-04-15", status: EvidenceStatus.SignedOff },
    { id: 'ev2-10', type: EvidenceType.QIP, title: "Glaucoma screening improvement", date: "2024-05-01", status: EvidenceStatus.Draft },
    { id: 'ev2-11', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Draft }
  ],
  trainee3: [
    // EPAs (most advanced trainee - ST5)
    { id: 'ev3-1', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 1", sia: "Cataract Surgery", level: 1, date: "2023-08-10", status: EvidenceStatus.SignedOff },
    { id: 'ev3-2', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 2", sia: "Cataract Surgery", level: 2, date: "2023-11-15", status: EvidenceStatus.SignedOff },
    { id: 'ev3-3', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 3", sia: "Cataract Surgery", level: 3, date: "2024-03-28", status: EvidenceStatus.SignedOff },
    { id: 'ev3-4', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 4", sia: "Cataract Surgery", level: 4, date: "2024-07-20", status: EvidenceStatus.SignedOff },
    { id: 'ev3-5', type: EvidenceType.EPA, title: "Vitreoretinal Surgery EPA Level 1", sia: "Vitreoretinal Surgery", level: 1, date: "2024-01-05", status: EvidenceStatus.SignedOff },
    { id: 'ev3-6', type: EvidenceType.EPA, title: "Vitreoretinal Surgery EPA Level 2", sia: "Vitreoretinal Surgery", level: 2, date: "2024-04-10", status: EvidenceStatus.SignedOff },
    { id: 'ev3-7', type: EvidenceType.EPA, title: "Vitreoretinal Surgery EPA Level 3", sia: "Vitreoretinal Surgery", level: 3, date: "2024-07-01", status: EvidenceStatus.SignedOff },
    { id: 'ev3-8', type: EvidenceType.EPA, title: "Vitreoretinal Surgery EPA Level 4", sia: "Vitreoretinal Surgery", level: 4, date: "2024-09-15", status: EvidenceStatus.Submitted },
    { id: 'ev3-9', type: EvidenceType.EPA, title: "Medical Retina EPA Level 1", sia: "Medical Retina", level: 1, date: "2023-09-20", status: EvidenceStatus.SignedOff },
    { id: 'ev3-10', type: EvidenceType.EPA, title: "Medical Retina EPA Level 2", sia: "Medical Retina", level: 2, date: "2024-02-15", status: EvidenceStatus.SignedOff },
    // Additional Evidence
    { id: 'ev3-11', type: EvidenceType.OSATs, title: "Cataract surgery OSAT", sia: "Cataract Surgery", level: 3, date: "2024-03-18", status: EvidenceStatus.SignedOff },
    { id: 'ev3-12', type: EvidenceType.OSATs, title: "Vitrectomy OSAT", sia: "Vitreoretinal Surgery", level: 4, date: "2024-08-05", status: EvidenceStatus.SignedOff },
    { id: 'ev3-13', type: EvidenceType.Research, title: "Publication: Outcomes of complex cataract surgery", date: "2024-06-20", status: EvidenceStatus.SignedOff },
    { id: 'ev3-14', type: EvidenceType.Leadership, title: "Led departmental teaching programme", date: "2024-05-10", status: EvidenceStatus.SignedOff },
    { id: 'ev3-15', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-12-01", status: EvidenceStatus.SignedOff }
  ],
  trainee4: [
    // EPAs (junior trainee - ST2)
    { id: 'ev4-1', type: EvidenceType.EPA, title: "Cornea & Ocular Surface EPA Level 1", sia: "Cornea & Ocular Surface", level: 1, date: "2024-04-01", status: EvidenceStatus.SignedOff },
    { id: 'ev4-2', type: EvidenceType.EPA, title: "Uveitis EPA Level 1", sia: "Uveitis", level: 1, date: "2024-05-10", status: EvidenceStatus.SignedOff },
    { id: 'ev4-3', type: EvidenceType.EPA, title: "Uveitis EPA Level 2", sia: "Uveitis", level: 2, date: "2024-08-05", status: EvidenceStatus.Draft },
    { id: 'ev4-4', type: EvidenceType.EPA, title: "Cataract Surgery EPA Level 1", sia: "Cataract Surgery", level: 1, date: "2024-03-20", status: EvidenceStatus.SignedOff },
    // Additional Evidence
    { id: 'ev4-5', type: EvidenceType.CbD, title: "Corneal ulcer management", sia: "Cornea & Ocular Surface", level: 1, date: "2024-03-12", status: EvidenceStatus.SignedOff },
    { id: 'ev4-6', type: EvidenceType.DOPs, title: "Corneal scrape technique", sia: "Cornea & Ocular Surface", level: 1, date: "2024-04-20", status: EvidenceStatus.SignedOff },
    { id: 'ev4-7', type: EvidenceType.Reflection, title: "Dealing with diagnostic uncertainty", date: "2024-05-01", status: EvidenceStatus.Draft },
    { id: 'ev4-8', type: EvidenceType.Course, title: "Anterior segment imaging course", date: "2024-04-15", status: EvidenceStatus.SignedOff },
    { id: 'ev4-9', type: EvidenceType.ARCPPrep, title: "ARCP Portfolio Compilation", date: "2024-06-01", status: EvidenceStatus.Draft }
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

