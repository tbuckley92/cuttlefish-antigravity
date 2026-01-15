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
        const { token } = await req.json()

        if (!token) {
            return new Response(
                JSON.stringify({ valid: false, reason: 'No token provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Validate token using database function
        const { data: linkData, error: linkError } = await supabaseAdmin
            .rpc('validate_magic_link', { link_token: token })

        if (linkError) throw linkError

        const link = linkData?.[0]

        if (!link) {
            return new Response(
                JSON.stringify({ valid: false, reason: 'Link not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!link.is_valid) {
            return new Response(
                JSON.stringify({ valid: false, reason: 'Link has already been used' }),
                { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get evidence data for the form
        const { data: evidence, error: evidenceError } = await supabaseAdmin
            .from('evidence')
            .select('*')
            .eq('id', link.evidence_id)
            .single()

        if (evidenceError) throw evidenceError

        // Parse linked evidence IDs if they exist
        let linkedEvidenceItems: any[] = []
        try {
            const formData = evidence.data?.epaFormData
            if (formData?.linkedEvidence) {
                const linkedIds = Object.values(formData.linkedEvidence)
                    .flat()
                    .filter((id): id is string => typeof id === 'string')

                if (linkedIds.length > 0) {
                    const { data: linkedData } = await supabaseAdmin
                        .from('evidence')
                        .select('*')
                        .in('id', linkedIds)

                    if (linkedData) {
                        linkedEvidenceItems = linkedData
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching linked evidence:', e)
        }

        // Capture debug info
        const linkedEvidenceMap = evidence.data?.epaFormData?.linkedEvidence;
        const linkedKeys = linkedEvidenceMap ? Object.keys(linkedEvidenceMap) : [];
        const sampleValue = linkedKeys.length > 0 ? linkedEvidenceMap[linkedKeys[0]] : null;

        const debugInfo = {
            hasFormData: !!evidence.data?.epaFormData,
            hasLinkedEvidence: !!linkedEvidenceMap,
            linkedIds: linkedEvidenceMap ? Object.values(linkedEvidenceMap).flat() : [],
            linkedItemsFound: linkedEvidenceItems.length,
            linkedKeys: linkedKeys,
            linkedEvidenceType: typeof linkedEvidenceMap,
            sampleValueType: sampleValue ? typeof sampleValue : 'null',
            sampleValueIsArray: Array.isArray(sampleValue),
            sampleValueContent: sampleValue
        };

        // Get trainee profile for context
        const { data: traineeProfile } = await supabaseAdmin
            .from('user_profile')
            .select('name, gmc_number')
            .eq('user_id', evidence.trainee_id)
            .single()

        return new Response(
            JSON.stringify({
                valid: true,
                evidence,
                linked_evidence: linkedEvidenceItems,
                debug_info: debugInfo,
                form_type: link.form_type,
                recipient_email: link.recipient_email,
                trainee_name: traineeProfile?.name || 'Unknown',
                requires_gmc: link.form_type !== 'MSF_RESPONSE'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Magic link validation failed:', error)
        return new Response(
            JSON.stringify({ valid: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
