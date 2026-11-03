-- Rebuild the CHECK constraint while preserving all existing accounts.
CREATE TABLE users_with_developer (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'chef', 'developer')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users_with_developer (id, username, password_hash, role, active, created_at, updated_at)
SELECT id, username, password_hash, role, active, created_at, updated_at FROM users;
DROP TABLE users;
ALTER TABLE users_with_developer RENAME TO users;
-- Only one developer account is supported. Bootstrap credentials are server secrets.
CREATE UNIQUE INDEX users_single_developer ON users(role) WHERE role = 'developer';
