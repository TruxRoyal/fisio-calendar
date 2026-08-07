package resumen

import (
	"context"
	"fmt"

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

	sesiones, pagoNeto, copagos, err := s.repo.ObtenerAgregadoMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	return &ResumenMensual{
		Anio:              anio,
		Mes:               mes,
		SesionesAtendidas: sesiones,
		UmbralAlcanzado:   sesiones > UmbralEscalon,
		PagoNeto:          pagoNeto,
		CopagosRecaudados: copagos,
		Total:             pagoNeto + copagos,
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

func formatearAnioMes(anio, mes int) string {
	return fmt.Sprintf("%04d-%02d", anio, mes)
}
