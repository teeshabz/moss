export const SMS_CONSENT_LABEL = 'text me my weekly nudge'

export const SMS_CONSENT_DISCLOSURE =
  'Get a weekly text reminder from Moss to share what moved you. Msg frequency: approx. 1/week. Msg & data rates may apply. Reply STOP to cancel, HELP for help.'

/** Everything shown next to the checkbox, stored verbatim on each consent record. */
export const SMS_CONSENT_FULL_TEXT = `${SMS_CONSENT_LABEL}. ${SMS_CONSENT_DISCLOSURE} Terms · Privacy Policy`

export type SmsConsentSource = 'onboarding' | 'profile' | 'verbal' | 'sms_page'
