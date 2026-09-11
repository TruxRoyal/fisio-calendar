package config

import (
	"os"
	"strconv"
)

type Config struct {
	Puerto       string
	RutaDB       string
	Entorno      string
	JWTSecret    string
	CorsOrigen   string
	CookieSecure bool
}

func Cargar() Config {
	c := Config{
		Puerto:     obtenerEnv("PORT", "8080"),
		RutaDB:     obtenerEnv("DB_PATH", "./app.db"),
		Entorno:    obtenerEnv("APP_ENV", "development"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		CorsOrigen: obtenerEnv("CORS_ORIGEN", ""),
	}
	c.CookieSecure = obtenerCookieSecure(c)
	return c
}

func (c Config) EsDesarrollo() bool {
	return c.Entorno == "development"
}

func obtenerCookieSecure(c Config) bool {
	valor, definida := os.LookupEnv("COOKIE_SECURE")
	if !definida {
		return !c.EsDesarrollo()
	}

	booleano, err := strconv.ParseBool(valor)
	if err != nil {
		return !c.EsDesarrollo()
	}
	return booleano
}

func obtenerEnv(clave, porDefecto string) string {
	if valor := os.Getenv(clave); valor != "" {
		return valor
	}
	return porDefecto
}
