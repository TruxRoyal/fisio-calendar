package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "time/tzdata"

	"fisio-backend/internal/autorizacion"
	"fisio-backend/internal/cita"
	"fisio-backend/internal/paciente"
	"fisio-backend/internal/resumen"
	"fisio-backend/internal/shared/config"
	"fisio-backend/internal/shared/db"
	"fisio-backend/internal/shared/httpx"
	"fisio-backend/web"
)

func main() {
	seed := flag.Bool("seed", false, "aplica datos de ejemplo (solo entorno development)")
	flag.Parse()

	cfg := config.Cargar()

	conexion, err := db.Abrir(cfg.RutaDB)
	if err != nil {
		log.Fatalf("abrir base de datos: %v", err)
	}
	defer conexion.Close()

	if err := db.Migrar(conexion, *seed && cfg.EsDesarrollo()); err != nil {
		log.Fatalf("aplicar migraciones: %v", err)
	}

	pacienteHandler := paciente.NuevoHandler(paciente.NuevoService(paciente.NuevoRepository(conexion)))
	autorizacionHandler := autorizacion.NuevoHandler(autorizacion.NuevoService(autorizacion.NuevoRepository(conexion)))
	citaHandler := cita.NuevoHandler(cita.NuevoService(cita.NuevoRepository(conexion)))
	resumenHandler := resumen.NuevoHandler(resumen.NuevoService(resumen.NuevoRepository(conexion)))

	var manejadorNoEncontrado http.Handler
	if !cfg.EsDesarrollo() {
		manejadorNoEncontrado = httpx.ManejadorSPA(web.FS)
	}

	router := httpx.NuevoRouter(
		manejadorNoEncontrado,
		paciente.RegistrarRutas(pacienteHandler),
		autorizacion.RegistrarRutas(autorizacionHandler),
		cita.RegistrarRutas(citaHandler),
		resumen.RegistrarRutas(resumenHandler),
	)

	servidor := &http.Server{
		Addr:         ":" + cfg.Puerto,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("servidor escuchando en :%s (entorno=%s)", cfg.Puerto, cfg.Entorno)
		if err := servidor.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("iniciar servidor: %v", err)
		}
	}()

	senales := make(chan os.Signal, 1)
	signal.Notify(senales, os.Interrupt, syscall.SIGTERM)
	<-senales

	ctx, cancelar := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelar()

	if err := servidor.Shutdown(ctx); err != nil {
		log.Fatalf("apagar servidor: %v", err)
	}
	log.Println("servidor apagado correctamente")
}
