package db_test

import (
	"database/sql"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"fisio-backend/internal/shared/db"
	"fisio-backend/migrations"
)

func TestMigrarBackfillYDedupeTipoTerapia(t *testing.T) {
	conexion, err := db.Abrir(filepath.Join(t.TempDir(), "migrate_test.db"))
	if err != nil {
		t.Fatalf("abrir base de datos: %v", err)
	}
	defer conexion.Close()

	aplicarMigracionesHasta(t, conexion, "0004_origen_paciente.sql")

	pacienteRespiratoria := insertarPaciente(t, conexion, "Ana Respiratoria", "respiratoria")
	pacienteFisica := insertarPaciente(t, conexion, "Beto Fisica", "fisica")
	pacienteSinTipo := insertarPaciente(t, conexion, "Carla SinTipo", "")

	citaRespiratoria := insertarCita(t, conexion, pacienteRespiratoria)
	citaSinTipo := insertarCita(t, conexion, pacienteSinTipo)

	autorizacionAntigua := insertarAutorizacion(t, conexion, pacienteRespiratoria, "2024-01-01 00:00:00")
	autorizacionReciente := insertarAutorizacion(t, conexion, pacienteRespiratoria, "2024-06-01 00:00:00")
	autorizacionFisica := insertarAutorizacion(t, conexion, pacienteFisica, "2024-01-01 00:00:00")

	if err := db.Migrar(conexion, false); err != nil {
		t.Fatalf("Migrar (aplicar 0005/0006) fallo: %v", err)
	}

	if tipo := leerTipoTerapiaCita(t, conexion, citaRespiratoria); tipo != "respiratoria" {
		t.Errorf("cita del paciente respiratoria: esperaba tipo_terapia=respiratoria, obtuvo %q", tipo)
	}

	if tipo := leerTipoTerapiaCita(t, conexion, citaSinTipo); tipo != "fisica" {
		t.Errorf("cita de paciente con tipo_terapia NULL: esperaba backfill por defecto a fisica, obtuvo %q", tipo)
	}

	if activa, tipo := leerAutorizacion(t, conexion, autorizacionAntigua); activa || tipo != "respiratoria" {
		t.Errorf("autorizacion antigua duplicada: esperaba activa=false, tipo_terapia=respiratoria; obtuvo activa=%v tipo=%q", activa, tipo)
	}

	if activa, tipo := leerAutorizacion(t, conexion, autorizacionReciente); !activa || tipo != "respiratoria" {
		t.Errorf("autorizacion mas reciente: esperaba activa=true, tipo_terapia=respiratoria; obtuvo activa=%v tipo=%q", activa, tipo)
	}

	if activa, tipo := leerAutorizacion(t, conexion, autorizacionFisica); !activa || tipo != "fisica" {
		t.Errorf("autorizacion fisica sin duplicado: esperaba activa=true, tipo_terapia=fisica; obtuvo activa=%v tipo=%q", activa, tipo)
	}

	var totalActivasRespiratoria int
	if err := conexion.QueryRow(
		`SELECT COUNT(*) FROM autorizacion WHERE paciente_id = ? AND tipo_terapia = 'respiratoria' AND activa = 1`,
		pacienteRespiratoria,
	).Scan(&totalActivasRespiratoria); err != nil {
		t.Fatalf("contar autorizaciones activas: %v", err)
	}
	if totalActivasRespiratoria != 1 {
		t.Errorf("esperaba exactamente 1 autorizacion activa respiratoria para el paciente tras el dedupe, obtuvo %d", totalActivasRespiratoria)
	}

	_, err = conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, tipo_terapia, creado_en) VALUES (?, 10, 1, 'respiratoria', '2024-09-01 00:00:00')`,
		pacienteRespiratoria,
	)
	if err == nil {
		t.Fatal("esperaba que idx_autoriz_activa_por_tipo rechazara una segunda autorizacion activa respiratoria para el mismo paciente")
	}
	if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
		t.Errorf("esperaba error de restriccion UNIQUE, obtuvo: %v", err)
	}
}

func aplicarMigracionesHasta(t *testing.T, conexion *sql.DB, corte string) {
	t.Helper()

	if _, err := conexion.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			nombre TEXT PRIMARY KEY,
			aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`); err != nil {
		t.Fatalf("crear tabla schema_migrations: %v", err)
	}

	entradas, err := migrations.FS.ReadDir(".")
	if err != nil {
		t.Fatalf("leer migraciones embebidas: %v", err)
	}

	nombres := make([]string, 0, len(entradas))
	for _, entrada := range entradas {
		nombre := entrada.Name()
		if entrada.IsDir() || !strings.HasSuffix(nombre, ".sql") || strings.Contains(nombre, "seed") {
			continue
		}
		if nombre > corte {
			continue
		}
		nombres = append(nombres, nombre)
	}
	sort.Strings(nombres)

	for _, nombre := range nombres {
		contenido, err := migrations.FS.ReadFile(nombre)
		if err != nil {
			t.Fatalf("leer migracion %s: %v", nombre, err)
		}

		for _, sentencia := range dividirSentenciasDeTest(string(contenido)) {
			if _, err := conexion.Exec(sentencia); err != nil {
				t.Fatalf("aplicar migracion %s: %v", nombre, err)
			}
		}

		if _, err := conexion.Exec("INSERT INTO schema_migrations (nombre) VALUES (?)", nombre); err != nil {
			t.Fatalf("registrar migracion %s: %v", nombre, err)
		}
	}
}

func dividirSentenciasDeTest(contenido string) []string {
	partes := strings.Split(contenido, ";")
	sentencias := make([]string, 0, len(partes))
	for _, parte := range partes {
		limpia := strings.TrimSpace(parte)
		if limpia != "" {
			sentencias = append(sentencias, limpia)
		}
	}
	return sentencias
}

func insertarPaciente(t *testing.T, conexion *sql.DB, nombre, tipoTerapia string) int64 {
	t.Helper()

	var resultado sql.Result
	var err error
	if tipoTerapia == "" {
		resultado, err = conexion.Exec(`INSERT INTO paciente (nombre, tipo_terapia) VALUES (?, NULL)`, nombre)
	} else {
		resultado, err = conexion.Exec(`INSERT INTO paciente (nombre, tipo_terapia) VALUES (?, ?)`, nombre, tipoTerapia)
	}
	if err != nil {
		t.Fatalf("insertar paciente %s: %v", nombre, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de paciente %s: %v", nombre, err)
	}
	return id
}

func insertarCita(t *testing.T, conexion *sql.DB, pacienteID int64) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO cita (paciente_id, inicio, fin) VALUES (?, '2024-01-01T09:00:00', '2024-01-01T10:00:00')`,
		pacienteID,
	)
	if err != nil {
		t.Fatalf("insertar cita para paciente %d: %v", pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de cita: %v", err)
	}
	return id
}

func insertarAutorizacion(t *testing.T, conexion *sql.DB, pacienteID int64, creadoEn string) int64 {
	t.Helper()

	resultado, err := conexion.Exec(
		`INSERT INTO autorizacion (paciente_id, sesiones_totales, activa, creado_en) VALUES (?, 10, 1, ?)`,
		pacienteID, creadoEn,
	)
	if err != nil {
		t.Fatalf("insertar autorizacion para paciente %d: %v", pacienteID, err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		t.Fatalf("obtener id de autorizacion: %v", err)
	}
	return id
}

func leerTipoTerapiaCita(t *testing.T, conexion *sql.DB, citaID int64) string {
	t.Helper()

	var tipo string
	if err := conexion.QueryRow(`SELECT tipo_terapia FROM cita WHERE id = ?`, citaID).Scan(&tipo); err != nil {
		t.Fatalf("leer tipo_terapia de cita %d: %v", citaID, err)
	}
	return tipo
}

func leerAutorizacion(t *testing.T, conexion *sql.DB, autorizacionID int64) (activa bool, tipo string) {
	t.Helper()

	var activaInt int
	if err := conexion.QueryRow(`SELECT activa, tipo_terapia FROM autorizacion WHERE id = ?`, autorizacionID).Scan(&activaInt, &tipo); err != nil {
		t.Fatalf("leer autorizacion %d: %v", autorizacionID, err)
	}
	return activaInt == 1, tipo
}
