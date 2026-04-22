-- Run this migration on your PostgreSQL `miniapp` database

CREATE TABLE IF NOT EXISTS ai_models (
  model_id     SERIAL PRIMARY KEY,
  filename     VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  notes        TEXT,
  uploaded_at  TIMESTAMP DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT FALSE
);
