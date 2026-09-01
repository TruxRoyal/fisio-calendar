ALTER TABLE autorizacion ADD COLUMN tipo_terapia TEXT NOT NULL DEFAULT 'fisica' CHECK (tipo_terapia IN ('respiratoria', 'fisica'));

UPDATE autorizacion
SET tipo_terapia = (SELECT p.tipo_terapia FROM paciente p WHERE p.id = autorizacion.paciente_id)
WHERE EXISTS (SELECT 1 FROM paciente p WHERE p.id = autorizacion.paciente_id AND p.tipo_terapia IS NOT NULL);

UPDATE autorizacion
SET activa = 0
WHERE activa = 1
  AND id <> (
    SELECT a2.id FROM autorizacion a2
    WHERE a2.activa = 1
      AND a2.paciente_id = autorizacion.paciente_id
      AND a2.tipo_terapia = autorizacion.tipo_terapia
    ORDER BY a2.creado_en DESC, a2.id DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX idx_autoriz_activa_por_tipo ON autorizacion(paciente_id, tipo_terapia) WHERE activa = 1;
