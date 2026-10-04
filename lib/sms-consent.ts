export const SMS_CONSENT_LABEL = 'text me my weekly nudge'

export const SMS_CONSENT_DISCLOSURE =
  'Get a weekly text reminder to share what moved you, plus occasional account updates. Msg frequency: approx. 1/week. Msg & data rates may apply. Reply STOP to cancel.'

/** Everything shown next to the checkbox, stored verbatim on each consent record. */
export const SMS_CONSENT_FULL_TEXT = `${SMS_CONSENT_LABEL}. ${SMS_CONSENT_DISCLOSURE} Terms · Privacy Policy`

export type SmsConsentSource = 'onboarding' | 'profile' | 'verbal'
