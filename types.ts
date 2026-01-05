
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
  MAR = 'MAR',
  Other = 'Other',
  EPA = 'EPA',
  EPAOperatingList = 'EPA Operating List',
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
  ARCPPrep = 'ARCP Preparation',
  CurriculumCatchUp = 'Curriculum Catch Up',
  FourteenFish = 'FourteenFish'
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
  arcpDate: string; // Next ARCP date
  supervisorName: string;
  supervisorEmail: string;
  supervisorGmc: string; // Educational Supervisor GMC number
  predictedSIAs: string[];
  pdpGoals: PDPGoal[];
  deanery?: string; // Default: "Thames Valley Deanery"
  arcpOutcome?: ARCPOutcome; // Selected ARCP outcome
  // Exam results
  frcophthPart1?: boolean;
  frcophthPart2Written?: boolean;
  frcophthPart2Viva?: boolean;
  refractionCertificate?: boolean;
  curriculumCatchUpPDFs?: Record<string, string>; // Map of box keys to PDF file URLs (key format: "column-level")
  curriculumCatchUpCompletions?: Record<string, boolean>; // Map of completed boxes (key format: "column-level")
  fourteenFishEvidence?: Record<string, string>; // Map of box keys to image file URLs (key format: "column-level")
  fourteenFishCompletions?: Record<string, boolean>; // Map of completed boxes (key format: "column-level")
  sias?: SIA[]; // Active EPAs
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

export interface PortfolioProgressItem {
  id: string;
  trainee_id: string;
  sia: string;
  level: number;
  status: EvidenceStatus | 'Not Started';
  evidence_type: EvidenceType | 'Curriculum Catch Up' | 'FourteenFish' | null;
  evidence_id?: string;
  notes?: string;
  completed_at?: string;
  updated_at?: string;
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
  // Sign-off specifics (in-person)
  supervisorGmc?: string;
  supervisorName?: string;
  supervisorEmail?: string;
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
    aspectsEspeciallyGood?: string; // Level 2 only
    additionalEvidenceNeeded?: string; // Level 2 only
    traineeNarrative?: string;
  };
  epaOperatingListFormData?: {
    subspecialty: string; // The specialty this operating list is for (Glaucoma, Cataract, etc.)
    comments: Record<string, string>; // Comments for each criterion
    ratings: Record<string, string>; // Ratings for each criterion
    entrustment: string;
    aspectsEspeciallyGood?: string;
    supervisorName: string;
    supervisorEmail: string;
  };
  gsatFormData?: {
    comments: Record<string, string>;
    linkedEvidence: Record<string, string[]>;
  };
  dopsFormData?: {
    dopsType?: string; // DOPS form type (e.g., "Custom", "Corneal scrape", etc.)
    specialty: string;
    supervisorName: string;
    supervisorEmail: string;
    sectionA: {
      descriptionOfProcedure: string;
      furtherDetails: string;
      numberOfProcedures: string;
      procedurePerformedOn: string; // Patient / Wet Lab / Simulator
    };
    sectionB: {
      ratings: Record<string, string>; // key: competency key, value: rating
      comments: Record<string, string>; // key: competency key, value: comment (for major/minor concerns)
    };
    sectionC: {
      ratings: Record<string, string>; // key: competency key, value: rating
      comments: Record<string, string>; // key: competency key, value: comment (for major/minor concerns)
    };
    sectionD: {
      aspectsEspeciallyGood: string;
      suggestionsForImprovement: string;
      agreedActionPlan: string;
    };
  };
  osatsFormData?: {
    osatsType?: string; // OSATS form type (e.g., "OSATS - Custom", "OSATS Microsurgical skills", etc.)
    specialty: string;
    supervisorName: string;
    supervisorEmail: string;
    sectionA: {
      caseDescription: string;
      operativeDetails: string;
      numberOfProcedures: string;
      procedurePerformedOn: string; // Patient / Wet Lab / Simulator
    };
    sectionB: {
      ratings: Record<string, string>; // key: competency key, value: rating
      comments: Record<string, string>; // key: competency key, value: comment (for major/minor concerns)
    };
    sectionC: {
      ratings: Record<string, string>; // key: competency key, value: rating
      comments: Record<string, string>; // key: competency key, value: comment (for major/minor concerns)
    };
    sectionD: {
      aspectsEspeciallyGood: string;
      suggestionsForImprovement: string;
      agreedActionPlan: string;
    };
  };
  cbdFormData?: {
    specialty: string;
    supervisorName: string;
    supervisorEmail: string;
    sectionA: {
      clinicalScenario: string;
      clinicalDiscussion: string;
    };
    sectionB: {
      ratings: Record<string, string>; // key: competency key, value: rating
      comments: Record<string, string>; // key: competency key, value: comment (only for minor concerns)
    };
    sectionC: {
      aspectsEspeciallyGood: string;
      suggestionsForImprovement: string;
      agreedActionPlan: string;
    };
  };
  marFormData?: {
    specialty: string;
    sectionA: Record<string, { rating: string; comments: string }>;
    sectionB: Record<string, { rating: string; comments: string }>;
    sectionC: {
      complimentsComplaints: { notApplicable: boolean; text: string };
      healthIssues: { notApplicable: boolean; text: string };
      probityConcerns: { hasConcerns: boolean; sharedWithTrainee: string; outcome: string };
    };
    sectionD: {
      overallPerformanceAtExpectedLevel: boolean;
      suggestionsForImprovement: string;
    };
  };
  crsFormData?: {
    crsType: string;
    caseDescription?: string;
    assessorName: string;
    assessorEmail: string;
    // Vision-specific fields
    visionData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Visual Acuity
      sectionB: {
        method: string; // "Snellen" | "LogMAR" | "Sheridan-Gardner" | "Other"
        otherMethod?: string; // Free text if "Other" selected
        appropriateOcclusion: string;
        technique: string;
        refractiveCorrection: string;
        pinhole: string;
        distanceAcuity: string;
        nearAcuity: string;
      };
      // Section C: Colour Vision
      sectionC: {
        method: string; // "Ishihara" | "Other pseudoisochromatic" | "Other"
        otherMethod?: string; // Free text if "Other" selected
        appropriateOcclusion: string;
        technique: string;
        colourVisionTest: string;
        accurateRecording: string;
      };
      // Comments and Recommendations
      comments: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Retinoscopy-specific fields
    retinoscopyData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Retinoscopy
      sectionB: {
        patientPositioning: string;
        appropriateCycloplegia: string;
        useOfTrialFrame: string;
        timeTaken: string;
        accuracy: string;
        notation: string;
        appropriatePrescription: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string;
        agreedActionPlan: string; // Mandatory
      };
    };
    // Indirect Ophthalmoscopy-specific fields
    indirectOphthalmoscopyData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Indirect Ophthalmoscopy
      sectionB: {
        instructionsToPatient: string;
        familiarityWithOphthalmoscope: string;
        correctUseOfIllumination: string;
        appropriateUseOfLenses: string;
        indentationTechnique: string;
        descriptionOfFindings: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Pupil-specific fields
    pupilData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Examination of the Pupils
      sectionB: {
        generalInspection: string;
        appropriateUseOfDistanceTarget: string;
        directPupillaryReaction: string;
        consensualReaction: string;
        swingingFlashlightTest: string;
        accommodativeReaction: string;
        slitLampExamination: string;
        correctReactionsIdentified: string;
        suggestionOfSuitableAetiology: string;
        suggestionsForSuitableFurtherTests: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Contact Lenses-specific fields
    contactLensesData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Fundus Contact Lenses
      sectionB: {
        instructionsToPatient: string;
        familiarityWithLenses: string;
        correctUseOfSlitLampIllumination: string;
        appropriateUseOfLenses: string;
        descriptionOfFindings: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // 78D/90D lens-specific fields
    lens78D90DData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: 78D / 90D (or Equivalent) Lenses
      sectionB: {
        instructionsToPatient: string;
        familiarityWithLenses: string;
        correctUseOfSlitLampIllumination: string;
        appropriateUseOfLenses: string;
        descriptionOfFindings: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Gonioscopy-specific fields
    gonioscopyData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Gonioscopy (with subsections)
      sectionB: {
        // Subsection: Slit Lamp
        roomSetup: string;
        anteriorChamberDepth: string;
        // Subsection: Gonioscopy Technique
        lensChoice: string;
        applicationAndPlacement: string;
        identificationOfStructures: string;
        examination360: string;
        careOfPatientAndLens: string;
        // Subsection: Dynamic Assessment
        useOfAppropriateLens: string;
        adjustmentOfSlitLamp: string;
        indentationTechnique: string;
        // Subsection: Interpretation
        understandingOfGrading: string;
        interpretationAndDocumentation: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Direct Ophthalmoscopy-specific fields
    directOphthalmoscopyData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Use of Direct Ophthalmoscope
      sectionB: {
        instructionsToPatient: string;
        familiarityWithOphthalmoscope: string;
        correctUseOfIllumination: string;
        appropriateUseOfLenses: string;
        descriptionOfFindings: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Slit Lamp-specific fields
    slitLampData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Knowledge of Slit Lamp
      sectionB: {
        appropriateIPD: string;
        appropriateEyepieceFocus: string;
        appropriateSlitBeamSizeAndAngle: string;
        useOfFullRangeOfMagnification: string;
        useOfAppropriateFilters: string;
      };
      // Section C: Examination of Anterior Segment
      sectionC: {
        lidsAndLashes: string;
        conjunctiva: string;
        cornea: string;
        irisStructures: string;
        lens: string;
        aqueousHumour: string;
        anteriorChamberDepth: string;
      };
      // Section D: Overall
      sectionD: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // IOP-specific fields
    iopData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: IOP Measurement
      sectionB: {
        technique: string; // "Goldmann" | "Tonopen" | "Perkins" | "Other"
        otherTechnique?: string;
        consentForTest: string;
        applicationOfAnaesthesiaAndFluorescein: string;
        stabilisationOfLidsAndEye: string;
        useOfTonometerAccuratePlacement: string;
        accurateIOPRecording: string;
        interpretationOfResult: string;
        cornealAppearanceAfterExamination: string;
        careOfTonometerHead: string;
        infectionControl: string;
      };
      // Section C: Checking Calibration of Tonometer
      sectionC: {
        knowledgeOfReasonsForCalibration: string;
        appropriateUseOfCalibrationArm: string;
        interpretationOfResults: string;
        appropriateActionTaken: string;
      };
      // Section D: Overall
      sectionD: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Ocular Motility-specific fields
    ocularMotilityData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: Cover Test and Eye Movements
      sectionB: {
        observationOfAssociatedOcularSignsAndHeadPosition: string;
        useOfFixationTargets: string;
        performanceOfCoverTests: string;
        assessmentOfVersionsDuctionsVergencesAndSaccades: string;
        interpretationOfFindings: string;
      };
      // Section C: Prism Cover Test
      sectionC: {
        explanationOfTest: string;
        appropriatePositioningOfPrismBar: string;
        assessmentOfAngle: string;
        interpretationOfResults: string;
      };
      // Section D: Overall
      sectionD: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // External Eye-specific fields
    externalEyeData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        respect: string;
      };
      // Section B: External Eye Examination
      sectionB: {
        assessmentOfFaceAndHead: string;
        palpationOfOrbitalMargins: string;
        examinationOfLacrimalSystem: string;
        assessmentOfLidPositionWithAppropriateMeasurements: string;
        examinationOfLashes: string;
        examinationOfMeibomianGlands: string;
        examinationOfConjunctiva: string;
        examinationOfCornea: string;
      };
      // Section C: Use of Ancillary Tests
      sectionC: {
        lidEversion: string;
        useOfExophthalmometer: string;
        otherAncillaryTests: string;
      };
      // Section D: Overall
      sectionD: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Fields-specific fields
    fieldsData?: {
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        listeningSkills: string;
        empathy: string;
        respect: string;
      };
      // Section B: Information Gathering (Visual Fields)
      sectionB: {
        appropriateOcclusion: string;
        appropriateTechnique: string;
        identificationOfVisualFieldDefect: string;
        understandingOfPossibleCauses: string;
        appropriateRecommendationForFurtherFieldTesting: string;
      };
      // Section C: Overall
      sectionC: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // Consultation Skills-specific fields
    consultationSkillsData?: {
      specialty?: string; // Specialty selection
      // Section A: Attitude and Manner
      sectionA: {
        introduction: string; // "Major concerns" | "Minor concerns" | "Meets expectations"
        rapport: string;
        listeningSkills: string;
        empathy: string;
        respect: string;
      };
      // Section B: Information Gathering
      sectionB: {
        historyOfPresentingComplaint: string;
        pastOphthalmicHistory: string;
        familyHistory: string;
        pastMedicalHistory: string;
        systemsEnquiry: string;
        drugHistoryAndAllergies: string;
        socialHistory: string;
        otherRelevantEnquiries: string;
        assessmentOfMentalState: string;
      };
      // Section C: Awareness
      sectionC: {
        sensitiveAndResponsiveToPatientAnxieties: string;
        awarenessOfSocialImpact: string;
        interviewSensitiveAndResponsive: string;
      };
      // Section D: Management of Consultation and Delivery of Information
      sectionD: {
        modeOfEnquiry: string;
        appropriateControlAndDirection: string;
        efficientUseOfTime: string;
        deliveryOfInformation: string;
        involvementOfPatientInDecisions: string;
        terminationOfInterview: string;
      };
      // Section E: Overall
      sectionE: {
        especiallyGood: string; // Mandatory
        suggestionsForImprovement: string; // Mandatory
        agreedActionPlan: string; // Mandatory
      };
    };
    // MAR-specific fields
    marFormData?: {
      specialty: string;
      // Section A: Clinical Skills
      sectionA: {
        efficiency: { rating: string; comments: string; };
        clinicalSkills: { rating: string; comments: string; };
        proceduralSkills: { rating: string; comments: string; };
        diagnosticSkills: { rating: string; comments: string; };
      };
      // Section B: Professionalism and Patient Care
      sectionB: {
        clarityAccuracyDetail: { rating: string; comments: string; };
        recognisingNeedForSeniorHelp: { rating: string; comments: string; };
        displayOfCareAndCompassion: { rating: string; comments: string; };
      };
      // Section C: Compliments, Complaints, Probity
      sectionC: {
        complimentsComplaints: { notApplicable: boolean; text: string; };
        healthIssues: { notApplicable: boolean; text: string; };
        probityConcerns: { hasConcerns: boolean; sharedWithTrainee: string; outcome: string; }; // sharedWithTrainee is "notApplicable" if not applicable, otherwise empty string
      };
      // Section D: Summary
      sectionD: {
        overallPerformanceAtExpectedLevel: boolean;
        suggestionsForImprovement: string;
      };
    };
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
