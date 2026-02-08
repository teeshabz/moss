-- Phase 7: Follow pings

-- Allow pings without a post (for follow notifications)
ALTER TABLE pings ALTER COLUMN post_id DROP NOT NULL;

-- Expand ping type constraint to include follow
ALTER TABLE pings DROP CONSTRAINT IF EXISTS pings_type_check;
ALTER TABLE pings ADD CONSTRAINT pings_type_check CHECK (type IN ('smile', 'note', 'follow'));

-- Ensure unique follow ping per actor/recipient
CREATE UNIQUE INDEX IF NOT EXISTS idx_pings_unique_follow
  ON pings(recipient_user_id, actor_user_id, type)
  WHERE type = 'follow';
