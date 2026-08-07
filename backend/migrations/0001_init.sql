PRAGMA foreign_keys = ON;

CREATE TABLE paciente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    documento TEXT UNIQUE,
    telefono TEXT,
    diagnostico TEXT,
    eps TEXT,
    tipo_terapia TEXT CHECK (tipo_terapia IN ('respiratoria', 'fisica')),
    lat REAL,
    lng REAL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE autorizacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    numero TEXT,
    copago INTEGER NOT NULL DEFAULT 0,
    sesiones_totales INTEGER NOT NULL,
    fecha_vencimiento TEXT,
    activa INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    autorizacion_id INTEGER REFERENCES autorizacion(id) ON DELETE SET NULL,
    inicio TEXT NOT NULL,
    fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada', 'atendida', 'cancelada')),
    valor_sesion INTEGER,
    copago_cobrado INTEGER NOT NULL DEFAULT 0,
    notas TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (fin > inicio)
);

CREATE INDEX idx_cita_inicio ON cita(inicio);
CREATE INDEX idx_cita_paciente ON cita(paciente_id);
CREATE INDEX idx_autoriz_paciente ON autorizacion(paciente_id);
