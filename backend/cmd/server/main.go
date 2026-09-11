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

	"fisio-backend/internal/autenticacion"
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
	crearUsuario := flag.Bool("crear-usuario", false, "crea un usuario y termina sin levantar el servidor")
	usuarioNombre := flag.String("usuario-nombre", "", "nombre del usuario a crear")
	usuarioEmail := flag.String("usuario-email", "", "email del usuario a crear")
	usuarioPassword := flag.String("usuario-password", "", "password del usuario a crear")
	usuarioRol := flag.String("usuario-rol", "fisio", "rol del usuario a crear")
	flag.Parse()

	cfg := config.Cargar()

	if cfg.JWTSecret == "" {
		log.Fatalf("JWT_SECRET no configurado")
	}

	conexion, err := db.Abrir(cfg.RutaDB)
	if err != nil {
		log.Fatalf("abrir base de datos: %v", err)
	}
	defer conexion.Close()

	if err := db.Migrar(conexion, *seed && cfg.EsDesarrollo()); err != nil {
		log.Fatalf("aplicar migraciones: %v", err)
	}

	if *crearUsuario {
		if *usuarioNombre == "" || *usuarioEmail == "" || *usuarioPassword == "" {
			log.Fatalf("usuario-nombre, usuario-email y usuario-password son obligatorios")
		}

		servicioAuth := autenticacion.NuevoService(autenticacion.NuevoRepository(conexion), cfg.JWTSecret)
		usuario, err := servicioAuth.CrearUsuario(context.Background(), *usuarioNombre, *usuarioEmail, *usuarioPassword, *usuarioRol)
		if err != nil {
			log.Fatalf("crear usuario: %v", err)
		}

		log.Printf("usuario creado: id=%d email=%s rol=%s", usuario.ID, usuario.Email, usuario.Rol)
		os.Exit(0)
	}

	pacienteHandler := paciente.NuevoHandler(paciente.NuevoService(paciente.NuevoRepository(conexion)))
	autorizacionHandler := autorizacion.NuevoHandler(autorizacion.NuevoService(autorizacion.NuevoRepository(conexion)))
	citaHandler := cita.NuevoHandler(cita.NuevoService(cita.NuevoRepository(conexion)))
	resumenHandler := resumen.NuevoHandler(resumen.NuevoService(resumen.NuevoRepository(conexion)))
	autenticacionHandler := autenticacion.NuevoHandler(autenticacion.NuevoService(autenticacion.NuevoRepository(conexion), cfg.JWTSecret), cfg.JWTSecret, cfg.CookieSecure)

	var manejadorNoEncontrado http.Handler
	if !cfg.EsDesarrollo() {
		manejadorNoEncontrado = httpx.ManejadorSPA(web.FS)
	}

	router := httpx.NuevoRouter(
		manejadorNoEncontrado,
		cfg.CorsOrigen,
		httpx.RequiereAuth(cfg.JWTSecret),
		[]httpx.RegistradorRutas{
			autenticacion.RegistrarRutas(autenticacionHandler, httpx.RequiereAuth(cfg.JWTSecret)),
		},
		[]httpx.RegistradorRutas{
			paciente.RegistrarRutas(pacienteHandler),
			autorizacion.RegistrarRutas(autorizacionHandler),
			cita.RegistrarRutas(citaHandler),
			resumen.RegistrarRutas(resumenHandler),
		},
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
