package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

func Abrir(rutaArchivo string) (*sql.DB, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)", rutaArchivo)

	conexion, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("abrir base de datos: %w", err)
	}

	conexion.SetMaxOpenConns(1)

	if _, err := conexion.Exec("PRAGMA journal_mode = WAL"); err != nil {
		return nil, fmt.Errorf("configurar journal_mode: %w", err)
	}

	return conexion, nil
}
