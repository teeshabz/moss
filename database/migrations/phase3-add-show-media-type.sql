-- Add SHOW to media_type enum for TV shows
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'SHOW';
