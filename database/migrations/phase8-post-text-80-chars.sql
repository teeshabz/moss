-- Relax post_notes length to match share/post caption limits (80 chars).
ALTER TABLE post_notes DROP CONSTRAINT IF EXISTS post_notes_text_length;
ALTER TABLE post_notes ADD CONSTRAINT post_notes_text_length
  CHECK (char_length(text) >= 1 AND char_length(text) <= 80);
