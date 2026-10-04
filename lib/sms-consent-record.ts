import type { SupabaseClient } from '@supabase/supabase-js'
import { SMS_CONSENT_FULL_TEXT, type SmsConsentSource } from '@/lib/sms-consent'

/**
 * Save proof of SMS opt-in. If the record can't be saved, the user is opted
 * back out: we must never text a number without a consent record.
 * Returns whether the user is still opted in.
 */
export async function recordSmsConsent(
  supabaseAdmin: SupabaseClient,
  userId: string,
  phoneNumber: string,
  source: SmsConsentSource
): Promise<boolean> {
  const { error } = await supabaseAdmin.from('sms_consents').insert({
    user_id: userId,
    phone_number: phoneNumber,
    consented_at: new Date().toISOString(),
    disclosure_text: SMS_CONSENT_FULL_TEXT,
    source,
  })

  if (!error) return true

  console.error('Error saving SMS consent record:', error)
  await supabaseAdmin.from('users').update({ sms_opt_in: false }).eq('id', userId)
  return false
}
