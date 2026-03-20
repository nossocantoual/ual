
CREATE TABLE recess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  image_url TEXT,
  theme_mode TEXT DEFAULT 'auto',
  theme_color_1 TEXT,
  theme_color_2 TEXT,
  is_active BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recess_dates ON recess(start_date, end_date);
CREATE INDEX idx_recess_active ON recess(is_active);
