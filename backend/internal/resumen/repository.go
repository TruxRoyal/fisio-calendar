package resumen

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

func (r *Repository) ObtenerAgregadoMensual(ctx context.Context, anioMes string) (sesionesAtendidas, pagoNeto, copagosRecaudados int, err error) {
	consulta := `
		SELECT
			COUNT(*),
			COALESCE(SUM(valor_sesion), 0),
			COALESCE(SUM(copago_cobrado), 0)
		FROM cita
		WHERE estado = 'atendida' AND strftime('%Y-%m', inicio) = ?
	`

	err = r.db.QueryRowContext(ctx, consulta, anioMes).Scan(&sesionesAtendidas, &pagoNeto, &copagosRecaudados)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("obtener agregado mensual: %w", err)
	}

	return sesionesAtendidas, pagoNeto, copagosRecaudados, nil
}

func (r *Repository) ListarDetalleMensual(ctx context.Context, anioMes string) ([]DetalleSesion, error) {
	consulta := `
		SELECT c.inicio, p.nombre, c.valor_sesion, c.copago_cobrado
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) = ?
		ORDER BY c.inicio ASC
	`

	filas, err := r.db.QueryContext(ctx, consulta, anioMes)
	if err != nil {
		return nil, fmt.Errorf("listar detalle mensual: %w", err)
	}
	defer filas.Close()

	detalle := []DetalleSesion{}
	for filas.Next() {
		var d DetalleSesion
		if err := filas.Scan(&d.Fecha, &d.PacienteNombre, &d.ValorSesion, &d.CopagoCobrado); err != nil {
			return nil, fmt.Errorf("escanear detalle mensual: %w", err)
		}
		detalle = append(detalle, d)
	}

	return detalle, filas.Err()
}
