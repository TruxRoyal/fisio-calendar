// Package testdb provee un helper de pruebas para levantar una base de datos
// SQLite temporal con todas las migraciones embebidas ya aplicadas.
package testdb

import (
	"database/sql"
	"path/filepath"
	"testing"

	"fisio-backend/internal/shared/db"
)

// Nueva crea una base de datos SQLite en un archivo temporal, ejecuta todas
// las migraciones embebidas (sin la semilla de datos de desarrollo) y
// registra su cierre automático al finalizar el test.
func Nueva(t *testing.T) *sql.DB {
	t.Helper()

	conexion, err := db.Abrir(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}

	if err := db.Migrar(conexion, false); err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { conexion.Close() })

	return conexion
}
