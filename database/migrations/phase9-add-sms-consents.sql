-- Phase 9: SMS consent records (proof of opt-in for carriers / TCPA)

CREATE TABLE IF NOT EXISTS sms_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  disclosure_text TEXT NOT NULL,
  -- 'verbal' = early users who opted in in person before the in-app checkbox existed
  source TEXT NOT NULL CHECK (source IN ('onboarding', 'profile', 'verbal'))
);

CREATE INDEX IF NOT EXISTS idx_sms_consents_user_consented
  ON sms_consents(user_id, consented_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_consents_phone
  ON sms_consents(phone_number);

-- RLS on with no policies: only the service role (API) can read/write
ALTER TABLE sms_consents ENABLE ROW LEVEL SECURITY;
