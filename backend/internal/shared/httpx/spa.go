package httpx

import (
	"io/fs"
	"net/http"
	"strings"
)

var archivosSinCache = map[string]bool{
	"":                     true,
	"index.html":           true,
	"sw.js":                true,
	"registerSW.js":        true,
	"manifest.webmanifest": true,
}

func ManejadorSPA(archivos fs.FS) http.Handler {
	servidorArchivos := http.FileServer(http.FS(archivos))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ruta := strings.TrimPrefix(r.URL.Path, "/")
		if ruta != "" {
			if _, err := fs.Stat(archivos, ruta); err != nil {
				r = r.Clone(r.Context())
				r.URL.Path = "/"
				ruta = ""
			}
		}

		cabeceraCacheControl := "public, max-age=3600"
		switch {
		case archivosSinCache[ruta] || strings.HasPrefix(ruta, "workbox-"):
			cabeceraCacheControl = "no-cache, must-revalidate"
		case strings.HasPrefix(ruta, "assets/"):
			cabeceraCacheControl = "public, max-age=31536000, immutable"
		}
		w.Header().Set("Cache-Control", cabeceraCacheControl)

		servidorArchivos.ServeHTTP(w, r)
	})
}
