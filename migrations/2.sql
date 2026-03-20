
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL UNIQUE,
  times_invited INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT 0,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_whatsapp ON users(whatsapp);
CREATE INDEX idx_users_blocked ON users(is_blocked, blocked_until);
