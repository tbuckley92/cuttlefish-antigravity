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
        const { token, evidenceId, updates, complete } = await req.json()

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

        // 3. Update Evidence
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

        // Construct data column
        // We need to fetch existing data first to merge? Or assume 'updates' contains full data?
        // EPAForm sends partial updates on save?
        // Actually EPAForm usually sends the FULL object in onSave.
        // Let's assume full object or merge.
        // Safer to fetch current data and merge if we want to be careful, but efficient to just write if frontend sends full.
        // FrontEnd onSave sends: epaFormData: { ... } (full object usually).

        if (epaFormData) {
            // We need to fetch existing to merge if we want to be safe, BUT supabase update merges columns.
            // But 'data' is a JSONB column. Updating it overwrites the whole column unless we use jsonb_set (complex).
            // Simpler: Fetch current, merge, save.
            const { data: currentEvidence } = await supabaseAdmin.from('evidence').select('data').eq('id', evidenceId).single()
            const currentData = currentEvidence?.data || {}

            updatePayload.data = {
                ...currentData,
                ...restData, // any other random fields
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
