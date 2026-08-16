package resumen

import (
	"context"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
)

type Service struct {
	repo *Repository
}

func NuevoService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ObtenerMensual(ctx context.Context, anio, mes int) (*ResumenMensual, error) {
	anioMes := formatearAnioMes(anio, mes)

	sesiones, sesionesTrabajo, pagoNeto, copagos, err := s.repo.ObtenerAgregadoMensual(ctx, anioMes)
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

	porMes := make(map[string]FilaAgregadoMensual, len(filas))
	for _, f := range filas {
		porMes[f.AnioMes] = f
	}

	resultado := make([]ResumenMensual, 0, meses)
	for i := 0; i < meses; i++ {
		fecha := fechaInicio.AddDate(0, i, 0)
		anioMes := formatearAnioMes(fecha.Year(), int(fecha.Month()))
		f := porMes[anioMes]

		resultado = append(resultado, ResumenMensual{
			Anio:              fecha.Year(),
			Mes:               int(fecha.Month()),
			SesionesAtendidas: f.SesionesAtendidas,
			SesionesTrabajo:   f.SesionesTrabajo,
			UmbralEscalon:     UmbralEscalon,
			UmbralAlcanzado:   f.SesionesTrabajo >= UmbralEscalon,
			PagoNeto:          f.PagoNeto,
			CopagosRecaudados: f.CopagosRecaudados,
			Total:             f.PagoNeto + f.CopagosRecaudados,
		})
	}

	return resultado, nil
}

func (s *Service) ObtenerDesglosePorPaciente(ctx context.Context, anio, mes int) ([]DesglosePaciente, error) {
	return s.repo.ListarDesglosePorPaciente(ctx, formatearAnioMes(anio, mes))
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
	archivo.SetCellValue(hoja, "C1", "Valor sesion")
	archivo.SetCellValue(hoja, "D1", "Copago cobrado")

	fila := 2
	for _, d := range detalle {
		archivo.SetCellValue(hoja, fmt.Sprintf("A%d", fila), d.Fecha)
		archivo.SetCellValue(hoja, fmt.Sprintf("B%d", fila), d.PacienteNombre)
		archivo.SetCellValue(hoja, fmt.Sprintf("C%d", fila), d.ValorSesion)
		archivo.SetCellValue(hoja, fmt.Sprintf("D%d", fila), d.CopagoCobrado)
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

	minutosEstimados, minutosReales, err := s.repo.ObtenerCapacidadMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	return &CapacidadMensual{MinutosEstimados: minutosEstimados, MinutosReales: minutosReales}, nil
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
