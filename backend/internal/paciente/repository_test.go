package paciente_test

import (
	"context"
	"database/sql"
	"testing"

	"fisio-backend/internal/paciente"
	"fisio-backend/internal/shared/testdb"
)

// TestListarIncluyeAmbasAutorizacionesActivasDePacienteDual cubre el area de
// mayor riesgo del design.md ("Listar per-tipo auths"): antes de esta unidad,
// Listar usaba un LEFT JOIN correlacionado + SELECT DISTINCT que solo podia
// traer UNA autorizacion activa por paciente. Con la migracion 0006, un
// paciente puede tener hasta una autorizacion activa POR tipoTerapia, asi
// que un paciente con autorizaciones activas fisica Y respiratoria debe
// aparecer en el listado exactamente una vez (no duplicado por el join) y
// con AutorizacionesActivas conteniendo ambas (no solo una perdida).
func TestListarIncluyeAmbasAutorizacionesActivasDePacienteDual(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := paciente.NuevoRepository(conexion)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Dual", "fisica")
	autorizacionFisicaID := insertarAutorizacionActivaTest(t, conexion, pacienteID, "fisica", 10)
	autorizacionRespiratoriaID := insertarAutorizacionActivaTest(t, conexion, pacienteID, "respiratoria", 8)

	// Un segundo paciente sin ninguna autorizacion activa, para probar que
	// el stitch en Go no arrastra autorizaciones de otro paciente ni rompe
	// cuando el mapa no tiene ninguna entrada para un id.
	otroPacienteID := insertarPacienteTest(t, conexion, "Paciente Sin Autorizacion", "fisica")

	pacientes, err := repo.Listar(ctx, "", "")
	if err != nil {
		t.Fatalf("listar pacientes: %v", err)
	}

	var dual, otro *paciente.PacienteDetalle
	ocurrenciasDual := 0
	for i := range pacientes {
		switch pacientes[i].ID {
		case pacienteID:
			ocurrenciasDual++
			dual = &pacientes[i]
		case otroPacienteID:
			otro = &pacientes[i]
		}
	}

	if ocurrenciasDual != 1 {
		t.Fatalf("esperaba exactamente 1 fila para el paciente dual, obtuvo %d (el JOIN no deberia duplicar filas por autorizacion)", ocurrenciasDual)
	}
	if dual == nil {
		t.Fatal("no se encontro al paciente dual en el listado")
	}
	if len(dual.AutorizacionesActivas) != 2 {
		t.Fatalf("esperaba 2 autorizaciones activas (fisica + respiratoria), obtuvo %d: %+v", len(dual.AutorizacionesActivas), dual.AutorizacionesActivas)
	}

	tipos := map[string]int64{}
	for _, a := range dual.AutorizacionesActivas {
		tipos[a.TipoTerapia] = a.ID
	}
	if tipos["fisica"] != autorizacionFisicaID {
		t.Fatalf("esperaba autorizacion fisica id=%d, obtuvo %d", autorizacionFisicaID, tipos["fisica"])
	}
	if tipos["respiratoria"] != autorizacionRespiratoriaID {
		t.Fatalf("esperaba autorizacion respiratoria id=%d, obtuvo %d", autorizacionRespiratoriaID, tipos["respiratoria"])
	}

	if len(dual.TiposTerapia) != 2 || dual.TiposTerapia[0] != "fisica" || dual.TiposTerapia[1] != "respiratoria" {
		t.Fatalf("esperaba TiposTerapia=[fisica respiratoria], obtuvo %v", dual.TiposTerapia)
	}

	if otro == nil {
		t.Fatal("no se encontro al paciente sin autorizacion en el listado")
	}
	if len(otro.AutorizacionesActivas) != 0 {
		t.Fatalf("esperaba 0 autorizaciones activas para el paciente sin autorizacion, obtuvo %d", len(otro.AutorizacionesActivas))
	}
	if len(otro.TiposTerapia) != 1 || otro.TiposTerapia[0] != "fisica" {
		t.Fatalf("esperaba TiposTerapia=[fisica] (solo el tipo preferido, sin autorizaciones activas), obtuvo %v", otro.TiposTerapia)
	}
}

// TestObtenerDetalleIncluyeAmbasAutorizacionesActivas cubre el mismo
// escenario dual mediante ObtenerDetalle (Service.ObtenerDetalle ->
// ListarAutorizacionesActivas), el reemplazo del antiguo
// ObtenerAutorizacionActiva singular.
func TestObtenerDetalleIncluyeAmbasAutorizacionesActivas(t *testing.T) {
	conexion := testdb.Nueva(t)
	repo := paciente.NuevoRepository(conexion)
	service := paciente.NuevoService(repo)
	ctx := context.Background()

	pacienteID := insertarPacienteTest(t, conexion, "Paciente Dual", "respiratoria")
	insertarAutorizacionActivaTest(t, conexion, pacienteID, "fisica", 10)
	insertarAutorizacionActivaTest(t, conexion, pacienteID, "respiratoria", 8)

	detalle, err := service.ObtenerDetalle(ctx, pacienteID)
	if err != nil {
		t.Fatalf("obtener detalle: %v", err)
	}

	if len(detalle.AutorizacionesActivas) != 2 {
		t.Fatalf("esperaba 2 autorizaciones activas, obtuvo %d", len(detalle.AutorizacionesActivas))
	}
	if len(detalle.TiposTerapia) != 2 {
		t.Fatalf("esperaba 2 tipos de terapia derivados, obtuvo %v", detalle.TiposTerapia)
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

func insertarAutorizacionActivaTest(t *testing.T, conexion *sql.DB, pacienteID int64, tipoTerapia string, sesionesTotales int) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, tipo_terapia) VALUES (?, ?, 1, ?)`,
		pacienteID, sesionesTotales, tipoTerapia,
	)
	if err != nil {
		t.Fatalf("insertar autorizacion activa %s para paciente %d: %v", tipoTerapia, pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de autorizacion activa: %v", err)
	}
	return id
}
