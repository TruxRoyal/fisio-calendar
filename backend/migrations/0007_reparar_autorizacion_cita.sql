UPDATE cita
SET autorizacion_id = (
  SELECT a.id FROM autorizacion a
  WHERE a.paciente_id = cita.paciente_id
    AND a.tipo_terapia = cita.tipo_terapia
    AND a.activa = 1
  LIMIT 1
)
WHERE estado = 'atendida'
  AND (
    autorizacion_id IS NULL
    OR autorizacion_id NOT IN (
      SELECT a.id FROM autorizacion a
      WHERE a.paciente_id = cita.paciente_id AND a.tipo_terapia = cita.tipo_terapia
    )
  );
