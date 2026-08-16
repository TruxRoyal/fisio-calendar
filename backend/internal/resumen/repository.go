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

func (r *Repository) ObtenerAgregadoMensual(ctx context.Context, anioMes string) (sesionesAtendidas, sesionesTrabajo, pagoNeto, copagosRecaudados int, err error) {
	consulta := `
		SELECT
			COUNT(*),
			COALESCE(SUM(CASE WHEN p.origen = 'trabajo' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) = ?
	`

	err = r.db.QueryRowContext(ctx, consulta, anioMes).Scan(&sesionesAtendidas, &sesionesTrabajo, &pagoNeto, &copagosRecaudados)
	if err != nil {
		return 0, 0, 0, 0, fmt.Errorf("obtener agregado mensual: %w", err)
	}

	return sesionesAtendidas, sesionesTrabajo, pagoNeto, copagosRecaudados, nil
}

func (r *Repository) ObtenerAgregadoMensualRango(ctx context.Context, desde, hasta string) ([]FilaAgregadoMensual, error) {
	consulta := `
		SELECT
			strftime('%Y-%m', c.inicio) AS anio_mes,
			COUNT(*),
			COALESCE(SUM(CASE WHEN p.origen = 'trabajo' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) BETWEEN ? AND ?
		GROUP BY anio_mes
	`

	filas, err := r.db.QueryContext(ctx, consulta, desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("obtener agregado mensual en rango: %w", err)
	}
	defer filas.Close()

	resultado := []FilaAgregadoMensual{}
	for filas.Next() {
		var f FilaAgregadoMensual
		if err := filas.Scan(&f.AnioMes, &f.SesionesAtendidas, &f.SesionesTrabajo, &f.PagoNeto, &f.CopagosRecaudados); err != nil {
			return nil, fmt.Errorf("escanear agregado mensual: %w", err)
		}
		resultado = append(resultado, f)
	}

	return resultado, filas.Err()
}

func (r *Repository) ObtenerCapacidadMensual(ctx context.Context, anioMes string) (minutosEstimados, minutosReales int, err error) {
	consultaEstimado := `
		SELECT COALESCE(SUM(
			MAX(0, a.sesiones_totales - (SELECT COUNT(*) FROM cita c WHERE c.autorizacion_id = a.id AND c.estado = 'atendida'))
		), 0)
		FROM autorizacion a
		WHERE a.activa = 1
	`
	var sesionesRestantesTotales int
	if err = r.db.QueryRowContext(ctx, consultaEstimado).Scan(&sesionesRestantesTotales); err != nil {
		return 0, 0, fmt.Errorf("obtener sesiones restantes totales: %w", err)
	}
	minutosEstimados = sesionesRestantesTotales * DuracionEstimadaMin

	consultaReal := `
		SELECT COALESCE(SUM((julianday(fin) - julianday(inicio)) * 24 * 60), 0)
		FROM cita
		WHERE estado = 'atendida' AND strftime('%Y-%m', inicio) = ?
	`
	var minutosRealesFloat float64
	if err = r.db.QueryRowContext(ctx, consultaReal, anioMes).Scan(&minutosRealesFloat); err != nil {
		return 0, 0, fmt.Errorf("obtener minutos reales del mes: %w", err)
	}
	minutosReales = int(minutosRealesFloat + 0.5)

	return minutosEstimados, minutosReales, nil
}

func (r *Repository) ListarDesglosePorPaciente(ctx context.Context, anioMes string) ([]DesglosePaciente, error) {
	consulta := `
		SELECT
			p.id,
			p.nombre,
			COUNT(*),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) = ?
		GROUP BY p.id, p.nombre
		ORDER BY COALESCE(SUM(c.valor_sesion), 0) + COALESCE(SUM(c.copago_cobrado), 0) DESC
	`

	filas, err := r.db.QueryContext(ctx, consulta, anioMes)
	if err != nil {
		return nil, fmt.Errorf("listar desglose por paciente: %w", err)
	}
	defer filas.Close()

	desglose := []DesglosePaciente{}
	for filas.Next() {
		var d DesglosePaciente
		if err := filas.Scan(&d.PacienteId, &d.Nombre, &d.Sesiones, &d.PagoNeto, &d.Copagos); err != nil {
			return nil, fmt.Errorf("escanear desglose por paciente: %w", err)
		}
		d.Total = d.PagoNeto + d.Copagos
		desglose = append(desglose, d)
	}

	return desglose, filas.Err()
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
