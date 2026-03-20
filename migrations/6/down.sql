
-- Remove new datetime fields
DELETE FROM settings WHERE key = 'event_date';
DELETE FROM settings WHERE key = 'registration_opens_at';
DELETE FROM settings WHERE key = 'registration_closes_at';
