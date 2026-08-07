package config

import "os"

type Config struct {
	Puerto  string
	RutaDB  string
	Entorno string
}

func Cargar() Config {
	return Config{
		Puerto:  obtenerEnv("PORT", "8080"),
		RutaDB:  obtenerEnv("DB_PATH", "./app.db"),
		Entorno: obtenerEnv("APP_ENV", "development"),
	}
}

func (c Config) EsDesarrollo() bool {
	return c.Entorno == "development"
}

func obtenerEnv(clave, porDefecto string) string {
	if valor := os.Getenv(clave); valor != "" {
		return valor
	}
	return porDefecto
}
