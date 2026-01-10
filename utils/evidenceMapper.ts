import { EvidenceItem, EvidenceStatus, EvidenceType } from '../types';

// Basic Json type definition to avoid external dependency issues
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Define the shape of a Supabase evidence row based on the schema
export interface SupabaseEvidenceRow {
    id: string;
    trainee_id: string;
    trainee_deanery: string; // Often auto-populated trigger side, but good to know
    type: string;
    status: string;
    title: string;
    event_date: string;
    sia?: string | null;
    level?: number | null;
    notes?: string | null;
    data: any; // JSONB
    submitted_at?: string | null;
    signed_off_at?: string | null;
    signed_off_by?: string | null;
    supervisor_gmc?: string | null;
    supervisor_name?: string | null;
    supervisor_email?: string | null;
    created_at?: string;
    updated_at?: string;
}

/**
 * Maps a Supabase DB row to the application's EvidenceItem type.
 */
export const mapRowToEvidenceItem = (row: SupabaseEvidenceRow): EvidenceItem => {
    const { data, ...baseFields } = row;

    // Extract known fields from the JSONB 'data' payload
    // Depending on the form type, 'data' contains { epaFormData: ... } or { dopsFormData: ... } etc.

    // Base object with common fields
    const item: any = {
        id: baseFields.id,
        type: baseFields.type as EvidenceType,
        status: baseFields.status as EvidenceStatus,
        title: baseFields.title,
        date: baseFields.event_date,
        sia: baseFields.sia || undefined,
        level: baseFields.level || undefined,
        notes: baseFields.notes || undefined,
        supervisorGmc: baseFields.supervisor_gmc || undefined,
        supervisorName: baseFields.supervisor_name || undefined,
        supervisorEmail: baseFields.supervisor_email || undefined,
        traineeId: baseFields.trainee_id,

        // Spread the entire data object. 
        // This restores all the form-specific fields like epaFormData, dopsFormData, linkedEvidence, etc.
        data: data, // Preserve the raw data object for new types like ARCP Outcome
        ...(data || {})
    };

    // Ensure arrays are initialized if missing in data (safety fallback)
    if (!item.linkedEvidence) item.linkedEvidence = {};

    return item as EvidenceItem;
};

/**
 * Maps an application EvidenceItem to a Partial<SupabaseEvidenceRow> for insertion/update.
 * Note: trainee_id is typically handled by the caller or context.
 */
export const mapEvidenceItemToRow = (item: Partial<EvidenceItem>): Partial<SupabaseEvidenceRow> => {
    // Destructure top-level columns that exist in the DB schema
    const {
        id,
        type,
        status,
        title,
        date,
        sia,
        level,
        notes,
        supervisorGmc,
        supervisorName,
        supervisorEmail,
        ...rest // Everything else goes into the 'data' JSONB column
    } = item;

    return {
        id,
        type: type,
        status: status,
        title: title,
        event_date: date,
        sia: sia || null,
        level: level || null,
        notes: notes || null,
        supervisor_gmc: supervisorGmc || null,
        supervisor_name: supervisorName || null,
        supervisor_email: supervisorEmail || null,
        data: rest // Store form-specific data in the JSONB column
    };
};
