package httpx

import (
	"io/fs"
	"net/http"
	"strings"
)

func ManejadorSPA(archivos fs.FS) http.Handler {
	servidorArchivos := http.FileServer(http.FS(archivos))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ruta := strings.TrimPrefix(r.URL.Path, "/")
		if ruta != "" {
			if _, err := fs.Stat(archivos, ruta); err != nil {
				r = r.Clone(r.Context())
				r.URL.Path = "/"
			}
		}
		servidorArchivos.ServeHTTP(w, r)
	})
}
