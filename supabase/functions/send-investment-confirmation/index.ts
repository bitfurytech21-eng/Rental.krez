/**
 * Supabase Edge Function: send-investment-confirmation
 * 
 * Sends an automated confirmation email to the investor via Resend
 * whenever a new investment entry is recorded in the database ledger.
 * Supports both direct client invocations and Supabase Database Webhooks (INSERT on investments table).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Handle Supabase Database Webhook payload format ({ type: 'INSERT', table: 'investments', record: { ... } })
    let investmentData = payload.record || payload

    let email = investmentData.email
    let fullName = investmentData.fullName || investmentData.full_name
    let propertyTitle = investmentData.propertyTitle || investmentData.property_title
    let propertyLocation = investmentData.propertyLocation || investmentData.property_location
    let tokensPurchased = investmentData.tokensPurchased || investmentData.tokens_purchased
    let totalAmountInvested = investmentData.totalAmountInvested || investmentData.total_amount_invested
    let certificateId = investmentData.certificateId || investmentData.certificate_id
    let transactionHash = investmentData.transactionHash || investmentData.transaction_hash
    let purchasedAt = investmentData.purchasedAt || investmentData.purchased_at

    // If triggered via Database Webhook and user email is missing from record, fetch user profile & email via Admin client
    const userId = investmentData.userId || investmentData.user_id
    if ((!email || !fullName) && userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (profile) {
        email = email || profile.email
        fullName = fullName || profile.full_name
      }
    }

    if (!email || !propertyTitle) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: email or propertyTitle' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY environment variable is not configured in Supabase Edge Function secrets.')
      return new Response(JSON.stringify({ 
        success: true, 
        warning: 'Email provider API key not configured, simulation mode active.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Kretz Investor Relations <investors@kretz.com>',
        to: [email],
        subject: `Investment Confirmed: ${tokensPurchased} tokens in ${propertyTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F6F7F4; padding: 20px; border-radius: 12px;">
            <h2 style="color: #182D2A; margin-bottom: 4px;">Investment Confirmation</h2>
            <p style="color: #69736F; font-size: 14px;">Kretz Institutional Real Estate & Asset Tokenization</p>
            
            <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #E3E8E3; margin-top: 16px;">
              <p style="font-size: 14px; color: #18211F;">Dear <strong>${fullName || 'Valued Investor'}</strong>,</p>
              <p style="font-size: 14px; color: #18211F;">Your investment transaction has been successfully recorded in the immutable database ledger and SPV ownership register.</p>
              
              <div style="background: #F6F7F4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 13px;"><strong>Property:</strong> ${propertyTitle}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Location:</strong> ${propertyLocation || 'European Prime Asset'}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Tokens Acquired:</strong> ${tokensPurchased}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Total Amount:</strong> €${Number(totalAmountInvested || 0).toLocaleString()} EUR</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Certificate ID:</strong> ${certificateId || 'CERT-REG-SECURE'}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Polygon Tx Hash:</strong> ${transactionHash || '0x-ledger-recorded'}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Timestamp:</strong> ${purchasedAt || new Date().toISOString()}</p>
              </div>

              <p style="font-size: 12px; color: #69736F;">You can view your portfolio, ownership certificates, and automated monthly rental dividend distributions anytime in your Kretz Investor Dashboard.</p>
            </div>
            <p style="text-align: center; color: #828D89; font-size: 11px; margin-top: 20px;">© 2026 Kretz Real Estate S.L. · Paseo de la Castellana 95, Madrid</p>
          </div>
        `,
      }),
    })

    const data = await emailResponse.json()

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
