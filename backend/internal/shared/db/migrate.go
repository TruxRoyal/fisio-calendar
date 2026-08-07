package db

import (
	"database/sql"
	"fmt"
	"sort"
	"strings"

	"fisio-backend/migrations"
)

func Migrar(conexion *sql.DB, aplicarSeed bool) error {
	if err := crearTablaMigraciones(conexion); err != nil {
		return err
	}

	entradas, err := migrations.FS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("leer migraciones embebidas: %w", err)
	}

	nombres := make([]string, 0, len(entradas))
	for _, entrada := range entradas {
		if !entrada.IsDir() && strings.HasSuffix(entrada.Name(), ".sql") {
			nombres = append(nombres, entrada.Name())
		}
	}
	sort.Strings(nombres)

	for _, nombre := range nombres {
		esSeed := strings.Contains(nombre, "seed")
		if esSeed && !aplicarSeed {
			continue
		}

		yaAplicada, err := migracionAplicada(conexion, nombre)
		if err != nil {
			return err
		}
		if yaAplicada {
			continue
		}

		contenido, err := migrations.FS.ReadFile(nombre)
		if err != nil {
			return fmt.Errorf("leer migracion %s: %w", nombre, err)
		}

		if err := ejecutarMigracion(conexion, nombre, string(contenido)); err != nil {
			return fmt.Errorf("aplicar migracion %s: %w", nombre, err)
		}
	}

	return nil
}

func crearTablaMigraciones(conexion *sql.DB) error {
	_, err := conexion.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			nombre TEXT PRIMARY KEY,
			aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`)
	return err
}

func migracionAplicada(conexion *sql.DB, nombre string) (bool, error) {
	var existe int
	err := conexion.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE nombre = ?", nombre).Scan(&existe)
	if err != nil {
		return false, fmt.Errorf("verificar migracion %s: %w", nombre, err)
	}
	return existe > 0, nil
}

func ejecutarMigracion(conexion *sql.DB, nombre, contenido string) error {
	transaccion, err := conexion.Begin()
	if err != nil {
		return err
	}
	defer transaccion.Rollback()

	for _, sentencia := range dividirSentencias(contenido) {
		if _, err := transaccion.Exec(sentencia); err != nil {
			return fmt.Errorf("ejecutar sentencia: %w", err)
		}
	}

	if _, err := transaccion.Exec("INSERT INTO schema_migrations (nombre) VALUES (?)", nombre); err != nil {
		return err
	}

	return transaccion.Commit()
}

func dividirSentencias(contenido string) []string {
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
