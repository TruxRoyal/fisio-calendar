package paciente

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
)

type Repository struct {
	db *sql.DB
}

func NuevoRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const columnasPaciente = `id, nombre, direccion, documento, telefono, diagnostico, eps, tipo_terapia, lat, lng, fecha_nacimiento, observaciones, color, origen, tarifa_sesion, creado_en, actualizado_en`

const columnasPacientePrefijadas = `p.id, p.nombre, p.direccion, p.documento, p.telefono, p.diagnostico, p.eps, p.tipo_terapia, p.lat, p.lng, p.fecha_nacimiento, p.observaciones, p.color, p.origen, p.tarifa_sesion, p.creado_en, p.actualizado_en`

func (r *Repository) Listar(ctx context.Context, busqueda, mes string) ([]PacienteDetalle, error) {
	consulta := fmt.Sprintf(`
		SELECT DISTINCT %s,
			a.id, a.sesiones_totales, a.fecha_vencimiento, a.creado_en,
			(SELECT COUNT(*) FROM cita c3 WHERE c3.autorizacion_id = a.id AND c3.estado = 'atendida')
		FROM paciente p
		LEFT JOIN autorizacion a ON a.id = (
			SELECT a2.id FROM autorizacion a2
			WHERE a2.paciente_id = p.id AND a2.activa = 1
			ORDER BY a2.creado_en DESC LIMIT 1
		)
	`, columnasPacientePrefijadas)
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

	pacientes := []PacienteDetalle{}
	for filas.Next() {
		var d PacienteDetalle
		var autorizacionID *int64
		var sesionesTotales *int
		var fechaVencimiento *string
		var autorizacionCreadoEn *string
		var sesionesUsadas int

		if err := filas.Scan(
			&d.ID, &d.Nombre, &d.Direccion, &d.Documento, &d.Telefono,
			&d.Diagnostico, &d.EPS, &d.TipoTerapia, &d.Lat, &d.Lng,
			&d.FechaNacimiento, &d.Observaciones, &d.Color,
			&d.Origen, &d.TarifaSesion,
			&d.CreadoEn, &d.ActualizadoEn,
			&autorizacionID, &sesionesTotales, &fechaVencimiento, &autorizacionCreadoEn, &sesionesUsadas,
		); err != nil {
			return nil, fmt.Errorf("escanear paciente: %w", err)
		}

		if autorizacionID != nil {
			d.AutorizacionActiva = &AutorizacionResumen{
				ID:                *autorizacionID,
				SesionesTotales:   *sesionesTotales,
				SesionesUsadas:    sesionesUsadas,
				SesionesRestantes: *sesionesTotales - sesionesUsadas,
				FechaVencimiento:  fechaVencimiento,
				CreadoEn:          *autorizacionCreadoEn,
				Activa:            true,
			}
		}

		pacientes = append(pacientes, d)
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
		INSERT INTO paciente (nombre, direccion, documento, telefono, diagnostico, eps, tipo_terapia, lat, lng, fecha_nacimiento, observaciones, color, origen, tarifa_sesion)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	resultado, err := r.db.ExecContext(ctx, consulta,
		solicitud.Nombre, solicitud.Direccion, solicitud.Documento, solicitud.Telefono,
		solicitud.Diagnostico, solicitud.EPS, solicitud.TipoTerapia, solicitud.Lat, solicitud.Lng,
		solicitud.FechaNacimiento, solicitud.Observaciones, solicitud.Color,
		solicitud.Origen, solicitud.TarifaSesion,
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
			eps = ?, tipo_terapia = ?, lat = ?, lng = ?,
			fecha_nacimiento = ?, observaciones = ?, color = ?,
			origen = ?, tarifa_sesion = ?, actualizado_en = datetime('now')
		WHERE id = ?
	`

	_, err := r.db.ExecContext(ctx, consulta,
		solicitud.Nombre, solicitud.Direccion, solicitud.Documento, solicitud.Telefono,
		solicitud.Diagnostico, solicitud.EPS, solicitud.TipoTerapia, solicitud.Lat, solicitud.Lng,
		solicitud.FechaNacimiento, solicitud.Observaciones, solicitud.Color,
		solicitud.Origen, solicitud.TarifaSesion, id,
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

func (r *Repository) ObtenerCronologia(ctx context.Context, pacienteID int64) ([]EventoCronologia, error) {
	eventosCitas, err := r.eventosDeCitas(ctx, pacienteID)
	if err != nil {
		return nil, err
	}

	eventosAutorizaciones, err := r.eventosDeAutorizaciones(ctx, pacienteID)
	if err != nil {
		return nil, err
	}

	eventos := append(eventosCitas, eventosAutorizaciones...)
	sort.Slice(eventos, func(i, j int) bool { return eventos[i].Fecha > eventos[j].Fecha })

	return eventos, nil
}

func (r *Repository) eventosDeCitas(ctx context.Context, pacienteID int64) ([]EventoCronologia, error) {
	filas, err := r.db.QueryContext(ctx, `
		SELECT inicio, estado, valor_sesion, copago_cobrado, notas
		FROM cita
		WHERE paciente_id = ? AND estado != 'agendada'
		ORDER BY inicio DESC
	`, pacienteID)
	if err != nil {
		return nil, fmt.Errorf("listar citas para cronologia: %w", err)
	}
	defer filas.Close()

	eventos := []EventoCronologia{}
	for filas.Next() {
		var inicio, estado string
		var valorSesion, copagoCobrado *int
		var notas *string
		if err := filas.Scan(&inicio, &estado, &valorSesion, &copagoCobrado, &notas); err != nil {
			return nil, fmt.Errorf("escanear cita para cronologia: %w", err)
		}

		switch estado {
		case "atendida":
			eventos = append(eventos, EventoCronologia{Tipo: "sesion_atendida", Fecha: inicio, Titulo: "Sesión atendida", Detalle: notas, Monto: valorSesion})
			if copagoCobrado != nil && *copagoCobrado > 0 {
				eventos = append(eventos, EventoCronologia{Tipo: "copago", Fecha: inicio, Titulo: "Copago recibido", Monto: copagoCobrado})
			}
		case "cancelada":
			eventos = append(eventos, EventoCronologia{Tipo: "sesion_cancelada", Fecha: inicio, Titulo: "Sesión cancelada", Detalle: notas})
		}
	}

	return eventos, filas.Err()
}

func (r *Repository) eventosDeAutorizaciones(ctx context.Context, pacienteID int64) ([]EventoCronologia, error) {
	filas, err := r.db.QueryContext(ctx, `
		SELECT creado_en, sesiones_totales, fecha_vencimiento
		FROM autorizacion
		WHERE paciente_id = ?
		ORDER BY creado_en DESC
	`, pacienteID)
	if err != nil {
		return nil, fmt.Errorf("listar autorizaciones para cronologia: %w", err)
	}
	defer filas.Close()

	eventos := []EventoCronologia{}
	for filas.Next() {
		var creadoEn string
		var sesionesTotales int
		var fechaVencimiento *string
		if err := filas.Scan(&creadoEn, &sesionesTotales, &fechaVencimiento); err != nil {
			return nil, fmt.Errorf("escanear autorizacion para cronologia: %w", err)
		}
		creadoEn = strings.Replace(creadoEn, " ", "T", 1)

		detalle := "Sin fecha de vencimiento"
		if fechaVencimiento != nil {
			detalle = fmt.Sprintf("Vence %s", *fechaVencimiento)
		}
		eventos = append(eventos, EventoCronologia{
			Tipo:    "autorizacion",
			Fecha:   creadoEn,
			Titulo:  fmt.Sprintf("Autorización de %d sesiones", sesionesTotales),
			Detalle: &detalle,
		})
	}

	return eventos, filas.Err()
}

func (r *Repository) ObtenerResumenFinanciero(ctx context.Context, pacienteID int64, anioMes string) (facturado, copagosRecibidos int, err error) {
	consulta := `
		SELECT COALESCE(SUM(valor_sesion), 0), COALESCE(SUM(copago_cobrado), 0)
		FROM cita
		WHERE paciente_id = ? AND estado = 'atendida' AND strftime('%Y-%m', inicio) = ?
	`

	err = r.db.QueryRowContext(ctx, consulta, pacienteID, anioMes).Scan(&facturado, &copagosRecibidos)
	if err != nil {
		return 0, 0, fmt.Errorf("obtener resumen financiero del paciente: %w", err)
	}

	return facturado, copagosRecibidos, nil
}

type escaneable interface {
	Scan(dest ...any) error
}

func escanearPaciente(fila escaneable, p *Paciente) error {
	return fila.Scan(
		&p.ID, &p.Nombre, &p.Direccion, &p.Documento, &p.Telefono,
		&p.Diagnostico, &p.EPS, &p.TipoTerapia, &p.Lat, &p.Lng,
		&p.FechaNacimiento, &p.Observaciones, &p.Color,
		&p.Origen, &p.TarifaSesion,
		&p.CreadoEn, &p.ActualizadoEn,
	)
}
