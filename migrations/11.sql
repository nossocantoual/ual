
-- Add normalized_username column for case and accent insensitive login
ALTER TABLE admin_users ADD COLUMN normalized_username TEXT;

-- Populate normalized_username for existing users
-- This will be lowercase without accents
UPDATE admin_users SET normalized_username = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(username, 'á', 'a'), 'à', 'a'), 'â', 'a'), 'ã', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'õ', 'o'), 'ú', 'u'), 'ü', 'u'), 'ç', 'c'), 'Á', 'a'));

-- Create index for faster lookups
CREATE INDEX idx_admin_users_normalized_username ON admin_users(normalized_username);
