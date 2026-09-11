package httpx

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type RegistradorRutas func(r chi.Router)

func NuevoRouter(
	manejadorNoEncontrado http.Handler,
	corsOrigen string,
	middlewareAuth func(http.Handler) http.Handler,
	registradoresPublicos []RegistradorRutas,
	registradoresProtegidos []RegistradorRutas,
) http.Handler {
	r := chi.NewRouter()
	r.Use(Recuperar)
	r.Use(Logger)
	r.Use(CORS(corsOrigen))

	r.Route("/api", func(api chi.Router) {
		for _, registrar := range registradoresPublicos {
			registrar(api)
		}
		api.Group(func(protegido chi.Router) {
			protegido.Use(middlewareAuth)
			for _, registrar := range registradoresProtegidos {
				registrar(protegido)
			}
		})
	})

	if manejadorNoEncontrado != nil {
		r.NotFound(manejadorNoEncontrado.ServeHTTP)
	}

	return r
}
