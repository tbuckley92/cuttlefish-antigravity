

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard } from '../components/GlassCard';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ClipboardCheck, ChevronRight as ChevronDown,
  FileText, Mail, ShieldCheck, Save, Clipboard
} from '../components/Icons';
import { SignOffDialog } from '../components/SignOffDialog';
import { SPECIALTIES, INITIAL_PROFILE } from '../constants';

import { uuidv4 } from '../utils/uuid';
import { EvidenceStatus, EvidenceItem, EvidenceType } from '../types';

interface CRSFormProps {
  id?: string;
  sia?: string;
  level?: number;
  initialAssessorName?: string;
  initialAssessorEmail?: string;
  initialStatus?: EvidenceStatus;
  initialCrsType?: string; // Pre-select CRS type when launching from EPA
  originView?: any; // View enum type
  originFormParams?: any; // FormParams type
  traineeName?: string;
  onBack: () => void;
  onSubmitted?: () => void;
  onSave: (evidence: Partial<EvidenceItem>) => Promise<void> | void;
  onViewLinkedEvidence?: (evidenceId: string, section?: number) => void;
  allEvidence?: EvidenceItem[];
  isSupervisor?: boolean;
}

const CRS_TYPES = ["Consultation skills", "Vision", "Fields", "Pupil", "IOP", "Retinoscopy", "External eye", "78D/90D lens", "Slit lamp funduscopy", "Slit lamp anterior segment", "Direct Ophthalmoscopy", "Indirect Ophthalmoscopy", "Gonioscopy", "Contact lenses", "Ocular motility"];

const VISION_SECTIONS = [
  "A. Attitude and Manner",
  "B. Visual Acuity",
  "C. Colour Vision",
  "Comments and Recommendations"
];

const RETINOSCOPY_SECTIONS = [
  "A. Attitude and Manner",
  "B. Retinoscopy",
  "C. Overall"
];

const INDIRECT_OPHTHALMOSCOPY_SECTIONS = [
  "A. Attitude and Manner",
  "B. Indirect Ophthalmoscopy",
  "C. Overall"
];

const PUPIL_SECTIONS = [
  "A. Attitude and Manner",
  "B. Examination of the Pupils",
  "C. Overall"
];

const CONTACT_LENSES_SECTIONS = [
  "A. Attitude and Manner",
  "B. Fundus Contact Lenses",
  "C. Overall"
];

const LENS_78D_90D_SECTIONS = [
  "A. Attitude and Manner",
  "B. 78D / 90D (or Equivalent) Lenses",
  "C. Overall"
];

const GONIOSCOPY_SECTIONS = [
  "A. Attitude and Manner",
  "B. Gonioscopy",
  "C. Overall"
];

const DIRECT_OPHTHALMOSCOPY_SECTIONS = [
  "A. Attitude and Manner",
  "B. Use of Direct Ophthalmoscope",
  "C. Overall"
];

const SLIT_LAMP_SECTIONS = [
  "A. Attitude and Manner",
  "B. Knowledge of Slit Lamp",
  "C. Examination of Anterior Segment",
  "D. Overall"
];

const IOP_SECTIONS = [
  "A. Attitude and Manner",
  "B. IOP Measurement",
  "C. Checking Calibration of Tonometer",
  "D. Overall"
];

const OCULAR_MOTILITY_SECTIONS = [
  "A. Attitude and Manner",
  "B. Cover Test and Eye Movements",
  "C. Prism Cover Test",
  "D. Overall"
];

const EXTERNAL_EYE_SECTIONS = [
  "A. Attitude and Manner",
  "B. External Eye Examination",
  "C. Use of Ancillary Tests",
  "D. Overall"
];

const FIELDS_SECTIONS = [
  "A. Attitude and Manner",
  "B. Information Gathering (Visual Fields)",
  "C. Overall"
];

const CONSULTATION_SKILLS_SECTIONS = [
  "A. Attitude and Manner",
  "B. Information Gathering",
  "C. Awareness",
  "D. Management of Consultation and Delivery of Information",
  "E. Overall"
];

const SECTION_A_CRITERIA = [
  "Introduction and explanation of test",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const RETINOSCOPY_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with child/carer, empathy and sensitivity to age and context",
  "Respect for child/carer"
];

const RETINOSCOPY_SECTION_B_CRITERIA = [
  "Patient positioning / room setup",
  "Appropriate cycloplegia",
  "Use of trial frame / lenses",
  "Time taken / flow of examination",
  "Accuracy of retinoscopy",
  "Notation of retinoscopy / working distance",
  "Appropriate prescription issued"
];

const INDIRECT_OPHTHALMOSCOPY_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient and their comfort"
];

const INDIRECT_OPHTHALMOSCOPY_SECTION_B_CRITERIA = [
  "Instructions to patient",
  "Familiarity with use of ophthalmoscope",
  "Correct use of illumination",
  "Appropriate use of lenses",
  "Indentation technique",
  "Description of findings"
];

const PUPIL_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const PUPIL_SECTION_B_CRITERIA = [
  "General inspection in ambient light with measurements",
  "Appropriate use of distance target",
  "Direct pupillary reaction and recovery",
  "Consensual reaction and recovery",
  "Swinging flashlight test",
  "Accommodative reaction and recovery",
  "Slit lamp examination",
  "Correct reactions identified",
  "Suggestion of suitable aetiology",
  "Suggestions for suitable further tests"
];

const CONTACT_LENSES_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient and their comfort"
];

const CONTACT_LENSES_SECTION_B_CRITERIA = [
  "Instructions to and preparation of patient",
  "Familiarity with use of lenses",
  "Correct use of slit lamp illumination",
  "Appropriate use of lenses",
  "Description of findings"
];

const LENS_78D_90D_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient and their comfort"
];

const LENS_78D_90D_SECTION_B_CRITERIA = [
  "Instructions to patient",
  "Familiarity with use of lenses",
  "Correct use of slit lamp illumination",
  "Appropriate use of lenses",
  "Description of findings"
];

const GONIOSCOPY_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity",
  "Respect for patient"
];

const DIRECT_OPHTHALMOSCOPY_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient and their comfort"
];

const DIRECT_OPHTHALMOSCOPY_SECTION_B_CRITERIA = [
  "Instructions to patient",
  "Familiarity with use of ophthalmoscope",
  "Correct use of illumination",
  "Appropriate use of lenses",
  "Description of findings"
];

const SLIT_LAMP_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const SLIT_LAMP_SECTION_B_CRITERIA = [
  "Appropriate interpupillary distance (IPD)",
  "Appropriate eyepiece focus",
  "Appropriate selection of slit beam size and angle",
  "Use of full range of available magnification powers",
  "Use of appropriate filters"
];

const SLIT_LAMP_SECTION_C_CRITERIA = [
  "Lids and lashes",
  "Conjunctiva",
  "Cornea",
  "Iris structures",
  "Lens",
  "Aqueous humour",
  "Anterior chamber depth"
];

const IOP_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const IOP_SECTION_B_CRITERIA = [
  "Consent for test",
  "Application of anaesthesia and fluorescein",
  "Stabilisation of lids and eye",
  "Use of tonometer, accurate placement on eye",
  "Accurate IOP recording (within ±2 mmHg)",
  "Interpretation of result",
  "Corneal appearance after examination",
  "Care of tonometer head",
  "Infection control"
];

const IOP_SECTION_C_CRITERIA = [
  "Knowledge of reasons for calibration",
  "Appropriate use of calibration arm",
  "Interpretation of results",
  "Appropriate action taken"
];

const IOP_TECHNIQUES = ["Goldmann", "Tonopen", "Perkins", "Other"];

const OCULAR_MOTILITY_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const OCULAR_MOTILITY_SECTION_B_CRITERIA = [
  "Observation of associated ocular signs and head position",
  "Use of fixation targets",
  "Performance of cover, cover–uncover, and alternate cover tests",
  "Assessment of versions, ductions, vergences, and saccades",
  "Interpretation of findings"
];

const OCULAR_MOTILITY_SECTION_C_CRITERIA = [
  "Explanation of test",
  "Appropriate positioning of prism bar",
  "Assessment of angle",
  "Interpretation of results"
];

const EXTERNAL_EYE_SECTION_A_CRITERIA = [
  "Introduction and explanation of examination",
  "Rapport with patient, empathy and sensitivity to age and context",
  "Respect for patient"
];

const EXTERNAL_EYE_SECTION_B_CRITERIA = [
  "Assessment of face and head",
  "Palpation of orbital margins",
  "Examination of lacrimal system",
  "Assessment of lid position with appropriate measurements",
  "Examination of lashes",
  "Examination of meibomian glands",
  "Examination of conjunctiva",
  "Examination of cornea"
];

const EXTERNAL_EYE_SECTION_C_CRITERIA = [
  "Lid eversion",
  "Use of exophthalmometer",
  "Other ancillary tests (specified as appropriate)"
];

const FIELDS_SECTION_A_CRITERIA = [
  "Introduction and start of interview",
  "Rapport with patient and development of trust",
  "Listening skills, appropriate eye contact and non-verbal communication",
  "Empathy and sensitivity",
  "Respect for patient"
];

const FIELDS_SECTION_B_CRITERIA = [
  "Appropriate occlusion",
  "Appropriate technique employed",
  "Identification of visual field defect",
  "Understanding of possible causes of defect",
  "Appropriate recommendation for further field testing"
];

const CONSULTATION_SKILLS_SECTION_A_CRITERIA = [
  "Introduction and start of interview",
  "Rapport with patient and development of trust",
  "Listening skills, appropriate eye contact and non-verbal communication",
  "Empathy and sensitivity",
  "Respect for patient"
];

const CONSULTATION_SKILLS_SECTION_B_CRITERIA = [
  "History of presenting complaint",
  "Past ophthalmic history",
  "Family history",
  "Past medical history / general health",
  "Systems enquiry",
  "Drug history and allergies",
  "Social history",
  "Other relevant enquiries pertinent to the case",
  "Assessment of mental state"
];

const CONSULTATION_SKILLS_SECTION_C_CRITERIA = [
  "Sensitive and responsive to patient anxieties and concerns",
  "Awareness of the social impact of problems for the patient",
  "Interview sensitive and responsive to patient's age, mental state, and any communication problems"
];

const CONSULTATION_SKILLS_SECTION_D_CRITERIA = [
  "Mode of enquiry: appropriate use of closed, open, directed and probing questions; clarification and summarising",
  "Appropriate control and direction of consultation",
  "Efficient use of time",
  "Delivery of information",
  "Involvement of patient in decisions",
  "Termination of interview"
];

const CONSULTATION_SKILLS_SPECIALTIES = [
  "No specialty SIA",
  "Cataract Surgery",
  "Community Ophthalmology",
  "Cornea & Ocular Surface",
  "Glaucoma",
  "Medical Retina",
  "Neuro-ophthalmology",
  "Ocular Motility",
  "Oculoplastics",
  "Paediatric Ophthalmology",
  "Urgent Eye Care",
  "Uveitis",
  "Vitreoretinal Surgery"
];

const GONIOSCOPY_SECTION_B_SUBSECTIONS = [
  {
    title: "Slit Lamp",
    criteria: [
      "Room setup and patient position",
      "Anterior chamber depth assessment and grading using Van Herick system"
    ]
  },
  {
    title: "Gonioscopy Technique",
    criteria: [
      "Lens choice, cleaning and preparation",
      "Application of topical anaesthesia and lens placement",
      "Identification of corneal wedge and other structures and features",
      "Examination in 360° of angle and iris",
      "Care of patient and lens"
    ]
  },
  {
    title: "Dynamic Assessment",
    criteria: [
      "Use of appropriate lens",
      "Adjustment of slit lamp, light exposure and eye position",
      "Indentation technique"
    ]
  },
  {
    title: "Interpretation",
    criteria: [
      "Understanding of angle grading system",
      "Interpretation and documentation of results"
    ]
  }
];

const SECTION_B_CRITERIA = [
  "Appropriate occlusion",
  "Technique of assessment appropriate for age and context",
  "Appropriate use of refractive correction",
  "Appropriate use of pinhole",
  "Accurate recording of distance acuity",
  "Accurate recording of near acuity"
];

const SECTION_C_CRITERIA = [
  "Appropriate occlusion",
  "Technique of assessment appropriate for age and context",
  "Appropriate use of colour vision test",
  "Accurate recording of colour vision"
];

const VISUAL_ACUITY_METHODS = ["Snellen", "LogMAR", "Sheridan-Gardner", "Other"];
const COLOUR_VISION_METHODS = ["Ishihara", "Other pseudoisochromatic", "Other"];

const RATING_OPTIONS = ["Major concerns", "Minor concerns", "Meets expectations"];

const CRSForm: React.FC<CRSFormProps> = ({
  id,
  sia = "General Ophthalmology",
  level = 1,
  initialAssessorName = "",
  initialAssessorEmail = "",
  initialStatus = EvidenceStatus.Draft,
  initialCrsType,
  traineeName,
  onBack,
  onSubmitted,
  onSave,
  allEvidence = [],
  isSupervisor = false
}) => {
  const [formId] = useState(id || uuidv4());
  const [activeSection, setActiveSection] = useState(0);
  // Use initialCrsType when creating new (no id), otherwise default to "Vision"
  const [selectedCrsType, setSelectedCrsType] = useState(() => {
    if (!id && initialCrsType && CRS_TYPES.includes(initialCrsType)) {
      return initialCrsType;
    }
    return CRS_TYPES[1]; // Default to "Vision"
  });
  const [trainingLevel, setTrainingLevel] = useState(level.toString());
  const [status, setStatus] = useState<EvidenceStatus>(initialStatus);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [assessorName, setAssessorName] = useState(initialAssessorName);
  const [assessorEmail, setAssessorEmail] = useState(initialAssessorEmail);
  const [caseDescription, setCaseDescription] = useState("");
  const [lastSaved, setLastSaved] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Vision form state
  const [sectionARatings, setSectionARatings] = useState<Record<string, string>>({});
  const [sectionBRatings, setSectionBRatings] = useState<Record<string, string>>({});
  const [sectionCRatings, setSectionCRatings] = useState<Record<string, string>>({});
  const [visualAcuityMethod, setVisualAcuityMethod] = useState("Snellen");
  const [visualAcuityOther, setVisualAcuityOther] = useState("");
  const [colourVisionMethod, setColourVisionMethod] = useState("Ishihara");
  const [colourVisionOther, setColourVisionOther] = useState("");
  const [comments, setComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Retinoscopy form state
  const [retinoscopySectionARatings, setRetinoscopySectionARatings] = useState<Record<string, string>>({});
  const [retinoscopySectionBRatings, setRetinoscopySectionBRatings] = useState<Record<string, string>>({});
  const [retinoscopyComments, setRetinoscopyComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Indirect Ophthalmoscopy form state
  const [indirectOphthalmoscopySectionARatings, setIndirectOphthalmoscopySectionARatings] = useState<Record<string, string>>({});
  const [indirectOphthalmoscopySectionBRatings, setIndirectOphthalmoscopySectionBRatings] = useState<Record<string, string>>({});
  const [indirectOphthalmoscopyComments, setIndirectOphthalmoscopyComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Pupil form state
  const [pupilSectionARatings, setPupilSectionARatings] = useState<Record<string, string>>({});
  const [pupilSectionBRatings, setPupilSectionBRatings] = useState<Record<string, string>>({});
  const [pupilComments, setPupilComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Contact Lenses form state
  const [contactLensesSectionARatings, setContactLensesSectionARatings] = useState<Record<string, string>>({});
  const [contactLensesSectionBRatings, setContactLensesSectionBRatings] = useState<Record<string, string>>({});
  const [contactLensesComments, setContactLensesComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // 78D/90D lens form state
  const [lens78D90DSectionARatings, setLens78D90DSectionARatings] = useState<Record<string, string>>({});
  const [lens78D90DSectionBRatings, setLens78D90DSectionBRatings] = useState<Record<string, string>>({});
  const [lens78D90DComments, setLens78D90DComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Gonioscopy form state
  const [gonioscopySectionARatings, setGonioscopySectionARatings] = useState<Record<string, string>>({});
  const [gonioscopySectionBRatings, setGonioscopySectionBRatings] = useState<Record<string, string>>({});
  const [gonioscopyComments, setGonioscopyComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Direct Ophthalmoscopy form state
  const [directOphthalmoscopySectionARatings, setDirectOphthalmoscopySectionARatings] = useState<Record<string, string>>({});
  const [directOphthalmoscopySectionBRatings, setDirectOphthalmoscopySectionBRatings] = useState<Record<string, string>>({});
  const [directOphthalmoscopyComments, setDirectOphthalmoscopyComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Slit Lamp form state
  const [slitLampSectionARatings, setSlitLampSectionARatings] = useState<Record<string, string>>({});
  const [slitLampSectionBRatings, setSlitLampSectionBRatings] = useState<Record<string, string>>({});
  const [slitLampSectionCRatings, setSlitLampSectionCRatings] = useState<Record<string, string>>({});
  const [slitLampComments, setSlitLampComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // IOP form state
  const [iopSectionARatings, setIopSectionARatings] = useState<Record<string, string>>({});
  const [iopSectionBRatings, setIopSectionBRatings] = useState<Record<string, string>>({});
  const [iopSectionCRatings, setIopSectionCRatings] = useState<Record<string, string>>({});
  const [iopComments, setIopComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });
  const [iopTechnique, setIopTechnique] = useState("Goldmann");
  const [iopOtherTechnique, setIopOtherTechnique] = useState("");

  // Ocular Motility form state
  const [ocularMotilitySectionARatings, setOcularMotilitySectionARatings] = useState<Record<string, string>>({});
  const [ocularMotilitySectionBRatings, setOcularMotilitySectionBRatings] = useState<Record<string, string>>({});
  const [ocularMotilitySectionCRatings, setOcularMotilitySectionCRatings] = useState<Record<string, string>>({});
  const [ocularMotilityComments, setOcularMotilityComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // External Eye form state
  const [externalEyeSectionARatings, setExternalEyeSectionARatings] = useState<Record<string, string>>({});
  const [externalEyeSectionBRatings, setExternalEyeSectionBRatings] = useState<Record<string, string>>({});
  const [externalEyeSectionCRatings, setExternalEyeSectionCRatings] = useState<Record<string, string>>({});
  const [externalEyeComments, setExternalEyeComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Fields form state
  const [fieldsSectionARatings, setFieldsSectionARatings] = useState<Record<string, string>>({});
  const [fieldsSectionBRatings, setFieldsSectionBRatings] = useState<Record<string, string>>({});
  const [fieldsComments, setFieldsComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });

  // Consultation Skills form state
  const [consultationSkillsSectionARatings, setConsultationSkillsSectionARatings] = useState<Record<string, string>>({});
  const [consultationSkillsSectionBRatings, setConsultationSkillsSectionBRatings] = useState<Record<string, string>>({});
  const [consultationSkillsSectionCRatings, setConsultationSkillsSectionCRatings] = useState<Record<string, string>>({});
  const [consultationSkillsSectionDRatings, setConsultationSkillsSectionDRatings] = useState<Record<string, string>>({});
  const [consultationSkillsComments, setConsultationSkillsComments] = useState({
    especiallyGood: "",
    suggestionsForImprovement: "",
    agreedActionPlan: ""
  });
  const [consultationSkillsSpecialty, setConsultationSkillsSpecialty] = useState("No specialty SIA");

  // Refs for smooth scroll navigation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth scroll to section
  const scrollToSection = useCallback((sectionIndex: number) => {
    const sectionElement = sectionRefs.current[sectionIndex];
    if (sectionElement && scrollContainerRef.current) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionIndex);
    }
  }, []);

  // Navigate to previous section
  const goToPreviousSection = useCallback(() => {
    if (activeSection > 0) {
      scrollToSection(activeSection - 1);
    }
  }, [activeSection, scrollToSection]);

  // Navigate to next section
  const goToNextSection = useCallback(() => {
    const sections = getCurrentSections();
    if (activeSection < sections.length - 1) {
      scrollToSection(activeSection + 1);
    }
  }, [activeSection, scrollToSection]);

  // IntersectionObserver to track which section is currently visible
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionIdx = sectionRefs.current.findIndex(ref => ref === entry.target);
            if (sectionIdx !== -1 && sectionIdx !== activeSection) {
              setActiveSection(sectionIdx);
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [selectedCrsType]);

  const isLocked = status === EvidenceStatus.SignedOff || (status === EvidenceStatus.Submitted && !isSupervisor);
  const isVisionForm = selectedCrsType === "Vision";
  const isRetinoscopyForm = selectedCrsType === "Retinoscopy";
  const isIndirectOphthalmoscopyForm = selectedCrsType === "Indirect Ophthalmoscopy";
  const isPupilForm = selectedCrsType === "Pupil";
  const isContactLensesForm = selectedCrsType === "Contact lenses";
  const isLens78D90DForm = selectedCrsType === "78D/90D lens";
  const isGonioscopyForm = selectedCrsType === "Gonioscopy";
  const isDirectOphthalmoscopyForm = selectedCrsType === "Direct Ophthalmoscopy";
  const isSlitLampForm = selectedCrsType === "Slit lamp anterior segment";
  const isIOPForm = selectedCrsType === "IOP";
  const isOcularMotilityForm = selectedCrsType === "Ocular motility";
  const isExternalEyeForm = selectedCrsType === "External eye";
  const isFieldsForm = selectedCrsType === "Fields";
  const isConsultationSkillsForm = selectedCrsType === "Consultation skills";
  const isStructuredForm = isVisionForm || isRetinoscopyForm || isIndirectOphthalmoscopyForm || isPupilForm || isContactLensesForm || isLens78D90DForm || isGonioscopyForm || isDirectOphthalmoscopyForm || isSlitLampForm || isIOPForm || isOcularMotilityForm || isExternalEyeForm || isFieldsForm || isConsultationSkillsForm;

  // Reset active section when form type changes
  useEffect(() => {
    setActiveSection(0);
  }, [selectedCrsType]);

  // Load existing data if editing
  useEffect(() => {
    if (id && allEvidence.length > 0) {
      const savedForm = allEvidence.find(e => e.id === id && e.type === EvidenceType.CRS);
      if (savedForm?.crsFormData) {
        const data = savedForm.crsFormData;

        // Load basic fields
        if (data.crsType) setSelectedCrsType(data.crsType);
        if (data.caseDescription) setCaseDescription(data.caseDescription);
        if (data.assessorName) setAssessorName(data.assessorName);
        if (data.assessorEmail) setAssessorEmail(data.assessorEmail);

        // Load Vision data
        if (data.visionData) {
          const v = data.visionData;
          if (v.sectionA) {
            setSectionARatings({
              introduction: v.sectionA.introduction || "",
              rapport: v.sectionA.rapport || "",
              respect: v.sectionA.respect || ""
            });
          }
          if (v.sectionB) setSectionBRatings(v.sectionB);
          if (v.sectionC) setSectionCRatings(v.sectionC);
          if (v.visualAcuityMethod) setVisualAcuityMethod(v.visualAcuityMethod);
          if (v.visualAcuityOther) setVisualAcuityOther(v.visualAcuityOther);
          if (v.colourVisionMethod) setColourVisionMethod(v.colourVisionMethod);
          if (v.colourVisionOther) setColourVisionOther(v.colourVisionOther);
          if (v.comments) setComments(v.comments);
        }

        // Load Retinoscopy data
        if (data.retinoscopyData) {
          const r = data.retinoscopyData;
          if (r.sectionA) setRetinoscopySectionARatings(r.sectionA);
          if (r.sectionB) setRetinoscopySectionBRatings(r.sectionB);
          if (r.comments) setRetinoscopyComments(r.comments);
        }

        // Load Indirect Ophthalmoscopy data
        if (data.indirectOphthalmoscopyData) {
          const io = data.indirectOphthalmoscopyData;
          if (io.sectionA) setIndirectOphthalmoscopySectionARatings(io.sectionA);
          if (io.sectionB) setIndirectOphthalmoscopySectionBRatings(io.sectionB);
          if (io.comments) setIndirectOphthalmoscopyComments(io.comments);
        }

        // Load Pupil data
        if (data.pupilData) {
          const p = data.pupilData;
          if (p.sectionA) setPupilSectionARatings(p.sectionA);
          if (p.sectionB) setPupilSectionBRatings(p.sectionB);
          if (p.comments) setPupilComments(p.comments);
        }

        // Load status and level
        if (savedForm.status) setStatus(savedForm.status);
        if (savedForm.level) setTrainingLevel(savedForm.level.toString());
      }
    }
  }, [id]);

  // Auto-save functionality
  useEffect(() => {
    if (isLocked || !isStructuredForm) return;
    const timer = setInterval(() => {
      setIsSaving(true);
      saveToParent();
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, [isLocked, isStructuredForm, sectionARatings, sectionBRatings, sectionCRatings, visualAcuityMethod, colourVisionMethod, comments, visualAcuityOther, colourVisionOther, retinoscopySectionARatings, retinoscopySectionBRatings, retinoscopyComments, indirectOphthalmoscopySectionARatings, indirectOphthalmoscopySectionBRatings, indirectOphthalmoscopyComments, pupilSectionARatings, pupilSectionBRatings, pupilComments, contactLensesSectionARatings, contactLensesSectionBRatings, contactLensesComments, lens78D90DSectionARatings, lens78D90DSectionBRatings, lens78D90DComments, gonioscopySectionARatings, gonioscopySectionBRatings, gonioscopyComments, directOphthalmoscopySectionARatings, directOphthalmoscopySectionBRatings, directOphthalmoscopyComments, slitLampSectionARatings, slitLampSectionBRatings, slitLampSectionCRatings, slitLampComments, iopSectionARatings, iopSectionBRatings, iopSectionCRatings, iopComments, iopTechnique, iopOtherTechnique, ocularMotilitySectionARatings, ocularMotilitySectionBRatings, ocularMotilitySectionCRatings, ocularMotilityComments, externalEyeSectionARatings, externalEyeSectionBRatings, externalEyeSectionCRatings, externalEyeComments, fieldsSectionARatings, fieldsSectionBRatings, fieldsComments, consultationSkillsSectionARatings, consultationSkillsSectionBRatings, consultationSkillsSectionCRatings, consultationSkillsSectionDRatings, consultationSkillsComments, consultationSkillsSpecialty]);

  const handleSupervisorSignOff = async () => {
    if (confirm("Are you sure you want to sign off this form as 'Complete'?")) {
      setStatus(EvidenceStatus.SignedOff);
      await saveToParent(EvidenceStatus.SignedOff);
      if (onSubmitted) onSubmitted();
      alert("Form signed off successfully.");
      onBack();
    }
  };

  const saveToParent = async (newStatus: EvidenceStatus = status, gmc?: string, name?: string, email?: string) => {
    const baseData: any = {
      id: formId,
      title: `CRS: ${selectedCrsType} - Level ${trainingLevel}`,
      type: EvidenceType.CRS,
      sia: selectedCrsType || sia,
      level: parseInt(trainingLevel) || 1,
      status: newStatus,
      supervisorGmc: gmc,
      supervisorName: name || assessorName,
      supervisorEmail: email || assessorEmail,
      date: new Date().toISOString().split('T')[0],
      notes: caseDescription,
      crsFormData: {
        crsType: selectedCrsType,
        caseDescription,
        assessorName: name || assessorName,
        assessorEmail: email || assessorEmail
      }
    };

    if (isVisionForm) {
      baseData.crsFormData.visionData = {
        sectionA: {
          introduction: sectionARatings["introduction"] || "",
          rapport: sectionARatings["rapport"] || "",
          respect: sectionARatings["respect"] || ""
        },
        sectionB: {
          method: visualAcuityMethod,
          otherMethod: visualAcuityMethod === "Other" ? visualAcuityOther : undefined,
          appropriateOcclusion: sectionBRatings["appropriateOcclusion"] || "",
          technique: sectionBRatings["technique"] || "",
          refractiveCorrection: sectionBRatings["refractiveCorrection"] || "",
          pinhole: sectionBRatings["pinhole"] || "",
          distanceAcuity: sectionBRatings["distanceAcuity"] || "",
          nearAcuity: sectionBRatings["nearAcuity"] || ""
        },
        sectionC: {
          method: colourVisionMethod,
          otherMethod: colourVisionMethod === "Other" ? colourVisionOther : undefined,
          appropriateOcclusion: sectionCRatings["appropriateOcclusion"] || "",
          technique: sectionCRatings["technique"] || "",
          colourVisionTest: sectionCRatings["colourVisionTest"] || "",
          accurateRecording: sectionCRatings["accurateRecording"] || ""
        },
        comments: comments
      };
    }

    if (isRetinoscopyForm) {
      baseData.crsFormData.retinoscopyData = {
        sectionA: {
          introduction: retinoscopySectionARatings["introduction"] || "",
          rapport: retinoscopySectionARatings["rapport"] || "",
          respect: retinoscopySectionARatings["respect"] || ""
        },
        sectionB: {
          patientPositioning: retinoscopySectionBRatings["patientPositioning"] || "",
          appropriateCycloplegia: retinoscopySectionBRatings["appropriateCycloplegia"] || "",
          useOfTrialFrame: retinoscopySectionBRatings["useOfTrialFrame"] || "",
          timeTaken: retinoscopySectionBRatings["timeTaken"] || "",
          accuracy: retinoscopySectionBRatings["accuracy"] || "",
          notation: retinoscopySectionBRatings["notation"] || "",
          appropriatePrescription: retinoscopySectionBRatings["appropriatePrescription"] || ""
        },
        sectionC: {
          especiallyGood: retinoscopyComments.especiallyGood,
          suggestionsForImprovement: retinoscopyComments.suggestionsForImprovement,
          agreedActionPlan: retinoscopyComments.agreedActionPlan
        }
      };
    }

    if (isIndirectOphthalmoscopyForm) {
      baseData.crsFormData.indirectOphthalmoscopyData = {
        sectionA: {
          introduction: indirectOphthalmoscopySectionARatings["introduction"] || "",
          rapport: indirectOphthalmoscopySectionARatings["rapport"] || "",
          respect: indirectOphthalmoscopySectionARatings["respect"] || ""
        },
        sectionB: {
          instructionsToPatient: indirectOphthalmoscopySectionBRatings["instructionsToPatient"] || "",
          familiarityWithOphthalmoscope: indirectOphthalmoscopySectionBRatings["familiarityWithOphthalmoscope"] || "",
          correctUseOfIllumination: indirectOphthalmoscopySectionBRatings["correctUseOfIllumination"] || "",
          appropriateUseOfLenses: indirectOphthalmoscopySectionBRatings["appropriateUseOfLenses"] || "",
          indentationTechnique: indirectOphthalmoscopySectionBRatings["indentationTechnique"] || "",
          descriptionOfFindings: indirectOphthalmoscopySectionBRatings["descriptionOfFindings"] || ""
        },
        sectionC: {
          especiallyGood: indirectOphthalmoscopyComments.especiallyGood,
          suggestionsForImprovement: indirectOphthalmoscopyComments.suggestionsForImprovement,
          agreedActionPlan: indirectOphthalmoscopyComments.agreedActionPlan
        }
      };
    }

    if (isPupilForm) {
      baseData.crsFormData.pupilData = {
        sectionA: {
          introduction: pupilSectionARatings["introduction"] || "",
          rapport: pupilSectionARatings["rapport"] || "",
          respect: pupilSectionARatings["respect"] || ""
        },
        sectionB: {
          generalInspection: pupilSectionBRatings["generalInspection"] || "",
          appropriateUseOfDistanceTarget: pupilSectionBRatings["appropriateUseOfDistanceTarget"] || "",
          directPupillaryReaction: pupilSectionBRatings["directPupillaryReaction"] || "",
          consensualReaction: pupilSectionBRatings["consensualReaction"] || "",
          swingingFlashlightTest: pupilSectionBRatings["swingingFlashlightTest"] || "",
          accommodativeReaction: pupilSectionBRatings["accommodativeReaction"] || "",
          slitLampExamination: pupilSectionBRatings["slitLampExamination"] || "",
          correctReactionsIdentified: pupilSectionBRatings["correctReactionsIdentified"] || "",
          suggestionOfSuitableAetiology: pupilSectionBRatings["suggestionOfSuitableAetiology"] || "",
          suggestionsForSuitableFurtherTests: pupilSectionBRatings["suggestionsForSuitableFurtherTests"] || ""
        },
        sectionC: {
          especiallyGood: pupilComments.especiallyGood,
          suggestionsForImprovement: pupilComments.suggestionsForImprovement,
          agreedActionPlan: pupilComments.agreedActionPlan
        }
      };
    }

    if (isContactLensesForm) {
      baseData.crsFormData.contactLensesData = {
        sectionA: {
          introduction: contactLensesSectionARatings["introduction"] || "",
          rapport: contactLensesSectionARatings["rapport"] || "",
          respect: contactLensesSectionARatings["respect"] || ""
        },
        sectionB: {
          instructionsToPatient: contactLensesSectionBRatings["instructionsToPatient"] || "",
          familiarityWithLenses: contactLensesSectionBRatings["familiarityWithLenses"] || "",
          correctUseOfSlitLampIllumination: contactLensesSectionBRatings["correctUseOfSlitLampIllumination"] || "",
          appropriateUseOfLenses: contactLensesSectionBRatings["appropriateUseOfLenses"] || "",
          descriptionOfFindings: contactLensesSectionBRatings["descriptionOfFindings"] || ""
        },
        sectionC: {
          especiallyGood: contactLensesComments.especiallyGood,
          suggestionsForImprovement: contactLensesComments.suggestionsForImprovement,
          agreedActionPlan: contactLensesComments.agreedActionPlan
        }
      };
    }

    if (isLens78D90DForm) {
      baseData.crsFormData.lens78D90DData = {
        sectionA: {
          introduction: lens78D90DSectionARatings["introduction"] || "",
          rapport: lens78D90DSectionARatings["rapport"] || "",
          respect: lens78D90DSectionARatings["respect"] || ""
        },
        sectionB: {
          instructionsToPatient: lens78D90DSectionBRatings["instructionsToPatient"] || "",
          familiarityWithLenses: lens78D90DSectionBRatings["familiarityWithLenses"] || "",
          correctUseOfSlitLampIllumination: lens78D90DSectionBRatings["correctUseOfSlitLampIllumination"] || "",
          appropriateUseOfLenses: lens78D90DSectionBRatings["appropriateUseOfLenses"] || "",
          descriptionOfFindings: lens78D90DSectionBRatings["descriptionOfFindings"] || ""
        },
        sectionC: {
          especiallyGood: lens78D90DComments.especiallyGood,
          suggestionsForImprovement: lens78D90DComments.suggestionsForImprovement,
          agreedActionPlan: lens78D90DComments.agreedActionPlan
        }
      };
    }

    if (isGonioscopyForm) {
      baseData.crsFormData.gonioscopyData = {
        sectionA: {
          introduction: gonioscopySectionARatings["introduction"] || "",
          rapport: gonioscopySectionARatings["rapport"] || "",
          respect: gonioscopySectionARatings["respect"] || ""
        },
        sectionB: {
          // Subsection: Slit Lamp
          roomSetup: gonioscopySectionBRatings["roomSetup"] || "",
          anteriorChamberDepth: gonioscopySectionBRatings["anteriorChamberDepth"] || "",
          // Subsection: Gonioscopy Technique
          lensChoice: gonioscopySectionBRatings["lensChoice"] || "",
          applicationAndPlacement: gonioscopySectionBRatings["applicationAndPlacement"] || "",
          identificationOfStructures: gonioscopySectionBRatings["identificationOfStructures"] || "",
          examination360: gonioscopySectionBRatings["examination360"] || "",
          careOfPatientAndLens: gonioscopySectionBRatings["careOfPatientAndLens"] || "",
          // Subsection: Dynamic Assessment
          useOfAppropriateLens: gonioscopySectionBRatings["useOfAppropriateLens"] || "",
          adjustmentOfSlitLamp: gonioscopySectionBRatings["adjustmentOfSlitLamp"] || "",
          indentationTechnique: gonioscopySectionBRatings["indentationTechnique"] || "",
          // Subsection: Interpretation
          understandingOfGrading: gonioscopySectionBRatings["understandingOfGrading"] || "",
          interpretationAndDocumentation: gonioscopySectionBRatings["interpretationAndDocumentation"] || ""
        },
        sectionC: {
          especiallyGood: gonioscopyComments.especiallyGood,
          suggestionsForImprovement: gonioscopyComments.suggestionsForImprovement,
          agreedActionPlan: gonioscopyComments.agreedActionPlan
        }
      };
    }

    if (isDirectOphthalmoscopyForm) {
      baseData.crsFormData.directOphthalmoscopyData = {
        sectionA: {
          introduction: directOphthalmoscopySectionARatings["introduction"] || "",
          rapport: directOphthalmoscopySectionARatings["rapport"] || "",
          respect: directOphthalmoscopySectionARatings["respect"] || ""
        },
        sectionB: {
          instructionsToPatient: directOphthalmoscopySectionBRatings["instructionsToPatient"] || "",
          familiarityWithOphthalmoscope: directOphthalmoscopySectionBRatings["familiarityWithOphthalmoscope"] || "",
          correctUseOfIllumination: directOphthalmoscopySectionBRatings["correctUseOfIllumination"] || "",
          appropriateUseOfLenses: directOphthalmoscopySectionBRatings["appropriateUseOfLenses"] || "",
          descriptionOfFindings: directOphthalmoscopySectionBRatings["descriptionOfFindings"] || ""
        },
        sectionC: {
          especiallyGood: directOphthalmoscopyComments.especiallyGood,
          suggestionsForImprovement: directOphthalmoscopyComments.suggestionsForImprovement,
          agreedActionPlan: directOphthalmoscopyComments.agreedActionPlan
        }
      };
    }

    if (isSlitLampForm) {
      baseData.crsFormData.slitLampData = {
        sectionA: {
          introduction: slitLampSectionARatings["introduction"] || "",
          rapport: slitLampSectionARatings["rapport"] || "",
          respect: slitLampSectionARatings["respect"] || ""
        },
        sectionB: {
          appropriateIPD: slitLampSectionBRatings["appropriateIPD"] || "",
          appropriateEyepieceFocus: slitLampSectionBRatings["appropriateEyepieceFocus"] || "",
          appropriateSlitBeamSizeAndAngle: slitLampSectionBRatings["appropriateSlitBeamSizeAndAngle"] || "",
          useOfFullRangeOfMagnification: slitLampSectionBRatings["useOfFullRangeOfMagnification"] || "",
          useOfAppropriateFilters: slitLampSectionBRatings["useOfAppropriateFilters"] || ""
        },
        sectionC: {
          lidsAndLashes: slitLampSectionCRatings["lidsAndLashes"] || "",
          conjunctiva: slitLampSectionCRatings["conjunctiva"] || "",
          cornea: slitLampSectionCRatings["cornea"] || "",
          irisStructures: slitLampSectionCRatings["irisStructures"] || "",
          lens: slitLampSectionCRatings["lens"] || "",
          aqueousHumour: slitLampSectionCRatings["aqueousHumour"] || "",
          anteriorChamberDepth: slitLampSectionCRatings["anteriorChamberDepth"] || ""
        },
        sectionD: {
          especiallyGood: slitLampComments.especiallyGood,
          suggestionsForImprovement: slitLampComments.suggestionsForImprovement,
          agreedActionPlan: slitLampComments.agreedActionPlan
        }
      };
    }

    if (isIOPForm) {
      baseData.crsFormData.iopData = {
        sectionA: {
          introduction: iopSectionARatings["introduction"] || "",
          rapport: iopSectionARatings["rapport"] || "",
          respect: iopSectionARatings["respect"] || ""
        },
        sectionB: {
          technique: iopTechnique,
          otherTechnique: iopTechnique === "Other" ? iopOtherTechnique : undefined,
          consentForTest: iopSectionBRatings["consentForTest"] || "",
          applicationOfAnaesthesiaAndFluorescein: iopSectionBRatings["applicationOfAnaesthesiaAndFluorescein"] || "",
          stabilisationOfLidsAndEye: iopSectionBRatings["stabilisationOfLidsAndEye"] || "",
          useOfTonometerAccuratePlacement: iopSectionBRatings["useOfTonometerAccuratePlacement"] || "",
          accurateIOPRecording: iopSectionBRatings["accurateIOPRecording"] || "",
          interpretationOfResult: iopSectionBRatings["interpretationOfResult"] || "",
          cornealAppearanceAfterExamination: iopSectionBRatings["cornealAppearanceAfterExamination"] || "",
          careOfTonometerHead: iopSectionBRatings["careOfTonometerHead"] || "",
          infectionControl: iopSectionBRatings["infectionControl"] || ""
        },
        sectionC: {
          knowledgeOfReasonsForCalibration: iopSectionCRatings["knowledgeOfReasonsForCalibration"] || "",
          appropriateUseOfCalibrationArm: iopSectionCRatings["appropriateUseOfCalibrationArm"] || "",
          interpretationOfResults: iopSectionCRatings["interpretationOfResults"] || "",
          appropriateActionTaken: iopSectionCRatings["appropriateActionTaken"] || ""
        },
        sectionD: {
          especiallyGood: iopComments.especiallyGood,
          suggestionsForImprovement: iopComments.suggestionsForImprovement,
          agreedActionPlan: iopComments.agreedActionPlan
        }
      };
    }

    if (isOcularMotilityForm) {
      baseData.crsFormData.ocularMotilityData = {
        sectionA: {
          introduction: ocularMotilitySectionARatings["introduction"] || "",
          rapport: ocularMotilitySectionARatings["rapport"] || "",
          respect: ocularMotilitySectionARatings["respect"] || ""
        },
        sectionB: {
          observationOfAssociatedOcularSignsAndHeadPosition: ocularMotilitySectionBRatings["observationOfAssociatedOcularSignsAndHeadPosition"] || "",
          useOfFixationTargets: ocularMotilitySectionBRatings["useOfFixationTargets"] || "",
          performanceOfCoverTests: ocularMotilitySectionBRatings["performanceOfCoverTests"] || "",
          assessmentOfVersionsDuctionsVergencesAndSaccades: ocularMotilitySectionBRatings["assessmentOfVersionsDuctionsVergencesAndSaccades"] || "",
          interpretationOfFindings: ocularMotilitySectionBRatings["interpretationOfFindings"] || ""
        },
        sectionC: {
          explanationOfTest: ocularMotilitySectionCRatings["explanationOfTest"] || "",
          appropriatePositioningOfPrismBar: ocularMotilitySectionCRatings["appropriatePositioningOfPrismBar"] || "",
          assessmentOfAngle: ocularMotilitySectionCRatings["assessmentOfAngle"] || "",
          interpretationOfResults: ocularMotilitySectionCRatings["interpretationOfResults"] || ""
        },
        sectionD: {
          especiallyGood: ocularMotilityComments.especiallyGood,
          suggestionsForImprovement: ocularMotilityComments.suggestionsForImprovement,
          agreedActionPlan: ocularMotilityComments.agreedActionPlan
        }
      };
    }

    if (isExternalEyeForm) {
      baseData.crsFormData.externalEyeData = {
        sectionA: {
          introduction: externalEyeSectionARatings["introduction"] || "",
          rapport: externalEyeSectionARatings["rapport"] || "",
          respect: externalEyeSectionARatings["respect"] || ""
        },
        sectionB: {
          assessmentOfFaceAndHead: externalEyeSectionBRatings["assessmentOfFaceAndHead"] || "",
          palpationOfOrbitalMargins: externalEyeSectionBRatings["palpationOfOrbitalMargins"] || "",
          examinationOfLacrimalSystem: externalEyeSectionBRatings["examinationOfLacrimalSystem"] || "",
          assessmentOfLidPositionWithAppropriateMeasurements: externalEyeSectionBRatings["assessmentOfLidPositionWithAppropriateMeasurements"] || "",
          examinationOfLashes: externalEyeSectionBRatings["examinationOfLashes"] || "",
          examinationOfMeibomianGlands: externalEyeSectionBRatings["examinationOfMeibomianGlands"] || "",
          examinationOfConjunctiva: externalEyeSectionBRatings["examinationOfConjunctiva"] || "",
          examinationOfCornea: externalEyeSectionBRatings["examinationOfCornea"] || ""
        },
        sectionC: {
          lidEversion: externalEyeSectionCRatings["lidEversion"] || "",
          useOfExophthalmometer: externalEyeSectionCRatings["useOfExophthalmometer"] || "",
          otherAncillaryTests: externalEyeSectionCRatings["otherAncillaryTests"] || ""
        },
        sectionD: {
          especiallyGood: externalEyeComments.especiallyGood,
          suggestionsForImprovement: externalEyeComments.suggestionsForImprovement,
          agreedActionPlan: externalEyeComments.agreedActionPlan
        }
      };
    }

    if (isFieldsForm) {
      baseData.crsFormData.fieldsData = {
        sectionA: {
          introduction: fieldsSectionARatings["introduction"] || "",
          rapport: fieldsSectionARatings["rapport"] || "",
          listeningSkills: fieldsSectionARatings["listeningSkills"] || "",
          empathy: fieldsSectionARatings["empathy"] || "",
          respect: fieldsSectionARatings["respect"] || ""
        },
        sectionB: {
          appropriateOcclusion: fieldsSectionBRatings["appropriateOcclusion"] || "",
          appropriateTechnique: fieldsSectionBRatings["appropriateTechnique"] || "",
          identificationOfVisualFieldDefect: fieldsSectionBRatings["identificationOfVisualFieldDefect"] || "",
          understandingOfPossibleCauses: fieldsSectionBRatings["understandingOfPossibleCauses"] || "",
          appropriateRecommendationForFurtherFieldTesting: fieldsSectionBRatings["appropriateRecommendationForFurtherFieldTesting"] || ""
        },
        sectionC: {
          especiallyGood: fieldsComments.especiallyGood,
          suggestionsForImprovement: fieldsComments.suggestionsForImprovement,
          agreedActionPlan: fieldsComments.agreedActionPlan
        }
      };
    }

    if (isConsultationSkillsForm) {
      baseData.crsFormData.consultationSkillsData = {
        specialty: consultationSkillsSpecialty,
        sectionA: {
          introduction: consultationSkillsSectionARatings["introduction"] || "",
          rapport: consultationSkillsSectionARatings["rapport"] || "",
          listeningSkills: consultationSkillsSectionARatings["listeningSkills"] || "",
          empathy: consultationSkillsSectionARatings["empathy"] || "",
          respect: consultationSkillsSectionARatings["respect"] || ""
        },
        sectionB: {
          historyOfPresentingComplaint: consultationSkillsSectionBRatings["historyOfPresentingComplaint"] || "",
          pastOphthalmicHistory: consultationSkillsSectionBRatings["pastOphthalmicHistory"] || "",
          familyHistory: consultationSkillsSectionBRatings["familyHistory"] || "",
          pastMedicalHistory: consultationSkillsSectionBRatings["pastMedicalHistory"] || "",
          systemsEnquiry: consultationSkillsSectionBRatings["systemsEnquiry"] || "",
          drugHistoryAndAllergies: consultationSkillsSectionBRatings["drugHistoryAndAllergies"] || "",
          socialHistory: consultationSkillsSectionBRatings["socialHistory"] || "",
          otherRelevantEnquiries: consultationSkillsSectionBRatings["otherRelevantEnquiries"] || "",
          assessmentOfMentalState: consultationSkillsSectionBRatings["assessmentOfMentalState"] || ""
        },
        sectionC: {
          sensitiveAndResponsiveToPatientAnxieties: consultationSkillsSectionCRatings["sensitiveAndResponsiveToPatientAnxieties"] || "",
          awarenessOfSocialImpact: consultationSkillsSectionCRatings["awarenessOfSocialImpact"] || "",
          interviewSensitiveAndResponsive: consultationSkillsSectionCRatings["interviewSensitiveAndResponsive"] || ""
        },
        sectionD: {
          modeOfEnquiry: consultationSkillsSectionDRatings["modeOfEnquiry"] || "",
          appropriateControlAndDirection: consultationSkillsSectionDRatings["appropriateControlAndDirection"] || "",
          efficientUseOfTime: consultationSkillsSectionDRatings["efficientUseOfTime"] || "",
          deliveryOfInformation: consultationSkillsSectionDRatings["deliveryOfInformation"] || "",
          involvementOfPatientInDecisions: consultationSkillsSectionDRatings["involvementOfPatientInDecisions"] || "",
          terminationOfInterview: consultationSkillsSectionDRatings["terminationOfInterview"] || ""
        },
        sectionE: {
          especiallyGood: consultationSkillsComments.especiallyGood,
          suggestionsForImprovement: consultationSkillsComments.suggestionsForImprovement,
          agreedActionPlan: consultationSkillsComments.agreedActionPlan
        }
      };
    }

    onSave(baseData);
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    saveToParent(EvidenceStatus.Draft);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }, 600);
  };

  const handleEmailForm = async () => {
    if (!assessorName || !assessorEmail) {
      alert("Please provide supervisor name and email.");
      return;
    }
    setStatus(EvidenceStatus.Submitted);
    await saveToParent(EvidenceStatus.Submitted);
    alert("Form emailed to supervisor");
    if (onSubmitted) onSubmitted();
  };

  const handleSignOffConfirm = async (gmc: string, name: string, email: string, signature: string) => {
    setStatus(EvidenceStatus.SignedOff);
    setAssessorName(name);
    setAssessorEmail(email);
    await saveToParent(EvidenceStatus.SignedOff, gmc, name, email);
    setIsSignOffOpen(false);
    if (onSubmitted) onSubmitted();
  };

  const handleRatingChange = (section: 'A' | 'B' | 'C' | 'D' | 'E', key: string, value: string, formType: 'vision' | 'retinoscopy' | 'indirectOphthalmoscopy' | 'pupil' | 'contactLenses' | 'lens78D90D' | 'gonioscopy' | 'directOphthalmoscopy' | 'slitLamp' | 'iop' | 'ocularMotility' | 'externalEye' | 'fields' | 'consultationSkills' = 'vision') => {
    if (isLocked) return;
    if (formType === 'retinoscopy') {
      if (section === 'A') {
        setRetinoscopySectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setRetinoscopySectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'indirectOphthalmoscopy') {
      if (section === 'A') {
        setIndirectOphthalmoscopySectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setIndirectOphthalmoscopySectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'pupil') {
      if (section === 'A') {
        setPupilSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setPupilSectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'contactLenses') {
      if (section === 'A') {
        setContactLensesSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setContactLensesSectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'lens78D90D') {
      if (section === 'A') {
        setLens78D90DSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setLens78D90DSectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'gonioscopy') {
      if (section === 'A') {
        setGonioscopySectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setGonioscopySectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'directOphthalmoscopy') {
      if (section === 'A') {
        setDirectOphthalmoscopySectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setDirectOphthalmoscopySectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'slitLamp') {
      if (section === 'A') {
        setSlitLampSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setSlitLampSectionBRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'C') {
        setSlitLampSectionCRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'iop') {
      if (section === 'A') {
        setIopSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setIopSectionBRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'C') {
        setIopSectionCRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'ocularMotility') {
      if (section === 'A') {
        setOcularMotilitySectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setOcularMotilitySectionBRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'C') {
        setOcularMotilitySectionCRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'externalEye') {
      if (section === 'A') {
        setExternalEyeSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setExternalEyeSectionBRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'C') {
        setExternalEyeSectionCRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'fields') {
      if (section === 'A') {
        setFieldsSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setFieldsSectionBRatings(prev => ({ ...prev, [key]: value }));
      }
    } else if (formType === 'consultationSkills') {
      if (section === 'A') {
        setConsultationSkillsSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setConsultationSkillsSectionBRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'C') {
        setConsultationSkillsSectionCRatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'D') {
        setConsultationSkillsSectionDRatings(prev => ({ ...prev, [key]: value }));
      }
    } else {
      if (section === 'A') {
        setSectionARatings(prev => ({ ...prev, [key]: value }));
      } else if (section === 'B') {
        setSectionBRatings(prev => ({ ...prev, [key]: value }));
      } else {
        setSectionCRatings(prev => ({ ...prev, [key]: value }));
      }
    }
  };

  const handleMarkAllMeets = () => {
    if (isLocked) return;
    const allMeets = "Meets expectations";

    if (isConsultationSkillsForm) {
      // Consultation Skills Section A
      const consultationSkillsSectionAKeys = ["introduction", "rapport", "listeningSkills", "empathy", "respect"];
      const newConsultationSkillsSectionA = { ...consultationSkillsSectionARatings };
      consultationSkillsSectionAKeys.forEach(key => {
        newConsultationSkillsSectionA[key] = allMeets;
      });
      setConsultationSkillsSectionARatings(newConsultationSkillsSectionA);

      // Consultation Skills Section B
      const consultationSkillsSectionBKeys = ["historyOfPresentingComplaint", "pastOphthalmicHistory", "familyHistory", "pastMedicalHistory", "systemsEnquiry", "drugHistoryAndAllergies", "socialHistory", "otherRelevantEnquiries", "assessmentOfMentalState"];
      const newConsultationSkillsSectionB = { ...consultationSkillsSectionBRatings };
      consultationSkillsSectionBKeys.forEach(key => {
        newConsultationSkillsSectionB[key] = allMeets;
      });
      setConsultationSkillsSectionBRatings(newConsultationSkillsSectionB);

      // Consultation Skills Section C
      const consultationSkillsSectionCKeys = ["sensitiveAndResponsiveToPatientAnxieties", "awarenessOfSocialImpact", "interviewSensitiveAndResponsive"];
      const newConsultationSkillsSectionC = { ...consultationSkillsSectionCRatings };
      consultationSkillsSectionCKeys.forEach(key => {
        newConsultationSkillsSectionC[key] = allMeets;
      });
      setConsultationSkillsSectionCRatings(newConsultationSkillsSectionC);

      // Consultation Skills Section D
      const consultationSkillsSectionDKeys = ["modeOfEnquiry", "appropriateControlAndDirection", "efficientUseOfTime", "deliveryOfInformation", "involvementOfPatientInDecisions", "terminationOfInterview"];
      const newConsultationSkillsSectionD = { ...consultationSkillsSectionDRatings };
      consultationSkillsSectionDKeys.forEach(key => {
        newConsultationSkillsSectionD[key] = allMeets;
      });
      setConsultationSkillsSectionDRatings(newConsultationSkillsSectionD);
    } else if (isFieldsForm) {
      // Fields Section A
      const fieldsSectionAKeys = ["introduction", "rapport", "listeningSkills", "empathy", "respect"];
      const newFieldsSectionA = { ...fieldsSectionARatings };
      fieldsSectionAKeys.forEach(key => {
        newFieldsSectionA[key] = allMeets;
      });
      setFieldsSectionARatings(newFieldsSectionA);

      // Fields Section B
      const fieldsSectionBKeys = ["appropriateOcclusion", "appropriateTechnique", "identificationOfVisualFieldDefect", "understandingOfPossibleCauses", "appropriateRecommendationForFurtherFieldTesting"];
      const newFieldsSectionB = { ...fieldsSectionBRatings };
      fieldsSectionBKeys.forEach(key => {
        newFieldsSectionB[key] = allMeets;
      });
      setFieldsSectionBRatings(newFieldsSectionB);
    } else if (isExternalEyeForm) {
      // External Eye Section A
      const externalEyeSectionAKeys = ["introduction", "rapport", "respect"];
      const newExternalEyeSectionA = { ...externalEyeSectionARatings };
      externalEyeSectionAKeys.forEach(key => {
        newExternalEyeSectionA[key] = allMeets;
      });
      setExternalEyeSectionARatings(newExternalEyeSectionA);

      // External Eye Section B
      const externalEyeSectionBKeys = ["assessmentOfFaceAndHead", "palpationOfOrbitalMargins", "examinationOfLacrimalSystem", "assessmentOfLidPositionWithAppropriateMeasurements", "examinationOfLashes", "examinationOfMeibomianGlands", "examinationOfConjunctiva", "examinationOfCornea"];
      const newExternalEyeSectionB = { ...externalEyeSectionBRatings };
      externalEyeSectionBKeys.forEach(key => {
        newExternalEyeSectionB[key] = allMeets;
      });
      setExternalEyeSectionBRatings(newExternalEyeSectionB);

      // External Eye Section C
      const externalEyeSectionCKeys = ["lidEversion", "useOfExophthalmometer", "otherAncillaryTests"];
      const newExternalEyeSectionC = { ...externalEyeSectionCRatings };
      externalEyeSectionCKeys.forEach(key => {
        newExternalEyeSectionC[key] = allMeets;
      });
      setExternalEyeSectionCRatings(newExternalEyeSectionC);
    } else if (isOcularMotilityForm) {
      // Ocular Motility Section A
      const ocularMotilitySectionAKeys = ["introduction", "rapport", "respect"];
      const newOcularMotilitySectionA = { ...ocularMotilitySectionARatings };
      ocularMotilitySectionAKeys.forEach(key => {
        newOcularMotilitySectionA[key] = allMeets;
      });
      setOcularMotilitySectionARatings(newOcularMotilitySectionA);

      // Ocular Motility Section B
      const ocularMotilitySectionBKeys = ["observationOfAssociatedOcularSignsAndHeadPosition", "useOfFixationTargets", "performanceOfCoverTests", "assessmentOfVersionsDuctionsVergencesAndSaccades", "interpretationOfFindings"];
      const newOcularMotilitySectionB = { ...ocularMotilitySectionBRatings };
      ocularMotilitySectionBKeys.forEach(key => {
        newOcularMotilitySectionB[key] = allMeets;
      });
      setOcularMotilitySectionBRatings(newOcularMotilitySectionB);

      // Ocular Motility Section C
      const ocularMotilitySectionCKeys = ["explanationOfTest", "appropriatePositioningOfPrismBar", "assessmentOfAngle", "interpretationOfResults"];
      const newOcularMotilitySectionC = { ...ocularMotilitySectionCRatings };
      ocularMotilitySectionCKeys.forEach(key => {
        newOcularMotilitySectionC[key] = allMeets;
      });
      setOcularMotilitySectionCRatings(newOcularMotilitySectionC);
    } else if (isIOPForm) {
      // IOP Section A
      const iopSectionAKeys = ["introduction", "rapport", "respect"];
      const newIopSectionA = { ...iopSectionARatings };
      iopSectionAKeys.forEach(key => {
        newIopSectionA[key] = allMeets;
      });
      setIopSectionARatings(newIopSectionA);

      // IOP Section B
      const iopSectionBKeys = ["consentForTest", "applicationOfAnaesthesiaAndFluorescein", "stabilisationOfLidsAndEye", "useOfTonometerAccuratePlacement", "accurateIOPRecording", "interpretationOfResult", "cornealAppearanceAfterExamination", "careOfTonometerHead", "infectionControl"];
      const newIopSectionB = { ...iopSectionBRatings };
      iopSectionBKeys.forEach(key => {
        newIopSectionB[key] = allMeets;
      });
      setIopSectionBRatings(newIopSectionB);

      // IOP Section C
      const iopSectionCKeys = ["knowledgeOfReasonsForCalibration", "appropriateUseOfCalibrationArm", "interpretationOfResults", "appropriateActionTaken"];
      const newIopSectionC = { ...iopSectionCRatings };
      iopSectionCKeys.forEach(key => {
        newIopSectionC[key] = allMeets;
      });
      setIopSectionCRatings(newIopSectionC);
    } else if (isSlitLampForm) {
      // Slit Lamp Section A
      const slitLampSectionAKeys = ["introduction", "rapport", "respect"];
      const newSlitLampSectionA = { ...slitLampSectionARatings };
      slitLampSectionAKeys.forEach(key => {
        newSlitLampSectionA[key] = allMeets;
      });
      setSlitLampSectionARatings(newSlitLampSectionA);

      // Slit Lamp Section B
      const slitLampSectionBKeys = ["appropriateIPD", "appropriateEyepieceFocus", "appropriateSlitBeamSizeAndAngle", "useOfFullRangeOfMagnification", "useOfAppropriateFilters"];
      const newSlitLampSectionB = { ...slitLampSectionBRatings };
      slitLampSectionBKeys.forEach(key => {
        newSlitLampSectionB[key] = allMeets;
      });
      setSlitLampSectionBRatings(newSlitLampSectionB);

      // Slit Lamp Section C
      const slitLampSectionCKeys = ["lidsAndLashes", "conjunctiva", "cornea", "irisStructures", "lens", "aqueousHumour", "anteriorChamberDepth"];
      const newSlitLampSectionC = { ...slitLampSectionCRatings };
      slitLampSectionCKeys.forEach(key => {
        newSlitLampSectionC[key] = allMeets;
      });
      setSlitLampSectionCRatings(newSlitLampSectionC);
    } else if (isDirectOphthalmoscopyForm) {
      // Direct Ophthalmoscopy Section A
      const directOphthalmoscopySectionAKeys = ["introduction", "rapport", "respect"];
      const newDirectOphthalmoscopySectionA = { ...directOphthalmoscopySectionARatings };
      directOphthalmoscopySectionAKeys.forEach(key => {
        newDirectOphthalmoscopySectionA[key] = allMeets;
      });
      setDirectOphthalmoscopySectionARatings(newDirectOphthalmoscopySectionA);

      // Direct Ophthalmoscopy Section B
      const directOphthalmoscopySectionBKeys = ["instructionsToPatient", "familiarityWithOphthalmoscope", "correctUseOfIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];
      const newDirectOphthalmoscopySectionB = { ...directOphthalmoscopySectionBRatings };
      directOphthalmoscopySectionBKeys.forEach(key => {
        newDirectOphthalmoscopySectionB[key] = allMeets;
      });
      setDirectOphthalmoscopySectionBRatings(newDirectOphthalmoscopySectionB);
    } else if (isGonioscopyForm) {
      // Gonioscopy Section A
      const gonioscopySectionAKeys = ["introduction", "rapport", "respect"];
      const newGonioscopySectionA = { ...gonioscopySectionARatings };
      gonioscopySectionAKeys.forEach(key => {
        newGonioscopySectionA[key] = allMeets;
      });
      setGonioscopySectionARatings(newGonioscopySectionA);

      // Gonioscopy Section B
      const gonioscopySectionBKeys = ["roomSetup", "anteriorChamberDepth", "lensChoice", "applicationAndPlacement", "identificationOfStructures", "examination360", "careOfPatientAndLens", "useOfAppropriateLens", "adjustmentOfSlitLamp", "indentationTechnique", "understandingOfGrading", "interpretationAndDocumentation"];
      const newGonioscopySectionB = { ...gonioscopySectionBRatings };
      gonioscopySectionBKeys.forEach(key => {
        newGonioscopySectionB[key] = allMeets;
      });
      setGonioscopySectionBRatings(newGonioscopySectionB);
    } else if (isLens78D90DForm) {
      // 78D/90D lens Section A
      const lens78D90DSectionAKeys = ["introduction", "rapport", "respect"];
      const newLens78D90DSectionA = { ...lens78D90DSectionARatings };
      lens78D90DSectionAKeys.forEach(key => {
        newLens78D90DSectionA[key] = allMeets;
      });
      setLens78D90DSectionARatings(newLens78D90DSectionA);

      // 78D/90D lens Section B
      const lens78D90DSectionBKeys = ["instructionsToPatient", "familiarityWithLenses", "correctUseOfSlitLampIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];
      const newLens78D90DSectionB = { ...lens78D90DSectionBRatings };
      lens78D90DSectionBKeys.forEach(key => {
        newLens78D90DSectionB[key] = allMeets;
      });
      setLens78D90DSectionBRatings(newLens78D90DSectionB);
    } else if (isContactLensesForm) {
      // Contact Lenses Section A
      const contactLensesSectionAKeys = ["introduction", "rapport", "respect"];
      const newContactLensesSectionA = { ...contactLensesSectionARatings };
      contactLensesSectionAKeys.forEach(key => {
        newContactLensesSectionA[key] = allMeets;
      });
      setContactLensesSectionARatings(newContactLensesSectionA);

      // Contact Lenses Section B
      const contactLensesSectionBKeys = ["instructionsToPatient", "familiarityWithLenses", "correctUseOfSlitLampIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];
      const newContactLensesSectionB = { ...contactLensesSectionBRatings };
      contactLensesSectionBKeys.forEach(key => {
        newContactLensesSectionB[key] = allMeets;
      });
      setContactLensesSectionBRatings(newContactLensesSectionB);
    } else if (isPupilForm) {
      // Pupil Section A
      const pupilSectionAKeys = ["introduction", "rapport", "respect"];
      const newPupilSectionA = { ...pupilSectionARatings };
      pupilSectionAKeys.forEach(key => {
        newPupilSectionA[key] = allMeets;
      });
      setPupilSectionARatings(newPupilSectionA);

      // Pupil Section B
      const pupilSectionBKeys = ["generalInspection", "appropriateUseOfDistanceTarget", "directPupillaryReaction", "consensualReaction", "swingingFlashlightTest", "accommodativeReaction", "slitLampExamination", "correctReactionsIdentified", "suggestionOfSuitableAetiology", "suggestionsForSuitableFurtherTests"];
      const newPupilSectionB = { ...pupilSectionBRatings };
      pupilSectionBKeys.forEach(key => {
        newPupilSectionB[key] = allMeets;
      });
      setPupilSectionBRatings(newPupilSectionB);
    } else if (isIndirectOphthalmoscopyForm) {
      // Indirect Ophthalmoscopy Section A
      const indirectOphthalmoscopySectionAKeys = ["introduction", "rapport", "respect"];
      const newIndirectOphthalmoscopySectionA = { ...indirectOphthalmoscopySectionARatings };
      indirectOphthalmoscopySectionAKeys.forEach(key => {
        newIndirectOphthalmoscopySectionA[key] = allMeets;
      });
      setIndirectOphthalmoscopySectionARatings(newIndirectOphthalmoscopySectionA);

      // Indirect Ophthalmoscopy Section B
      const indirectOphthalmoscopySectionBKeys = ["instructionsToPatient", "familiarityWithOphthalmoscope", "correctUseOfIllumination", "appropriateUseOfLenses", "indentationTechnique", "descriptionOfFindings"];
      const newIndirectOphthalmoscopySectionB = { ...indirectOphthalmoscopySectionBRatings };
      indirectOphthalmoscopySectionBKeys.forEach(key => {
        newIndirectOphthalmoscopySectionB[key] = allMeets;
      });
      setIndirectOphthalmoscopySectionBRatings(newIndirectOphthalmoscopySectionB);
    } else if (isRetinoscopyForm) {
      // Retinoscopy Section A
      const retinoscopySectionAKeys = ["introduction", "rapport", "respect"];
      const newRetinoscopySectionA = { ...retinoscopySectionARatings };
      retinoscopySectionAKeys.forEach(key => {
        newRetinoscopySectionA[key] = allMeets;
      });
      setRetinoscopySectionARatings(newRetinoscopySectionA);

      // Retinoscopy Section B
      const retinoscopySectionBKeys = ["patientPositioning", "appropriateCycloplegia", "useOfTrialFrame", "timeTaken", "accuracy", "notation", "appropriatePrescription"];
      const newRetinoscopySectionB = { ...retinoscopySectionBRatings };
      retinoscopySectionBKeys.forEach(key => {
        newRetinoscopySectionB[key] = allMeets;
      });
      setRetinoscopySectionBRatings(newRetinoscopySectionB);
    } else if (isVisionForm) {
      // Vision Section A
      const sectionAKeys = ["introduction", "rapport", "respect"];
      const newSectionA = { ...sectionARatings };
      sectionAKeys.forEach(key => {
        newSectionA[key] = allMeets;
      });
      setSectionARatings(newSectionA);

      // Vision Section B
      const sectionBKeys = ["appropriateOcclusion", "technique", "refractiveCorrection", "pinhole", "distanceAcuity", "nearAcuity"];
      const newSectionB = { ...sectionBRatings };
      sectionBKeys.forEach(key => {
        newSectionB[key] = allMeets;
      });
      setSectionBRatings(newSectionB);

      // Vision Section C
      const sectionCKeys = ["appropriateOcclusion", "technique", "colourVisionTest", "accurateRecording"];
      const newSectionC = { ...sectionCRatings };
      sectionCKeys.forEach(key => {
        newSectionC[key] = allMeets;
      });
      setSectionCRatings(newSectionC);
    }
  };

  const renderSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = sectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderSectionB = () => {
    const criteriaKeys = ["appropriateOcclusion", "technique", "refractiveCorrection", "pinhole", "distanceAcuity", "nearAcuity"];

    return (
      <div className="space-y-6">
        {/* Method Selection */}
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">Method Used</label>
          <div className="flex flex-wrap gap-3">
            {VISUAL_ACUITY_METHODS.map(method => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visualAcuityMethod"
                  value={method}
                  checked={visualAcuityMethod === method}
                  onChange={(e) => setVisualAcuityMethod(e.target.value)}
                  disabled={isLocked}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-white/70">{method}</span>
              </label>
            ))}
          </div>
          {visualAcuityMethod === "Other" && (
            <input
              type="text"
              value={visualAcuityOther}
              onChange={(e) => setVisualAcuityOther(e.target.value)}
              disabled={isLocked}
              placeholder="Specify method"
              className="mt-3 w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
            />
          )}
        </GlassCard>

        {/* Performance Criteria */}
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = sectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderSectionC = () => {
    const criteriaKeys = ["appropriateOcclusion", "technique", "colourVisionTest", "accurateRecording"];

    return (
      <div className="space-y-6">
        {/* Method Selection */}
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">Method Used</label>
          <div className="flex flex-wrap gap-3">
            {COLOUR_VISION_METHODS.map(method => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colourVisionMethod"
                  value={method}
                  checked={colourVisionMethod === method}
                  onChange={(e) => setColourVisionMethod(e.target.value)}
                  disabled={isLocked}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-white/70">{method}</span>
              </label>
            ))}
          </div>
          {colourVisionMethod === "Other" && (
            <input
              type="text"
              value={colourVisionOther}
              onChange={(e) => setColourVisionOther(e.target.value)}
              disabled={isLocked}
              placeholder="Specify method"
              className="mt-3 w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
            />
          )}
        </GlassCard>

        {/* Performance Criteria */}
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = sectionCRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderComments = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={comments.especiallyGood}
            onChange={(e) => setComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!comments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={comments.suggestionsForImprovement}
            onChange={(e) => setComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!comments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={comments.agreedActionPlan}
            onChange={(e) => setComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!comments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Retinoscopy rendering functions
  const renderRetinoscopySectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {RETINOSCOPY_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = retinoscopySectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'retinoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderRetinoscopySectionB = () => {
    const criteriaKeys = ["patientPositioning", "appropriateCycloplegia", "useOfTrialFrame", "timeTaken", "accuracy", "notation", "appropriatePrescription"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {RETINOSCOPY_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = retinoscopySectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'retinoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderRetinoscopySectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={retinoscopyComments.especiallyGood}
            onChange={(e) => setRetinoscopyComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!retinoscopyComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points
          </label>
          <textarea
            disabled={isLocked}
            value={retinoscopyComments.suggestionsForImprovement}
            onChange={(e) => setRetinoscopyComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Optional"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''}`}
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={retinoscopyComments.agreedActionPlan}
            onChange={(e) => setRetinoscopyComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!retinoscopyComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Indirect Ophthalmoscopy rendering functions
  const renderIndirectOphthalmoscopySectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {INDIRECT_OPHTHALMOSCOPY_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = indirectOphthalmoscopySectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'indirectOphthalmoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderIndirectOphthalmoscopySectionB = () => {
    const criteriaKeys = ["instructionsToPatient", "familiarityWithOphthalmoscope", "correctUseOfIllumination", "appropriateUseOfLenses", "indentationTechnique", "descriptionOfFindings"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {INDIRECT_OPHTHALMOSCOPY_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = indirectOphthalmoscopySectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'indirectOphthalmoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderIndirectOphthalmoscopySectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={indirectOphthalmoscopyComments.especiallyGood}
            onChange={(e) => setIndirectOphthalmoscopyComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!indirectOphthalmoscopyComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={indirectOphthalmoscopyComments.suggestionsForImprovement}
            onChange={(e) => setIndirectOphthalmoscopyComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!indirectOphthalmoscopyComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={indirectOphthalmoscopyComments.agreedActionPlan}
            onChange={(e) => setIndirectOphthalmoscopyComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!indirectOphthalmoscopyComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Pupil rendering functions
  const renderPupilSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {PUPIL_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = pupilSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'pupil')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderPupilSectionB = () => {
    const criteriaKeys = ["generalInspection", "appropriateUseOfDistanceTarget", "directPupillaryReaction", "consensualReaction", "swingingFlashlightTest", "accommodativeReaction", "slitLampExamination", "correctReactionsIdentified", "suggestionOfSuitableAetiology", "suggestionsForSuitableFurtherTests"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {PUPIL_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = pupilSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'pupil')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderPupilSectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={pupilComments.especiallyGood}
            onChange={(e) => setPupilComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!pupilComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={pupilComments.suggestionsForImprovement}
            onChange={(e) => setPupilComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!pupilComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={pupilComments.agreedActionPlan}
            onChange={(e) => setPupilComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!pupilComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Contact Lenses rendering functions
  const renderContactLensesSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {CONTACT_LENSES_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = contactLensesSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'contactLenses')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderContactLensesSectionB = () => {
    const criteriaKeys = ["instructionsToPatient", "familiarityWithLenses", "correctUseOfSlitLampIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {CONTACT_LENSES_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = contactLensesSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'contactLenses')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderContactLensesSectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={contactLensesComments.especiallyGood}
            onChange={(e) => setContactLensesComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!contactLensesComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={contactLensesComments.suggestionsForImprovement}
            onChange={(e) => setContactLensesComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!contactLensesComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={contactLensesComments.agreedActionPlan}
            onChange={(e) => setContactLensesComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!contactLensesComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // 78D/90D lens rendering functions
  const renderLens78D90DSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {LENS_78D_90D_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = lens78D90DSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'lens78D90D')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderLens78D90DSectionB = () => {
    const criteriaKeys = ["instructionsToPatient", "familiarityWithLenses", "correctUseOfSlitLampIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {LENS_78D_90D_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = lens78D90DSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'lens78D90D')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderLens78D90DSectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={lens78D90DComments.especiallyGood}
            onChange={(e) => setLens78D90DComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!lens78D90DComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={lens78D90DComments.suggestionsForImprovement}
            onChange={(e) => setLens78D90DComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!lens78D90DComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={lens78D90DComments.agreedActionPlan}
            onChange={(e) => setLens78D90DComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!lens78D90DComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Gonioscopy rendering functions
  const renderGonioscopySectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {GONIOSCOPY_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = gonioscopySectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'gonioscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderGonioscopySectionB = () => {
    // Map criteria keys for each subsection
    const subsectionKeys = [
      ["roomSetup", "anteriorChamberDepth"], // Slit Lamp
      ["lensChoice", "applicationAndPlacement", "identificationOfStructures", "examination360", "careOfPatientAndLens"], // Gonioscopy Technique
      ["useOfAppropriateLens", "adjustmentOfSlitLamp", "indentationTechnique"], // Dynamic Assessment
      ["understandingOfGrading", "interpretationAndDocumentation"] // Interpretation
    ];

    return (
      <div className="space-y-8">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {GONIOSCOPY_SECTION_B_SUBSECTIONS.map((subsection, subIdx) => {
          const criteriaKeys = subsectionKeys[subIdx];

          return (
            <div key={subsection.title} className="space-y-6">
              <div className="border-l-4 border-indigo-500 pl-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white/90 uppercase tracking-wider mb-4">
                  Subsection: {subsection.title}
                </h4>
              </div>

              {subsection.criteria.map((criterion, idx) => {
                const key = criteriaKeys[idx];
                const rating = gonioscopySectionBRatings[key] || "";
                const isFilled = !!rating;

                return (
                  <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

                    <div className="flex flex-wrap gap-2">
                      {RATING_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          disabled={isLocked}
                          onClick={() => handleRatingChange('B', key, opt, 'gonioscopy')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderGonioscopySectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={gonioscopyComments.especiallyGood}
            onChange={(e) => setGonioscopyComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!gonioscopyComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={gonioscopyComments.suggestionsForImprovement}
            onChange={(e) => setGonioscopyComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!gonioscopyComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={gonioscopyComments.agreedActionPlan}
            onChange={(e) => setGonioscopyComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!gonioscopyComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Direct Ophthalmoscopy rendering functions
  const renderDirectOphthalmoscopySectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {DIRECT_OPHTHALMOSCOPY_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = directOphthalmoscopySectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'directOphthalmoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderDirectOphthalmoscopySectionB = () => {
    const criteriaKeys = ["instructionsToPatient", "familiarityWithOphthalmoscope", "correctUseOfIllumination", "appropriateUseOfLenses", "descriptionOfFindings"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {DIRECT_OPHTHALMOSCOPY_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = directOphthalmoscopySectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'directOphthalmoscopy')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderDirectOphthalmoscopySectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={directOphthalmoscopyComments.especiallyGood}
            onChange={(e) => setDirectOphthalmoscopyComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!directOphthalmoscopyComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={directOphthalmoscopyComments.suggestionsForImprovement}
            onChange={(e) => setDirectOphthalmoscopyComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!directOphthalmoscopyComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={directOphthalmoscopyComments.agreedActionPlan}
            onChange={(e) => setDirectOphthalmoscopyComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!directOphthalmoscopyComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Slit Lamp rendering functions
  const renderSlitLampSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {SLIT_LAMP_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = slitLampSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'slitLamp')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderSlitLampSectionB = () => {
    const criteriaKeys = ["appropriateIPD", "appropriateEyepieceFocus", "appropriateSlitBeamSizeAndAngle", "useOfFullRangeOfMagnification", "useOfAppropriateFilters"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {SLIT_LAMP_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = slitLampSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'slitLamp')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderSlitLampSectionC = () => {
    const criteriaKeys = ["lidsAndLashes", "conjunctiva", "cornea", "irisStructures", "lens", "aqueousHumour", "anteriorChamberDepth"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {SLIT_LAMP_SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = slitLampSectionCRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt, 'slitLamp')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderSlitLampSectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={slitLampComments.especiallyGood}
            onChange={(e) => setSlitLampComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!slitLampComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={slitLampComments.suggestionsForImprovement}
            onChange={(e) => setSlitLampComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!slitLampComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={slitLampComments.agreedActionPlan}
            onChange={(e) => setSlitLampComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!slitLampComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // IOP rendering functions
  const renderIopSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {IOP_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = iopSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'iop')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderIopSectionB = () => {
    const criteriaKeys = ["consentForTest", "applicationOfAnaesthesiaAndFluorescein", "stabilisationOfLidsAndEye", "useOfTonometerAccuratePlacement", "accurateIOPRecording", "interpretationOfResult", "cornealAppearanceAfterExamination", "careOfTonometerHead", "infectionControl"];

    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4 block">
            Technique Used
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {IOP_TECHNIQUES.map(technique => (
              <button
                key={technique}
                disabled={isLocked}
                onClick={() => setIopTechnique(technique)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${iopTechnique === technique
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                  }`}
              >
                {technique}
              </button>
            ))}
          </div>
          {iopTechnique === "Other" && (
            <input
              type="text"
              disabled={isLocked}
              value={iopOtherTechnique}
              onChange={(e) => setIopOtherTechnique(e.target.value)}
              placeholder="Specify technique"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500/40"
            />
          )}
        </GlassCard>

        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {IOP_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = iopSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'iop')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderIopSectionC = () => {
    const criteriaKeys = ["knowledgeOfReasonsForCalibration", "appropriateUseOfCalibrationArm", "interpretationOfResults", "appropriateActionTaken"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {IOP_SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = iopSectionCRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt, 'iop')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderIopSectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={iopComments.especiallyGood}
            onChange={(e) => setIopComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!iopComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={iopComments.suggestionsForImprovement}
            onChange={(e) => setIopComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!iopComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={iopComments.agreedActionPlan}
            onChange={(e) => setIopComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!iopComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Ocular Motility rendering functions
  const renderOcularMotilitySectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {OCULAR_MOTILITY_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = ocularMotilitySectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'ocularMotility')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderOcularMotilitySectionB = () => {
    const criteriaKeys = ["observationOfAssociatedOcularSignsAndHeadPosition", "useOfFixationTargets", "performanceOfCoverTests", "assessmentOfVersionsDuctionsVergencesAndSaccades", "interpretationOfFindings"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {OCULAR_MOTILITY_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = ocularMotilitySectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'ocularMotility')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderOcularMotilitySectionC = () => {
    const criteriaKeys = ["explanationOfTest", "appropriatePositioningOfPrismBar", "assessmentOfAngle", "interpretationOfResults"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {OCULAR_MOTILITY_SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = ocularMotilitySectionCRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt, 'ocularMotility')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderOcularMotilitySectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={ocularMotilityComments.especiallyGood}
            onChange={(e) => setOcularMotilityComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!ocularMotilityComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={ocularMotilityComments.suggestionsForImprovement}
            onChange={(e) => setOcularMotilityComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!ocularMotilityComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={ocularMotilityComments.agreedActionPlan}
            onChange={(e) => setOcularMotilityComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!ocularMotilityComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // External Eye rendering functions
  const renderExternalEyeSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "respect"];

    return (
      <div className="space-y-6">
        {EXTERNAL_EYE_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = externalEyeSectionARatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'externalEye')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderExternalEyeSectionB = () => {
    const criteriaKeys = ["assessmentOfFaceAndHead", "palpationOfOrbitalMargins", "examinationOfLacrimalSystem", "assessmentOfLidPositionWithAppropriateMeasurements", "examinationOfLashes", "examinationOfMeibomianGlands", "examinationOfConjunctiva", "examinationOfCornea"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {EXTERNAL_EYE_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = externalEyeSectionBRatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'externalEye')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderExternalEyeSectionC = () => {
    const criteriaKeys = ["lidEversion", "useOfExophthalmometer", "otherAncillaryTests"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {EXTERNAL_EYE_SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = externalEyeSectionCRatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt, 'externalEye')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderExternalEyeSectionD = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={externalEyeComments.especiallyGood}
            onChange={(e) => setExternalEyeComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!externalEyeComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={externalEyeComments.suggestionsForImprovement}
            onChange={(e) => setExternalEyeComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!externalEyeComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={externalEyeComments.agreedActionPlan}
            onChange={(e) => setExternalEyeComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!externalEyeComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Fields rendering functions
  const renderFieldsSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "listeningSkills", "empathy", "respect"];

    return (
      <div className="space-y-6">
        {FIELDS_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = fieldsSectionARatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'fields')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderFieldsSectionB = () => {
    const criteriaKeys = ["appropriateOcclusion", "appropriateTechnique", "identificationOfVisualFieldDefect", "understandingOfPossibleCauses", "appropriateRecommendationForFurtherFieldTesting"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {FIELDS_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = fieldsSectionBRatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'fields')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderFieldsSectionC = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={fieldsComments.especiallyGood}
            onChange={(e) => setFieldsComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!fieldsComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={fieldsComments.suggestionsForImprovement}
            onChange={(e) => setFieldsComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!fieldsComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={fieldsComments.agreedActionPlan}
            onChange={(e) => setFieldsComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!fieldsComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  // Consultation Skills rendering functions
  const renderConsultationSkillsSectionA = () => {
    const criteriaKeys = ["introduction", "rapport", "listeningSkills", "empathy", "respect"];

    return (
      <div className="space-y-6">
        {CONSULTATION_SKILLS_SECTION_A_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = consultationSkillsSectionARatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('A', key, opt, 'consultationSkills')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderConsultationSkillsSectionB = () => {
    const criteriaKeys = ["historyOfPresentingComplaint", "pastOphthalmicHistory", "familyHistory", "pastMedicalHistory", "systemsEnquiry", "drugHistoryAndAllergies", "socialHistory", "otherRelevantEnquiries", "assessmentOfMentalState"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {CONSULTATION_SKILLS_SECTION_B_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = consultationSkillsSectionBRatings[key] || "";
          const isFilled = !!rating;

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''} ${isFilled ? 'ring-2 ring-green-500/30' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('B', key, opt, 'consultationSkills')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderConsultationSkillsSectionC = () => {
    const criteriaKeys = ["sensitiveAndResponsiveToPatientAnxieties", "awarenessOfSocialImpact", "interviewSensitiveAndResponsive"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {CONSULTATION_SKILLS_SECTION_C_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = consultationSkillsSectionCRatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('C', key, opt, 'consultationSkills')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderConsultationSkillsSectionD = () => {
    const criteriaKeys = ["modeOfEnquiry", "appropriateControlAndDirection", "efficientUseOfTime", "deliveryOfInformation", "involvementOfPatientInDecisions", "terminationOfInterview"];

    return (
      <div className="space-y-6">
        <div className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">Performance Criteria</div>

        {CONSULTATION_SKILLS_SECTION_D_CRITERIA.map((criterion, idx) => {
          const key = criteriaKeys[idx];
          const rating = consultationSkillsSectionDRatings[key] || "";

          return (
            <GlassCard key={key} className={`p-5 lg:p-6 transition-all duration-300 ${isLocked ? 'bg-slate-50/50' : ''}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-4">{criterion}</p>

              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => handleRatingChange('D', key, opt, 'consultationSkills')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${rating === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:bg-slate-100'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderConsultationSkillsSectionE = () => {
    return (
      <div className="space-y-6">
        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Aspects which were especially good <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={consultationSkillsComments.especiallyGood}
            onChange={(e) => setConsultationSkillsComments(prev => ({ ...prev, especiallyGood: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!consultationSkillsComments.especiallyGood ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Suggestions for improvement and action points <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={consultationSkillsComments.suggestionsForImprovement}
            onChange={(e) => setConsultationSkillsComments(prev => ({ ...prev, suggestionsForImprovement: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!consultationSkillsComments.suggestionsForImprovement ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>

        <GlassCard className="p-5 lg:p-6">
          <label className="text-sm font-semibold text-slate-900 dark:text-white/90 mb-2 block">
            Agreed action plan <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={consultationSkillsComments.agreedActionPlan}
            onChange={(e) => setConsultationSkillsComments(prev => ({ ...prev, agreedActionPlan: e.target.value }))}
            placeholder="Required"
            className={`w-full min-h-[100px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/40 transition-all resize-none ${isLocked ? 'cursor-default' : ''} ${!consultationSkillsComments.agreedActionPlan ? 'border-red-300' : ''}`}
            required
          />
        </GlassCard>
      </div>
    );
  };

  const isSectionComplete = (sectionIdx: number): boolean => {
    if (isConsultationSkillsForm) {
      if (sectionIdx === 0) {
        // Consultation Skills Section A
        return consultationSkillsSectionARatings["introduction"] &&
          consultationSkillsSectionARatings["rapport"] &&
          consultationSkillsSectionARatings["listeningSkills"] &&
          consultationSkillsSectionARatings["empathy"] &&
          consultationSkillsSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Consultation Skills Section B
        return consultationSkillsSectionBRatings["historyOfPresentingComplaint"] &&
          consultationSkillsSectionBRatings["pastOphthalmicHistory"] &&
          consultationSkillsSectionBRatings["familyHistory"] &&
          consultationSkillsSectionBRatings["pastMedicalHistory"] &&
          consultationSkillsSectionBRatings["systemsEnquiry"] &&
          consultationSkillsSectionBRatings["drugHistoryAndAllergies"] &&
          consultationSkillsSectionBRatings["socialHistory"] &&
          consultationSkillsSectionBRatings["otherRelevantEnquiries"] &&
          consultationSkillsSectionBRatings["assessmentOfMentalState"];
      } else if (sectionIdx === 2) {
        // Consultation Skills Section C
        return consultationSkillsSectionCRatings["sensitiveAndResponsiveToPatientAnxieties"] &&
          consultationSkillsSectionCRatings["awarenessOfSocialImpact"] &&
          consultationSkillsSectionCRatings["interviewSensitiveAndResponsive"];
      } else if (sectionIdx === 3) {
        // Consultation Skills Section D
        return consultationSkillsSectionDRatings["modeOfEnquiry"] &&
          consultationSkillsSectionDRatings["appropriateControlAndDirection"] &&
          consultationSkillsSectionDRatings["efficientUseOfTime"] &&
          consultationSkillsSectionDRatings["deliveryOfInformation"] &&
          consultationSkillsSectionDRatings["involvementOfPatientInDecisions"] &&
          consultationSkillsSectionDRatings["terminationOfInterview"];
      } else {
        // Consultation Skills Section E
        return consultationSkillsComments.especiallyGood.trim() !== "" &&
          consultationSkillsComments.suggestionsForImprovement.trim() !== "" &&
          consultationSkillsComments.agreedActionPlan.trim() !== "";
      }
    } else if (isFieldsForm) {
      if (sectionIdx === 0) {
        // Fields Section A
        return fieldsSectionARatings["introduction"] &&
          fieldsSectionARatings["rapport"] &&
          fieldsSectionARatings["listeningSkills"] &&
          fieldsSectionARatings["empathy"] &&
          fieldsSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Fields Section B
        return fieldsSectionBRatings["appropriateOcclusion"] &&
          fieldsSectionBRatings["appropriateTechnique"] &&
          fieldsSectionBRatings["identificationOfVisualFieldDefect"] &&
          fieldsSectionBRatings["understandingOfPossibleCauses"] &&
          fieldsSectionBRatings["appropriateRecommendationForFurtherFieldTesting"];
      } else {
        // Fields Section C
        return fieldsComments.especiallyGood.trim() !== "" &&
          fieldsComments.suggestionsForImprovement.trim() !== "" &&
          fieldsComments.agreedActionPlan.trim() !== "";
      }
    } else if (isExternalEyeForm) {
      if (sectionIdx === 0) {
        // External Eye Section A
        return externalEyeSectionARatings["introduction"] &&
          externalEyeSectionARatings["rapport"] &&
          externalEyeSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // External Eye Section B
        return externalEyeSectionBRatings["assessmentOfFaceAndHead"] &&
          externalEyeSectionBRatings["palpationOfOrbitalMargins"] &&
          externalEyeSectionBRatings["examinationOfLacrimalSystem"] &&
          externalEyeSectionBRatings["assessmentOfLidPositionWithAppropriateMeasurements"] &&
          externalEyeSectionBRatings["examinationOfLashes"] &&
          externalEyeSectionBRatings["examinationOfMeibomianGlands"] &&
          externalEyeSectionBRatings["examinationOfConjunctiva"] &&
          externalEyeSectionBRatings["examinationOfCornea"];
      } else if (sectionIdx === 2) {
        // External Eye Section C
        return externalEyeSectionCRatings["lidEversion"] &&
          externalEyeSectionCRatings["useOfExophthalmometer"] &&
          externalEyeSectionCRatings["otherAncillaryTests"];
      } else {
        // External Eye Section D
        return externalEyeComments.especiallyGood.trim() !== "" &&
          externalEyeComments.suggestionsForImprovement.trim() !== "" &&
          externalEyeComments.agreedActionPlan.trim() !== "";
      }
    } else if (isOcularMotilityForm) {
      if (sectionIdx === 0) {
        // Ocular Motility Section A
        return ocularMotilitySectionARatings["introduction"] &&
          ocularMotilitySectionARatings["rapport"] &&
          ocularMotilitySectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Ocular Motility Section B
        return ocularMotilitySectionBRatings["observationOfAssociatedOcularSignsAndHeadPosition"] &&
          ocularMotilitySectionBRatings["useOfFixationTargets"] &&
          ocularMotilitySectionBRatings["performanceOfCoverTests"] &&
          ocularMotilitySectionBRatings["assessmentOfVersionsDuctionsVergencesAndSaccades"] &&
          ocularMotilitySectionBRatings["interpretationOfFindings"];
      } else if (sectionIdx === 2) {
        // Ocular Motility Section C
        return ocularMotilitySectionCRatings["explanationOfTest"] &&
          ocularMotilitySectionCRatings["appropriatePositioningOfPrismBar"] &&
          ocularMotilitySectionCRatings["assessmentOfAngle"] &&
          ocularMotilitySectionCRatings["interpretationOfResults"];
      } else {
        // Ocular Motility Section D
        return ocularMotilityComments.especiallyGood.trim() !== "" &&
          ocularMotilityComments.suggestionsForImprovement.trim() !== "" &&
          ocularMotilityComments.agreedActionPlan.trim() !== "";
      }
    } else if (isIOPForm) {
      if (sectionIdx === 0) {
        // IOP Section A
        return iopSectionARatings["introduction"] &&
          iopSectionARatings["rapport"] &&
          iopSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // IOP Section B
        return iopSectionBRatings["consentForTest"] &&
          iopSectionBRatings["applicationOfAnaesthesiaAndFluorescein"] &&
          iopSectionBRatings["stabilisationOfLidsAndEye"] &&
          iopSectionBRatings["useOfTonometerAccuratePlacement"] &&
          iopSectionBRatings["accurateIOPRecording"] &&
          iopSectionBRatings["interpretationOfResult"] &&
          iopSectionBRatings["cornealAppearanceAfterExamination"] &&
          iopSectionBRatings["careOfTonometerHead"] &&
          iopSectionBRatings["infectionControl"];
      } else if (sectionIdx === 2) {
        // IOP Section C
        return iopSectionCRatings["knowledgeOfReasonsForCalibration"] &&
          iopSectionCRatings["appropriateUseOfCalibrationArm"] &&
          iopSectionCRatings["interpretationOfResults"] &&
          iopSectionCRatings["appropriateActionTaken"];
      } else {
        // IOP Section D
        return iopComments.especiallyGood.trim() !== "" &&
          iopComments.suggestionsForImprovement.trim() !== "" &&
          iopComments.agreedActionPlan.trim() !== "";
      }
    } else if (isSlitLampForm) {
      if (sectionIdx === 0) {
        // Slit Lamp Section A
        return slitLampSectionARatings["introduction"] &&
          slitLampSectionARatings["rapport"] &&
          slitLampSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Slit Lamp Section B
        return slitLampSectionBRatings["appropriateIPD"] &&
          slitLampSectionBRatings["appropriateEyepieceFocus"] &&
          slitLampSectionBRatings["appropriateSlitBeamSizeAndAngle"] &&
          slitLampSectionBRatings["useOfFullRangeOfMagnification"] &&
          slitLampSectionBRatings["useOfAppropriateFilters"];
      } else if (sectionIdx === 2) {
        // Slit Lamp Section C
        return slitLampSectionCRatings["lidsAndLashes"] &&
          slitLampSectionCRatings["conjunctiva"] &&
          slitLampSectionCRatings["cornea"] &&
          slitLampSectionCRatings["irisStructures"] &&
          slitLampSectionCRatings["lens"] &&
          slitLampSectionCRatings["aqueousHumour"] &&
          slitLampSectionCRatings["anteriorChamberDepth"];
      } else {
        // Slit Lamp Section D
        return slitLampComments.especiallyGood.trim() !== "" &&
          slitLampComments.suggestionsForImprovement.trim() !== "" &&
          slitLampComments.agreedActionPlan.trim() !== "";
      }
    } else if (isDirectOphthalmoscopyForm) {
      if (sectionIdx === 0) {
        // Direct Ophthalmoscopy Section A
        return directOphthalmoscopySectionARatings["introduction"] &&
          directOphthalmoscopySectionARatings["rapport"] &&
          directOphthalmoscopySectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Direct Ophthalmoscopy Section B
        return directOphthalmoscopySectionBRatings["instructionsToPatient"] &&
          directOphthalmoscopySectionBRatings["familiarityWithOphthalmoscope"] &&
          directOphthalmoscopySectionBRatings["correctUseOfIllumination"] &&
          directOphthalmoscopySectionBRatings["appropriateUseOfLenses"] &&
          directOphthalmoscopySectionBRatings["descriptionOfFindings"];
      } else {
        // Direct Ophthalmoscopy Section C
        return directOphthalmoscopyComments.especiallyGood.trim() !== "" &&
          directOphthalmoscopyComments.suggestionsForImprovement.trim() !== "" &&
          directOphthalmoscopyComments.agreedActionPlan.trim() !== "";
      }
    } else if (isGonioscopyForm) {
      if (sectionIdx === 0) {
        // Gonioscopy Section A
        return gonioscopySectionARatings["introduction"] &&
          gonioscopySectionARatings["rapport"] &&
          gonioscopySectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Gonioscopy Section B (all 12 criteria)
        return gonioscopySectionBRatings["roomSetup"] &&
          gonioscopySectionBRatings["anteriorChamberDepth"] &&
          gonioscopySectionBRatings["lensChoice"] &&
          gonioscopySectionBRatings["applicationAndPlacement"] &&
          gonioscopySectionBRatings["identificationOfStructures"] &&
          gonioscopySectionBRatings["examination360"] &&
          gonioscopySectionBRatings["careOfPatientAndLens"] &&
          gonioscopySectionBRatings["useOfAppropriateLens"] &&
          gonioscopySectionBRatings["adjustmentOfSlitLamp"] &&
          gonioscopySectionBRatings["indentationTechnique"] &&
          gonioscopySectionBRatings["understandingOfGrading"] &&
          gonioscopySectionBRatings["interpretationAndDocumentation"];
      } else {
        // Gonioscopy Section C
        return gonioscopyComments.especiallyGood.trim() !== "" &&
          gonioscopyComments.suggestionsForImprovement.trim() !== "" &&
          gonioscopyComments.agreedActionPlan.trim() !== "";
      }
    } else if (isLens78D90DForm) {
      if (sectionIdx === 0) {
        // 78D/90D lens Section A
        return lens78D90DSectionARatings["introduction"] &&
          lens78D90DSectionARatings["rapport"] &&
          lens78D90DSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // 78D/90D lens Section B
        return lens78D90DSectionBRatings["instructionsToPatient"] &&
          lens78D90DSectionBRatings["familiarityWithLenses"] &&
          lens78D90DSectionBRatings["correctUseOfSlitLampIllumination"] &&
          lens78D90DSectionBRatings["appropriateUseOfLenses"] &&
          lens78D90DSectionBRatings["descriptionOfFindings"];
      } else {
        // 78D/90D lens Section C
        return lens78D90DComments.especiallyGood.trim() !== "" &&
          lens78D90DComments.suggestionsForImprovement.trim() !== "" &&
          lens78D90DComments.agreedActionPlan.trim() !== "";
      }
    } else if (isContactLensesForm) {
      if (sectionIdx === 0) {
        // Contact Lenses Section A
        return contactLensesSectionARatings["introduction"] &&
          contactLensesSectionARatings["rapport"] &&
          contactLensesSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Contact Lenses Section B
        return contactLensesSectionBRatings["instructionsToPatient"] &&
          contactLensesSectionBRatings["familiarityWithLenses"] &&
          contactLensesSectionBRatings["correctUseOfSlitLampIllumination"] &&
          contactLensesSectionBRatings["appropriateUseOfLenses"] &&
          contactLensesSectionBRatings["descriptionOfFindings"];
      } else {
        // Contact Lenses Section C
        return contactLensesComments.especiallyGood.trim() !== "" &&
          contactLensesComments.suggestionsForImprovement.trim() !== "" &&
          contactLensesComments.agreedActionPlan.trim() !== "";
      }
    } else if (isPupilForm) {
      if (sectionIdx === 0) {
        // Pupil Section A
        return pupilSectionARatings["introduction"] &&
          pupilSectionARatings["rapport"] &&
          pupilSectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Pupil Section B
        return pupilSectionBRatings["generalInspection"] &&
          pupilSectionBRatings["appropriateUseOfDistanceTarget"] &&
          pupilSectionBRatings["directPupillaryReaction"] &&
          pupilSectionBRatings["consensualReaction"] &&
          pupilSectionBRatings["swingingFlashlightTest"] &&
          pupilSectionBRatings["accommodativeReaction"] &&
          pupilSectionBRatings["slitLampExamination"] &&
          pupilSectionBRatings["correctReactionsIdentified"] &&
          pupilSectionBRatings["suggestionOfSuitableAetiology"] &&
          pupilSectionBRatings["suggestionsForSuitableFurtherTests"];
      } else {
        // Pupil Section C
        return pupilComments.especiallyGood.trim() !== "" &&
          pupilComments.suggestionsForImprovement.trim() !== "" &&
          pupilComments.agreedActionPlan.trim() !== "";
      }
    } else if (isIndirectOphthalmoscopyForm) {
      if (sectionIdx === 0) {
        // Indirect Ophthalmoscopy Section A
        return indirectOphthalmoscopySectionARatings["introduction"] &&
          indirectOphthalmoscopySectionARatings["rapport"] &&
          indirectOphthalmoscopySectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Indirect Ophthalmoscopy Section B
        return indirectOphthalmoscopySectionBRatings["instructionsToPatient"] &&
          indirectOphthalmoscopySectionBRatings["familiarityWithOphthalmoscope"] &&
          indirectOphthalmoscopySectionBRatings["correctUseOfIllumination"] &&
          indirectOphthalmoscopySectionBRatings["appropriateUseOfLenses"] &&
          indirectOphthalmoscopySectionBRatings["indentationTechnique"] &&
          indirectOphthalmoscopySectionBRatings["descriptionOfFindings"];
      } else {
        // Indirect Ophthalmoscopy Section C
        return indirectOphthalmoscopyComments.especiallyGood.trim() !== "" &&
          indirectOphthalmoscopyComments.suggestionsForImprovement.trim() !== "" &&
          indirectOphthalmoscopyComments.agreedActionPlan.trim() !== "";
      }
    } else if (isRetinoscopyForm) {
      if (sectionIdx === 0) {
        // Retinoscopy Section A
        return retinoscopySectionARatings["introduction"] &&
          retinoscopySectionARatings["rapport"] &&
          retinoscopySectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Retinoscopy Section B
        return retinoscopySectionBRatings["patientPositioning"] &&
          retinoscopySectionBRatings["appropriateCycloplegia"] &&
          retinoscopySectionBRatings["useOfTrialFrame"] &&
          retinoscopySectionBRatings["timeTaken"] &&
          retinoscopySectionBRatings["accuracy"] &&
          retinoscopySectionBRatings["notation"] &&
          retinoscopySectionBRatings["appropriatePrescription"];
      } else {
        // Retinoscopy Section C
        return retinoscopyComments.especiallyGood.trim() !== "" &&
          retinoscopyComments.agreedActionPlan.trim() !== "";
      }
    } else if (isVisionForm) {
      if (sectionIdx === 0) {
        // Vision Section A
        return sectionARatings["introduction"] && sectionARatings["rapport"] && sectionARatings["respect"];
      } else if (sectionIdx === 1) {
        // Vision Section B
        return visualAcuityMethod &&
          sectionBRatings["appropriateOcclusion"] &&
          sectionBRatings["technique"] &&
          sectionBRatings["refractiveCorrection"] &&
          sectionBRatings["pinhole"] &&
          sectionBRatings["distanceAcuity"] &&
          sectionBRatings["nearAcuity"] &&
          (visualAcuityMethod !== "Other" || visualAcuityOther.trim() !== "");
      } else if (sectionIdx === 2) {
        // Vision Section C
        return colourVisionMethod &&
          sectionCRatings["appropriateOcclusion"] &&
          sectionCRatings["technique"] &&
          sectionCRatings["colourVisionTest"] &&
          sectionCRatings["accurateRecording"] &&
          (colourVisionMethod !== "Other" || colourVisionOther.trim() !== "");
      } else {
        // Vision Comments section
        return comments.especiallyGood.trim() !== "" &&
          comments.suggestionsForImprovement.trim() !== "" &&
          comments.agreedActionPlan.trim() !== "";
      }
    }
    return false;
  };

  const getCurrentSections = () => {
    if (isConsultationSkillsForm) return CONSULTATION_SKILLS_SECTIONS;
    if (isFieldsForm) return FIELDS_SECTIONS;
    if (isExternalEyeForm) return EXTERNAL_EYE_SECTIONS;
    if (isOcularMotilityForm) return OCULAR_MOTILITY_SECTIONS;
    if (isIOPForm) return IOP_SECTIONS;
    if (isSlitLampForm) return SLIT_LAMP_SECTIONS;
    if (isDirectOphthalmoscopyForm) return DIRECT_OPHTHALMOSCOPY_SECTIONS;
    if (isGonioscopyForm) return GONIOSCOPY_SECTIONS;
    if (isLens78D90DForm) return LENS_78D_90D_SECTIONS;
    if (isContactLensesForm) return CONTACT_LENSES_SECTIONS;
    if (isPupilForm) return PUPIL_SECTIONS;
    if (isIndirectOphthalmoscopyForm) return INDIRECT_OPHTHALMOSCOPY_SECTIONS;
    if (isRetinoscopyForm) return RETINOSCOPY_SECTIONS;
    if (isVisionForm) return VISION_SECTIONS;
    return [];
  };

  const completeness = isStructuredForm
    ? Math.round((getCurrentSections().filter((_, i) => isSectionComplete(i)).length / getCurrentSections().length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-6 lg:h-[calc(100vh-100px)] lg:overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <SignOffDialog
        isOpen={isSignOffOpen}
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={handleSignOffConfirm}
        formInfo={{
          type: `CRS - ${selectedCrsType}`,
          traineeName: traineeName || 'Trainee',
          supervisorEmail: assessorEmail,
          date: new Date().toLocaleDateString(),
          supervisorName: assessorName || "Assessor"
        }}
      />

      {/* Left Column: Metadata (Desktop) */}
      <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 overflow-y-auto pr-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90">CRS Assessment</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {status}
            </span>
          </div>
          <div className="space-y-6">
            <MetadataField label="CRS Type">
              <select
                value={selectedCrsType}
                onChange={(e) => setSelectedCrsType(e.target.value)}
                disabled={isLocked}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {CRS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </MetadataField>

            <MetadataField label="Level">
              <select
                value={trainingLevel}
                onChange={(e) => setTrainingLevel(e.target.value)}
                disabled={isLocked}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
              >
                {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </MetadataField>

            {isConsultationSkillsForm && (
              <MetadataField label="Specialty">
                <select
                  value={consultationSkillsSpecialty}
                  onChange={(e) => setConsultationSkillsSpecialty(e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors"
                >
                  {CONSULTATION_SKILLS_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </MetadataField>
            )}

            <MetadataField label="Assessor">
              <div className="space-y-2">
                <input
                  type="text"
                  value={assessorName}
                  onChange={(e) => setAssessorName(e.target.value)}
                  disabled={isLocked}
                  placeholder="Assessor Name"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="email"
                  value={assessorEmail}
                  onChange={(e) => setAssessorEmail(e.target.value)}
                  disabled={isLocked}
                  placeholder="Assessor Email"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>
            </MetadataField>

            {/* Section Navigation Sidebar - Show for structured forms */}
            {isStructuredForm && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Sections</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goToPreviousSection}
                      disabled={activeSection === 0}
                      className="epa-nav-chevron p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous section"
                    >
                      <ChevronLeft size={16} className="text-slate-500 dark:text-white/50 rotate-90" />
                    </button>
                    <button
                      onClick={goToNextSection}
                      disabled={activeSection >= getCurrentSections().length - 1}
                      className="epa-nav-chevron p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next section"
                    >
                      <ChevronRight size={16} className="text-slate-500 dark:text-white/50 rotate-90" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {getCurrentSections().map((section, idx) => {
                    const isActive = activeSection === idx;
                    const sectionLetter = section.split('.')[0];

                    return (
                      <button
                        key={section}
                        onClick={() => scrollToSection(idx)}
                        className={`epa-section-nav-item w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left group ${isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white/60'
                          }`}
                      >
                        <div className={`epa-section-dot w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 group-hover:bg-slate-200 dark:group-hover:bg-white/10'
                          }`}>
                          {sectionLetter}
                        </div>
                        <span className="text-xs font-medium truncate">
                          {section.split('. ')[1] || section}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isLocked && (
              <div className="pt-6 flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-2xl">
                <ShieldCheck className="text-green-500" size={24} />
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">COMPLETE</p>
                <p className="text-[10px] text-green-600 dark:text-green-500 text-center">Validated by {assessorName || "Assessor"}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Show brief description for non-Vision forms */}
        {!isVisionForm && (
          <GlassCard className="p-6">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Brief description</label>
            <textarea
              disabled={isLocked}
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm"
            />
          </GlassCard>
        )}
      </div>

      {/* Right Column: Section Content */}
      <div className="lg:col-span-8 flex flex-col lg:overflow-hidden">
        {/* Mobile Metadata Summary */}
        <div className="lg:hidden mb-2">
          <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40 mb-4">
            <ArrowLeft size={14} /> Back
          </button>
          <GlassCard className="p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedCrsType}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Level {trainingLevel} • {completeness}% Complete</p>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${status === EvidenceStatus.SignedOff ? 'bg-green-100 text-green-700' : status === EvidenceStatus.Submitted ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {status}
                  </span>
                </div>
              </div>
              <div className={`transition-transform duration-300 ${isMetadataExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>

            {isMetadataExpanded && (
              <div className="pt-4 mt-3 border-t border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                <MetadataField label="CRS Type">
                  <select
                    value={selectedCrsType}
                    onChange={(e) => setSelectedCrsType(e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    {CRS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </MetadataField>
                <MetadataField label="Level">
                  <select
                    value={trainingLevel}
                    onChange={(e) => setTrainingLevel(e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </MetadataField>
                {isConsultationSkillsForm && (
                  <MetadataField label="Specialty">
                    <select
                      value={consultationSkillsSpecialty}
                      onChange={(e) => setConsultationSkillsSpecialty(e.target.value)}
                      disabled={isLocked}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      {CONSULTATION_SKILLS_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </MetadataField>
                )}
                <MetadataField label="Assessor">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={assessorName}
                      onChange={(e) => setAssessorName(e.target.value)}
                      disabled={isLocked}
                      placeholder="Assessor Name"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                    <input
                      type="email"
                      value={assessorEmail}
                      onChange={(e) => setAssessorEmail(e.target.value)}
                      disabled={isLocked}
                      placeholder="Assessor Email"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </MetadataField>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Section Titles at Top (For structured forms) */}
        {isStructuredForm && (
          <div className="sticky top-0 lg:static z-20 bg-[#f8fafc]/80 dark:bg-[#0d1117]/80 backdrop-blur-lg lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-slate-200 dark:border-white/10 flex gap-1 mb-4 lg:mb-8 overflow-x-auto no-scrollbar">
            {getCurrentSections().map((section, idx) => (
              <button
                key={section}
                onClick={() => setActiveSection(idx)}
                className={`
                  px-4 py-2 text-[10px] lg:text-xs font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap
                  ${activeSection === idx ? 'text-indigo-600 dark:text-white' : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50'}
                `}
              >
                {section}
                {activeSection === idx && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Section Content */}
        <div className="flex-1 lg:overflow-y-auto pr-2 space-y-6 pb-24 lg:pb-0">
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {isVisionForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderSectionA()}
                  {activeSection === 1 && renderSectionB()}
                  {activeSection === 2 && renderSectionC()}
                  {activeSection === 3 && renderComments()}
                </div>
              </>
            ) : isRetinoscopyForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderRetinoscopySectionA()}
                  {activeSection === 1 && renderRetinoscopySectionB()}
                  {activeSection === 2 && renderRetinoscopySectionC()}
                </div>
              </>
            ) : isIndirectOphthalmoscopyForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderIndirectOphthalmoscopySectionA()}
                  {activeSection === 1 && renderIndirectOphthalmoscopySectionB()}
                  {activeSection === 2 && renderIndirectOphthalmoscopySectionC()}
                </div>
              </>
            ) : isPupilForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderPupilSectionA()}
                  {activeSection === 1 && renderPupilSectionB()}
                  {activeSection === 2 && renderPupilSectionC()}
                </div>
              </>
            ) : isContactLensesForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderContactLensesSectionA()}
                  {activeSection === 1 && renderContactLensesSectionB()}
                  {activeSection === 2 && renderContactLensesSectionC()}
                </div>
              </>
            ) : isLens78D90DForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderLens78D90DSectionA()}
                  {activeSection === 1 && renderLens78D90DSectionB()}
                  {activeSection === 2 && renderLens78D90DSectionC()}
                </div>
              </>
            ) : isGonioscopyForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderGonioscopySectionA()}
                  {activeSection === 1 && renderGonioscopySectionB()}
                  {activeSection === 2 && renderGonioscopySectionC()}
                </div>
              </>
            ) : isDirectOphthalmoscopyForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderDirectOphthalmoscopySectionA()}
                  {activeSection === 1 && renderDirectOphthalmoscopySectionB()}
                  {activeSection === 2 && renderDirectOphthalmoscopySectionC()}
                </div>
              </>
            ) : isSlitLampForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderSlitLampSectionA()}
                  {activeSection === 1 && renderSlitLampSectionB()}
                  {activeSection === 2 && renderSlitLampSectionC()}
                  {activeSection === 3 && renderSlitLampSectionD()}
                </div>
              </>
            ) : isIOPForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderIopSectionA()}
                  {activeSection === 1 && renderIopSectionB()}
                  {activeSection === 2 && renderIopSectionC()}
                  {activeSection === 3 && renderIopSectionD()}
                </div>
              </>
            ) : isOcularMotilityForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderOcularMotilitySectionA()}
                  {activeSection === 1 && renderOcularMotilitySectionB()}
                  {activeSection === 2 && renderOcularMotilitySectionC()}
                  {activeSection === 3 && renderOcularMotilitySectionD()}
                </div>
              </>
            ) : isExternalEyeForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderExternalEyeSectionA()}
                  {activeSection === 1 && renderExternalEyeSectionB()}
                  {activeSection === 2 && renderExternalEyeSectionC()}
                  {activeSection === 3 && renderExternalEyeSectionD()}
                </div>
              </>
            ) : isFieldsForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderFieldsSectionA()}
                  {activeSection === 1 && renderFieldsSectionB()}
                  {activeSection === 2 && renderFieldsSectionC()}
                </div>
              </>
            ) : isConsultationSkillsForm ? (
              <>
                {!isLocked && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllMeets}
                      className="px-4 py-2 rounded-xl border border-indigo-500/30 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all bg-indigo-500/5 shadow-sm whitespace-nowrap"
                    >
                      MARK ALL 'MEETS EXPECTATIONS'
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {activeSection === 0 && renderConsultationSkillsSectionA()}
                  {activeSection === 1 && renderConsultationSkillsSectionB()}
                  {activeSection === 2 && renderConsultationSkillsSectionC()}
                  {activeSection === 3 && renderConsultationSkillsSectionD()}
                  {activeSection === 4 && renderConsultationSkillsSectionE()}
                </div>
              </>
            ) : (
              <GlassCard className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Brief description</label>
                  <textarea
                    disabled={isLocked}
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm"
                  />
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:static z-30 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 mt-0 lg:mt-6 flex flex-col gap-4 shadow-2xl lg:shadow-none">

          {/* Row 1: Navigation (For structured forms) */}
          {isStructuredForm && (
            <div className="flex justify-between items-center w-full">
              <button
                disabled={activeSection === 0}
                onClick={() => setActiveSection(s => s - 1)}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
              >
                <ChevronLeft size={18} /> <span className="hidden lg:inline">Previous</span>
              </button>
              <div className="flex gap-1.5">
                {getCurrentSections().map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${activeSection === i
                      ? 'bg-indigo-500'
                      : isSectionComplete(i)
                        ? 'bg-green-500'
                        : 'bg-slate-300 dark:bg-white/10'
                      }`}
                  ></div>
                ))}
              </div>
              <button
                disabled={activeSection === getCurrentSections().length - 1}
                onClick={() => setActiveSection(s => s + 1)}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-0"
              >
                <span className="hidden lg:inline">Next</span> <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Row 2: Form Actions */}
          <div className="flex items-center justify-end gap-2 lg:gap-3">
            {showSaveMessage && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300 mr-auto">
                Draft saved {lastSaved}
              </span>
            )}

            {!isLocked && !isSupervisor && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 text-[10px] lg:text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> <span>SAVE DRAFT</span>
                </button>

                <button
                  onClick={handleEmailForm}
                  className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
                >
                  <Mail size={16} /> <span>EMAIL FORM</span>
                </button>

                <button
                  onClick={() => setIsSignOffOpen(true)}
                  className="h-10 px-4 rounded-xl bg-green-600 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <ShieldCheck size={16} /> <span>IN PERSON SIGN OFF</span>
                </button>
              </>
            )}

            {isSupervisor && status === EvidenceStatus.Submitted && (
              <button
                onClick={handleSupervisorSignOff}
                className="h-10 px-6 rounded-xl bg-green-600 text-white text-xs font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <ShieldCheck size={18} /> <span>SIGN OFF</span>
              </button>
            )}

            {isLocked && !isSupervisor && (
              <button onClick={onBack} className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest">Close View</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetadataField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default CRSForm;
