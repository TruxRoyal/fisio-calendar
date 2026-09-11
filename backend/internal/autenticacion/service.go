package autenticacion

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"fisio-backend/internal/shared/jwtx"
	"fisio-backend/internal/shared/validate"
)

var ErrCredencialesInvalidas = errors.New("credenciales invalidas")
var ErrCuentaBloqueada = errors.New("credenciales invalidas")
var ErrRefreshInvalido = errors.New("refresh token invalido")

const duracionRefreshToken = 7 * 24 * time.Hour
const costoBcrypt = 12
const formatoFechaSQLite = "2006-01-02 15:04:05"

type Service struct {
	repo       *Repository
	jwtSecreto string
}

func NuevoService(repo *Repository, jwtSecreto string) *Service {
	return &Service{repo: repo, jwtSecreto: jwtSecreto}
}

func (s *Service) Login(ctx context.Context, email, password string) (*Usuario, string, string, error) {
	usuario, err := s.repo.ObtenerPorEmail(ctx, email)
	if err != nil {
		return nil, "", "", err
	}
	if usuario == nil {
		return nil, "", "", ErrCredencialesInvalidas
	}

	if cuentaBloqueada(usuario.BloqueadoHasta) {
		return nil, "", "", ErrCredencialesInvalidas
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(password)); err != nil {
		if err := s.repo.RegistrarIntentoFallido(ctx, usuario.ID); err != nil {
			return nil, "", "", err
		}
		return nil, "", "", ErrCredencialesInvalidas
	}

	if err := s.repo.ResetearIntentosFallidos(ctx, usuario.ID); err != nil {
		return nil, "", "", err
	}

	return s.emitirSesion(ctx, usuario.ID, usuario.Nombre, usuario.Email, usuario.Rol, uuid.NewString())
}

func (s *Service) RefrescarSesion(ctx context.Context, refreshTokenCrudo string) (*Usuario, string, string, error) {
	fila, err := s.repo.ObtenerRefreshTokenPorHash(ctx, hashearToken(refreshTokenCrudo))
	if err != nil {
		return nil, "", "", err
	}
	if fila == nil {
		return nil, "", "", ErrRefreshInvalido
	}

	if fila.Revocado {
		if err := s.repo.RevocarFamiliaRefreshToken(ctx, fila.FamiliaID); err != nil {
			return nil, "", "", err
		}
		return nil, "", "", ErrRefreshInvalido
	}

	if refreshTokenExpirado(fila.ExpiraEn) {
		if err := s.repo.RevocarRefreshToken(ctx, fila.ID); err != nil {
			return nil, "", "", err
		}
		return nil, "", "", ErrRefreshInvalido
	}

	if err := s.repo.RevocarRefreshToken(ctx, fila.ID); err != nil {
		return nil, "", "", err
	}

	usuario, err := s.repo.ObtenerPorID(ctx, fila.UsuarioID)
	if err != nil {
		return nil, "", "", err
	}
	if usuario == nil {
		return nil, "", "", ErrRefreshInvalido
	}

	return s.emitirSesion(ctx, usuario.ID, usuario.Nombre, usuario.Email, usuario.Rol, fila.FamiliaID)
}

func (s *Service) CerrarSesion(ctx context.Context, refreshTokenCrudo string) error {
	if refreshTokenCrudo == "" {
		return nil
	}

	fila, err := s.repo.ObtenerRefreshTokenPorHash(ctx, hashearToken(refreshTokenCrudo))
	if err != nil {
		return err
	}
	if fila == nil {
		return nil
	}

	return s.repo.RevocarRefreshToken(ctx, fila.ID)
}

func (s *Service) ObtenerPorID(ctx context.Context, id int64) (*Usuario, error) {
	return s.repo.ObtenerPorID(ctx, id)
}

func (s *Service) CrearUsuario(ctx context.Context, nombre, email, password, rol string) (*Usuario, error) {
	errores := validate.Nuevo()
	validate.TextoNoVacio(nombre, "nombre", errores)
	validate.Email(email, "email", errores)
	validate.LongitudMinima(password, 8, "password", errores)
	validate.Enum(rol, RolesValidos, "rol", errores)
	if errores.TieneErrores() {
		return nil, fmt.Errorf("datos invalidos: %v", errores)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), costoBcrypt)
	if err != nil {
		return nil, fmt.Errorf("hashear password: %w", err)
	}

	return s.repo.Crear(ctx, nombre, email, string(hash), rol)
}

func (s *Service) emitirSesion(ctx context.Context, usuarioID int64, nombre, email, rol, familiaID string) (*Usuario, string, string, error) {
	refreshTokenCrudo, tokenHash, err := generarRefreshToken()
	if err != nil {
		return nil, "", "", err
	}

	expiraEn := time.Now().UTC().Add(duracionRefreshToken).Format(formatoFechaSQLite)
	if err := s.repo.GuardarRefreshToken(ctx, usuarioID, familiaID, tokenHash, expiraEn); err != nil {
		return nil, "", "", err
	}

	accessToken, err := jwtx.GenerarAccessToken(s.jwtSecreto, usuarioID, rol)
	if err != nil {
		return nil, "", "", err
	}

	return &Usuario{ID: usuarioID, Nombre: nombre, Email: email, Rol: rol}, accessToken, refreshTokenCrudo, nil
}

func generarRefreshToken() (crudo, hash string, err error) {
	bytesAleatorios := make([]byte, 32)
	if _, err := rand.Read(bytesAleatorios); err != nil {
		return "", "", fmt.Errorf("generar refresh token: %w", err)
	}

	crudo = base64.RawURLEncoding.EncodeToString(bytesAleatorios)
	return crudo, hashearToken(crudo), nil
}

func hashearToken(tokenCrudo string) string {
	sumatoria := sha256.Sum256([]byte(tokenCrudo))
	return hex.EncodeToString(sumatoria[:])
}

func cuentaBloqueada(bloqueadoHasta *string) bool {
	if bloqueadoHasta == nil || *bloqueadoHasta == "" {
		return false
	}

	limite, err := time.Parse(formatoFechaSQLite, *bloqueadoHasta)
	if err != nil {
		return false
	}

	return time.Now().UTC().Before(limite)
}

func refreshTokenExpirado(expiraEn string) bool {
	limite, err := time.Parse(formatoFechaSQLite, expiraEn)
	if err != nil {
		return true
	}
	return time.Now().UTC().After(limite)
}
