package paciente

import (
	"context"
	"errors"
	"strings"

	"fisio-backend/internal/shared/validate"
)

var ErrNoEncontrado = errors.New("paciente no encontrado")
var ErrDocumentoDuplicado = errors.New("ya existe un paciente con ese documento")

type Service struct {
	repo *Repository
}

func NuevoService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Listar(ctx context.Context, busqueda, mes string) ([]Paciente, error) {
	return s.repo.Listar(ctx, busqueda, mes)
}

func (s *Service) ObtenerDetalle(ctx context.Context, id int64) (*PacienteDetalle, error) {
	p, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrNoEncontrado
	}

	autorizacion, err := s.repo.ObtenerAutorizacionActiva(ctx, id)
	if err != nil {
		return nil, err
	}

	return &PacienteDetalle{Paciente: *p, AutorizacionActiva: autorizacion}, nil
}

func (s *Service) Crear(ctx context.Context, solicitud SolicitudCrearPaciente) (*Paciente, validate.Errores, error) {
	errores := validarSolicitud(solicitud.Nombre, solicitud.TipoTerapia)
	if errores.TieneErrores() {
		return nil, errores, nil
	}

	creado, err := s.repo.Crear(ctx, solicitud)
	if err != nil {
		if esErrorDocumentoDuplicado(err) {
			return nil, nil, ErrDocumentoDuplicado
		}
		return nil, nil, err
	}

	return creado, nil, nil
}

func (s *Service) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarPaciente) (*Paciente, validate.Errores, error) {
	errores := validarSolicitud(solicitud.Nombre, solicitud.TipoTerapia)
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

	actualizado, err := s.repo.Actualizar(ctx, id, solicitud)
	if err != nil {
		if esErrorDocumentoDuplicado(err) {
			return nil, nil, ErrDocumentoDuplicado
		}
		return nil, nil, err
	}

	return actualizado, nil, nil
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

func validarSolicitud(nombre, tipoTerapia string) validate.Errores {
	errores := validate.Nuevo()
	validate.TextoNoVacio(nombre, "nombre", errores)
	validate.Enum(tipoTerapia, TiposTerapiaValidos, "tipoTerapia", errores)
	return errores
}

func esErrorDocumentoDuplicado(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}
