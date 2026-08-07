package httpx

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type RegistradorRutas func(r chi.Router)

func NuevoRouter(manejadorNoEncontrado http.Handler, registradores ...RegistradorRutas) http.Handler {
	r := chi.NewRouter()
	r.Use(Recuperar)
	r.Use(Logger)

	r.Route("/api", func(api chi.Router) {
		for _, registrar := range registradores {
			registrar(api)
		}
	})

	if manejadorNoEncontrado != nil {
		r.NotFound(manejadorNoEncontrado.ServeHTTP)
	}

	return r
}
