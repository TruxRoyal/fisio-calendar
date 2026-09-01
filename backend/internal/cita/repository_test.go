package cita_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"fisio-backend/internal/cita"
	"fisio-backend/internal/shared/testdb"
)

// TestCitaTipoTerapiaEsIndependienteDeTipoPreferidoPaciente reproduce el
// escenario del spec "Editing paciente tipo preferido does not retro-relabel
// past citas": una cita creada con tipoTerapia='fisica' debe conservar ese
// valor aunque el tipo preferido del paciente cambie despues. Antes de esta
// unidad, cita.TipoTerapia se derivaba via JOIN en vivo contra
// paciente.tipo_terapia, por lo que este test habria fallado (mostrando
// 'respiratoria' en vez de 'fisica').
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

// TestActualizarRechazaCambioDeTipoTerapiaCuandoAtendida cubre el spec
// "Cita tipoTerapia is frozen once atendida": una vez estado='atendida', un
// intento de Actualizar con un tipoTerapia distinto debe rechazarse con un
// error de validacion y la base de datos debe permanecer sin cambios.
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

	_, conflicto, errores, err := service.Actualizar(ctx, creada.ID, cita.SolicitudActualizarCita{
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

// TestCalcularValorSesionCuentaSesionesDeAmbosTiposJuntas cubre el spec
// "Pricing threshold stays patient-wide": el umbral de descuento
// (UmbralEscalon) debe seguir sumando sesiones atendidas de todos los tipos
// de terapia de un paciente, sin filtrar por tipoTerapia.
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
			// La ultima del lote (previas = UmbralEscalon-1) todavia debe
			// cobrar el valor base: el umbral aun no se cruzo.
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

// TestServiceCrearResuelveAutorizacionActivaSegunTipo cubre el flujo de
// resolucion de autorizacion_id descrito en design.md: al crear una cita sin
// autorizacionId explicito, el servicio debe resolverlo a la autorizacion
// activa del paciente cuyo tipoTerapia coincida con el de la cita.
func TestServiceCrearResuelveAutorizacionActivaSegunTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Dual", "fisica")
	autorizacionFisicaID := insertarAutorizacionTest(t, conexion, pacienteID, "fisica")
	autorizacionRespiratoriaID := insertarAutorizacionTest(t, conexion, pacienteID, "respiratoria")

	creada, conflicto, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
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

// TestServiceCrearAdviertesSinAutorizacionActivaDelTipo cubre el requisito
// "advertencia-sin-autorizacion": crear una cita de un tipo sin autorizacion
// activa debe igual tener exito (sin bloquear), pero devolver una advertencia
// no bloqueante y dejar autorizacionId en nil.
func TestServiceCrearAdviertesSinAutorizacionActivaDelTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := cita.NuevoRepository(conexion)
	service := cita.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Solo Fisica", "fisica")
	insertarAutorizacionTest(t, conexion, pacienteID, "fisica")

	creada, conflicto, errores, err := service.Crear(ctx, cita.SolicitudCrearCita{
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

// horarioSecuencial genera un rango horario de una hora que no se solapa con
// ningun otro indice, todo dentro de enero de 2024, avanzando 2 horas por
// indice para dejar espacio entre citas.
func horarioSecuencial(indice int) (inicio, fin string) {
	dia := 1 + (indice*2)/24
	hora := (indice * 2) % 24
	inicio = fmt.Sprintf("2024-01-%02dT%02d:00:00", dia, hora)
	fin = fmt.Sprintf("2024-01-%02dT%02d:00:00", dia, hora+1)
	return inicio, fin
}
