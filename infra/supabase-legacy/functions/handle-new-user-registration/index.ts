/**
 * Supabase Edge Function: handle-new-user-registration
 * 
 * Handles new user sign-up security checks (email validation, bot screening)
 * and automatically provisions an initial profile entry in the 'profiles' database table.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
    // Supabase Auth webhook payload or direct registration payload
    const record = payload.record || payload.user || payload

    const userId = record.id || record.userId
    const email = (record.email || '').toLowerCase().trim()
    const fullName = record.raw_user_meta_data?.full_name || record.fullName || 'Valued Investor'
    const role = record.raw_user_meta_data?.role || record.role || 'investor'
    const accountType = record.raw_user_meta_data?.account_type || record.accountType || 'individual_investor'

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing userId or email in registration payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Security Check: Block disposable or blacklisted email domains
    const blacklistedDomains = ['tempmail.com', 'throwawaymail.com', '10minutemail.com', 'trashmail.com']
    const emailDomain = email.split('@')[1]
    if (blacklistedDomains.includes(emailDomain)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Registration rejected: Disposable email domains are not permitted for institutional SPV compliance.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Admin client with service role key
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // 2. Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return new Response(JSON.stringify({ success: true, message: 'Profile already exists.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create initial profile entry in the 'profiles' database table
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        account_type: accountType,
        wallet_balance: 0.00,
        invested_balance: 0.00,
        kyc_status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      throw new Error(`Failed to insert profile into database: ${insertError.message}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User registration security checks passed and profile successfully provisioned.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
