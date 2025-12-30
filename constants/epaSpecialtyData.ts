// This file is auto-generated from epa-forms-data.csv.csv
// Do not edit manually - run: npm run generate-epa-data

export interface EPASpecialtyData {
  learningOutcomes: string[];
  criteria: {
    sectionB: string[];
    sectionC: string[];
    sectionD: string[];
    sectionE: string[];
    sectionF: string[];
  };
  sectionBlurbs: {
    sectionB: boolean;
    sectionC: boolean;
    sectionD: boolean;
    sectionE: boolean;
    sectionF: boolean;
  };
  showCommentsAlways: {
    sectionB: boolean;
    sectionC: boolean;
    sectionD: boolean;
    sectionE: boolean;
    sectionF: boolean;
  };
}

export const LEVEL_3_CATARACT_SURGERY: EPASpecialtyData = {
  learningOutcomes: [
    "CS3.3 - Independently perform low risk phacoemulsification cataract procedures.",
    "CS3.2 - Risk assess and prioritise patients appropriately, recognising the need for special interest input.",
    "CS3.1 - Independently assess and manage moderate complexity patients, demonstrating an understanding of cataract procedures and selecting the most appropriate treatment according to current accepted practice.",
  ],
  criteria: {
    sectionB: [
      "CRS Consultation skills",
    ],
    sectionC: [
    ],
    sectionD: [
      "OSATS Cataract Surgery",
      "DOPS Biometry",
    ],
    sectionE: [
      "Local anaesthesia",
      "Aqueous / vitreous biopsy",
      "Anterior chamber paracentesis",
      "Periocular and intraocular drug delivery",
    ],
    sectionF: [
      "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
      "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
      "Review of record keeping and letters:",
      "Case-based Discussions (CbDs)",
      "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA",
    ],
  },
  sectionBlurbs: {
    sectionB: false,
    sectionC: false,
    sectionD: false,
    sectionE: true,
    sectionF: false,
  },
  showCommentsAlways: {
    sectionB: false,
    sectionC: false,
    sectionD: true,
    sectionE: true,
    sectionF: true,
  },
};

export const LEVEL_3_CORNEA_AND_OCULAR_SURFACE_DISEASE: EPASpecialtyData = {
  learningOutcomes: [
    "COS3.3 - Independently perform low complexity corneal and ocular surface procedures.",
    "COS3.2 - Risk assess and prioritise patients appropriately, recognising the need for special interest input.",
    "COS3.1 - Independently assess and manage moderate complexity patients, demonstrating an understanding of cornea procedures and selecting the most appropriate treatment according to current accepted practice.",
  ],
  criteria: {
    sectionB: [
      "CRS Consultation skills",
    ],
    sectionC: [
      "Corneal gluing",
    ],
    sectionD: [
      "OSATS Microsurgical skills",
    ],
    sectionE: [
      "Corneal trauma repair",
      "Corneal graft suture removal",
      "Local anaesthesia",
    ],
    sectionF: [
      "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
      "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
      "Review of record keeping and letters:",
      "Case-based Discussions (CbDs)",
      "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA",
    ],
  },
  sectionBlurbs: {
    sectionB: false,
    sectionC: true,
    sectionD: false,
    sectionE: true,
    sectionF: false,
  },
  showCommentsAlways: {
    sectionB: false,
    sectionC: true,
    sectionD: false,
    sectionE: true,
    sectionF: true,
  },
};

export const LEVEL_3_OCULOPLASTICS: EPASpecialtyData = {
  learningOutcomes: [
    "OO3.1 - Independently assess and manage moderate complexity patients, demonstrating an understanding of oculoplastics procedures and selecting the most appropriate treatment according to current accepted practice.",
    "OO3.2 - Risk assess and prioritise patients appropriately, recognising the need for special interest input.",
    "OO3.3 - Independently perform low complexity oculoplastic procedures.",
  ],
  criteria: {
    sectionB: [
      "CRS Consultation skills",
    ],
    sectionC: [
      "Assessment and detailed interpretation of lacrimal function (syringing / sac wash-out)",
      "Initial management of sight-threatening orbital emergencies (e.g. orbital cellulitis)",
    ],
    sectionD: [
      "OSATS Lid Surgery",
      "OSATS Lateral canthotomy and cantholysis",
    ],
    sectionE: [
      "Local anaesthesia",
      "Tarsorrhaphy",
      "Eyelid laceration repair",
      "Eyelid lesion biopsy",
    ],
    sectionF: [
      "Longitudinal, periodic observation by consultant assessor in the outpatient and/or on call setting, where possible:",
      "Longitudinal observation by consultant assessor in the theatre and simulation setting:",
      "Review of record keeping and letters:",
      "Case-based Discussions (CbDs)",
      "Please indicate if Multi-assessor Report (MAR) have been reviewed before completing EPA",
    ],
  },
  sectionBlurbs: {
    sectionB: false,
    sectionC: true,
    sectionD: false,
    sectionE: true,
    sectionF: false,
  },
  showCommentsAlways: {
    sectionB: false,
    sectionC: true,
    sectionD: false,
    sectionE: true,
    sectionF: true,
  },
};


// Lookup map: Level -> Specialty -> Data
export const EPA_SPECIALTY_DATA: Record<number, Record<string, EPASpecialtyData>> = {
  3: {
    "Cataract Surgery": LEVEL_3_CATARACT_SURGERY,
    "Cornea & Ocular Surface Disease": LEVEL_3_CORNEA_AND_OCULAR_SURFACE_DISEASE,
    "Oculoplastics": LEVEL_3_OCULOPLASTICS,
  },
};
