import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface EmailFormParams {
    evidenceId: string;
    recipientEmail: string;
    recipientGmc?: string;
    formType: string;
}

/**
 * Sends a magic link email for form completion
 * @param params - Evidence ID, recipient email, optional GMC, form type
 * @returns Promise with success status and magic link URL
 */
export async function sendMagicLinkEmail(params: EmailFormParams): Promise<{ success: boolean; error?: string; magicLink?: string }> {
    if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('create-magic-link', {
            body: {
                evidence_id: params.evidenceId,
                recipient_email: params.recipientEmail,
                recipient_gmc: params.recipientGmc,
                form_type: params.formType
            }
        });

        if (error) {
            console.error('Magic link creation error:', error);
            return { success: false, error: error.message };
        }

        return {
            success: true,
            magicLink: data.magic_link
        };
    } catch (err: any) {
        console.error('sendMagicLinkEmail error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Validates a magic link token
 * @param token - The magic link token from URL
 * @returns Promise with validation result and evidence data
 */
export async function validateMagicLinkToken(token: string): Promise<{
    valid: boolean;
    evidence?: any;
    formType?: string;
    recipientEmail?: string;
    traineeName?: string;
    requiresGmc?: boolean;
    error?: string;
}> {
    if (!isSupabaseConfigured || !supabase) {
        return { valid: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('validate-magic-link', {
            body: { token }
        });

        if (error) {
            return { valid: false, error: error.message };
        }

        return data;
    } catch (err: any) {
        return { valid: false, error: err.message };
    }
}

/**
 * Marks a magic link as used after form submission
 * @param token - The magic link token
 */
export async function markMagicLinkUsed(token: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    try {
        await supabase.rpc('mark_magic_link_used', { link_token: token });
    } catch (err) {
        console.error('Error marking magic link as used:', err);
    }
}

export type NotificationType =
    | 'welcome'
    | 'form_signed_off'
    | 'arcp_outcome'
    | 'arcp_broadcast'
    | 'edit_request_approved'
    | 'edit_request_denied';

export interface NotificationEmailParams {
    type: NotificationType;
    recipientEmail?: string;
    userId?: string;
    recipientName?: string;
    data?: {
        formType?: string;
        formTitle?: string;
        supervisorName?: string;
        traineeName?: string;
        arcpOutcome?: string;
        message?: string;
        evidenceId?: string;
    };
}

/**
 * Sends a notification email via the send-notification-email Edge Function
 * @param params - Notification type, recipient (email or userId), and contextual data
 * @returns Promise with success status
 */
export async function sendNotificationEmail(params: NotificationEmailParams): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('send-notification-email', {
            body: {
                type: params.type,
                recipient_email: params.recipientEmail,
                user_id: params.userId,
                recipient_name: params.recipientName,
                ...params.data
            }
        });

        if (error) {
            console.error('Notification email error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('sendNotificationEmail error:', err);
        return { success: false, error: err.message };
    }
}

