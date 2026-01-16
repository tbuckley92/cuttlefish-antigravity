import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { token, evidenceId, updates, complete, formType } = await req.json()

        if (!token || !evidenceId || !updates) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Validate Token
        const { data: linkData, error: linkError } = await supabaseAdmin
            .from('magic_links')
            .select('*')
            .eq('token', token)
            .eq('evidence_id', evidenceId)
            .is('used_at', null)
            .single()

        if (linkError || !linkData) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired magic link' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Check Expiry (24 hours)
        const output = new Date(linkData.created_at).getTime() + (24 * 60 * 60 * 1000);
        if (Date.now() > output) {
            return new Response(
                JSON.stringify({ success: false, error: 'Magic link expired' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Handle MSF Response specially
        if (formType === 'MSF_RESPONSE' && updates.msfResponse) {
            console.log('Processing MSF response from:', updates.msfResponse.respondentEmail);

            // Fetch current evidence to update respondent status
            const { data: currentEvidence, error: fetchError } = await supabaseAdmin
                .from('evidence')
                .select('data')
                .eq('id', evidenceId)
                .single()

            if (fetchError) throw fetchError;

            const currentData = currentEvidence?.data || {};
            const msfRespondents = currentData.msfRespondents || [];

            // Find and update the respondent by email
            const respondentEmail = updates.msfResponse.respondentEmail;
            const updatedRespondents = msfRespondents.map((r: any) => {
                if (r.email === respondentEmail) {
                    return {
                        ...r,
                        status: 'Completed',
                        response: {
                            selections: updates.msfResponse.selections,
                            comments: updates.msfResponse.comments,
                            overallComments: updates.msfResponse.overallComments,
                            submittedAt: updates.msfResponse.submittedAt
                        }
                    };
                }
                return r;
            });

            // Update the evidence with the new respondent data
            const { error: updateError } = await supabaseAdmin
                .from('evidence')
                .update({
                    updated_at: new Date().toISOString(),
                    data: {
                        ...currentData,
                        msfRespondents: updatedRespondents
                    }
                })
                .eq('id', evidenceId);

            if (updateError) throw updateError;

            // Mark link as used
            if (complete) {
                await supabaseAdmin
                    .from('magic_links')
                    .update({ used_at: new Date().toISOString() })
                    .eq('token', token)
            }

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4. Update Evidence (standard form path)
        // We separate top-level fields from JSONB data
        const { id, type, status, title, sia, level, notes, supervisorGmc, supervisorName, supervisorEmail, signedOffBy, signedOffAt, epaFormData, ...restData } = updates

        // Prepare update payload
        const updatePayload: any = {
            updated_at: new Date().toISOString()
        }

        if (status) updatePayload.status = status
        if (title) updatePayload.title = title
        if (sia) updatePayload.sia = sia
        if (level) updatePayload.level = level
        if (notes) updatePayload.notes = notes
        if (supervisorGmc) updatePayload.supervisor_gmc = supervisorGmc
        if (supervisorName) updatePayload.supervisor_name = supervisorName
        if (supervisorEmail) updatePayload.supervisor_email = supervisorEmail
        if (signedOffBy) updatePayload.signed_off_by = signedOffBy
        if (signedOffAt) updatePayload.signed_off_at = signedOffAt

        if (epaFormData) {
            const { data: currentEvidence } = await supabaseAdmin.from('evidence').select('data').eq('id', evidenceId).single()
            const currentData = currentEvidence?.data || {}

            updatePayload.data = {
                ...currentData,
                ...restData,
                epaFormData: {
                    ...(currentData.epaFormData || {}),
                    ...epaFormData
                }
            }
        }

        const { error: updateError } = await supabaseAdmin
            .from('evidence')
            .update(updatePayload)
            .eq('id', evidenceId)

        if (updateError) throw updateError

        // 4. Mark Link Used if complete
        if (complete) {
            await supabaseAdmin
                .from('magic_links')
                .update({ used_at: new Date().toISOString() })
                .eq('token', token)
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Submit failed:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
