
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL,
  registration_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registrations_week ON registrations(week_start_date);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_user ON registrations(user_id);
