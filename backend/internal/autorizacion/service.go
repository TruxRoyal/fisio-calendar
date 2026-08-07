package autorizacion

import (
	"context"
	"errors"
	"strings"
	"time"

	"fisio-backend/internal/shared/validate"
)

var ErrNoEncontrado = errors.New("autorizacion no encontrada")
var ErrPacienteNoEncontrado = errors.New("paciente no encontrado")

type Service struct {
	repo *Repository
}

func NuevoService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListarPorPaciente(ctx context.Context, pacienteID int64) ([]Autorizacion, error) {
	autorizaciones, err := s.repo.ListarPorPaciente(ctx, pacienteID)
	if err != nil {
		return nil, err
	}
	for i := range autorizaciones {
		completarDerivados(&autorizaciones[i])
	}
	return autorizaciones, nil
}

func (s *Service) ObtenerPorID(ctx context.Context, id int64) (*Autorizacion, error) {
	a, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if a == nil {
		return nil, ErrNoEncontrado
	}
	completarDerivados(a)
	return a, nil
}

func (s *Service) Crear(ctx context.Context, solicitud SolicitudCrearAutorizacion) (*Autorizacion, validate.Errores, error) {
	errores := validarSolicitud(solicitud.SesionesTotales, solicitud.Copago)
	if errores.TieneErrores() {
		return nil, errores, nil
	}

	creada, err := s.repo.Crear(ctx, solicitud)
	if err != nil {
		if esErrorPacienteInexistente(err) {
			return nil, nil, ErrPacienteNoEncontrado
		}
		return nil, nil, err
	}

	completarDerivados(creada)
	return creada, nil, nil
}

func (s *Service) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarAutorizacion) (*Autorizacion, validate.Errores, error) {
	errores := validarSolicitud(solicitud.SesionesTotales, solicitud.Copago)
	if errores.TieneErrores() {
		return nil, errores, nil
	}

	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if existente == nil {
		return nil, nil, ErrNoEncontrado
	}

	actualizada, err := s.repo.Actualizar(ctx, id, solicitud)
	if err != nil {
		return nil, nil, err
	}

	completarDerivados(actualizada)
	return actualizada, nil, nil
}

func (s *Service) Eliminar(ctx context.Context, id int64) error {
	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return err
	}
	if existente == nil {
		return ErrNoEncontrado
	}
	return s.repo.Eliminar(ctx, id)
}

func completarDerivados(a *Autorizacion) {
	a.SesionesRestantes = a.SesionesTotales - a.SesionesUsadas
	a.AlertaSesiones = a.SesionesRestantes <= SesionesAlertaMinimas
	a.AlertaVencimiento = calcularAlertaVencimiento(a.FechaVencimiento)
}

func calcularAlertaVencimiento(fechaVencimiento *string) bool {
	if fechaVencimiento == nil || *fechaVencimiento == "" {
		return false
	}

	fecha, err := time.Parse("2006-01-02", (*fechaVencimiento)[:10])
	if err != nil {
		return false
	}

	hoy := ahoraBogota()
	limite := hoy.AddDate(0, 0, DiasAlertaVencimiento)

	return !fecha.After(limite)
}

func ahoraBogota() time.Time {
	ubicacion, err := time.LoadLocation("America/Bogota")
	if err != nil {
		return time.Now().UTC()
	}
	return time.Now().In(ubicacion)
}

func validarSolicitud(sesionesTotales, copago int) validate.Errores {
	errores := validate.Nuevo()
	validate.EnteroPositivo(sesionesTotales, "sesionesTotales", errores)
	validate.EnteroNoNegativo(copago, "copago", errores)
	return errores
}

func esErrorPacienteInexistente(err error) bool {
	return err != nil && strings.Contains(err.Error(), "FOREIGN KEY constraint failed")
}
