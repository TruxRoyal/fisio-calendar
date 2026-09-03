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

func (h *Handler) ObtenerHistorico(w http.ResponseWriter, r *http.Request) {
	meses := 6
	if valor := r.URL.Query().Get("meses"); valor != "" {
		parsed, err := strconv.Atoi(valor)
		if err != nil || parsed < 1 || parsed > 24 {
			httpx.Error(w, http.StatusBadRequest, "meses_invalido", "el parametro meses debe ser numerico y estar entre 1 y 24")
			return
		}
		meses = parsed
	}

	anioAncla, mesAncla := 0, 0
	if r.URL.Query().Get("anio") != "" || r.URL.Query().Get("mes") != "" {
		var err error
		anioAncla, mesAncla, err = periodoDesdeQuery(r)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "periodo_invalido", err.Error())
			return
		}
	}

	historico, err := h.service.ObtenerHistoricoMensual(r.Context(), meses, anioAncla, mesAncla)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, historico)
}

func (h *Handler) ObtenerDesglose(w http.ResponseWriter, r *http.Request) {
	anio, mes, err := periodoDesdeQuery(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", err.Error())
		return
	}

	desglose, err := h.service.ObtenerDesglosePorPaciente(r.Context(), anio, mes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, desglose)
}

func (h *Handler) ObtenerProyeccion(w http.ResponseWriter, r *http.Request) {
	anio, mes, err := periodoDesdeQuery(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", err.Error())
		return
	}

	proyeccion, err := h.service.ObtenerProyeccionMensual(r.Context(), anio, mes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, proyeccion)
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
