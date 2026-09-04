package resumen_test

import (
	"context"
	"testing"

	"fisio-backend/internal/resumen"
	"fisio-backend/internal/shared/testdb"
)

func TestExportarExcelGeneraLasCuatroHojasEsperadas(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Excel", "fisica")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 23500, 5000, "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "respiratoria", "atendida", 23500, 0, "2024-03-02T09:00:00", "2024-03-02T10:00:00")

	archivo, err := service.ExportarExcel(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("exportar excel: %v", err)
	}

	hojasEsperadas := []string{"Resumen", "Detalle de sesiones", "Por paciente", "Por tipo de terapia"}
	hojas := archivo.GetSheetList()
	if len(hojas) != len(hojasEsperadas) {
		t.Fatalf("esperaba %d hojas, obtuvo %d: %v", len(hojasEsperadas), len(hojas), hojas)
	}
	for i, esperada := range hojasEsperadas {
		if hojas[i] != esperada {
			t.Fatalf("hoja %d: esperaba %q, obtuvo %q (orden completo: %v)", i, esperada, hojas[i], hojas)
		}
	}

	mes, err := archivo.GetCellValue("Resumen", "B2")
	if err != nil {
		t.Fatalf("leer Resumen!B2: %v", err)
	}
	if mes != "2024-03" {
		t.Fatalf("esperaba Resumen!B2=2024-03, obtuvo %q", mes)
	}

	pacienteDetalle, err := archivo.GetCellValue("Detalle de sesiones", "C2")
	if err != nil {
		t.Fatalf("leer Detalle de sesiones!C2: %v", err)
	}
	if pacienteDetalle != "Paciente Excel" {
		t.Fatalf("esperaba Detalle de sesiones!C2=Paciente Excel, obtuvo %q", pacienteDetalle)
	}

	pacientePorPaciente, err := archivo.GetCellValue("Por paciente", "A2")
	if err != nil {
		t.Fatalf("leer Por paciente!A2: %v", err)
	}
	if pacientePorPaciente != "Paciente Excel" {
		t.Fatalf("esperaba Por paciente!A2=Paciente Excel, obtuvo %q", pacientePorPaciente)
	}

	filasPorTipo, err := archivo.GetRows("Por tipo de terapia")
	if err != nil {
		t.Fatalf("leer filas de Por tipo de terapia: %v", err)
	}
	// encabezado + fisica + respiratoria
	if len(filasPorTipo) != 3 {
		t.Fatalf("esperaba 3 filas en Por tipo de terapia (encabezado + 2 tipos), obtuvo %d: %v", len(filasPorTipo), filasPorTipo)
	}
}
