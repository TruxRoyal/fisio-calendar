package resumen

import (
	"context"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"

	"fisio-backend/internal/cita"
)

type Service struct {
	repo *Repository
}

func NuevoService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ObtenerMensual(ctx context.Context, anio, mes int) (*ResumenMensual, error) {
	anioMes := formatearAnioMes(anio, mes)

	sesiones, sesionesTrabajo, pagoNeto, copagos, porTipo, err := s.repo.ObtenerAgregadoMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	return &ResumenMensual{
		Anio:              anio,
		Mes:               mes,
		SesionesAtendidas: sesiones,
		SesionesTrabajo:   sesionesTrabajo,
		UmbralEscalon:     UmbralEscalon,
		UmbralAlcanzado:   sesionesTrabajo >= UmbralEscalon,
		PagoNeto:          pagoNeto,
		CopagosRecaudados: copagos,
		Total:             pagoNeto + copagos,
		PorTipo:           porTipo,
	}, nil
}

func (s *Service) ObtenerHistoricoMensual(ctx context.Context, meses, anioAncla, mesAncla int) ([]ResumenMensual, error) {
	if anioAncla == 0 || mesAncla == 0 {
		anioAncla, mesAncla = anioMesActual()
	}
	fechaAncla := time.Date(anioAncla, time.Month(mesAncla), 1, 0, 0, 0, 0, time.UTC)
	fechaInicio := fechaAncla.AddDate(0, -(meses - 1), 0)

	desde := formatearAnioMes(fechaInicio.Year(), int(fechaInicio.Month()))
	hasta := formatearAnioMes(anioAncla, mesAncla)

	filas, err := s.repo.ObtenerAgregadoMensualRango(ctx, desde, hasta)
	if err != nil {
		return nil, err
	}

	type agregadoMes struct {
		sesionesAtendidas int
		sesionesTrabajo   int
		pagoNeto          int
		copagosRecaudados int
		porTipo           []ResumenTipo
	}

	porMes := make(map[string]*agregadoMes, len(filas))
	for _, f := range filas {
		agregado, existe := porMes[f.AnioMes]
		if !existe {
			agregado = &agregadoMes{porTipo: []ResumenTipo{}}
			porMes[f.AnioMes] = agregado
		}
		agregado.sesionesAtendidas += f.SesionesAtendidas
		agregado.sesionesTrabajo += f.SesionesTrabajo
		agregado.pagoNeto += f.PagoNeto
		agregado.copagosRecaudados += f.CopagosRecaudados
		agregado.porTipo = append(agregado.porTipo, ResumenTipo{
			TipoTerapia:       f.TipoTerapia,
			SesionesAtendidas: f.SesionesAtendidas,
			PagoNeto:          f.PagoNeto,
			CopagosRecaudados: f.CopagosRecaudados,
		})
	}

	resultado := make([]ResumenMensual, 0, meses)
	for i := 0; i < meses; i++ {
		fecha := fechaInicio.AddDate(0, i, 0)
		anioMes := formatearAnioMes(fecha.Year(), int(fecha.Month()))
		agregado, existe := porMes[anioMes]
		if !existe {
			agregado = &agregadoMes{porTipo: []ResumenTipo{}}
		}

		resultado = append(resultado, ResumenMensual{
			Anio:              fecha.Year(),
			Mes:               int(fecha.Month()),
			SesionesAtendidas: agregado.sesionesAtendidas,
			SesionesTrabajo:   agregado.sesionesTrabajo,
			UmbralEscalon:     UmbralEscalon,
			UmbralAlcanzado:   agregado.sesionesTrabajo >= UmbralEscalon,
			PagoNeto:          agregado.pagoNeto,
			CopagosRecaudados: agregado.copagosRecaudados,
			Total:             agregado.pagoNeto + agregado.copagosRecaudados,
			PorTipo:           agregado.porTipo,
		})
	}

	return resultado, nil
}

func (s *Service) ObtenerDesglosePorPaciente(ctx context.Context, anio, mes int) ([]DesglosePaciente, error) {
	return s.repo.ListarDesglosePorPaciente(ctx, formatearAnioMes(anio, mes))
}

func (s *Service) ObtenerProyeccionMensual(ctx context.Context, anio, mes int) (*ProyeccionMensual, error) {
	anioMes := formatearAnioMes(anio, mes)

	resumenActual, err := s.ObtenerMensual(ctx, anio, mes)
	if err != nil {
		return nil, err
	}

	agendadas, err := s.repo.ListarAgendadasMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	// La simulación asume que toda cita agendada de trabajo se atenderá en el
	// orden actual, sin cancelaciones ni citas nuevas insertadas antes en el mes.
	contadorTrabajo := resumenActual.SesionesTrabajo
	pagoNetoProyectado := 0
	restantesTrabajo, restantesExtra, sinTarifa := 0, 0, 0

	for _, fila := range agendadas {
		switch fila.Origen {
		case "trabajo":
			valor := cita.ValorSesionBase
			if contadorTrabajo >= cita.UmbralEscalon {
				valor = cita.ValorSesionEscalon
			}
			pagoNetoProyectado += valor
			contadorTrabajo++
			restantesTrabajo++
		case "extra":
			if fila.TarifaSesion == nil {
				sinTarifa++
				continue
			}
			pagoNetoProyectado += *fila.TarifaSesion
			restantesExtra++
		}
	}

	sesionesValoradas := restantesTrabajo + restantesExtra
	valorPromedio := 0
	if sesionesValoradas > 0 {
		valorPromedio = pagoNetoProyectado / sesionesValoradas
	}

	return &ProyeccionMensual{
		Anio:                        anio,
		Mes:                         mes,
		UmbralEscalon:               UmbralEscalon,
		SesionesTrabajoActual:       resumenActual.SesionesTrabajo,
		SesionesTrabajoProyectadas:  contadorTrabajo,
		SesionesRestantes:           len(agendadas),
		SesionesRestantesTrabajo:    restantesTrabajo,
		SesionesRestantesExtra:      restantesExtra,
		SesionesSinTarifa:           sinTarifa,
		PagoNetoActual:              resumenActual.PagoNeto,
		PagoNetoProyectado:          pagoNetoProyectado,
		TotalActual:                 resumenActual.Total,
		TotalProyectado:             resumenActual.Total + pagoNetoProyectado,
		ValorPromedioSesionRestante: valorPromedio,
	}, nil
}

func (s *Service) ExportarExcel(ctx context.Context, anio, mes int) (*excelize.File, error) {
	anioMes := formatearAnioMes(anio, mes)

	resumen, err := s.ObtenerMensual(ctx, anio, mes)
	if err != nil {
		return nil, err
	}

	detalle, err := s.repo.ListarDetalleMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	archivo := excelize.NewFile()
	hoja := "Resumen"
	archivo.SetSheetName("Sheet1", hoja)

	archivo.SetCellValue(hoja, "A1", "Fecha")
	archivo.SetCellValue(hoja, "B1", "Paciente")
	archivo.SetCellValue(hoja, "C1", "Tipo de terapia")
	archivo.SetCellValue(hoja, "D1", "Valor sesion")
	archivo.SetCellValue(hoja, "E1", "Copago cobrado")

	fila := 2
	for _, d := range detalle {
		archivo.SetCellValue(hoja, fmt.Sprintf("A%d", fila), d.Fecha)
		archivo.SetCellValue(hoja, fmt.Sprintf("B%d", fila), d.PacienteNombre)
		archivo.SetCellValue(hoja, fmt.Sprintf("C%d", fila), d.TipoTerapia)
		archivo.SetCellValue(hoja, fmt.Sprintf("D%d", fila), d.ValorSesion)
		archivo.SetCellValue(hoja, fmt.Sprintf("E%d", fila), d.CopagoCobrado)
		fila++
	}

	filaTotales := fila + 1
	archivo.SetCellValue(hoja, fmt.Sprintf("A%d", filaTotales), "Sesiones atendidas")
	archivo.SetCellValue(hoja, fmt.Sprintf("B%d", filaTotales), resumen.SesionesAtendidas)
	archivo.SetCellValue(hoja, fmt.Sprintf("A%d", filaTotales+1), "Pago neto")
	archivo.SetCellValue(hoja, fmt.Sprintf("B%d", filaTotales+1), resumen.PagoNeto)
	archivo.SetCellValue(hoja, fmt.Sprintf("A%d", filaTotales+2), "Copagos recaudados")
	archivo.SetCellValue(hoja, fmt.Sprintf("B%d", filaTotales+2), resumen.CopagosRecaudados)
	archivo.SetCellValue(hoja, fmt.Sprintf("A%d", filaTotales+3), "Total")
	archivo.SetCellValue(hoja, fmt.Sprintf("B%d", filaTotales+3), resumen.Total)

	return archivo, nil
}

func (s *Service) ObtenerCapacidadMensual(ctx context.Context) (*CapacidadMensual, error) {
	anioMes := formatearAnioMes(anioMesActual())

	minutosEstimados, minutosReales, sesionesHechasMes, sesionesTotalesMes, err := s.repo.ObtenerCapacidadMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	return &CapacidadMensual{
		MinutosEstimados:   minutosEstimados,
		MinutosReales:      minutosReales,
		SesionesHechasMes:  sesionesHechasMes,
		SesionesTotalesMes: sesionesTotalesMes,
	}, nil
}

func formatearAnioMes(anio, mes int) string {
	return fmt.Sprintf("%04d-%02d", anio, mes)
}

func anioMesActual() (int, int) {
	ubicacion, err := time.LoadLocation("America/Bogota")
	if err != nil {
		ahora := time.Now().UTC()
		return ahora.Year(), int(ahora.Month())
	}
	ahora := time.Now().In(ubicacion)
	return ahora.Year(), int(ahora.Month())
}
