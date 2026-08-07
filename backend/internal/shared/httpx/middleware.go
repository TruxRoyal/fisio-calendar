package httpx

import (
	"log"
	"net/http"
	"time"
)

func Logger(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inicio := time.Now()
		envoltorio := &escritorConEstado{ResponseWriter: w, status: http.StatusOK}
		siguiente.ServeHTTP(envoltorio, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, envoltorio.status, time.Since(inicio))
	})
}

func Recuperar(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("panic recuperado: %v", err)
				Error(w, http.StatusInternalServerError, "error_interno", "Ocurrio un error inesperado")
			}
		}()
		siguiente.ServeHTTP(w, r)
	})
}

type escritorConEstado struct {
	http.ResponseWriter
	status int
}

func (e *escritorConEstado) WriteHeader(status int) {
	e.status = status
	e.ResponseWriter.WriteHeader(status)
}
