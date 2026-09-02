package resumen

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
)

type Repository struct {
	db *sql.DB
}

func NuevoRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ObtenerAgregadoMensual(ctx context.Context, anioMes string) (sesionesAtendidas, sesionesTrabajo, pagoNeto, copagosRecaudados int, porTipo []ResumenTipo, err error) {
	consulta := `
		SELECT
			c.tipo_terapia,
			COUNT(*),
			COALESCE(SUM(CASE WHEN p.origen = 'trabajo' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) = ?
		GROUP BY c.tipo_terapia
		ORDER BY c.tipo_terapia ASC
	`

	filas, err := r.db.QueryContext(ctx, consulta, anioMes)
	if err != nil {
		return 0, 0, 0, 0, nil, fmt.Errorf("obtener agregado mensual: %w", err)
	}
	defer filas.Close()

	porTipo = []ResumenTipo{}
	for filas.Next() {
		var fila ResumenTipo
		var sesionesTrabajoTipo int
		if err := filas.Scan(&fila.TipoTerapia, &fila.SesionesAtendidas, &sesionesTrabajoTipo, &fila.PagoNeto, &fila.CopagosRecaudados); err != nil {
			return 0, 0, 0, 0, nil, fmt.Errorf("escanear agregado mensual por tipo: %w", err)
		}
		sesionesAtendidas += fila.SesionesAtendidas
		sesionesTrabajo += sesionesTrabajoTipo
		pagoNeto += fila.PagoNeto
		copagosRecaudados += fila.CopagosRecaudados
		porTipo = append(porTipo, fila)
	}
	if err := filas.Err(); err != nil {
		return 0, 0, 0, 0, nil, err
	}

	return sesionesAtendidas, sesionesTrabajo, pagoNeto, copagosRecaudados, porTipo, nil
}

func (r *Repository) ObtenerAgregadoMensualRango(ctx context.Context, desde, hasta string) ([]FilaAgregadoMensual, error) {
	consulta := `
		SELECT
			strftime('%Y-%m', c.inicio) AS anio_mes,
			c.tipo_terapia,
			COUNT(*),
			COALESCE(SUM(CASE WHEN p.origen = 'trabajo' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) BETWEEN ? AND ?
		GROUP BY anio_mes, c.tipo_terapia
	`

	filas, err := r.db.QueryContext(ctx, consulta, desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("obtener agregado mensual en rango: %w", err)
	}
	defer filas.Close()

	resultado := []FilaAgregadoMensual{}
	for filas.Next() {
		var f FilaAgregadoMensual
		if err := filas.Scan(&f.AnioMes, &f.TipoTerapia, &f.SesionesAtendidas, &f.SesionesTrabajo, &f.PagoNeto, &f.CopagosRecaudados); err != nil {
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
			c.tipo_terapia,
			COUNT(*),
			COALESCE(SUM(c.valor_sesion), 0),
			COALESCE(SUM(c.copago_cobrado), 0)
		FROM cita c
		JOIN paciente p ON p.id = c.paciente_id
		WHERE c.estado = 'atendida' AND strftime('%Y-%m', c.inicio) = ?
		GROUP BY p.id, p.nombre, c.tipo_terapia
		ORDER BY p.nombre ASC, c.tipo_terapia ASC
	`

	filas, err := r.db.QueryContext(ctx, consulta, anioMes)
	if err != nil {
		return nil, fmt.Errorf("listar desglose por paciente: %w", err)
	}
	defer filas.Close()

	orden := []int{}
	porPaciente := map[int]*DesglosePaciente{}
	for filas.Next() {
		var pacienteID int
		var nombre, tipoTerapia string
		var sesiones, pagoNeto, copagos int
		if err := filas.Scan(&pacienteID, &nombre, &tipoTerapia, &sesiones, &pagoNeto, &copagos); err != nil {
			return nil, fmt.Errorf("escanear desglose por paciente: %w", err)
		}

		d, existe := porPaciente[pacienteID]
		if !existe {
			d = &DesglosePaciente{PacienteId: pacienteID, Nombre: nombre, PorTipo: []ResumenTipo{}}
			porPaciente[pacienteID] = d
			orden = append(orden, pacienteID)
		}
		d.Sesiones += sesiones
		d.PagoNeto += pagoNeto
		d.Copagos += copagos
		d.Total += pagoNeto + copagos
		d.PorTipo = append(d.PorTipo, ResumenTipo{
			TipoTerapia:       tipoTerapia,
			SesionesAtendidas: sesiones,
			PagoNeto:          pagoNeto,
			CopagosRecaudados: copagos,
		})
	}
	if err := filas.Err(); err != nil {
		return nil, err
	}

	desglose := make([]DesglosePaciente, 0, len(orden))
	for _, id := range orden {
		desglose = append(desglose, *porPaciente[id])
	}
	sort.Slice(desglose, func(i, j int) bool { return desglose[i].Total > desglose[j].Total })

	return desglose, nil
}

func (r *Repository) ListarDetalleMensual(ctx context.Context, anioMes string) ([]DetalleSesion, error) {
	consulta := `
		SELECT c.inicio, p.nombre, c.tipo_terapia, c.valor_sesion, c.copago_cobrado
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
		if err := filas.Scan(&d.Fecha, &d.PacienteNombre, &d.TipoTerapia, &d.ValorSesion, &d.CopagoCobrado); err != nil {
			return nil, fmt.Errorf("escanear detalle mensual: %w", err)
		}
		detalle = append(detalle, d)
	}

	return detalle, filas.Err()
}
