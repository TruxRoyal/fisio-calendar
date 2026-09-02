package autorizacion

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

func (h *Handler) ListarPorPaciente(w http.ResponseWriter, r *http.Request) {
	pacienteID, err := strconv.ParseInt(r.URL.Query().Get("pacienteId"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "paciente_id_invalido", "El parametro pacienteId es requerido y debe ser numerico")
		return
	}

	autorizaciones, err := h.service.ListarPorPaciente(r.Context(), pacienteID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, autorizaciones)
}

func (h *Handler) ObtenerPorID(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	autorizacion, err := h.service.ObtenerPorID(r.Context(), id)
	if err != nil {
		manejarError(w, err)
		return
	}

	httpx.JSON(w, http.StatusOK, autorizacion)
}

func (h *Handler) Crear(w http.ResponseWriter, r *http.Request) {
	var solicitud SolicitudCrearAutorizacion
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	creada, errores, err := h.service.Crear(r.Context(), solicitud)
	if err != nil {
		manejarError(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
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

	var solicitud SolicitudActualizarAutorizacion
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	actualizada, errores, err := h.service.Actualizar(r.Context(), id, solicitud)
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
		httpx.Error(w, http.StatusNotFound, "no_encontrado", "Autorizacion no encontrada")
	case errors.Is(err, ErrPacienteNoEncontrado):
		httpx.Error(w, http.StatusBadRequest, "paciente_no_encontrado", "El paciente indicado no existe")
	case errors.Is(err, ErrAutorizacionActivaDuplicada):
		httpx.Error(w, http.StatusConflict, "autorizacion_activa_duplicada", "Ya existe una autorizacion activa de ese tipo para el paciente")
	default:
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
	}
}

func idDesdeRuta(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}
