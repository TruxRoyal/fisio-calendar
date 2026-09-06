package cita_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"

	"fisio-backend/internal/cita"
	"fisio-backend/internal/shared/testdb"
)

func TestCitaTipoTerapiaEsIndependienteDeTipoPreferidoPaciente(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Fisica", "fisica")

	creada, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if creada.TipoTerapia != "fisica" {
		t.Fatalf("cita recien creada: esperaba tipoTerapia=fisica, obtuvo %q", creada.TipoTerapia)
	}

	if _, err := conexion.ExecContext(ctx, `UPDATE paciente SET tipo_terapia = 'respiratoria' WHERE id = ?`, pacienteID); err != nil {
		t.Fatalf("cambiar tipo preferido del paciente: %v", err)
	}

	releida, err := repo.ObtenerPorID(ctx, creada.ID)
	if err != nil {
		t.Fatalf("releer cita: %v", err)
	}
	if releida.TipoTerapia != "fisica" {
		t.Fatalf("cita historica: esperaba que mantenga tipoTerapia=fisica pese al cambio de tipo preferido del paciente a respiratoria, obtuvo %q", releida.TipoTerapia)
	}
	if releida.Paciente == nil || releida.Paciente.TipoTerapia == nil || *releida.Paciente.TipoTerapia != "respiratoria" {
		t.Fatalf("el tipo preferido del paciente deberia reflejar el cambio a respiratoria")
	}
}

func TestActualizarRechazaCambioDeTipoTerapiaCuandoAtendida(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Fisica", "fisica")

	creada, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}

	if _, err := repo.CambiarEstado(ctx, creada.ID, "atendida", nil, nil); err != nil {
		t.Fatalf("cambiar estado a atendida: %v", err)
	}

	_, _, conflicto, errores, err := service.Actualizar(ctx, creada.ID, cita.SolicitudActualizarCita{
		TipoTerapia: "respiratoria",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("actualizar cita atendida: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto de horario, obtuvo %+v", conflicto)
	}
	if errores == nil || !errores.TieneErrores() || errores["tipoTerapia"] == "" {
		t.Fatalf("esperaba un error de validacion en tipoTerapia al intentar cambiarlo en una cita atendida, obtuvo errores=%v", errores)
	}

	releida, err := repo.ObtenerPorID(ctx, creada.ID)
	if err != nil {
		t.Fatalf("releer cita: %v", err)
	}
	if releida.TipoTerapia != "fisica" {
		t.Fatalf("tipoTerapia de la cita atendida deberia permanecer fisica, obtuvo %q", releida.TipoTerapia)
	}
}

func TestActualizarRechazaMoverHorarioDeCitaAtendida(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Atendida Horario", "fisica")

	creada, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if _, err := repo.CambiarEstado(ctx, creada.ID, "atendida", nil, nil); err != nil {
		t.Fatalf("cambiar estado a atendida: %v", err)
	}

	_, _, conflicto, errores, err := service.Actualizar(ctx, creada.ID, cita.SolicitudActualizarCita{
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T11:00:00",
		Fin:         "2024-01-01T12:00:00",
	})
	if err != nil {
		t.Fatalf("actualizar cita atendida: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto de horario, obtuvo %+v", conflicto)
	}
	if errores == nil || !errores.TieneErrores() || errores["inicio"] == "" {
		t.Fatalf("esperaba un error de validacion al intentar mover una cita atendida, obtuvo errores=%v", errores)
	}

	releida, err := repo.ObtenerPorID(ctx, creada.ID)
	if err != nil {
		t.Fatalf("releer cita: %v", err)
	}
	if releida.Inicio != "2024-01-01T09:00:00" || releida.Fin != "2024-01-01T10:00:00" {
		t.Fatalf("cita atendida no deberia haberse movido, obtuvo %s/%s", releida.Inicio, releida.Fin)
	}
}

func TestPlanificarMovimientoRechazaCitaAtendida(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Atendida Preview", "fisica")

	creada, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if _, err := repo.CambiarEstado(ctx, creada.ID, "atendida", nil, nil); err != nil {
		t.Fatalf("cambiar estado a atendida: %v", err)
	}

	_, _, _, _, err = service.PlanificarMovimiento(ctx, creada.ID, "2024-01-01T11:00:00", "2024-01-01T12:00:00")
	if !errors.Is(err, cita.ErrCitaAtendidaNoSeMueve) {
		t.Fatalf("esperaba ErrCitaAtendidaNoSeMueve al planificar mover una cita atendida, obtuvo %v", err)
	}
}

func TestCalcularValorSesionCuentaSesionesDeAmbosTiposJuntas(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Mixto", "fisica")

	tipos := []string{"fisica", "respiratoria"}
	var ultimaCreada *cita.Cita
	for i := 0; i < cita.UmbralEscalon; i++ {
		inicio, fin := horarioSecuencial(i)
		creada, err := repo.Crear(ctx, cita.SolicitudCrearCita{
			PacienteID:  pacienteID,
			TipoTerapia: tipos[i%2],
			Inicio:      inicio,
			Fin:         fin,
		})
		if err != nil {
			t.Fatalf("crear cita mixta #%d: %v", i, err)
		}

		actualizada, errores, err := service.CambiarEstado(ctx, creada.ID, cita.SolicitudCambiarEstado{Estado: "atendida"})
		if err != nil {
			t.Fatalf("marcar atendida cita mixta #%d: %v", i, err)
		}
		if errores.TieneErrores() {
			t.Fatalf("no esperaba errores de validacion marcando atendida #%d: %v", i, errores)
		}

		if i == cita.UmbralEscalon-1 {
			if actualizada.ValorSesion == nil || *actualizada.ValorSesion != cita.ValorSesionBase {
				t.Fatalf("cita #%d (previas=%d): esperaba valorSesion=%d (base), obtuvo %v", i, i, cita.ValorSesionBase, actualizada.ValorSesion)
			}
		}
		ultimaCreada = actualizada
	}
	_ = ultimaCreada

	inicioSiguiente, finSiguiente := horarioSecuencial(cita.UmbralEscalon)
	siguiente, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "respiratoria",
		Inicio:      inicioSiguiente,
		Fin:         finSiguiente,
	})
	if err != nil {
		t.Fatalf("crear cita siguiente al umbral: %v", err)
	}

	actualizada, errores, err := service.CambiarEstado(ctx, siguiente.ID, cita.SolicitudCambiarEstado{Estado: "atendida"})
	if err != nil {
		t.Fatalf("marcar atendida cita siguiente al umbral: %v", err)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}
	if actualizada.ValorSesion == nil || *actualizada.ValorSesion != cita.ValorSesionEscalon {
		t.Fatalf("cita que cruza el umbral (previas=%d, mezclando fisica/respiratoria): esperaba valorSesion=%d (escalon), obtuvo %v", cita.UmbralEscalon, cita.ValorSesionEscalon, actualizada.ValorSesion)
	}
}

func TestServiceCrearResuelveAutorizacionActivaSegunTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Dual", "fisica")
	autorizacionFisicaID := insertarAutorizacionTest(t, conexion, pacienteID, "fisica")
	autorizacionRespiratoriaID := insertarAutorizacionTest(t, conexion, pacienteID, "respiratoria")

	creada, conflicto, autorizacionVencida, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "respiratoria",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto: %+v", conflicto)
	}
	if autorizacionVencida != nil {
		t.Fatalf("no esperaba bloqueo por vencimiento: %+v", autorizacionVencida)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}

	if creada.AutorizacionID == nil || *creada.AutorizacionID != autorizacionRespiratoriaID {
		t.Fatalf("esperaba autorizacionId=%d (la activa respiratoria), obtuvo %v (fisica era %d)", autorizacionRespiratoriaID, creada.AutorizacionID, autorizacionFisicaID)
	}
	if len(creada.Advertencias) != 0 {
		t.Fatalf("no esperaba advertencias cuando existe una autorizacion activa que coincide, obtuvo %v", creada.Advertencias)
	}
}

func TestServiceCrearAdviertesSinAutorizacionActivaDelTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Solo Fisica", "fisica")
	insertarAutorizacionTest(t, conexion, pacienteID, "fisica")

	creada, conflicto, autorizacionVencida, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "respiratoria",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto: %+v", conflicto)
	}
	if autorizacionVencida != nil {
		t.Fatalf("no esperaba bloqueo por vencimiento: %+v", autorizacionVencida)
	}
	if errores.TieneErrores() {
		t.Fatalf("la creacion no deberia bloquearse por falta de autorizacion, obtuvo errores=%v", errores)
	}
	if creada.AutorizacionID != nil {
		t.Fatalf("no esperaba autorizacionId resuelto (no hay activa respiratoria), obtuvo %v", *creada.AutorizacionID)
	}
	if len(creada.Advertencias) == 0 {
		t.Fatal("esperaba una advertencia no bloqueante por falta de autorizacion activa respiratoria")
	}
}

func TestActualizarEmpujaCitasSiguientesEnCascada(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Cascada", "fisica")

	primera, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear primera cita: %v", err)
	}

	segunda, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T10:00:00",
		Fin:         "2024-01-01T11:00:00",
	})
	if err != nil {
		t.Fatalf("crear segunda cita: %v", err)
	}

	actualizada, empujadas, conflicto, errores, err := service.Actualizar(ctx, primera.ID, cita.SolicitudActualizarCita{
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:30:00",
		Fin:         "2024-01-01T10:30:00",
	})
	if err != nil {
		t.Fatalf("actualizar primera cita: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto, obtuvo %+v", conflicto)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}
	if actualizada.Inicio != "2024-01-01T09:30:00" || actualizada.Fin != "2024-01-01T10:30:00" {
		t.Fatalf("cita movida: esperaba inicio/fin 09:30/10:30, obtuvo %s/%s", actualizada.Inicio, actualizada.Fin)
	}

	if len(empujadas) != 1 || empujadas[0].ID != segunda.ID {
		t.Fatalf("esperaba que la segunda cita fuera empujada, obtuvo %+v", empujadas)
	}
	if empujadas[0].Inicio != "2024-01-01T10:30:00" || empujadas[0].Fin != "2024-01-01T11:30:00" {
		t.Fatalf("segunda cita: esperaba inicio/fin nuevos 10:30/11:30, obtuvo %s/%s", empujadas[0].Inicio, empujadas[0].Fin)
	}

	releidaSegunda, err := repo.ObtenerPorID(ctx, segunda.ID)
	if err != nil {
		t.Fatalf("releer segunda cita: %v", err)
	}
	if releidaSegunda.Inicio != "2024-01-01T10:30:00" || releidaSegunda.Fin != "2024-01-01T11:30:00" {
		t.Fatalf("segunda cita en bd: esperaba inicio/fin 10:30/11:30, obtuvo %s/%s", releidaSegunda.Inicio, releidaSegunda.Fin)
	}
}

func TestActualizarNuncaMueveCitaQueYaHabiaEmpezadoYCorreLaMovidaHastaSuFinal(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Insercion", "fisica")

	primera, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T09:30:00",
	})
	if err != nil {
		t.Fatalf("crear primera cita: %v", err)
	}

	segunda, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:30:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear segunda cita: %v", err)
	}

	tercera, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T14:00:00",
		Fin:         "2024-01-01T14:30:00",
	})
	if err != nil {
		t.Fatalf("crear tercera cita: %v", err)
	}

	actualizada, empujadas, conflicto, errores, err := service.Actualizar(ctx, tercera.ID, cita.SolicitudActualizarCita{
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:15:00",
		Fin:         "2024-01-01T09:45:00",
	})
	if err != nil {
		t.Fatalf("mover tercera cita al medio de las otras dos: %v", err)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto: la cita anterior nunca deberia bloquear, solo correrse la movida: %+v", conflicto)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}

	if actualizada.Inicio != "2024-01-01T09:30:00" || actualizada.Fin != "2024-01-01T10:00:00" {
		t.Fatalf("tercera cita: esperaba que se corra a 09:30/10:00 (fin de la primera), obtuvo %s/%s", actualizada.Inicio, actualizada.Fin)
	}

	if len(empujadas) != 1 || empujadas[0].ID != segunda.ID {
		t.Fatalf("esperaba que solo se empuje la segunda cita (la primera nunca se toca), obtuvo %+v", empujadas)
	}
	if empujadas[0].Inicio != "2024-01-01T10:00:00" || empujadas[0].Fin != "2024-01-01T10:30:00" {
		t.Fatalf("segunda cita: esperaba que se empuje a 10:00/10:30, obtuvo %s/%s", empujadas[0].Inicio, empujadas[0].Fin)
	}

	releidaPrimera, err := repo.ObtenerPorID(ctx, primera.ID)
	if err != nil {
		t.Fatalf("releer primera cita: %v", err)
	}
	if releidaPrimera.Inicio != "2024-01-01T09:00:00" || releidaPrimera.Fin != "2024-01-01T09:30:00" {
		t.Fatalf("primera cita: no deberia haberse movido, obtuvo %s/%s", releidaPrimera.Inicio, releidaPrimera.Fin)
	}

	releidaSegunda, err := repo.ObtenerPorID(ctx, segunda.ID)
	if err != nil {
		t.Fatalf("releer segunda cita: %v", err)
	}
	if releidaSegunda.Inicio != "2024-01-01T10:00:00" || releidaSegunda.Fin != "2024-01-01T10:30:00" {
		t.Fatalf("segunda cita en bd: esperaba inicio/fin 10:00/10:30, obtuvo %s/%s", releidaSegunda.Inicio, releidaSegunda.Fin)
	}
}

func TestActualizarNuncaMueveNiBloqueaPorCitaAtendidaQueYaHabiaEmpezado(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Atendida", "fisica")

	atendida, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T09:30:00",
	})
	if err != nil {
		t.Fatalf("crear cita atendida: %v", err)
	}
	if _, err := repo.CambiarEstado(ctx, atendida.ID, "atendida", nil, nil); err != nil {
		t.Fatalf("marcar cita como atendida: %v", err)
	}

	otra, err := repo.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T14:00:00",
		Fin:         "2024-01-01T14:30:00",
	})
	if err != nil {
		t.Fatalf("crear otra cita: %v", err)
	}

	actualizada, empujadas, conflicto, errores, err := service.Actualizar(ctx, otra.ID, cita.SolicitudActualizarCita{
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:15:00",
		Fin:         "2024-01-01T09:45:00",
	})
	if err != nil {
		t.Fatalf("mover otra cita encima de la atendida: %v", err)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba conflicto: una cita atendida que ya habia empezado antes nunca deberia bloquear, obtuvo %+v", conflicto)
	}
	if len(empujadas) != 0 {
		t.Fatalf("no esperaba citas empujadas (nada despues de la atendida), obtuvo %+v", empujadas)
	}

	if actualizada.Inicio != "2024-01-01T09:30:00" || actualizada.Fin != "2024-01-01T10:00:00" {
		t.Fatalf("otra cita: esperaba que se corra a 09:30/10:00 (fin de la atendida), obtuvo %s/%s", actualizada.Inicio, actualizada.Fin)
	}

	releidaAtendida, err := repo.ObtenerPorID(ctx, atendida.ID)
	if err != nil {
		t.Fatalf("releer cita atendida: %v", err)
	}
	if releidaAtendida.Inicio != "2024-01-01T09:00:00" || releidaAtendida.Fin != "2024-01-01T09:30:00" {
		t.Fatalf("cita atendida no deberia haberse movido nunca, obtuvo %s/%s", releidaAtendida.Inicio, releidaAtendida.Fin)
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

func insertarAutorizacionTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, tipo_terapia) VALUES (?, 10, 1, ?)`,
		pacienteID, tipoTerapia,
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

func insertarAutorizacionConVencimientoTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia, fechaVencimiento string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, tipo_terapia, fecha_vencimiento) VALUES (?, 10, 1, ?, ?)`,
		pacienteID, tipoTerapia, fechaVencimiento,
	)
	if err != nil {
		t.Fatalf("insertar autorizacion con vencimiento %s para paciente %d: %v", tipoTerapia, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de autorizacion: %v", err)
	}
	return id
}

func TestCrearBloqueaCitaSiLaAutorizacionResueltaYaVencio(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Orden Vencida", "fisica")
	autorizacionID := insertarAutorizacionConVencimientoTest(t, conexion, pacienteID, "fisica", "2000-01-01")

	creada, conflicto, autorizacionVencida, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba choque de horario: %+v", conflicto)
	}
	if creada != nil {
		t.Fatalf("no esperaba que se cree la cita con la orden vencida, obtuvo %+v", creada)
	}
	if autorizacionVencida == nil || autorizacionVencida.AutorizacionID != autorizacionID {
		t.Fatalf("esperaba bloqueo por autorizacion %d vencida, obtuvo %+v", autorizacionID, autorizacionVencida)
	}
	if autorizacionVencida.FechaVencimiento[:10] != "2000-01-01" {
		t.Fatalf("esperaba fechaVencimiento=2000-01-01, obtuvo %s", autorizacionVencida.FechaVencimiento)
	}
}

func TestCrearPermiteCitaSiLaAutorizacionResueltaNoHaVencidoAunqueEsteProximaAVencer(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Orden Por Vencer", "fisica")
	insertarAutorizacionConVencimientoTest(t, conexion, pacienteID, "fisica", "2999-01-01")

	creada, conflicto, autorizacionVencida, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
		PacienteID:  pacienteID,
		TipoTerapia: "fisica",
		Inicio:      "2024-01-01T09:00:00",
		Fin:         "2024-01-01T10:00:00",
	})
	if err != nil {
		t.Fatalf("crear cita: %v", err)
	}
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion: %v", errores)
	}
	if conflicto != nil {
		t.Fatalf("no esperaba choque de horario: %+v", conflicto)
	}
	if autorizacionVencida != nil {
		t.Fatalf("no esperaba bloqueo por vencimiento (la orden todavia es valida): %+v", autorizacionVencida)
	}
	if creada == nil {
		t.Fatal("esperaba que la cita se creara con la orden todavia vigente")
	}
}

func horarioSecuencial(indice int) (inicio, fin string) {
	dia := 1 + (indice*2)/24
	hora := (indice * 2) % 24
	inicio = fmt.Sprintf("2024-01-%02dT%02d:00:00", dia, hora)
	fin = fmt.Sprintf("2024-01-%02dT%02d:00:00", dia, hora+1)
	return inicio, fin
}
