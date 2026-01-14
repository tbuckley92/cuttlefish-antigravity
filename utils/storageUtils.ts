import { supabase } from './supabaseClient';
import { uuidv4 } from './uuid';

/**
 * Uploads a file to the 'evidence-files' bucket in Supabase Storage.
 * Returns the path to the uploaded file.
 * 
 * @param userId - The ID of the user uploading the file (used for folder structure)
 * @param file - The file object to upload
 * @returns Promise resolving to the storage path (e.g., "userId/filename.ext")
 */
export const uploadEvidenceFile = async (userId: string, file: File): Promise<string> => {
    if (!supabase) throw new Error("Supabase is not configured");

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
        .from('evidence-files')
        .upload(filePath, file, {
            upsert: false // Prevent overwriting unless intended, though UUID prevents collision
        });

    if (error) {
        throw error;
    }

    return filePath;
};

/**
 * Generates a signed URL for a file in the 'evidence-files' bucket.
 * The URL is valid for 1 hour (3600 seconds).
 * 
 * @param path - The storage path of the file
 * @returns Promise resolving to the signed URL string
 */
export const getEvidenceFileUrl = async (path: string): Promise<string> => {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.storage
        .from('evidence-files')
        .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
        throw error;
    }

    return data.signedUrl;
};

/**
 * Lists all files in the current user's evidence folder.
 * For debugging purposes.
 */
export const listUserEvidenceFiles = async (userId: string): Promise<string[]> => {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.storage
        .from('evidence-files')
        .list(userId, {
            limit: 100,
            offset: 0
        });

    if (error) {
        console.error('Error listing files:', error);
        return [];
    }

    console.log('📂 Files in storage for user:', userId);
    console.log(data.map(f => `  - ${f.name} (${(f.metadata?.size || 0) / 1024} KB)`).join('\n'));

    return data.map(f => `${userId}/${f.name}`);
};
