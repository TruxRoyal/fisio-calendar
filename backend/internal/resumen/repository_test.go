package resumen_test

import (
	"context"
	"database/sql"
	"testing"

	"fisio-backend/internal/resumen"
	"fisio-backend/internal/shared/testdb"
)

// TestObtenerMensualDesglosaPorTipoYSumaAlTotal cubre el spec
// "resumen-por-tipo" / "Dual-therapy patient summary": un paciente con
// citas atendidas de fisica Y respiratoria en el mismo mes debe reportar un
// desglose PorTipo correcto para cada tipo, y la suma de esos desgloses debe
// coincidir con el total mensual sin tipo (el comportamiento pre-existente).
// Tambien confirma que una cita cancelada no se cuenta en ningun lado.
func TestObtenerMensualDesglosaPorTipoYSumaAlTotal(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Mixto", "fisica")

	// 2 fisica atendidas: valor_sesion 100 c/u, copago 10 c/u.
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 10, "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 10, "2024-03-02T09:00:00", "2024-03-02T10:00:00")
	// 1 respiratoria atendida: valor_sesion 150, copago 20 (valores distintos
	// a proposito, para que un bug de mezcla de sumas sea detectable).
	insertarCitaTest(t, conexion, pacienteID, "respiratoria", "atendida", 150, 20, "2024-03-03T09:00:00", "2024-03-03T10:00:00")
	// 1 cancelada: no deberia contarse en ningun lado.
	insertarCitaTest(t, conexion, pacienteID, "respiratoria", "cancelada", 150, 20, "2024-03-04T09:00:00", "2024-03-04T10:00:00")

	resumenMensual, err := service.ObtenerMensual(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("obtener resumen mensual: %v", err)
	}

	if resumenMensual.SesionesAtendidas != 3 {
		t.Fatalf("esperaba 3 sesiones atendidas (cancelada excluida), obtuvo %d", resumenMensual.SesionesAtendidas)
	}
	if resumenMensual.PagoNeto != 350 {
		t.Fatalf("esperaba pagoNeto=350 (2*100 + 150), obtuvo %d", resumenMensual.PagoNeto)
	}
	if resumenMensual.CopagosRecaudados != 40 {
		t.Fatalf("esperaba copagosRecaudados=40 (2*10 + 20), obtuvo %d", resumenMensual.CopagosRecaudados)
	}

	if len(resumenMensual.PorTipo) != 2 {
		t.Fatalf("esperaba desglose de 2 tipos, obtuvo %d: %+v", len(resumenMensual.PorTipo), resumenMensual.PorTipo)
	}

	porTipo := map[string]resumen.ResumenTipo{}
	sumaSesiones, sumaPagoNeto, sumaCopagos := 0, 0, 0
	for _, r := range resumenMensual.PorTipo {
		porTipo[r.TipoTerapia] = r
		sumaSesiones += r.SesionesAtendidas
		sumaPagoNeto += r.PagoNeto
		sumaCopagos += r.CopagosRecaudados
	}

	fisica, ok := porTipo["fisica"]
	if !ok {
		t.Fatal("esperaba desglose para tipo fisica")
	}
	if fisica.SesionesAtendidas != 2 || fisica.PagoNeto != 200 || fisica.CopagosRecaudados != 20 {
		t.Fatalf("desglose fisica incorrecto: %+v", fisica)
	}

	respiratoria, ok := porTipo["respiratoria"]
	if !ok {
		t.Fatal("esperaba desglose para tipo respiratoria")
	}
	if respiratoria.SesionesAtendidas != 1 || respiratoria.PagoNeto != 150 || respiratoria.CopagosRecaudados != 20 {
		t.Fatalf("desglose respiratoria incorrecto (la cancelada no deberia sumar aqui): %+v", respiratoria)
	}

	// La suma de los desgloses por tipo debe coincidir exactamente con el
	// total mensual sin tipo (mismo comportamiento pre-existente, ahora
	// tambien correcto al mezclar tipos).
	if sumaSesiones != resumenMensual.SesionesAtendidas {
		t.Fatalf("suma de sesiones por tipo (%d) no coincide con el total (%d)", sumaSesiones, resumenMensual.SesionesAtendidas)
	}
	if sumaPagoNeto != resumenMensual.PagoNeto {
		t.Fatalf("suma de pagoNeto por tipo (%d) no coincide con el total (%d)", sumaPagoNeto, resumenMensual.PagoNeto)
	}
	if sumaCopagos != resumenMensual.CopagosRecaudados {
		t.Fatalf("suma de copagos por tipo (%d) no coincide con el total (%d)", sumaCopagos, resumenMensual.CopagosRecaudados)
	}
}

// TestListarDesglosePorPacienteAgrupaPorTipoSinDuplicarPaciente cubre el
// mismo riesgo de agrupacion, ahora en ListarDesglosePorPaciente: un
// paciente con sesiones de ambos tipos en el mes debe aparecer una sola vez
// en el desglose (no una fila por tipo), con su PorTipo poblado y su Total
// sumando ambos tipos.
func TestListarDesglosePorPacienteAgrupaPorTipoSinDuplicarPaciente(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Mixto", "fisica")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 10, "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "respiratoria", "atendida", 150, 20, "2024-03-03T09:00:00", "2024-03-03T10:00:00")

	desglose, err := service.ObtenerDesglosePorPaciente(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("obtener desglose por paciente: %v", err)
	}

	ocurrencias := 0
	var fila resumen.DesglosePaciente
	for _, d := range desglose {
		if d.PacienteId == int(pacienteID) {
			ocurrencias++
			fila = d
		}
	}

	if ocurrencias != 1 {
		t.Fatalf("esperaba exactamente 1 fila para el paciente mixto, obtuvo %d", ocurrencias)
	}
	if fila.Sesiones != 2 {
		t.Fatalf("esperaba 2 sesiones totales, obtuvo %d", fila.Sesiones)
	}
	if fila.Total != 280 {
		t.Fatalf("esperaba total=280 (100+10+150+20), obtuvo %d", fila.Total)
	}
	if len(fila.PorTipo) != 2 {
		t.Fatalf("esperaba desglose de 2 tipos para el paciente, obtuvo %d: %+v", len(fila.PorTipo), fila.PorTipo)
	}
}

func insertarPacienteTest(t *testing.T, conexion *sql.DB, nombre, tipoTerapia string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(`INSERT INTO paciente (nombre, tipo_terapia) VALUES (?, ?)`, nombre, tipoTerapia)
	if err != nil {
		t.Fatalf("insertar paciente %s: %v", nombre, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de paciente %s: %v", nombre, err)
	}
	return id
}

func insertarCitaTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia, estado string, valorSesion, copagoCobrado int, inicio, fin string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO cita (paciente_id, tipo_terapia, estado, valor_sesion, copago_cobrado, inicio, fin) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		pacienteID, tipoTerapia, estado, valorSesion, copagoCobrado, inicio, fin,
	)
	if err != nil {
		t.Fatalf("insertar cita %s/%s para paciente %d: %v", tipoTerapia, estado, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de cita: %v", err)
	}
	return id
}
