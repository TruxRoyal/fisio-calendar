-- Datos 100% ficticios para desarrollo local. Ningun nombre, documento, telefono
-- o direccion corresponde a una persona o domicilio real.
INSERT INTO paciente (nombre, direccion, documento, telefono, diagnostico, eps, tipo_terapia, lat, lng)
VALUES
    ('Paciente de Prueba Uno', 'Suba, Bogota (direccion de ejemplo)', 'TEST-000001', '3000000001', 'Diagnostico respiratorio de ejemplo', 'EPS de ejemplo', 'respiratoria', 4.7431, -74.0937),
    ('Paciente de Prueba Dos', 'Suba, Bogota (direccion de ejemplo)', 'TEST-000002', '3000000002', 'Diagnostico de rehabilitacion fisica de ejemplo', 'EPS de ejemplo', 'fisica', 4.7465, -74.0891);

INSERT INTO autorizacion (paciente_id, numero, copago, sesiones_totales, fecha_vencimiento, activa)
VALUES
    (1, 'AUT-EJEMPLO-0001', 1000, 20, '2026-09-15', 1),
    (2, 'AUT-EJEMPLO-0002', 1000, 15, '2026-08-20', 1);

INSERT INTO cita (paciente_id, autorizacion_id, inicio, fin, estado, valor_sesion, copago_cobrado, notas)
VALUES
    (1, 1, '2026-08-03T08:00:00', '2026-08-03T08:30:00', 'atendida', 23500, 1000, 'Nota de ejemplo'),
    (2, 2, '2026-08-03T09:00:00', '2026-08-03T10:00:00', 'atendida', 23500, 1000, 'Nota de ejemplo'),
    (1, 1, '2026-08-05T08:00:00', '2026-08-05T08:30:00', 'atendida', 23500, 1000, NULL),
    (2, 2, '2026-08-06T09:00:00', '2026-08-06T10:00:00', 'cancelada', NULL, 0, 'Cancelada por ejemplo'),
    (1, 1, '2026-08-10T08:00:00', '2026-08-10T08:30:00', 'agendada', NULL, 0, NULL),
    (2, 2, '2026-08-10T09:00:00', '2026-08-10T10:00:00', 'agendada', NULL, 0, NULL);
