// ============================================================================
// REFRACTIVE AUDIT CONSTANTS
// ============================================================================

// Snellen visual acuity options (metric)
export const SNELLEN_VA_OPTIONS = [
  '6/4',
  '6/5',
  '6/6',
  '6/9',
  '6/12',
  '6/18',
  '6/24',
  '6/36',
  '6/60',
  'CF',   // Counting Fingers
  'HM',   // Hand Movements
  'PL',   // Perception of Light
  'NPL',  // No Perception of Light
];

// Spherical equivalent range: -5.00 to +5.00 in 0.25 steps
export const SPHERE_OPTIONS: number[] = [];
for (let i = -5.0; i <= 5.0; i += 0.25) {
  SPHERE_OPTIONS.push(Math.round(i * 100) / 100); // Avoid floating point issues
}

// Cylinder/Astigmatism range: -2.50 to +2.50 in 0.25 steps
export const CYLINDER_OPTIONS: number[] = [];
for (let i = -2.5; i <= 2.5; i += 0.25) {
  CYLINDER_OPTIONS.push(Math.round(i * 100) / 100);
}

// Axis range: 0 to 180 degrees
export const AXIS_MIN = 0;
export const AXIS_MAX = 180;

// Vision change options
export const VISION_CHANGE_OPTIONS = [
  { value: 'better', label: 'Better' },
  { value: 'same', label: 'Same' },
  { value: 'worse', label: 'Worse' },
] as const;

// Helper to format sphere/cylinder for display
export const formatDiopter = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};

// Type for refractive audit entry
export interface RefractiveAuditEntry {
  id: string;
  created_at: string;
  resident_user_id: string;
  patient_id: string;
  patient_dob: string;
  va_right: string;
  va_left: string;
  sph_right: number;
  sph_left: number;
  cyl_right: number;
  cyl_left: number;
  axis_right: number;
  axis_left: number;
  vision_change_right: 'better' | 'same' | 'worse';
  vision_change_left: 'better' | 'same' | 'worse';
}
