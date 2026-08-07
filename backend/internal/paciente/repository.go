package paciente

import (
	"context"
	"database/sql"
	"fmt"
)

type Repository struct {
	db *sql.DB
}

func NuevoRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const columnasPaciente = `id, nombre, direccion, documento, telefono, diagnostico, eps, tipo_terapia, lat, lng, creado_en, actualizado_en`

const columnasPacientePrefijadas = `p.id, p.nombre, p.direccion, p.documento, p.telefono, p.diagnostico, p.eps, p.tipo_terapia, p.lat, p.lng, p.creado_en, p.actualizado_en`

func (r *Repository) Listar(ctx context.Context, busqueda, mes string) ([]Paciente, error) {
	consulta := fmt.Sprintf(`SELECT DISTINCT %s FROM paciente p`, columnasPacientePrefijadas)
	condiciones := []string{}
	argumentos := []any{}

	if mes != "" {
		consulta += ` JOIN cita c ON c.paciente_id = p.id`
		condiciones = append(condiciones, `strftime('%Y-%m', c.inicio) = ?`)
		argumentos = append(argumentos, mes)
	}

	if busqueda != "" {
		condiciones = append(condiciones, `(p.nombre LIKE ? OR p.documento LIKE ?)`)
		comodin := "%" + busqueda + "%"
		argumentos = append(argumentos, comodin, comodin)
	}

	if len(condiciones) > 0 {
		consulta += " WHERE "
		for i, condicion := range condiciones {
			if i > 0 {
				consulta += " AND "
			}
			consulta += condicion
		}
	}

	consulta += " ORDER BY p.nombre ASC"

	filas, err := r.db.QueryContext(ctx, consulta, argumentos...)
	if err != nil {
		return nil, fmt.Errorf("listar pacientes: %w", err)
	}
	defer filas.Close()

	pacientes := []Paciente{}
	for filas.Next() {
		var p Paciente
		if err := escanearPaciente(filas, &p); err != nil {
			return nil, fmt.Errorf("escanear paciente: %w", err)
		}
		pacientes = append(pacientes, p)
	}

	return pacientes, filas.Err()
}

func (r *Repository) ObtenerPorID(ctx context.Context, id int64) (*Paciente, error) {
	consulta := fmt.Sprintf(`SELECT %s FROM paciente WHERE id = ?`, columnasPaciente)
	fila := r.db.QueryRowContext(ctx, consulta, id)

	var p Paciente
	if err := escanearPaciente(fila, &p); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener paciente: %w", err)
	}

	return &p, nil
}

func (r *Repository) ObtenerAutorizacionActiva(ctx context.Context, pacienteID int64) (*AutorizacionResumen, error) {
	consulta := `
		SELECT a.id, a.sesiones_totales, a.fecha_vencimiento, a.activa,
			(SELECT COUNT(*) FROM cita c WHERE c.autorizacion_id = a.id AND c.estado = 'atendida') AS sesiones_usadas
		FROM autorizacion a
		WHERE a.paciente_id = ? AND a.activa = 1
		ORDER BY a.creado_en DESC
		LIMIT 1
	`

	fila := r.db.QueryRowContext(ctx, consulta, pacienteID)

	var resumen AutorizacionResumen
	var activa int
	if err := fila.Scan(&resumen.ID, &resumen.SesionesTotales, &resumen.FechaVencimiento, &activa, &resumen.SesionesUsadas); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener autorizacion activa: %w", err)
	}

	resumen.Activa = activa == 1
	resumen.SesionesRestantes = resumen.SesionesTotales - resumen.SesionesUsadas

	return &resumen, nil
}

func (r *Repository) Crear(ctx context.Context, solicitud SolicitudCrearPaciente) (*Paciente, error) {
	consulta := `
		INSERT INTO paciente (nombre, direccion, documento, telefono, diagnostico, eps, tipo_terapia, lat, lng)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	resultado, err := r.db.ExecContext(ctx, consulta,
		solicitud.Nombre, solicitud.Direccion, solicitud.Documento, solicitud.Telefono,
		solicitud.Diagnostico, solicitud.EPS, solicitud.TipoTerapia, solicitud.Lat, solicitud.Lng,
	)
	if err != nil {
		return nil, fmt.Errorf("crear paciente: %w", err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("obtener id de paciente creado: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarPaciente) (*Paciente, error) {
	consulta := `
		UPDATE paciente
		SET nombre = ?, direccion = ?, documento = ?, telefono = ?, diagnostico = ?,
			eps = ?, tipo_terapia = ?, lat = ?, lng = ?, actualizado_en = datetime('now')
		WHERE id = ?
	`

	_, err := r.db.ExecContext(ctx, consulta,
		solicitud.Nombre, solicitud.Direccion, solicitud.Documento, solicitud.Telefono,
		solicitud.Diagnostico, solicitud.EPS, solicitud.TipoTerapia, solicitud.Lat, solicitud.Lng, id,
	)
	if err != nil {
		return nil, fmt.Errorf("actualizar paciente: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Eliminar(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM paciente WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("eliminar paciente: %w", err)
	}
	return nil
}

type escaneable interface {
	Scan(dest ...any) error
}

func escanearPaciente(fila escaneable, p *Paciente) error {
	return fila.Scan(
		&p.ID, &p.Nombre, &p.Direccion, &p.Documento, &p.Telefono,
		&p.Diagnostico, &p.EPS, &p.TipoTerapia, &p.Lat, &p.Lng,
		&p.CreadoEn, &p.ActualizadoEn,
	)
}

