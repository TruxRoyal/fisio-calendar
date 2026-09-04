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

func (s *Service) ObtenerDetalleMensual(ctx context.Context, anio, mes int) ([]DetalleSesion, error) {
	return s.repo.ListarDetalleMensual(ctx, formatearAnioMes(anio, mes))
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

	desglose, err := s.repo.ListarDesglosePorPaciente(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	archivo := excelize.NewFile()

	estilos, err := crearEstilosExcel(archivo)
	if err != nil {
		return nil, fmt.Errorf("crear estilos de excel: %w", err)
	}

	escribirHojaResumen(archivo, estilos, resumen)
	escribirHojaDetalle(archivo, estilos, detalle)
	escribirHojaPorPaciente(archivo, estilos, desglose)
	escribirHojaPorTipo(archivo, estilos, resumen.PorTipo)

	archivo.DeleteSheet("Sheet1")
	archivo.SetActiveSheet(0)

	return archivo, nil
}

type estilosExcel struct {
	encabezado    int
	texto         int
	textoAlt      int
	moneda        int
	monedaAlt     int
	centro        int
	centroAlt     int
	totalEtiqueta int
	totalValor    int
}

const (
	colorAcento     = "82272A"
	colorFilaAlt    = "F7F0EF"
	colorBorde      = "E6DEDD"
	formatoMonedaCO = `"$"#,##0`
)

func crearEstilosExcel(archivo *excelize.File) (*estilosExcel, error) {
	borde := []excelize.Border{
		{Type: "top", Color: colorBorde, Style: 1},
		{Type: "bottom", Color: colorBorde, Style: 1},
		{Type: "left", Color: colorBorde, Style: 1},
		{Type: "right", Color: colorBorde, Style: 1},
	}
	formatoMoneda := formatoMonedaCO

	encabezado, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{colorAcento}},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    borde,
	})
	if err != nil {
		return nil, err
	}

	texto, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10.5},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border:    borde,
	})
	if err != nil {
		return nil, err
	}

	textoAlt, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10.5},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{colorFilaAlt}},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border:    borde,
	})
	if err != nil {
		return nil, err
	}

	moneda, err := archivo.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10.5},
		Alignment:    &excelize.Alignment{Vertical: "center", Horizontal: "right"},
		Border:       borde,
		CustomNumFmt: &formatoMoneda,
	})
	if err != nil {
		return nil, err
	}

	monedaAlt, err := archivo.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10.5},
		Fill:         excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{colorFilaAlt}},
		Alignment:    &excelize.Alignment{Vertical: "center", Horizontal: "right"},
		Border:       borde,
		CustomNumFmt: &formatoMoneda,
	})
	if err != nil {
		return nil, err
	}

	centro, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10.5},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border:    borde,
	})
	if err != nil {
		return nil, err
	}

	centroAlt, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10.5},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{colorFilaAlt}},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border:    borde,
	})
	if err != nil {
		return nil, err
	}

	totalEtiqueta, err := archivo.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10.5, Color: colorAcento},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border:    []excelize.Border{{Type: "top", Color: colorAcento, Style: 2}},
	})
	if err != nil {
		return nil, err
	}

	totalValor, err := archivo.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true, Size: 10.5, Color: colorAcento},
		Alignment:    &excelize.Alignment{Vertical: "center", Horizontal: "right"},
		Border:       []excelize.Border{{Type: "top", Color: colorAcento, Style: 2}},
		CustomNumFmt: &formatoMoneda,
	})
	if err != nil {
		return nil, err
	}

	return &estilosExcel{
		encabezado:    encabezado,
		texto:         texto,
		textoAlt:      textoAlt,
		moneda:        moneda,
		monedaAlt:     monedaAlt,
		centro:        centro,
		centroAlt:     centroAlt,
		totalEtiqueta: totalEtiqueta,
		totalValor:    totalValor,
	}, nil
}

// columna describe una columna de una tabla exportada: su encabezado, ancho
// y si sus valores deben formatearse como moneda.
type columna struct {
	titulo string
	ancho  float64
	moneda bool
	centro bool
}

func prepararHoja(archivo *excelize.File, estilos *estilosExcel, hoja string, columnas []columna) {
	archivo.NewSheet(hoja)
	archivo.SetRowHeight(hoja, 1, 22)

	for i, c := range columnas {
		celda, _ := excelize.CoordinatesToCellName(i+1, 1)
		archivo.SetCellValue(hoja, celda, c.titulo)
		letra, _ := excelize.ColumnNumberToName(i + 1)
		archivo.SetColWidth(hoja, letra, letra, c.ancho)
	}
	archivo.SetCellStyle(hoja, "A1", fmt.Sprintf("%s1", letraColumna(len(columnas))), estilos.encabezado)
	archivo.SetPanes(hoja, &excelize.Panes{Freeze: true, Split: false, XSplit: 0, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"})
}

func letraColumna(indice int) string {
	letra, _ := excelize.ColumnNumberToName(indice)
	return letra
}

func estiloFila(estilos *estilosExcel, columnas []columna, indiceColumna, fila int) int {
	par := fila%2 == 0
	c := columnas[indiceColumna]
	switch {
	case c.moneda && par:
		return estilos.monedaAlt
	case c.moneda:
		return estilos.moneda
	case c.centro && par:
		return estilos.centroAlt
	case c.centro:
		return estilos.centro
	case par:
		return estilos.textoAlt
	default:
		return estilos.texto
	}
}

func escribirHojaResumen(archivo *excelize.File, estilos *estilosExcel, resumen *ResumenMensual) {
	hoja := "Resumen"
	columnas := []columna{
		{titulo: "Concepto", ancho: 26},
		{titulo: "Valor", ancho: 20, centro: true},
	}
	prepararHoja(archivo, estilos, hoja, columnas)

	umbralAlcanzado := "No"
	if resumen.UmbralAlcanzado {
		umbralAlcanzado = "Si"
	}

	filas := []struct {
		etiqueta string
		valor    any
		moneda   bool
	}{
		{"Mes", formatearAnioMes(resumen.Anio, resumen.Mes), false},
		{"Sesiones atendidas", resumen.SesionesAtendidas, false},
		{"Sesiones de trabajo", resumen.SesionesTrabajo, false},
		{"Umbral de escalon", resumen.UmbralEscalon, false},
		{"Umbral alcanzado", umbralAlcanzado, false},
		{"Pago neto", resumen.PagoNeto, true},
		{"Copagos recaudados", resumen.CopagosRecaudados, true},
	}

	for i, f := range filas {
		fila := i + 2
		archivo.SetCellValue(hoja, fmt.Sprintf("A%d", fila), f.etiqueta)
		archivo.SetCellValue(hoja, fmt.Sprintf("B%d", fila), f.valor)
		archivo.SetCellStyle(hoja, fmt.Sprintf("A%d", fila), fmt.Sprintf("A%d", fila), estiloFila(estilos, columnas, 0, fila))
		estiloValor := estiloFila(estilos, columnas, 1, fila)
		if f.moneda {
			if fila%2 == 0 {
				estiloValor = estilos.monedaAlt
			} else {
				estiloValor = estilos.moneda
			}
		}
		archivo.SetCellStyle(hoja, fmt.Sprintf("B%d", fila), fmt.Sprintf("B%d", fila), estiloValor)
	}

	filaTotal := len(filas) + 2
	archivo.SetCellValue(hoja, fmt.Sprintf("A%d", filaTotal), "Total")
	archivo.SetCellValue(hoja, fmt.Sprintf("B%d", filaTotal), resumen.Total)
	archivo.SetCellStyle(hoja, fmt.Sprintf("A%d", filaTotal), fmt.Sprintf("A%d", filaTotal), estilos.totalEtiqueta)
	archivo.SetCellStyle(hoja, fmt.Sprintf("B%d", filaTotal), fmt.Sprintf("B%d", filaTotal), estilos.totalValor)
}

func escribirHojaDetalle(archivo *excelize.File, estilos *estilosExcel, detalle []DetalleSesion) {
	hoja := "Detalle de sesiones"
	columnas := []columna{
		{titulo: "Fecha", ancho: 13, centro: true},
		{titulo: "Hora", ancho: 9, centro: true},
		{titulo: "Paciente", ancho: 28},
		{titulo: "Documento", ancho: 14, centro: true},
		{titulo: "Tipo de terapia", ancho: 16, centro: true},
		{titulo: "Origen", ancho: 11, centro: true},
		{titulo: "Valor sesion", ancho: 14, moneda: true},
		{titulo: "Copago cobrado", ancho: 15, moneda: true},
	}
	prepararHoja(archivo, estilos, hoja, columnas)

	for i, d := range detalle {
		fila := i + 2
		fechaTexto, horaTexto := separarFechaHora(d.Fecha)
		documento := ""
		if d.Documento != nil {
			documento = *d.Documento
		}
		valores := []any{fechaTexto, horaTexto, d.PacienteNombre, documento, d.TipoTerapia, d.Origen, d.ValorSesion, d.CopagoCobrado}
		escribirFila(archivo, estilos, hoja, columnas, fila, valores)
	}
}

func escribirHojaPorPaciente(archivo *excelize.File, estilos *estilosExcel, desglose []DesglosePaciente) {
	hoja := "Por paciente"
	columnas := []columna{
		{titulo: "Paciente", ancho: 28},
		{titulo: "Sesiones", ancho: 11, centro: true},
		{titulo: "Pago neto", ancho: 14, moneda: true},
		{titulo: "Copagos", ancho: 13, moneda: true},
		{titulo: "Total", ancho: 14, moneda: true},
	}
	prepararHoja(archivo, estilos, hoja, columnas)

	for i, d := range desglose {
		fila := i + 2
		valores := []any{d.Nombre, d.Sesiones, d.PagoNeto, d.Copagos, d.Total}
		escribirFila(archivo, estilos, hoja, columnas, fila, valores)
	}
}

func escribirHojaPorTipo(archivo *excelize.File, estilos *estilosExcel, porTipo []ResumenTipo) {
	hoja := "Por tipo de terapia"
	columnas := []columna{
		{titulo: "Tipo de terapia", ancho: 18, centro: true},
		{titulo: "Sesiones atendidas", ancho: 17, centro: true},
		{titulo: "Pago neto", ancho: 14, moneda: true},
		{titulo: "Copagos recaudados", ancho: 17, moneda: true},
	}
	prepararHoja(archivo, estilos, hoja, columnas)

	for i, t := range porTipo {
		fila := i + 2
		valores := []any{t.TipoTerapia, t.SesionesAtendidas, t.PagoNeto, t.CopagosRecaudados}
		escribirFila(archivo, estilos, hoja, columnas, fila, valores)
	}
}

func escribirFila(archivo *excelize.File, estilos *estilosExcel, hoja string, columnas []columna, fila int, valores []any) {
	for i, valor := range valores {
		celda, _ := excelize.CoordinatesToCellName(i+1, fila)
		archivo.SetCellValue(hoja, celda, valor)
		archivo.SetCellStyle(hoja, celda, celda, estiloFila(estilos, columnas, i, fila))
	}
}

func (s *Service) ObtenerCapacidadMensual(ctx context.Context) (*CapacidadMensual, error) {
	anioMes := formatearAnioMes(anioMesActual())

	minutosEstimados, minutosReales, sesionesHechasMes, sesionesTotalesMes, sesionesAutorizadasTotal, sesionesRegistradasTotal, err := s.repo.ObtenerCapacidadMensual(ctx, anioMes)
	if err != nil {
		return nil, err
	}

	return &CapacidadMensual{
		MinutosEstimados:         minutosEstimados,
		MinutosReales:            minutosReales,
		SesionesHechasMes:        sesionesHechasMes,
		SesionesTotalesMes:       sesionesTotalesMes,
		SesionesAutorizadasTotal: sesionesAutorizadasTotal,
		SesionesRegistradasTotal: sesionesRegistradasTotal,
	}, nil
}

func separarFechaHora(inicio string) (fecha, hora string) {
	analizado, err := time.Parse("2006-01-02T15:04:05", inicio)
	if err != nil {
		return inicio, ""
	}
	return analizado.Format("2006-01-02"), analizado.Format("15:04")
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
