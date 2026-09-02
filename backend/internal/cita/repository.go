package cita

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

const consultaBase = `
	SELECT
		c.id, c.paciente_id, c.autorizacion_id, c.tipo_terapia, c.inicio, c.fin, c.estado,
		c.valor_sesion, c.copago_cobrado, c.notas, c.creado_en, c.actualizado_en,
		p.id, p.nombre, p.direccion, p.tipo_terapia, p.color
	FROM cita c
	JOIN paciente p ON p.id = c.paciente_id
`

func (r *Repository) ListarPorRango(ctx context.Context, desde, hasta string) ([]Cita, error) {
	consulta := consultaBase + " WHERE date(c.inicio) BETWEEN ? AND ? ORDER BY c.inicio ASC"

	filas, err := r.db.QueryContext(ctx, consulta, desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("listar citas: %w", err)
	}
	defer filas.Close()

	citas := []Cita{}
	for filas.Next() {
		var c Cita
		if err := escanearCita(filas, &c); err != nil {
			return nil, fmt.Errorf("escanear cita: %w", err)
		}
		citas = append(citas, c)
	}

	return citas, filas.Err()
}

func (r *Repository) ObtenerPorID(ctx context.Context, id int64) (*Cita, error) {
	consulta := consultaBase + " WHERE c.id = ?"

	var c Cita
	if err := escanearCita(r.db.QueryRowContext(ctx, consulta, id), &c); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener cita: %w", err)
	}

	return &c, nil
}

func (r *Repository) ExisteChoque(ctx context.Context, inicio, fin string, excluirCitaID *int64) (*Conflicto, error) {
	consulta := `
		SELECT id, inicio, fin FROM cita
		WHERE estado != 'cancelada' AND inicio < ? AND fin > ?
	`
	argumentos := []any{fin, inicio}

	if excluirCitaID != nil {
		consulta += " AND id != ?"
		argumentos = append(argumentos, *excluirCitaID)
	}

	consulta += " LIMIT 1"

	var conflicto Conflicto
	err := r.db.QueryRowContext(ctx, consulta, argumentos...).Scan(&conflicto.CitaID, &conflicto.Inicio, &conflicto.Fin)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("verificar choque: %w", err)
	}

	return &conflicto, nil
}

func (r *Repository) ContarAtendidasAntesEnMes(ctx context.Context, inicio string) (int, error) {
	consulta := `
		SELECT COUNT(*) FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida'
			AND p.origen = 'trabajo'
			AND strftime('%Y-%m', c.inicio) = strftime('%Y-%m', ?)
			AND c.inicio < ?
	`

	var total int
	err := r.db.QueryRowContext(ctx, consulta, inicio, inicio).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("contar citas atendidas del mes: %w", err)
	}

	return total, nil
}

func (r *Repository) ObtenerOrigenPaciente(ctx context.Context, pacienteID int64) (origen string, tarifaSesion *int, err error) {
	consulta := `SELECT origen, tarifa_sesion FROM paciente WHERE id = ?`
	err = r.db.QueryRowContext(ctx, consulta, pacienteID).Scan(&origen, &tarifaSesion)
	if err != nil {
		return "", nil, fmt.Errorf("obtener origen del paciente: %w", err)
	}
	return origen, tarifaSesion, nil
}

func (r *Repository) ResolverAutorizacionActiva(ctx context.Context, pacienteID int64, tipoTerapia string) (*int64, error) {
	consulta := `
		SELECT id FROM autorizacion
		WHERE paciente_id = ? AND tipo_terapia = ? AND activa = 1
		LIMIT 1
	`

	var id int64
	err := r.db.QueryRowContext(ctx, consulta, pacienteID, tipoTerapia).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("resolver autorizacion activa: %w", err)
	}

	return &id, nil
}

func (r *Repository) Crear(ctx context.Context, solicitud SolicitudCrearCita) (*Cita, error) {
	consulta := `
		INSERT INTO cita (paciente_id, autorizacion_id, tipo_terapia, inicio, fin, notas)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	resultado, err := r.db.ExecContext(ctx, consulta, solicitud.PacienteID, solicitud.AutorizacionID, solicitud.TipoTerapia, solicitud.Inicio, solicitud.Fin, solicitud.Notas)
	if err != nil {
		return nil, fmt.Errorf("crear cita: %w", err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("obtener id de cita creada: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarCita) (*Cita, error) {
	consulta := `
		UPDATE cita
		SET autorizacion_id = ?, tipo_terapia = ?, inicio = ?, fin = ?, notas = ?, actualizado_en = datetime('now')
		WHERE id = ?
	`

	_, err := r.db.ExecContext(ctx, consulta, solicitud.AutorizacionID, solicitud.TipoTerapia, solicitud.Inicio, solicitud.Fin, solicitud.Notas, id)
	if err != nil {
		return nil, fmt.Errorf("actualizar cita: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) CambiarEstado(ctx context.Context, id int64, estado string, valorSesion, copagoCobrado *int) (*Cita, error) {
	consulta := `
		UPDATE cita
		SET estado = ?,
			valor_sesion = COALESCE(?, valor_sesion),
			copago_cobrado = COALESCE(?, copago_cobrado),
			actualizado_en = datetime('now')
		WHERE id = ?
	`

	_, err := r.db.ExecContext(ctx, consulta, estado, valorSesion, copagoCobrado, id)
	if err != nil {
		return nil, fmt.Errorf("cambiar estado de cita: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Eliminar(ctx context.Context, id int64) error {
	if _, err := r.db.ExecContext(ctx, "DELETE FROM cita WHERE id = ?", id); err != nil {
		return fmt.Errorf("eliminar cita: %w", err)
	}
	return nil
}

type escaneable interface {
	Scan(dest ...any) error
}

func escanearCita(fila escaneable, c *Cita) error {
	c.Paciente = &PacienteResumen{}
	return fila.Scan(
		&c.ID, &c.PacienteID, &c.AutorizacionID, &c.TipoTerapia, &c.Inicio, &c.Fin, &c.Estado,
		&c.ValorSesion, &c.CopagoCobrado, &c.Notas, &c.CreadoEn, &c.ActualizadoEn,
		&c.Paciente.ID, &c.Paciente.Nombre, &c.Paciente.Direccion, &c.Paciente.TipoTerapia, &c.Paciente.Color,
	)
}
