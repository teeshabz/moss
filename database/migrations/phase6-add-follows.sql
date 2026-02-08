-- Phase 6: User follows

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_created
  ON follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following_created
  ON follows(following_id, created_at DESC);

-- Enable RLS (API uses service role; policies can be added later)
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone" ON follows
  FOR SELECT USING (true);
