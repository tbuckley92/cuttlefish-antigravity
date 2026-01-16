import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyeportfolio.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notification_id, user_id, type, title, body } = await req.json()

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user email from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('email, name')
      .eq('user_id', user_id)
      .single()

    if (profileError || !profile?.email) {
      throw new Error(`User email not found: ${profileError?.message}`)
    }

    // Get email template based on notification type
    const emailContent = getEmailTemplate(type, title, body, profile.name)

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: profile.email,
        subject: emailContent.subject,
        html: emailContent.html
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${errorText}`)
    }

    // Mark notification as email sent
    if (notification_id) {
      await supabaseAdmin
        .from('notifications')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', notification_id)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email sending failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getEmailTemplate(type: string, title: string, body: string, userName: string) {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  `

  const templates: Record<string, { subject: string; html: string }> = {
    'signup': {
      subject: 'Welcome to Eye Portfolio',
      html: `
        <div style="${baseStyles}">
          <h1 style="color: #1e293b; margin-bottom: 16px;">Welcome ${userName}!</h1>
          <p style="color: #64748b; line-height: 1.6;">Your Eye Portfolio account has been successfully created.</p>
          <p style="color: #64748b; line-height: 1.6;">You can now start building your portfolio and tracking your training progress.</p>
          <a href="https://eyeportfolio.com" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">Open Portfolio</a>
        </div>
      `
    },
    'form_signed': {
      subject: title,
      html: `
        <div style="${baseStyles}">
          <h1 style="color: #1e293b; margin-bottom: 16px;">Form Signed Off</h1>
          <p style="color: #64748b; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #64748b; line-height: 1.6;">${body}</p>
          <a href="https://eyeportfolio.com" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">View in Portfolio</a>
        </div>
      `
    },
    'arcp_outcome': {
      subject: 'ARCP Outcome Received',
      html: `
        <div style="${baseStyles}">
          <h1 style="color: #1e293b; margin-bottom: 16px;">ARCP Outcome</h1>
          <p style="color: #64748b; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #64748b; line-height: 1.6;">${body}</p>
          <a href="https://eyeportfolio.com" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">View Outcome</a>
        </div>
      `
    },
    'arcp_broadcast': {
      subject: title,
      html: `
        <div style="${baseStyles}">
          <h1 style="color: #1e293b; margin-bottom: 16px;">${title}</h1>
          <p style="color: #64748b; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #64748b; line-height: 1.6;">${body}</p>
        </div>
      `
    },
    'msf_submitted': {
      subject: 'MSF Submitted for Review',
      html: `
        <div style="${baseStyles}">
          <h1 style="color: #1e293b; margin-bottom: 16px;">Multi-Source Feedback Review</h1>
          <p style="color: #64748b; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #64748b; line-height: 1.6;">${body}</p>
          <p style="color: #64748b; line-height: 1.6;">Please log in to review and sign off the feedback.</p>
          <a href="https://eyeportfolio.com" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600;">Review MSF</a>
        </div>
      `
    }
  }

  return templates[type] || {
    subject: title,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1e293b; margin-bottom: 16px;">${title}</h1>
        <p style="color: #64748b; line-height: 1.6;">${body}</p>
      </div>
    `
  }
}
