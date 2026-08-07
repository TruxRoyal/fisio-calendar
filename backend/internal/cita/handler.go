package cita

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"fisio-backend/internal/shared/httpx"
)

type Handler struct {
	service *Service
}

func NuevoHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Listar(w http.ResponseWriter, r *http.Request) {
	desde := r.URL.Query().Get("desde")
	hasta := r.URL.Query().Get("hasta")

	if desde == "" || hasta == "" {
		httpx.Error(w, http.StatusBadRequest, "rango_invalido", "Los parametros desde y hasta son requeridos")
		return
	}

	citas, err := h.service.Listar(r.Context(), desde, hasta)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, citas)
}

func (h *Handler) ObtenerPorID(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	c, err := h.service.ObtenerPorID(r.Context(), id)
	if err != nil {
		manejarError(w, err)
		return
	}

	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) Crear(w http.ResponseWriter, r *http.Request) {
	var solicitud SolicitudCrearCita
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	creada, conflicto, errores, err := h.service.Crear(r.Context(), solicitud)
	if err != nil {
		manejarError(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
		return
	}
	if conflicto != nil {
		httpx.ErrorConDetalles(w, http.StatusConflict, "choque_horario", "La cita se cruza con otra existente", conflicto)
		return
	}

	httpx.JSON(w, http.StatusCreated, creada)
}

func (h *Handler) Actualizar(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	var solicitud SolicitudActualizarCita
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	actualizada, conflicto, errores, err := h.service.Actualizar(r.Context(), id, solicitud)
	if err != nil {
		manejarError(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
		return
	}
	if conflicto != nil {
		httpx.ErrorConDetalles(w, http.StatusConflict, "choque_horario", "La cita se cruza con otra existente", conflicto)
		return
	}

	httpx.JSON(w, http.StatusOK, actualizada)
}

func (h *Handler) CambiarEstado(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	var solicitud SolicitudCambiarEstado
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	actualizada, errores, err := h.service.CambiarEstado(r.Context(), id, solicitud)
	if err != nil {
		manejarError(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
		return
	}

	httpx.JSON(w, http.StatusOK, actualizada)
}

func (h *Handler) VerificarChoque(w http.ResponseWriter, r *http.Request) {
	var solicitud SolicitudVerificarChoque
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	conflicto, err := h.service.VerificarChoque(r.Context(), solicitud)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"choque":    conflicto != nil,
		"conflicto": conflicto,
	})
}

func (h *Handler) Eliminar(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	if err := h.service.Eliminar(r.Context(), id); err != nil {
		manejarError(w, err)
		return
	}

	httpx.NoContent(w)
}

func manejarError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNoEncontrado):
		httpx.Error(w, http.StatusNotFound, "no_encontrado", "Cita no encontrada")
	case errors.Is(err, ErrPacienteNoEncontrado):
		httpx.Error(w, http.StatusBadRequest, "paciente_no_encontrado", "El paciente indicado no existe")
	default:
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
	}
}

func idDesdeRuta(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}
