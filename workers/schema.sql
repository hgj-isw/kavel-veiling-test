-- D1 schema: kavels, biedingen, allowlist, sessions
-- Privacy: publieke /api/stand geeft nooit e-mail/namen terug.

CREATE TABLE IF NOT EXISTS allowlist (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kavels (
  id TEXT PRIMARY KEY,
  titel TEXT NOT NULL,
  omschrijving TEXT NOT NULL DEFAULT '',
  start_bedrag REAL NOT NULL,
  stap_grootte REAL NOT NULL,
  actief INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biedingen (
  id TEXT PRIMARY KEY,
  kavel_id TEXT NOT NULL,
  bedrag REAL NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  tijdstip TEXT NOT NULL,
  FOREIGN KEY (kavel_id) REFERENCES kavels(id)
);

CREATE INDEX IF NOT EXISTS idx_biedingen_kavel ON biedingen(kavel_id);
CREATE INDEX IF NOT EXISTS idx_biedingen_email ON biedingen(email);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
