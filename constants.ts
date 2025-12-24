
import { CurriculumRequirement, TrainingGrade, EvidenceType, EvidenceStatus, EvidenceItem, SIA } from './types';

export const CURRICULUM_DATA: CurriculumRequirement[] = [
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Independently perform a patient assessment and investigations sufficient to identify describe and interpret clinical findings to arrive at differential diagnoses." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Independently formulate and initiate a management plan for low complexity cases." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Justify the diagnoses and plan with reference to basic and clinical science." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Work effectively with patients and the multi-professional team." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 2, requirement: "Independently manage patients at an appropriate work-rate employing the most appropriate clinical examination equipment and investigation modalities." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 2, requirement: "Refine the differential diagnoses and management plan by application of clinical knowledge." },
  { specialty: "Oculoplastics", domain: "Patient Management", formType: "EPA", level: 3, requirement: "Independently assess and manage moderate complexity patients demonstrating an understanding of oculoplastics procedures and selecting the most appropriate treatment according to current accepted practice." },
  { specialty: "Ocular Motility", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Independently perform a patient assessment and investigations sufficient to identify describe and interpret clinical findings to arrive at differential diagnoses." },
  { specialty: "Ocular Motility", domain: "Patient Management", formType: "EPA", level: 1, requirement: "Independently formulate and initiate a management plan for low complexity cases." },
  { specialty: "Medical Retina", domain: "Patient Management", formType: "EPA", level: 3, requirement: "Independently assess and manage moderate complexity patients demonstrating an understanding of medical retina procedures and selecting the most appropriate treatment according to current accepted practice." },
];

export const INITIAL_PROFILE = {
  name: "Dr. Alex Carter",
  grade: TrainingGrade.ST4,
  location: "London Deanery",
  fte: 100,
  arcpMonth: "June",
  cctDate: "2027-08-01",
  supervisorName: "Mr. James Wright",
  supervisorEmail: "j.wright@nhs.net",
  predictedSIAs: ["Oculoplastics", "Ocular Motility"]
};

export const INITIAL_SIAS: SIA[] = [
  { id: '1', specialty: "Oculoplastics", level: 2, supervisorInitials: "JW" },
  { id: '2', specialty: "Medical Retina", level: 3, supervisorInitials: "SR" },
  { id: '3', specialty: "Cataract Surgery", level: 4, supervisorInitials: "AL" },
];

export const INITIAL_EVIDENCE: EvidenceItem[] = [
  { id: 'ev1', type: EvidenceType.CbD, title: "Ptosis management case study", sia: "Oculoplastics", level: 2, date: "2024-03-15", status: EvidenceStatus.SignedOff },
  { id: 'ev2', type: EvidenceType.DOPs, title: "Basal cell carcinoma excision", sia: "Oculoplastics", level: 2, date: "2024-03-20", status: EvidenceStatus.Submitted },
  { id: 'ev3', type: EvidenceType.Reflection, title: "Clinic communication reflection", date: "2024-03-22", status: EvidenceStatus.Draft },
];

export const SPECIALTIES = [
  "Oculoplastics", "Cornea & Ocular Surface Disease", "Cataract Surgery", "Glaucoma", "Uveitis",
  "Medical Retina", "Vitreoretinal Surgery", "Ocular Motility", "Neuro-Ophthalmology",
  "Paediatric Ophthalmology", "Urgent Eye Care"
];
