-- Add LIVE to media_type enum and migrate existing SHOW entries
ALTER TYPE media_type ADD VALUE IF NOT EXISTS 'LIVE';
UPDATE media_items SET media_type = 'LIVE' WHERE media_type = 'SHOW';
