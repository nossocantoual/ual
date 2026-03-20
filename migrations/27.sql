
CREATE TABLE pade_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pade_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pade_event_id INTEGER NOT NULL,
  participant_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pade_participants_event ON pade_participants(pade_event_id);
CREATE INDEX idx_pade_events_date ON pade_events(event_date);
