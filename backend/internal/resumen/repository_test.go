package resumen_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"fisio-backend/internal/resumen"
	"fisio-backend/internal/shared/testdb"
)

func TestObtenerMensualDesglosaPorTipoYSumaAlTotal(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Mixto", "fisica")

	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 10, "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 10, "2024-03-02T09:00:00", "2024-03-02T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "respiratoria", "atendida", 150, 20, "2024-03-03T09:00:00", "2024-03-03T10:00:00")
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

func TestObtenerProyeccionMensualCalculaEscalonSobreCitasAgendadas(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	// Paciente de trabajo: 65 sesiones ya atendidas (por debajo del umbral de 71),
	// y 10 citas agendadas que deben cruzar el umbral a mitad de la simulación.
	pacienteID := insertarPacienteTest(t, conexion, "Paciente Trabajo", "fisica")

	indice := 0
	for i := 0; i < 65; i++ {
		inicio, fin := horarioSecuencialResumenTest(indice)
		insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 23500, 0, inicio, fin)
		indice++
	}
	for i := 0; i < 10; i++ {
		inicio, fin := horarioSecuencialResumenTest(indice)
		insertarCitaTest(t, conexion, pacienteID, "fisica", "agendada", 0, 0, inicio, fin)
		indice++
	}

	proyeccion, err := service.ObtenerProyeccionMensual(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("obtener proyeccion mensual: %v", err)
	}

	if proyeccion.SesionesTrabajoActual != 65 {
		t.Fatalf("esperaba sesionesTrabajoActual=65, obtuvo %d", proyeccion.SesionesTrabajoActual)
	}
	if proyeccion.SesionesTrabajoProyectadas != 75 {
		t.Fatalf("esperaba sesionesTrabajoProyectadas=75, obtuvo %d", proyeccion.SesionesTrabajoProyectadas)
	}
	if proyeccion.SesionesRestantes != 10 || proyeccion.SesionesRestantesTrabajo != 10 {
		t.Fatalf("esperaba 10 sesiones restantes de trabajo, obtuvo restantes=%d restantesTrabajo=%d", proyeccion.SesionesRestantes, proyeccion.SesionesRestantesTrabajo)
	}

	// 6 citas antes de cruzar el umbral (65..70) a valor base, 4 desde el umbral (71..74) a valor escalon.
	esperadoPagoProyectado := 6*23500 + 4*25000
	if proyeccion.PagoNetoProyectado != esperadoPagoProyectado {
		t.Fatalf("esperaba pagoNetoProyectado=%d, obtuvo %d", esperadoPagoProyectado, proyeccion.PagoNetoProyectado)
	}

	esperadoPagoActual := 65 * 23500
	if proyeccion.PagoNetoActual != esperadoPagoActual {
		t.Fatalf("esperaba pagoNetoActual=%d, obtuvo %d", esperadoPagoActual, proyeccion.PagoNetoActual)
	}
	if proyeccion.TotalActual != proyeccion.PagoNetoActual {
		t.Fatalf("esperaba totalActual=%d (sin copagos), obtuvo %d", proyeccion.PagoNetoActual, proyeccion.TotalActual)
	}
	esperadoTotalProyectado := proyeccion.TotalActual + esperadoPagoProyectado
	if proyeccion.TotalProyectado != esperadoTotalProyectado {
		t.Fatalf("esperaba totalProyectado=%d, obtuvo %d", esperadoTotalProyectado, proyeccion.TotalProyectado)
	}
}

func TestObtenerProyeccionMensualDistingueTarifaExtraDeSinTarifa(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteConTarifa := insertarPacienteConOrigenTest(t, conexion, "Paciente Extra Con Tarifa", "fisica", "extra", intPtrResumenTest(40000))
	pacienteSinTarifa := insertarPacienteConOrigenTest(t, conexion, "Paciente Extra Sin Tarifa", "fisica", "extra", nil)

	inicio1, fin1 := horarioSecuencialResumenTest(0)
	insertarCitaTest(t, conexion, pacienteConTarifa, "fisica", "agendada", 0, 0, inicio1, fin1)

	inicio2, fin2 := horarioSecuencialResumenTest(1)
	insertarCitaTest(t, conexion, pacienteSinTarifa, "fisica", "agendada", 0, 0, inicio2, fin2)

	proyeccion, err := service.ObtenerProyeccionMensual(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("obtener proyeccion mensual: %v", err)
	}

	if proyeccion.SesionesRestantesExtra != 1 {
		t.Fatalf("esperaba sesionesRestantesExtra=1, obtuvo %d", proyeccion.SesionesRestantesExtra)
	}
	if proyeccion.SesionesSinTarifa != 1 {
		t.Fatalf("esperaba sesionesSinTarifa=1, obtuvo %d", proyeccion.SesionesSinTarifa)
	}
	if proyeccion.SesionesRestantes != 2 {
		t.Fatalf("esperaba sesionesRestantes=2, obtuvo %d", proyeccion.SesionesRestantes)
	}
	if proyeccion.PagoNetoProyectado != 40000 {
		t.Fatalf("esperaba pagoNetoProyectado=40000 (solo la cita con tarifa), obtuvo %d", proyeccion.PagoNetoProyectado)
	}
	if proyeccion.ValorPromedioSesionRestante != 40000 {
		t.Fatalf("esperaba valorPromedioSesionRestante=40000 (promedio sobre 1 sesion valorada), obtuvo %d", proyeccion.ValorPromedioSesionRestante)
	}
}

func TestObtenerProyeccionMensualSinCitasAgendadasNoDividePorCero(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	service := resumen.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Sin Agendadas", "fisica")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 23500, 0, "2024-03-01T09:00:00", "2024-03-01T10:00:00")

	proyeccion, err := service.ObtenerProyeccionMensual(ctx, 2024, 3)
	if err != nil {
		t.Fatalf("obtener proyeccion mensual: %v", err)
	}

	if proyeccion.SesionesRestantes != 0 {
		t.Fatalf("esperaba sesionesRestantes=0, obtuvo %d", proyeccion.SesionesRestantes)
	}
	if proyeccion.PagoNetoProyectado != 0 {
		t.Fatalf("esperaba pagoNetoProyectado=0, obtuvo %d", proyeccion.PagoNetoProyectado)
	}
	if proyeccion.ValorPromedioSesionRestante != 0 {
		t.Fatalf("esperaba valorPromedioSesionRestante=0 sin dividir por cero, obtuvo %d", proyeccion.ValorPromedioSesionRestante)
	}
	if proyeccion.TotalProyectado != proyeccion.TotalActual {
		t.Fatalf("esperaba totalProyectado=totalActual sin citas agendadas, obtuvo %d vs %d", proyeccion.TotalProyectado, proyeccion.TotalActual)
	}
}

func TestObtenerCapacidadMensualCuentaSesionesHechasYTotalesExcluyendoCanceladas(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Capacidad", "fisica")

	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 0, "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 0, "2024-03-02T09:00:00", "2024-03-02T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "agendada", 0, 0, "2024-03-05T09:00:00", "2024-03-05T10:00:00")
	insertarCitaTest(t, conexion, pacienteID, "fisica", "cancelada", 0, 0, "2024-03-06T09:00:00", "2024-03-06T10:00:00")
	// Cita fuera del mes objetivo: no debe contar en ningun total.
	insertarCitaTest(t, conexion, pacienteID, "fisica", "atendida", 100, 0, "2024-04-01T09:00:00", "2024-04-01T10:00:00")

	_, _, sesionesHechasMes, sesionesTotalesMes, _, _, err := repo.ObtenerCapacidadMensual(ctx, "2024-03")
	if err != nil {
		t.Fatalf("obtener capacidad mensual: %v", err)
	}

	if sesionesHechasMes != 2 {
		t.Fatalf("esperaba sesionesHechasMes=2, obtuvo %d", sesionesHechasMes)
	}
	if sesionesTotalesMes != 3 {
		t.Fatalf("esperaba sesionesTotalesMes=3 (2 atendidas + 1 agendada, cancelada excluida), obtuvo %d", sesionesTotalesMes)
	}
}

func TestObtenerCapacidadMensualCuentaAutorizadasYRegistradasDelTotalDePacientes(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := resumen.NuevoRepository(conexion)
	ctx := context.Background()

	pacienteUnoID := insertarPacienteTest(t, conexion, "Paciente Uno Backlog", "fisica")
	pacienteDosID := insertarPacienteTest(t, conexion, "Paciente Dos Backlog", "respiratoria")

	autorizacionUnoID := insertarAutorizacionTest(t, conexion, pacienteUnoID, "fisica", 10)
	autorizacionDosID := insertarAutorizacionTest(t, conexion, pacienteDosID, "respiratoria", 10)
	// Autorizacion inactiva (de otro tipo, para no chocar con el indice unico de activas): no debe sumar a lo autorizado ni a lo registrado.
	autorizacionInactivaID := insertarAutorizacionTest(t, conexion, pacienteUnoID, "respiratoria", 10)
	desactivarAutorizacionTest(t, conexion, autorizacionInactivaID)

	// 2 citas registradas (con autorizacion_id) para el paciente uno: 1 atendida, 1 agendada.
	insertarCitaConAutorizacionTest(t, conexion, pacienteUnoID, autorizacionUnoID, "fisica", "atendida", "2024-03-01T09:00:00", "2024-03-01T10:00:00")
	insertarCitaConAutorizacionTest(t, conexion, pacienteUnoID, autorizacionUnoID, "fisica", "agendada", "2024-03-05T09:00:00", "2024-03-05T10:00:00")
	// 1 cita cancelada: no debe contar como registrada.
	insertarCitaConAutorizacionTest(t, conexion, pacienteUnoID, autorizacionUnoID, "fisica", "cancelada", "2024-03-06T09:00:00", "2024-03-06T10:00:00")
	// 1 cita registrada para el paciente dos.
	insertarCitaConAutorizacionTest(t, conexion, pacienteDosID, autorizacionDosID, "respiratoria", "atendida", "2024-03-02T09:00:00", "2024-03-02T10:00:00")

	_, _, _, _, sesionesAutorizadasTotal, sesionesRegistradasTotal, err := repo.ObtenerCapacidadMensual(ctx, "2024-03")
	if err != nil {
		t.Fatalf("obtener capacidad mensual: %v", err)
	}

	if sesionesAutorizadasTotal != 20 {
		t.Fatalf("esperaba sesionesAutorizadasTotal=20 (10+10 de las 2 autorizaciones activas, la inactiva no cuenta), obtuvo %d", sesionesAutorizadasTotal)
	}
	if sesionesRegistradasTotal != 3 {
		t.Fatalf("esperaba sesionesRegistradasTotal=3 (2 del paciente uno + 1 del paciente dos, la cancelada no cuenta), obtuvo %d", sesionesRegistradasTotal)
	}
}

func horarioSecuencialResumenTest(indice int) (inicio, fin string) {
	dia := 1 + (indice*2)/24
	hora := (indice * 2) % 24
	inicio = fmt.Sprintf("2024-03-%02dT%02d:00:00", dia, hora)
	fin = fmt.Sprintf("2024-03-%02dT%02d:00:00", dia, hora+1)
	return inicio, fin
}

func intPtrResumenTest(valor int) *int {
	return &valor
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

func insertarPacienteConOrigenTest(t *testing.T, conexion *sql.DB, nombre, tipoTerapia, origen string, tarifaSesion *int) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO paciente (nombre, tipo_terapia, origen, tarifa_sesion) VALUES (?, ?, ?, ?)`,
		nombre, tipoTerapia, origen, tarifaSesion,
	)
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

func insertarAutorizacionTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia string, sesionesTotales int) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, tipo_terapia, sesiones_totales, activa) VALUES (?, ?, ?, 1)`,
		pacienteID, tipoTerapia, sesionesTotales,
	)
	if err != nil {
		t.Fatalf("insertar autorizacion %s para paciente %d: %v", tipoTerapia, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de autorizacion: %v", err)
	}
	return id
}

func desactivarAutorizacionTest(t *testing.T, conexion *sql.DB, autorizacionID int64) {
	t.Helper()

	if _, err := conexion.Exec(`UPDATE autorizacion SET activa = 0 WHERE id = ?`, autorizacionID); err != nil {
		t.Fatalf("desactivar autorizacion %d: %v", autorizacionID, err)
	}
}

func insertarCitaConAutorizacionTest(t *testing.T, conexion *sql.DB, pacienteID, autorizacionID int64, tipoTerapia, estado, inicio, fin string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO cita (paciente_id, autorizacion_id, tipo_terapia, estado, inicio, fin) VALUES (?, ?, ?, ?, ?, ?)`,
		pacienteID, autorizacionID, tipoTerapia, estado, inicio, fin,
	)
	if err != nil {
		t.Fatalf("insertar cita %s/%s con autorizacion para paciente %d: %v", tipoTerapia, estado, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de cita: %v", err)
	}
	return id
}
