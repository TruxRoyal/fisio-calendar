package testdb

import (
	"database/sql"
	"path/filepath"
	"testing"

	"fisio-backend/internal/shared/db"
)

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
