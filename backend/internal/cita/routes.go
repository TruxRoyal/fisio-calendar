package cita

import (
	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

func RegistrarRutas(h *Handler) httpx.RegistradorRutas {
	return func(r chi.Router) {
		r.Route("/citas", func(rc chi.Router) {
			rc.Get("/", h.Listar)
			rc.Post("/", h.Crear)
			rc.Post("/verificar-choque", h.VerificarChoque)
			rc.Get("/{id}", h.ObtenerPorID)
			rc.Put("/{id}", h.Actualizar)
			rc.Patch("/{id}/estado", h.CambiarEstado)
			rc.Delete("/{id}", h.Eliminar)
		})
	}
}
