package resumen

import (
	"fmt"
	"net/http"
	"strconv"

	"fisio-backend/internal/shared/httpx"
)

type Handler struct {
	service *Service
}

func NuevoHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ObtenerMensual(w http.ResponseWriter, r *http.Request) {
	anio, mes, err := periodoDesdeQuery(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", err.Error())
		return
	}

	resumen, err := h.service.ObtenerMensual(r.Context(), anio, mes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, resumen)
}

func (h *Handler) ExportarExcel(w http.ResponseWriter, r *http.Request) {
	anio, mes, err := periodoDesdeQuery(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", err.Error())
		return
	}

	archivo, err := h.service.ExportarExcel(r.Context(), anio, mes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("resumen-%04d-%02d.xlsx", anio, mes)
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", nombreArchivo))

	if err := archivo.Write(w); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
	}
}

func (h *Handler) ObtenerCapacidadMensual(w http.ResponseWriter, r *http.Request) {
	capacidad, err := h.service.ObtenerCapacidadMensual(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, capacidad)
}

func periodoDesdeQuery(r *http.Request) (anio, mes int, err error) {
	anio, err = strconv.Atoi(r.URL.Query().Get("anio"))
	if err != nil {
		return 0, 0, fmt.Errorf("el parametro anio es requerido y debe ser numerico")
	}

	mes, err = strconv.Atoi(r.URL.Query().Get("mes"))
	if err != nil || mes < 1 || mes > 12 {
		return 0, 0, fmt.Errorf("el parametro mes es requerido y debe estar entre 1 y 12")
	}

	return anio, mes, nil
}
