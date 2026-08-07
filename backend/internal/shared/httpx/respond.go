package httpx

import (
	"encoding/json"
	"net/http"
)

type respuestaError struct {
	Error     string `json:"error"`
	Mensaje   string `json:"mensaje"`
	Detalles  any    `json:"detalles,omitempty"`
}

func JSON(w http.ResponseWriter, status int, cuerpo any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if cuerpo != nil {
		json.NewEncoder(w).Encode(cuerpo)
	}
}

func Error(w http.ResponseWriter, status int, codigo, mensaje string) {
	JSON(w, status, respuestaError{Error: codigo, Mensaje: mensaje})
}

func ErrorConDetalles(w http.ResponseWriter, status int, codigo, mensaje string, detalles any) {
	JSON(w, status, respuestaError{Error: codigo, Mensaje: mensaje, Detalles: detalles})
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
