package autenticacion

import (
	"encoding/json"
	"errors"
	"net/http"

	"fisio-backend/internal/shared/httpx"
	"fisio-backend/internal/shared/validate"
)

type Handler struct {
	service      *Service
	jwtSecreto   string
	cookieSecure bool
}

func NuevoHandler(service *Service, jwtSecreto string, cookieSecure bool) *Handler {
	return &Handler{service: service, jwtSecreto: jwtSecreto, cookieSecure: cookieSecure}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var solicitud SolicitudLogin
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	errores := validate.Nuevo()
	validate.Email(solicitud.Email, "email", errores)
	validate.TextoNoVacio(solicitud.Password, "password", errores)
	if errores.TieneErrores() {
		httpx.Error(w, http.StatusUnauthorized, "credenciales_invalidas", "Email o contraseña incorrectos")
		return
	}

	usuario, accessToken, refreshToken, err := h.service.Login(r.Context(), solicitud.Email, solicitud.Password)
	if err != nil {
		manejarError(w, err)
		return
	}

	establecerCookiesSesion(w, h.cookieSecure, accessToken, refreshToken)
	httpx.JSON(w, http.StatusOK, usuario)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "sesion_invalida", "Se requiere autenticacion")
		return
	}

	usuario, accessToken, refreshToken, err := h.service.RefrescarSesion(r.Context(), cookie.Value)
	if err != nil {
		limpiarCookiesSesion(w, h.cookieSecure)
		httpx.Error(w, http.StatusUnauthorized, "sesion_invalida", "Se requiere autenticacion")
		return
	}

	establecerCookiesSesion(w, h.cookieSecure, accessToken, refreshToken)
	httpx.JSON(w, http.StatusOK, usuario)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	refreshTokenCrudo := ""
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		refreshTokenCrudo = cookie.Value
	}

	h.service.CerrarSesion(r.Context(), refreshTokenCrudo)
	limpiarCookiesSesion(w, h.cookieSecure)
	httpx.NoContent(w)
}

func (h *Handler) Yo(w http.ResponseWriter, r *http.Request) {
	usuarioID, ok := httpx.UsuarioIDDesdeContexto(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "no_autenticado", "Se requiere autenticacion")
		return
	}

	usuario, err := h.service.ObtenerPorID(r.Context(), usuarioID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}
	if usuario == nil {
		httpx.Error(w, http.StatusUnauthorized, "no_autenticado", "Se requiere autenticacion")
		return
	}

	httpx.JSON(w, http.StatusOK, usuario)
}

func manejarError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrCredencialesInvalidas), errors.Is(err, ErrCuentaBloqueada):
		httpx.Error(w, http.StatusUnauthorized, "credenciales_invalidas", "Email o contraseña incorrectos")
	case errors.Is(err, ErrRefreshInvalido):
		httpx.Error(w, http.StatusUnauthorized, "sesion_invalida", "Se requiere autenticacion")
	default:
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
	}
}
