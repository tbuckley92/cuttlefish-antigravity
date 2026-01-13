// CRS Form Data - Generated from crs-forms-data.csv
// This file contains structured data for all 14 CRS form types

export interface CRSCriterion {
    key: string;
    label: string;
    subsection?: string;
}

export interface CRSSection {
    id: string;           // A, B, C, D, E
    title: string;
    criteria: CRSCriterion[];
    isOverallSection?: boolean;  // True for the final "Overall" section with comments
}

export interface CRSFormTypeConfig {
    name: string;
    sections: CRSSection[];
    methodSelector?: {
        section: string;
        label: string;
        options: string[];
        otherLabel?: string;
    };
    hasSpecialtySelector?: boolean;
}

// Rating options for all CRS forms
export const CRS_RATING_OPTIONS = ["Major concerns", "Minor concerns", "Meets expectations"];

// Specialty options for Consultation Skills
export const CRS_SPECIALTIES = [
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

// IOP technique options
export const IOP_TECHNIQUES = ["Goldmann", "Tonopen", "Perkins", "Other"];

// Visual acuity method options
export const VISUAL_ACUITY_METHODS = ["Snellen", "LogMAR", "Sheridan-Gardner", "Other"];

// Colour vision method options
export const COLOUR_VISION_METHODS = ["Ishihara", "Other pseudoisochromatic", "Other"];

// All CRS form types
export const CRS_FORM_TYPES: Record<string, CRSFormTypeConfig> = {
    "Vision": {
        name: "Vision",
        methodSelector: {
            section: "B",
            label: "Method of visual acuity assessment",
            options: VISUAL_ACUITY_METHODS,
            otherLabel: "Other method"
        },
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of test" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Assessment of Visual Acuity",
                criteria: [
                    { key: "appropriateOcclusion", label: "Appropriate occlusion" },
                    { key: "technique", label: "Technique of assessment appropriate for age and context" },
                    { key: "refractiveCorrection", label: "Appropriate use of refractive correction" },
                    { key: "pinhole", label: "Appropriate use of pinhole" },
                    { key: "distanceAcuity", label: "Accurate recording of distance acuity" },
                    { key: "nearAcuity", label: "Accurate recording of near acuity" }
                ]
            },
            {
                id: "C",
                title: "Assessment of Colour Vision",
                criteria: [
                    { key: "appropriateOcclusion", label: "Appropriate occlusion" },
                    { key: "technique", label: "Technique of assessment appropriate for age and context" },
                    { key: "colourVisionTest", label: "Appropriate use of colour vision test" },
                    { key: "accurateRecording", label: "Accurate recording of colour vision" }
                ]
            },
            {
                id: "D",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Retinoscopy": {
        name: "Retinoscopy",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with child/carer, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for child/carer" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "patientPositioning", label: "Patient positioning / room setup" },
                    { key: "appropriateCycloplegia", label: "Appropriate cycloplegia" },
                    { key: "useOfTrialFrame", label: "Use of trial frame / lenses" },
                    { key: "timeTaken", label: "Time taken / flow of examination" },
                    { key: "accuracy", label: "Accuracy of retinoscopy" },
                    { key: "notation", label: "Notation of retinoscopy / working distance" },
                    { key: "appropriatePrescription", label: "Appropriate prescription issued" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Indirect Ophthalmoscopy": {
        name: "Indirect Ophthalmoscopy",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient and their comfort" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "instructionsToPatient", label: "Instructions to patient" },
                    { key: "familiarityWithOphthalmoscope", label: "Familiarity with use of ophthalmoscope" },
                    { key: "correctUseOfIllumination", label: "Correct use of illumination" },
                    { key: "appropriateUseOfLenses", label: "Appropriate use of lenses" },
                    { key: "indentationTechnique", label: "Indentation technique" },
                    { key: "descriptionOfFindings", label: "Description of findings" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Pupil": {
        name: "Pupil",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "generalInspection", label: "General inspection in ambient light with measurements" },
                    { key: "appropriateUseOfDistanceTarget", label: "Appropriate use of distance target" },
                    { key: "directPupillaryReaction", label: "Direct pupillary reaction and recovery" },
                    { key: "consensualReaction", label: "Consensual reaction and recovery" },
                    { key: "swingingFlashlightTest", label: "Swinging flashlight test" },
                    { key: "accommodativeReaction", label: "Accommodative reaction and recovery" },
                    { key: "slitLampExamination", label: "Slit lamp examination" },
                    { key: "correctReactionsIdentified", label: "Correct reactions identified" },
                    { key: "suggestionOfSuitableAetiology", label: "Suggestion of suitable aetiology" },
                    { key: "suggestionsForSuitableFurtherTests", label: "Suggestions for suitable further tests" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Contact lenses": {
        name: "Contact lenses",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient and their comfort" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "instructionsToPatient", label: "Instructions to and preparation of patient" },
                    { key: "familiarityWithLenses", label: "Familiarity with use of lenses" },
                    { key: "correctUseOfSlitLampIllumination", label: "Correct use of slit lamp illumination" },
                    { key: "appropriateUseOfLenses", label: "Appropriate use of lenses" },
                    { key: "descriptionOfFindings", label: "Description of findings" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "78D/90D lens": {
        name: "78D/90D lens",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient and their comfort" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "instructionsToPatient", label: "Instructions to patient" },
                    { key: "familiarityWithLenses", label: "Familiarity with use of lenses" },
                    { key: "correctUseOfSlitLampIllumination", label: "Correct use of slit lamp illumination" },
                    { key: "appropriateUseOfLenses", label: "Appropriate use of lenses" },
                    { key: "descriptionOfFindings", label: "Description of findings" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Gonioscopy": {
        name: "Gonioscopy",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Technical Skills",
                criteria: [
                    { key: "roomSetup", label: "Room setup and patient position", subsection: "Slit Lamp" },
                    { key: "anteriorChamberDepth", label: "Anterior chamber depth assessment and grading using Van Herick system", subsection: "Slit Lamp" },
                    { key: "lensChoice", label: "Lens choice, cleaning and preparation", subsection: "Gonioscopy Technique" },
                    { key: "applicationAndPlacement", label: "Application of topical anaesthesia and lens placement", subsection: "Gonioscopy Technique" },
                    { key: "identificationOfStructures", label: "Identification of corneal wedge and other structures and features", subsection: "Gonioscopy Technique" },
                    { key: "examination360", label: "Examination in 360° of angle and iris", subsection: "Gonioscopy Technique" },
                    { key: "careOfPatientAndLens", label: "Care of patient and lens", subsection: "Gonioscopy Technique" },
                    { key: "useOfAppropriateLens", label: "Use of appropriate lens", subsection: "Dynamic Assessment" },
                    { key: "adjustmentOfSlitLamp", label: "Adjustment of slit lamp, light exposure and eye position", subsection: "Dynamic Assessment" },
                    { key: "indentationTechnique", label: "Indentation technique", subsection: "Dynamic Assessment" },
                    { key: "understandingOfGrading", label: "Understanding of angle grading system", subsection: "Interpretation" },
                    { key: "interpretationAndDocumentation", label: "Interpretation and documentation of results", subsection: "Interpretation" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Direct Ophthalmoscopy": {
        name: "Direct Ophthalmoscopy",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient and their comfort" }
                ]
            },
            {
                id: "B",
                title: "Use of Direct Ophthalmoscope",
                criteria: [
                    { key: "instructionsToPatient", label: "Instructions to patient" },
                    { key: "familiarityWithOphthalmoscope", label: "Familiarity with use of ophthalmoscope" },
                    { key: "correctUseOfIllumination", label: "Correct use of illumination" },
                    { key: "appropriateUseOfLenses", label: "Appropriate use of lenses" },
                    { key: "descriptionOfFindings", label: "Description of findings" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Slit lamp anterior segment": {
        name: "Slit lamp anterior segment",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Knowledge of Slit Lamp",
                criteria: [
                    { key: "appropriateIPD", label: "Appropriate interpupillary distance (IPD)" },
                    { key: "appropriateEyepieceFocus", label: "Appropriate eyepiece focus" },
                    { key: "appropriateSlitBeamSizeAndAngle", label: "Appropriate selection of slit beam size and angle" },
                    { key: "useOfFullRangeOfMagnification", label: "Use of full range of available magnification powers" },
                    { key: "useOfAppropriateFilters", label: "Use of appropriate filters" }
                ]
            },
            {
                id: "C",
                title: "Examination of Anterior Segment",
                criteria: [
                    { key: "lidsAndLashes", label: "Lids and lashes" },
                    { key: "conjunctiva", label: "Conjunctiva" },
                    { key: "cornea", label: "Cornea" },
                    { key: "irisStructures", label: "Iris structures" },
                    { key: "lens", label: "Lens" },
                    { key: "aqueousHumour", label: "Aqueous humour" },
                    { key: "anteriorChamberDepth", label: "Anterior chamber depth" }
                ]
            },
            {
                id: "D",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "IOP": {
        name: "IOP",
        methodSelector: {
            section: "B",
            label: "Technique",
            options: IOP_TECHNIQUES,
            otherLabel: "Other technique"
        },
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "IOP Measurement",
                criteria: [
                    { key: "consentForTest", label: "Consent for test" },
                    { key: "applicationOfAnaesthesiaAndFluorescein", label: "Application of anaesthesia and fluorescein" },
                    { key: "stabilisationOfLidsAndEye", label: "Stabilisation of lids and eye" },
                    { key: "useOfTonometerAccuratePlacement", label: "Use of tonometer, accurate placement on eye" },
                    { key: "accurateIOPRecording", label: "Accurate IOP recording (within ±2 mmHg)" },
                    { key: "interpretationOfResult", label: "Interpretation of result" },
                    { key: "cornealAppearanceAfterExamination", label: "Corneal appearance after examination" },
                    { key: "careOfTonometerHead", label: "Care of tonometer head" },
                    { key: "infectionControl", label: "Infection control" }
                ]
            },
            {
                id: "C",
                title: "Checking Calibration of Tonometer",
                criteria: [
                    { key: "knowledgeOfReasonsForCalibration", label: "Knowledge of reasons for calibration" },
                    { key: "appropriateUseOfCalibrationArm", label: "Appropriate use of calibration arm" },
                    { key: "interpretationOfResults", label: "Interpretation of results" },
                    { key: "appropriateActionTaken", label: "Appropriate action taken" }
                ]
            },
            {
                id: "D",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Ocular motility": {
        name: "Ocular motility",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Cover Test and Eye Movements",
                criteria: [
                    { key: "observationOfOcularSigns", label: "Observation of associated ocular signs and head position" },
                    { key: "useOfFixationTargets", label: "Use of fixation targets" },
                    { key: "performanceOfCoverTests", label: "Performance of cover, cover–uncover, and alternate cover tests" },
                    { key: "assessmentOfVersions", label: "Assessment of versions, ductions, vergences, and saccades" },
                    { key: "interpretationOfFindings", label: "Interpretation of findings" }
                ]
            },
            {
                id: "C",
                title: "Prism Cover Test",
                criteria: [
                    { key: "explanationOfTest", label: "Explanation of test" },
                    { key: "appropriatePositioning", label: "Appropriate positioning of prism bar" },
                    { key: "assessmentOfAngle", label: "Assessment of angle" },
                    { key: "interpretationOfResults", label: "Interpretation of results" }
                ]
            },
            {
                id: "D",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "External eye": {
        name: "External eye",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and explanation of examination" },
                    { key: "rapport", label: "Rapport with patient, empathy and sensitivity to age and context" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "External Eye Examination",
                criteria: [
                    { key: "assessmentOfFaceAndHead", label: "Assessment of face and head" },
                    { key: "palpationOfOrbitalMargins", label: "Palpation of orbital margins" },
                    { key: "examinationOfLacrimalSystem", label: "Examination of lacrimal system" },
                    { key: "assessmentOfLidPosition", label: "Assessment of lid position with appropriate measurements" },
                    { key: "examinationOfLashes", label: "Examination of lashes" },
                    { key: "examinationOfMeibomianGlands", label: "Examination of meibomian glands" },
                    { key: "examinationOfConjunctiva", label: "Examination of conjunctiva" },
                    { key: "examinationOfCornea", label: "Examination of cornea" }
                ]
            },
            {
                id: "C",
                title: "Use of Ancillary Tests",
                criteria: [
                    { key: "lidEversion", label: "Lid eversion" },
                    { key: "useOfExophthalmometer", label: "Use of exophthalmometer" },
                    { key: "otherAncillaryTests", label: "Other ancillary tests (specified as appropriate)" }
                ]
            },
            {
                id: "D",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Fields": {
        name: "Fields",
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and start of interview" },
                    { key: "rapport", label: "Rapport with patient and development of trust" },
                    { key: "listeningSkills", label: "Listening skills, appropriate eye contact and non-verbal communication" },
                    { key: "empathy", label: "Empathy and sensitivity" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Information Gathering (Visual Fields)",
                criteria: [
                    { key: "appropriateOcclusion", label: "Appropriate occlusion" },
                    { key: "appropriateTechnique", label: "Appropriate technique employed" },
                    { key: "identificationOfDefect", label: "Identification of visual field defect" },
                    { key: "understandingOfCauses", label: "Understanding of possible causes of defect" },
                    { key: "appropriateRecommendation", label: "Appropriate recommendation for further field testing" }
                ]
            },
            {
                id: "C",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    },
    "Consultation skills": {
        name: "Consultation skills",
        hasSpecialtySelector: true,
        sections: [
            {
                id: "A",
                title: "Attitude and Manner",
                criteria: [
                    { key: "introduction", label: "Introduction and start of interview" },
                    { key: "rapport", label: "Rapport with patient and development of trust" },
                    { key: "listeningSkills", label: "Listening skills, appropriate eye contact and non-verbal communication" },
                    { key: "empathy", label: "Empathy and sensitivity" },
                    { key: "respect", label: "Respect for patient" }
                ]
            },
            {
                id: "B",
                title: "Information Gathering",
                criteria: [
                    { key: "historyOfPresentingComplaint", label: "History of presenting complaint" },
                    { key: "pastOphthalmicHistory", label: "Past ophthalmic history" },
                    { key: "familyHistory", label: "Family history" },
                    { key: "pastMedicalHistory", label: "Past medical history / general health" },
                    { key: "systemsEnquiry", label: "Systems enquiry" },
                    { key: "drugHistoryAndAllergies", label: "Drug history and allergies" },
                    { key: "socialHistory", label: "Social history" },
                    { key: "otherRelevantEnquiries", label: "Other relevant enquiries pertinent to the case" },
                    { key: "assessmentOfMentalState", label: "Assessment of mental state" }
                ]
            },
            {
                id: "C",
                title: "Awareness",
                criteria: [
                    { key: "sensitiveToAnxieties", label: "Sensitive and responsive to patient anxieties and concerns" },
                    { key: "awarenessOfSocialImpact", label: "Awareness of the social impact of problems for the patient" },
                    { key: "sensitiveToAge", label: "Interview sensitive and responsive to patient's age, mental state, and any communication problems" }
                ]
            },
            {
                id: "D",
                title: "Management of Consultation and Delivery of Information",
                criteria: [
                    { key: "modeOfEnquiry", label: "Mode of enquiry: appropriate use of closed, open, directed and probing questions; clarification and summarising" },
                    { key: "appropriateControl", label: "Appropriate control and direction of consultation" },
                    { key: "efficientUseOfTime", label: "Efficient use of time" },
                    { key: "deliveryOfInformation", label: "Delivery of information" },
                    { key: "involvementOfPatient", label: "Involvement of patient in decisions" },
                    { key: "terminationOfInterview", label: "Termination of interview" }
                ]
            },
            {
                id: "E",
                title: "Overall",
                isOverallSection: true,
                criteria: [
                    { key: "especiallyGood", label: "Please note any aspects which were especially good" },
                    { key: "suggestionsForImprovement", label: "Suggestions for improvement" },
                    { key: "agreedActionPlan", label: "Agreed action plan" }
                ]
            }
        ]
    }
};

// Helper to get section labels for display (e.g., "A. Attitude and Manner")
export function getSectionLabels(formType: string): string[] {
    const config = CRS_FORM_TYPES[formType];
    if (!config) return [];
    return config.sections.map(s => `${s.id}. ${s.title}`);
}

// Helper to get form type names
export function getCRSFormTypeNames(): string[] {
    return Object.keys(CRS_FORM_TYPES);
}
