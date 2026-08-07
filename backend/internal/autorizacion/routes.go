package autorizacion

import (
	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

func RegistrarRutas(h *Handler) httpx.RegistradorRutas {
	return func(r chi.Router) {
		r.Route("/autorizaciones", func(ra chi.Router) {
			ra.Get("/", h.ListarPorPaciente)
			ra.Post("/", h.Crear)
			ra.Get("/{id}", h.ObtenerPorID)
			ra.Put("/{id}", h.Actualizar)
			ra.Delete("/{id}", h.Eliminar)
		})
	}
}
