package autorizacion_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"fisio-backend/internal/autorizacion"
	"fisio-backend/internal/shared/testdb"
)

func TestServiceCrearPermiteUnaActivaPorTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := autorizacion.NuevoRepository(conexion)
	service := autorizacion.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Dual")

	fisica, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 10,
	})
	if err != nil || errores.TieneErrores() {
		t.Fatalf("crear autorizacion fisica: err=%v errores=%v", err, errores)
	}
	if !fisica.Activa {
		t.Fatalf("esperaba autorizacion fisica activa")
	}

	respiratoria, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "respiratoria",
		SesionesTotales: 10,
	})
	if err != nil || errores.TieneErrores() {
		t.Fatalf("crear autorizacion respiratoria: err=%v errores=%v", err, errores)
	}
	if !respiratoria.Activa {
		t.Fatalf("esperaba autorizacion respiratoria activa")
	}
}

func TestServiceCrearRechazaSegundaActivaMismoTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := autorizacion.NuevoRepository(conexion)
	service := autorizacion.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Fisica")

	if _, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 10,
	}); err != nil || errores.TieneErrores() {
		t.Fatalf("crear primera autorizacion fisica: err=%v errores=%v", err, errores)
	}

	_, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 5,
	})
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion, obtuvo %v", errores)
	}
	if !errors.Is(err, autorizacion.ErrAutorizacionActivaDuplicada) {
		t.Fatalf("esperaba ErrAutorizacionActivaDuplicada, obtuvo %v", err)
	}
}

func TestServiceCrearPermiteNuevaActivaTrasDesactivarAnterior(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := autorizacion.NuevoRepository(conexion)
	service := autorizacion.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Fisica")

	primera, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 10,
	})
	if err != nil || errores.TieneErrores() {
		t.Fatalf("crear primera autorizacion fisica: err=%v errores=%v", err, errores)
	}

	if _, errores, err := service.Actualizar(ctx, primera.ID, autorizacion.SolicitudActualizarAutorizacion{
		TipoTerapia:     "fisica",
		SesionesTotales: 10,
		Activa:          false,
	}); err != nil || errores.TieneErrores() {
		t.Fatalf("desactivar primera autorizacion: err=%v errores=%v", err, errores)
	}

	segunda, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 8,
	})
	if err != nil || errores.TieneErrores() {
		t.Fatalf("crear segunda autorizacion fisica tras desactivar la primera: err=%v errores=%v", err, errores)
	}
	if !segunda.Activa {
		t.Fatalf("esperaba que la segunda autorizacion fisica quedara activa")
	}
}

func TestServiceActualizarRechazaActivarSegundaMismoTipo(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := autorizacion.NuevoRepository(conexion)
	service := autorizacion.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Fisica")

	if _, errores, err := service.Crear(ctx, autorizacion.SolicitudCrearAutorizacion{
		PacienteID:      pacienteID,
		TipoTerapia:     "fisica",
		SesionesTotales: 10,
	}); err != nil || errores.TieneErrores() {
		t.Fatalf("crear autorizacion activa: err=%v errores=%v", err, errores)
	}

	inactivaID := insertarAutorizacionInactivaTest(t, conexion, pacienteID, "fisica")

	_, errores, err := service.Actualizar(ctx, inactivaID, autorizacion.SolicitudActualizarAutorizacion{
		TipoTerapia:     "fisica",
		SesionesTotales: 5,
		Activa:          true,
	})
	if errores.TieneErrores() {
		t.Fatalf("no esperaba errores de validacion, obtuvo %v", errores)
	}
	if !errors.Is(err, autorizacion.ErrAutorizacionActivaDuplicada) {
		t.Fatalf("esperaba ErrAutorizacionActivaDuplicada al activar una segunda del mismo tipo, obtuvo %v", err)
	}
}

func insertarPacienteTest(t *testing.T, conexion *sql.DB, nombre string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(`INSERT INTO paciente (nombre, tipo_terapia) VALUES (?, 'fisica')`, nombre)
	if err != nil {
		t.Fatalf("insertar paciente %s: %v", nombre, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de paciente %s: %v", nombre, err)
	}
	return id
}

func insertarAutorizacionInactivaTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, tipo_terapia) VALUES (?, 10, 0, ?)`,
		pacienteID, tipoTerapia,
	)
	if err != nil {
		t.Fatalf("insertar autorizacion inactiva %s para paciente %d: %v", tipoTerapia, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de autorizacion inactiva: %v", err)
	}
	return id
}
