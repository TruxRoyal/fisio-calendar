ALTER TABLE paciente ADD COLUMN origen TEXT NOT NULL DEFAULT 'trabajo' CHECK (origen IN ('trabajo', 'extra'));
ALTER TABLE paciente ADD COLUMN tarifa_sesion INTEGER;
