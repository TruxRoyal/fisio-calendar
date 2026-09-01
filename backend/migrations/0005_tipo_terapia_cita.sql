ALTER TABLE cita ADD COLUMN tipo_terapia TEXT NOT NULL DEFAULT 'fisica' CHECK (tipo_terapia IN ('respiratoria', 'fisica'));

UPDATE cita
SET tipo_terapia = (SELECT p.tipo_terapia FROM paciente p WHERE p.id = cita.paciente_id)
WHERE EXISTS (SELECT 1 FROM paciente p WHERE p.id = cita.paciente_id AND p.tipo_terapia IS NOT NULL);

CREATE INDEX idx_cita_tipo_terapia ON cita(tipo_terapia);
