import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyeportfolio.com'
const APP_URL = Deno.env.get('APP_URL') || 'https://eyeportfolio.com'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log("Create Magic Link Function Invoked");
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { evidence_id, recipient_email, recipient_gmc, form_type } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Generate secure token (64 character hex string)
        const tokenArray = new Uint8Array(32)
        crypto.getRandomValues(tokenArray)
        const token = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('')

        // Get evidence details for email
        const { data: evidence, error: evidenceError } = await supabaseAdmin
            .from('evidence')
            .select('type, title, trainee_id')
            .eq('id', evidence_id)
            .single()

        if (evidenceError || !evidence) {
            throw new Error(`Evidence not found: ${evidenceError?.message}`)
        }

        // Get trainee name for email
        const { data: traineeProfile } = await supabaseAdmin
            .from('user_profile')
            .select('name')
            .eq('user_id', evidence.trainee_id)
            .single()

        const traineeName = traineeProfile?.name || 'a trainee'

        // Get auth user (MANDATORY)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders })
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            console.error('Auth failed:', authError)
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), { status: 401, headers: corsHeaders })
        }

        const createdBy = user.id

        // Store magic link in database
        const { error: insertError } = await supabaseAdmin
            .from('magic_links')
            .insert({
                evidence_id,
                token,
                recipient_email,
                recipient_gmc: recipient_gmc || null,
                form_type,
                created_by: createdBy
            })

        if (insertError) throw insertError

        // Create magic link URL
        const magicLinkUrl = `${APP_URL}?token=${token}`

        // Determine email content based on form type
        const isMSF = form_type === 'MSF_RESPONSE'
        const subject = isMSF
            ? `Multi-Source Feedback Request for ${traineeName}`
            : `Complete ${evidence.type}: ${evidence.title}`

        const html = isMSF ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1e293b; margin-bottom: 16px;">Multi-Source Feedback Request</h1>
        <p style="color: #64748b; line-height: 1.6;">You have been invited to provide feedback for <strong>${traineeName}</strong>.</p>
        <p style="color: #64748b; line-height: 1.6;">Your feedback is valuable and confidential. It will help the trainee understand their strengths and areas for development.</p>
        <a href="${magicLinkUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">Complete Feedback Form</a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link is unique to you. Please do not share it.</p>
      </div>
    ` : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1e293b; margin-bottom: 16px;">Form Ready for Sign-Off</h1>
        <p style="color: #64748b; line-height: 1.6;">A ${evidence.type} form has been prepared for your review and sign-off.</p>
        <p style="color: #64748b; line-height: 1.6;"><strong>Form:</strong> ${evidence.title}</p>
        <p style="color: #64748b; line-height: 1.6;"><strong>Trainee:</strong> ${traineeName}</p>
        <a href="${magicLinkUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">Review and Sign Off</a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link can only be used once. You will need to enter your GMC number to complete the sign-off.</p>
      </div>
    `

        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: recipient_email,
                subject,
                html
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Resend API error: ${errorText}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                magic_link: magicLinkUrl,
                token
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Magic link creation failed:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
