
-- Create new events table to store gira-specific settings
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date DATE NOT NULL UNIQUE,
  gira_text TEXT NOT NULL DEFAULT 'Gira de',
  header_text TEXT NOT NULL DEFAULT 'Lista de presença',
  event_time TEXT NOT NULL DEFAULT '19:30',
  registration_opens_at DATETIME NOT NULL,
  registration_closes_at DATETIME NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate current settings to events table
INSERT INTO events (
  event_date,
  gira_text,
  header_text,
  event_time,
  registration_opens_at,
  registration_closes_at,
  max_capacity,
  is_active
)
SELECT 
  (SELECT value FROM settings WHERE key = 'event_date'),
  (SELECT value FROM settings WHERE key = 'gira_text'),
  (SELECT value FROM settings WHERE key = 'header_text'),
  (SELECT value FROM settings WHERE key = 'event_time'),
  (SELECT value FROM settings WHERE key = 'registration_opens_at'),
  (SELECT value FROM settings WHERE key = 'registration_closes_at'),
  CAST((SELECT value FROM settings WHERE key = 'max_capacity') AS INTEGER),
  1;

-- Create index for faster lookups
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_active ON events(is_active);
