CREATE TABLE usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'fisio' CHECK (rol IN ('paciente', 'fisio', 'admin')),
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE refresh_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    familia_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expira_en TEXT NOT NULL,
    revocado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_refresh_token_familia ON refresh_token(familia_id);
CREATE INDEX idx_refresh_token_usuario ON refresh_token(usuario_id);
