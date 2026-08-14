package paciente

import (
	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

func RegistrarRutas(h *Handler) httpx.RegistradorRutas {
	return func(r chi.Router) {
		r.Route("/pacientes", func(rp chi.Router) {
			rp.Get("/", h.Listar)
			rp.Post("/", h.Crear)
			rp.Get("/{id}", h.ObtenerDetalle)
			rp.Put("/{id}", h.Actualizar)
			rp.Delete("/{id}", h.Eliminar)
			rp.Get("/{id}/cronologia", h.ObtenerCronologia)
			rp.Get("/{id}/resumen-financiero", h.ObtenerResumenFinanciero)
		})
	}
}
