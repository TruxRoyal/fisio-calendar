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

	pacientes := []PacienteDetalle{}
	ids := []int64{}
	for filas.Next() {
		var d PacienteDetalle
		if err := escanearPaciente(filas, &d.Paciente); err != nil {
			return nil, fmt.Errorf("escanear paciente: %w", err)
		}
		d.AutorizacionesActivas = []AutorizacionResumen{}
		pacientes = append(pacientes, d)
		ids = append(ids, d.ID)
	}
	if err := filas.Err(); err != nil {
		return nil, err
	}

	if len(ids) == 0 {
		return pacientes, nil
	}

	activasPorPaciente, err := r.listarAutorizacionesActivasPorPacientes(ctx, ids)
	if err != nil {
		return nil, err
	}

	for i := range pacientes {
		activas := activasPorPaciente[pacientes[i].ID]
		if activas == nil {
			activas = []AutorizacionResumen{}
		}
		pacientes[i].AutorizacionesActivas = activas
		pacientes[i].TiposTerapia = calcularTiposTerapia(activas, pacientes[i].TipoTerapia)
	}

	return pacientes, nil
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

func (r *Repository) ListarAutorizacionesActivas(ctx context.Context, pacienteID int64) ([]AutorizacionResumen, error) {
	activasPorPaciente, err := r.listarAutorizacionesActivasPorPacientes(ctx, []int64{pacienteID})
	if err != nil {
		return nil, err
	}

	activas := activasPorPaciente[pacienteID]
	if activas == nil {
		activas = []AutorizacionResumen{}
	}
	return activas, nil
}

func (r *Repository) listarAutorizacionesActivasPorPacientes(ctx context.Context, pacienteIDs []int64) (map[int64][]AutorizacionResumen, error) {
	marcadores := make([]string, len(pacienteIDs))
	argumentos := make([]any, len(pacienteIDs))
	for i, id := range pacienteIDs {
		marcadores[i] = "?"
		argumentos[i] = id
	}

	consulta := fmt.Sprintf(`
		SELECT a.paciente_id, a.id, a.tipo_terapia, a.sesiones_totales, a.fecha_vencimiento, a.creado_en,
			(SELECT COUNT(*) FROM cita c WHERE c.autorizacion_id = a.id AND c.estado = 'atendida') AS sesiones_usadas
		FROM autorizacion a
		WHERE a.activa = 1 AND a.paciente_id IN (%s)
		ORDER BY a.paciente_id ASC, a.tipo_terapia ASC
	`, strings.Join(marcadores, ", "))

	filas, err := r.db.QueryContext(ctx, consulta, argumentos...)
	if err != nil {
		return nil, fmt.Errorf("listar autorizaciones activas: %w", err)
	}
	defer filas.Close()

	resultado := make(map[int64][]AutorizacionResumen)
	for filas.Next() {
		var pacienteID int64
		var resumen AutorizacionResumen
		if err := filas.Scan(
			&pacienteID, &resumen.ID, &resumen.TipoTerapia, &resumen.SesionesTotales,
			&resumen.FechaVencimiento, &resumen.CreadoEn, &resumen.SesionesUsadas,
		); err != nil {
			return nil, fmt.Errorf("escanear autorizacion activa: %w", err)
		}
		resumen.SesionesRestantes = resumen.SesionesTotales - resumen.SesionesUsadas
		resumen.Activa = true
		resultado[pacienteID] = append(resultado[pacienteID], resumen)
	}

	return resultado, filas.Err()
}

func calcularTiposTerapia(activas []AutorizacionResumen, tipoPreferido *string) []string {
	vistos := map[string]bool{}
	tipos := []string{}
	agregar := func(tipo string) {
		if tipo == "" || vistos[tipo] {
			return
		}
		vistos[tipo] = true
		tipos = append(tipos, tipo)
	}

	for _, a := range activas {
		agregar(a.TipoTerapia)
	}
	if tipoPreferido != nil {
		agregar(*tipoPreferido)
	}

	sort.Strings(tipos)
	return tipos
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

func (r *Repository) ObtenerResumenFinanciero(ctx context.Context, pacienteID int64, anioMes string) (facturado, copagosRecibidos int, porTipo []FinancieroTipo, err error) {
	consulta := `
		SELECT tipo_terapia, COALESCE(SUM(valor_sesion), 0), COALESCE(SUM(copago_cobrado), 0)
		FROM cita
		WHERE paciente_id = ? AND estado = 'atendida' AND strftime('%Y-%m', inicio) = ?
		GROUP BY tipo_terapia
		ORDER BY tipo_terapia ASC
	`

	filas, err := r.db.QueryContext(ctx, consulta, pacienteID, anioMes)
	if err != nil {
		return 0, 0, nil, fmt.Errorf("obtener resumen financiero del paciente: %w", err)
	}
	defer filas.Close()

	porTipo = []FinancieroTipo{}
	for filas.Next() {
		var fila FinancieroTipo
		if err := filas.Scan(&fila.TipoTerapia, &fila.Facturado, &fila.CopagosRecibidos); err != nil {
			return 0, 0, nil, fmt.Errorf("escanear resumen financiero por tipo: %w", err)
		}
		facturado += fila.Facturado
		copagosRecibidos += fila.CopagosRecibidos
		porTipo = append(porTipo, fila)
	}
	if err := filas.Err(); err != nil {
		return 0, 0, nil, err
	}

	return facturado, copagosRecibidos, porTipo, nil
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
