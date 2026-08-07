package autorizacion

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
		a.id, a.paciente_id, a.numero, a.copago, a.sesiones_totales, a.fecha_vencimiento, a.activa, a.creado_en,
		(SELECT COUNT(*) FROM cita c WHERE c.autorizacion_id = a.id AND c.estado = 'atendida') AS sesiones_usadas
	FROM autorizacion a
`

func (r *Repository) ListarPorPaciente(ctx context.Context, pacienteID int64) ([]Autorizacion, error) {
	consulta := consultaBase + " WHERE a.paciente_id = ? ORDER BY a.creado_en DESC"

	filas, err := r.db.QueryContext(ctx, consulta, pacienteID)
	if err != nil {
		return nil, fmt.Errorf("listar autorizaciones: %w", err)
	}
	defer filas.Close()

	autorizaciones := []Autorizacion{}
	for filas.Next() {
		var a Autorizacion
		var activa int
		if err := filas.Scan(&a.ID, &a.PacienteID, &a.Numero, &a.Copago, &a.SesionesTotales, &a.FechaVencimiento, &activa, &a.CreadoEn, &a.SesionesUsadas); err != nil {
			return nil, fmt.Errorf("escanear autorizacion: %w", err)
		}
		a.Activa = activa == 1
		autorizaciones = append(autorizaciones, a)
	}

	return autorizaciones, filas.Err()
}

func (r *Repository) ObtenerPorID(ctx context.Context, id int64) (*Autorizacion, error) {
	consulta := consultaBase + " WHERE a.id = ?"

	var a Autorizacion
	var activa int
	err := r.db.QueryRowContext(ctx, consulta, id).Scan(
		&a.ID, &a.PacienteID, &a.Numero, &a.Copago, &a.SesionesTotales, &a.FechaVencimiento, &activa, &a.CreadoEn, &a.SesionesUsadas,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener autorizacion: %w", err)
	}
	a.Activa = activa == 1

	return &a, nil
}

func (r *Repository) Crear(ctx context.Context, solicitud SolicitudCrearAutorizacion) (*Autorizacion, error) {
	consulta := `
		INSERT INTO autorizacion (paciente_id, numero, copago, sesiones_totales, fecha_vencimiento)
		VALUES (?, ?, ?, ?, ?)
	`

	resultado, err := r.db.ExecContext(ctx, consulta,
		solicitud.PacienteID, solicitud.Numero, solicitud.Copago, solicitud.SesionesTotales, solicitud.FechaVencimiento,
	)
	if err != nil {
		return nil, fmt.Errorf("crear autorizacion: %w", err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("obtener id de autorizacion creada: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarAutorizacion) (*Autorizacion, error) {
	consulta := `
		UPDATE autorizacion
		SET numero = ?, copago = ?, sesiones_totales = ?, fecha_vencimiento = ?, activa = ?
		WHERE id = ?
	`

	activa := 0
	if solicitud.Activa {
		activa = 1
	}

	_, err := r.db.ExecContext(ctx, consulta,
		solicitud.Numero, solicitud.Copago, solicitud.SesionesTotales, solicitud.FechaVencimiento, activa, id,
	)
	if err != nil {
		return nil, fmt.Errorf("actualizar autorizacion: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) Eliminar(ctx context.Context, id int64) error {
	if _, err := r.db.ExecContext(ctx, "DELETE FROM autorizacion WHERE id = ?", id); err != nil {
		return fmt.Errorf("eliminar autorizacion: %w", err)
	}
	return nil
}
