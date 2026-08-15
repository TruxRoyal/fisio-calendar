package resumen

import (
	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

func RegistrarRutas(h *Handler) httpx.RegistradorRutas {
	return func(r chi.Router) {
		r.Route("/resumen", func(rr chi.Router) {
			rr.Get("/mensual", h.ObtenerMensual)
			rr.Get("/mensual/exportar", h.ExportarExcel)
			rr.Get("/historico", h.ObtenerHistorico)
			rr.Get("/desglose", h.ObtenerDesglose)
			rr.Get("/capacidad-mensual", h.ObtenerCapacidadMensual)
		})
	}
}
