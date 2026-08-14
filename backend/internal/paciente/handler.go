package paciente

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
	busqueda := r.URL.Query().Get("q")
	mes := r.URL.Query().Get("mes")

	pacientes, err := h.service.Listar(r.Context(), busqueda, mes)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, pacientes)
}

func (h *Handler) ObtenerDetalle(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	detalle, err := h.service.ObtenerDetalle(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNoEncontrado) {
			httpx.Error(w, http.StatusNotFound, "no_encontrado", "Paciente no encontrado")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, detalle)
}

func (h *Handler) Crear(w http.ResponseWriter, r *http.Request) {
	var solicitud SolicitudCrearPaciente
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	creado, errores, err := h.service.Crear(r.Context(), solicitud)
	if err != nil {
		manejarErrorEscritura(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
		return
	}

	httpx.JSON(w, http.StatusCreated, creado)
}

func (h *Handler) Actualizar(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	var solicitud SolicitudActualizarPaciente
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		httpx.Error(w, http.StatusBadRequest, "cuerpo_invalido", "El cuerpo de la solicitud no es JSON valido")
		return
	}

	actualizado, errores, err := h.service.Actualizar(r.Context(), id, solicitud)
	if err != nil {
		manejarErrorEscritura(w, err)
		return
	}
	if errores.TieneErrores() {
		httpx.ErrorConDetalles(w, http.StatusBadRequest, "validacion", "Datos invalidos", errores)
		return
	}

	httpx.JSON(w, http.StatusOK, actualizado)
}

func (h *Handler) ObtenerCronologia(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	eventos, err := h.service.ObtenerCronologia(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNoEncontrado) {
			httpx.Error(w, http.StatusNotFound, "no_encontrado", "Paciente no encontrado")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, eventos)
}

func (h *Handler) ObtenerResumenFinanciero(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	anio, err := strconv.Atoi(r.URL.Query().Get("anio"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", "El parametro anio es requerido y debe ser numerico")
		return
	}

	mes, err := strconv.Atoi(r.URL.Query().Get("mes"))
	if err != nil || mes < 1 || mes > 12 {
		httpx.Error(w, http.StatusBadRequest, "periodo_invalido", "El parametro mes es requerido y debe estar entre 1 y 12")
		return
	}

	resumen, err := h.service.ObtenerResumenFinanciero(r.Context(), id, anio, mes)
	if err != nil {
		if errors.Is(err, ErrNoEncontrado) {
			httpx.Error(w, http.StatusNotFound, "no_encontrado", "Paciente no encontrado")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, resumen)
}

func (h *Handler) Eliminar(w http.ResponseWriter, r *http.Request) {
	id, err := idDesdeRuta(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "id_invalido", "El id debe ser numerico")
		return
	}

	if err := h.service.Eliminar(r.Context(), id); err != nil {
		manejarErrorEscritura(w, err)
		return
	}

	httpx.NoContent(w)
}

func manejarErrorEscritura(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNoEncontrado):
		httpx.Error(w, http.StatusNotFound, "no_encontrado", "Paciente no encontrado")
	case errors.Is(err, ErrDocumentoDuplicado):
		httpx.Error(w, http.StatusConflict, "documento_duplicado", "Ya existe un paciente con ese documento")
	default:
		httpx.Error(w, http.StatusInternalServerError, "error_interno", err.Error())
	}
}

func idDesdeRuta(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}
