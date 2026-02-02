-- Moss Database Schema
-- Run this in Supabase SQL Editor to create all tables.
-- Identity: users.id = Clerk user id (set by app). RLS does not use auth.uid();
-- API uses service role and enforces "current user" in application code.

-- Create users table (id = Clerk user id; set by app on insert)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_color TEXT, -- hex color, e.g. "#E07C54"
  phone_number TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'), -- no spaces, alphanumeric + underscore
  CONSTRAINT reserved_usernames CHECK (username NOT IN ('moss', 'api', 'admin', 'support'))
);

-- Create media_items table
CREATE TYPE media_type AS ENUM ('BOOK', 'MOVIE', 'PODCAST', 'SONG', 'ALBUM', 'ARTICLE');

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  media_type media_type NOT NULL,
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  external_url TEXT,
  cover_url TEXT,
  source TEXT, -- e.g. "google_books"
  source_id TEXT, -- e.g. Google Books volume ID
  metadata JSONB, -- flexible JSON for integration-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for source + source_id (only when both are not null)
  CONSTRAINT unique_source_id UNIQUE NULLS NOT DISTINCT (source, source_id)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_item FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_source ON media_items(source, source_id) WHERE source IS NOT NULL;

-- Create saves table for post saves
CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Index for listing saved posts per user
CREATE INDEX IF NOT EXISTS idx_saves_user_created ON saves(user_id, created_at DESC);

-- Enable Row Level Security (RLS) - we'll configure policies later
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- RLS: Auth is via Clerk; API uses service role (bypasses RLS) and enforces "current user" in code.
-- No auth.uid() policies; public SELECT only where needed.
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Media items are viewable by everyone" ON media_items FOR SELECT USING (true);
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
-- saves: no per-user policies; API uses service role and filters by Clerk userId

-- Migration for existing projects: add profile columns if users table already exists:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
-- For Phase 1 (Clerk): run database/migrations/phase1-clerk-rls.sql to drop auth.uid() policies and default on users.id.
