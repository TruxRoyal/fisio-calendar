package httpx

import (
	"context"
	"log"
	"net/http"
	"time"

	"fisio-backend/internal/shared/jwtx"
)

func Logger(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inicio := time.Now()
		envoltorio := &escritorConEstado{ResponseWriter: w, status: http.StatusOK}
		siguiente.ServeHTTP(envoltorio, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, envoltorio.status, time.Since(inicio))
	})
}

func Recuperar(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("panic recuperado: %v", err)
				Error(w, http.StatusInternalServerError, "error_interno", "Ocurrio un error inesperado")
			}
		}()
		siguiente.ServeHTTP(w, r)
	})
}

type escritorConEstado struct {
	http.ResponseWriter
	status int
}

func (e *escritorConEstado) WriteHeader(status int) {
	e.status = status
	e.ResponseWriter.WriteHeader(status)
}

type claveContexto string

const ClaveUsuarioID claveContexto = "usuario_id"
const ClaveRol claveContexto = "rol"

func RequiereAuth(jwtSecreto string) func(http.Handler) http.Handler {
	return func(siguiente http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("access_token")
			if err != nil {
				Error(w, http.StatusUnauthorized, "no_autenticado", "Se requiere autenticacion")
				return
			}

			usuarioID, rol, err := jwtx.ValidarAccessToken(jwtSecreto, cookie.Value)
			if err != nil {
				Error(w, http.StatusUnauthorized, "no_autenticado", "Se requiere autenticacion")
				return
			}

			ctx := context.WithValue(r.Context(), ClaveUsuarioID, usuarioID)
			ctx = context.WithValue(ctx, ClaveRol, rol)
			siguiente.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UsuarioIDDesdeContexto(ctx context.Context) (int64, bool) {
	usuarioID, ok := ctx.Value(ClaveUsuarioID).(int64)
	return usuarioID, ok
}

func RolDesdeContexto(ctx context.Context) (string, bool) {
	rol, ok := ctx.Value(ClaveRol).(string)
	return rol, ok
}

func CORS(origenPermitido string) func(http.Handler) http.Handler {
	return func(siguiente http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if origenPermitido == "" {
				siguiente.ServeHTTP(w, r)
				return
			}

			origen := r.Header.Get("Origin")
			if origen == origenPermitido {
				w.Header().Set("Access-Control-Allow-Origin", origenPermitido)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			siguiente.ServeHTTP(w, r)
		})
	}
}
