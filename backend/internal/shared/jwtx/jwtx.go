package jwtx

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrTokenInvalido = errors.New("token invalido")

const duracionAccessToken = 15 * time.Minute

type claims struct {
	Rol string `json:"rol"`
	jwt.RegisteredClaims
}

func GenerarAccessToken(secreto string, usuarioID int64, rol string) (string, error) {
	ahora := time.Now()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		Rol: rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(usuarioID, 10),
			IssuedAt:  jwt.NewNumericDate(ahora),
			ExpiresAt: jwt.NewNumericDate(ahora.Add(duracionAccessToken)),
		},
	})

	firmado, err := token.SignedString([]byte(secreto))
	if err != nil {
		return "", fmt.Errorf("firmar access token: %w", err)
	}

	return firmado, nil
}

func ValidarAccessToken(secreto, tokenCrudo string) (int64, string, error) {
	token, err := jwt.ParseWithClaims(tokenCrudo, &claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalido
		}
		return []byte(secreto), nil
	})
	if err != nil || !token.Valid {
		return 0, "", ErrTokenInvalido
	}

	datos, ok := token.Claims.(*claims)
	if !ok {
		return 0, "", ErrTokenInvalido
	}

	usuarioID, err := strconv.ParseInt(datos.Subject, 10, 64)
	if err != nil {
		return 0, "", ErrTokenInvalido
	}

	return usuarioID, datos.Rol, nil
}
