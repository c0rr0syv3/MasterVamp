-- ============================================================
-- schema_d1.sql — Vampiro: A Máscara
-- SQLite / Cloudflare D1
-- Execute com: wrangler d1 execute VTM_DB --file=schema_d1.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS utilizadores (
  id        INTEGER  PRIMARY KEY AUTOINCREMENT,
  username  TEXT     NOT NULL UNIQUE,
  password  TEXT     NOT NULL,
  is_master INTEGER  NOT NULL DEFAULT 0,
  criado_em TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personagens (
  id              TEXT     PRIMARY KEY,
  owner_id        INTEGER  NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  nome            TEXT     NOT NULL DEFAULT 'Desconhecido',
  foto_url        TEXT     NOT NULL DEFAULT '',
  saude_atual     TEXT     NOT NULL DEFAULT 'OK',
  pontos_sangue   INTEGER  NOT NULL DEFAULT 0,
  dados_completos TEXT     NOT NULL DEFAULT '{}',
  criado_em       TEXT     NOT NULL DEFAULT (datetime('now')),
  atualizado_em   TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mesas (
  id              TEXT     PRIMARY KEY,
  owner_id        INTEGER  NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  nome            TEXT     NOT NULL DEFAULT 'Mesa sem nome',
  max_jogadores   INTEGER  NOT NULL DEFAULT 4,
  prefs           TEXT     DEFAULT '',
  dados_completos TEXT     NOT NULL DEFAULT '{}',
  criada_em       TEXT     NOT NULL DEFAULT (datetime('now')),
  atualizada_em   TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_personagens_owner ON personagens(owner_id);
CREATE INDEX IF NOT EXISTS idx_mesas_owner       ON mesas(owner_id);
