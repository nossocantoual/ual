
CREATE TABLE attendance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_week ON attendance_history(week_start_date);
CREATE INDEX idx_history_user ON attendance_history(user_id);
