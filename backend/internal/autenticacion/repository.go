package autenticacion

import (
	"context"
	"database/sql"
	"fmt"
)

type Repository struct {
	db *sql.DB
}

func NuevoRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ObtenerPorEmail(ctx context.Context, email string) (*usuarioConHash, error) {
	var u usuarioConHash

	err := r.db.QueryRowContext(ctx, `
		SELECT id, nombre, email, password_hash, rol, intentos_fallidos, bloqueado_hasta
		FROM usuario
		WHERE email = ?
	`, email).Scan(&u.ID, &u.Nombre, &u.Email, &u.PasswordHash, &u.Rol, &u.IntentosFallidos, &u.BloqueadoHasta)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener usuario por email: %w", err)
	}

	return &u, nil
}

func (r *Repository) ObtenerPorID(ctx context.Context, id int64) (*Usuario, error) {
	var u Usuario

	err := r.db.QueryRowContext(ctx, `
		SELECT id, nombre, email, rol
		FROM usuario
		WHERE id = ?
	`, id).Scan(&u.ID, &u.Nombre, &u.Email, &u.Rol)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener usuario por id: %w", err)
	}

	return &u, nil
}

func (r *Repository) Crear(ctx context.Context, nombre, email, passwordHash, rol string) (*Usuario, error) {
	resultado, err := r.db.ExecContext(ctx, `
		INSERT INTO usuario (nombre, email, password_hash, rol)
		VALUES (?, ?, ?, ?)
	`, nombre, email, passwordHash, rol)
	if err != nil {
		return nil, fmt.Errorf("crear usuario: %w", err)
	}

	id, err := resultado.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("obtener id de usuario creado: %w", err)
	}

	return r.ObtenerPorID(ctx, id)
}

func (r *Repository) RegistrarIntentoFallido(ctx context.Context, usuarioID int64) error {
	transaccion, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("iniciar transaccion de intento fallido: %w", err)
	}
	defer transaccion.Rollback()

	if _, err := transaccion.ExecContext(ctx, `
		UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?
	`, usuarioID); err != nil {
		return fmt.Errorf("incrementar intentos fallidos: %w", err)
	}

	var intentos int
	if err := transaccion.QueryRowContext(ctx, `
		SELECT intentos_fallidos FROM usuario WHERE id = ?
	`, usuarioID).Scan(&intentos); err != nil {
		return fmt.Errorf("leer intentos fallidos: %w", err)
	}

	if intentos >= 5 {
		if _, err := transaccion.ExecContext(ctx, `
			UPDATE usuario SET bloqueado_hasta = datetime('now', '+15 minutes') WHERE id = ?
		`, usuarioID); err != nil {
			return fmt.Errorf("bloquear usuario: %w", err)
		}
	}

	return transaccion.Commit()
}

func (r *Repository) ResetearIntentosFallidos(ctx context.Context, usuarioID int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?
	`, usuarioID)
	if err != nil {
		return fmt.Errorf("resetear intentos fallidos: %w", err)
	}
	return nil
}

func (r *Repository) GuardarRefreshToken(ctx context.Context, usuarioID int64, familiaID, tokenHash, expiraEn string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO refresh_token (usuario_id, familia_id, token_hash, expira_en)
		VALUES (?, ?, ?, ?)
	`, usuarioID, familiaID, tokenHash, expiraEn)
	if err != nil {
		return fmt.Errorf("guardar refresh token: %w", err)
	}
	return nil
}

func (r *Repository) ObtenerRefreshTokenPorHash(ctx context.Context, tokenHash string) (*refreshTokenFila, error) {
	var f refreshTokenFila
	var revocado int

	err := r.db.QueryRowContext(ctx, `
		SELECT id, usuario_id, familia_id, expira_en, revocado
		FROM refresh_token
		WHERE token_hash = ?
	`, tokenHash).Scan(&f.ID, &f.UsuarioID, &f.FamiliaID, &f.ExpiraEn, &revocado)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("obtener refresh token: %w", err)
	}
	f.Revocado = revocado == 1

	return &f, nil
}

func (r *Repository) RevocarRefreshToken(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_token SET revocado = 1 WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("revocar refresh token: %w", err)
	}
	return nil
}

func (r *Repository) RevocarFamiliaRefreshToken(ctx context.Context, familiaID string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_token SET revocado = 1 WHERE familia_id = ?`, familiaID)
	if err != nil {
		return fmt.Errorf("revocar familia de refresh token: %w", err)
	}
	return nil
}
