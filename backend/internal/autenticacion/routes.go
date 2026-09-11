package autenticacion

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

func RegistrarRutas(h *Handler, middlewareAuth func(http.Handler) http.Handler) httpx.RegistradorRutas {
	return func(r chi.Router) {
		r.Route("/auth", func(ra chi.Router) {
			ra.Post("/login", h.Login)
			ra.Post("/refresh", h.Refresh)
			ra.Post("/logout", h.Logout)
			ra.With(middlewareAuth).Get("/me", h.Yo)
		})
	}
}
