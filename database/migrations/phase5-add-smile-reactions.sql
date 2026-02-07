-- Phase 5: Smile reactions and pings

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'smile',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT post_reactions_type_check CHECK (reaction_type = 'smile'),
  PRIMARY KEY (user_id, post_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_created
  ON post_reactions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_created
  ON post_reactions(user_id, created_at DESC);

-- Create pings table
CREATE TABLE IF NOT EXISTS pings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'smile',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  seen_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT pings_type_check CHECK (type = 'smile')
);

CREATE INDEX IF NOT EXISTS idx_pings_recipient_created
  ON pings(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_recipient_unseen
  ON pings(recipient_user_id)
  WHERE seen_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pings_unique_smile
  ON pings(recipient_user_id, actor_user_id, post_id, type);

-- Enable RLS (API uses service role; policies can be added later)
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
