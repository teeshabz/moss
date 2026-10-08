-- Phase 10: allow consent records from the public /sms opt-in page

ALTER TABLE sms_consents DROP CONSTRAINT IF EXISTS sms_consents_source_check;
ALTER TABLE sms_consents ADD CONSTRAINT sms_consents_source_check
  CHECK (source IN ('onboarding', 'profile', 'verbal', 'sms_page'));
