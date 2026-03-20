
-- Add new datetime fields for registration opening and closing
INSERT OR IGNORE INTO settings (key, value) VALUES ('event_date', date('now'));
INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_opens_at', datetime('now'));
INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_closes_at', datetime('now', '+7 days'));

-- Migrate existing data if available
UPDATE settings SET value = (SELECT value FROM settings WHERE key = 'event_start_date') WHERE key = 'event_date' AND EXISTS (SELECT 1 FROM settings WHERE key = 'event_start_date');
