
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value) VALUES 
  ('weekly_day', '1'),
  ('opening_time', '09:00'),
  ('closing_time', '21:00'),
  ('max_capacity', '30'),
  ('header_text', 'Lista de presença - Nosso Canto de Umbanda Amor e Luz');
