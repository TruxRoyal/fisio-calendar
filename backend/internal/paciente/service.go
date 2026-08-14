package paciente

import (
	"context"
	"errors"
	"fmt"
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
	if solicitud.Origen == "" {
		solicitud.Origen = "trabajo"
	}
	errores := validarSolicitud(solicitud.Nombre, solicitud.TipoTerapia, solicitud.Origen, solicitud.TarifaSesion)
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
	if solicitud.Origen == "" {
		solicitud.Origen = "trabajo"
	}
	errores := validarSolicitud(solicitud.Nombre, solicitud.TipoTerapia, solicitud.Origen, solicitud.TarifaSesion)
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

func (s *Service) ObtenerCronologia(ctx context.Context, id int64) ([]EventoCronologia, error) {
	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existente == nil {
		return nil, ErrNoEncontrado
	}

	return s.repo.ObtenerCronologia(ctx, id)
}

func (s *Service) ObtenerResumenFinanciero(ctx context.Context, id int64, anio, mes int) (*ResumenFinancieroPaciente, error) {
	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existente == nil {
		return nil, ErrNoEncontrado
	}

	anioMes := fmt.Sprintf("%04d-%02d", anio, mes)
	facturado, copagosRecibidos, err := s.repo.ObtenerResumenFinanciero(ctx, id, anioMes)
	if err != nil {
		return nil, err
	}

	return &ResumenFinancieroPaciente{Anio: anio, Mes: mes, Facturado: facturado, CopagosRecibidos: copagosRecibidos}, nil
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

func validarSolicitud(nombre, tipoTerapia, origen string, tarifaSesion *int) validate.Errores {
	errores := validate.Nuevo()
	validate.TextoNoVacio(nombre, "nombre", errores)
	validate.Enum(tipoTerapia, TiposTerapiaValidos, "tipoTerapia", errores)
	validate.Enum(origen, OrigenesValidos, "origen", errores)
	if origen == "extra" && (tarifaSesion == nil || *tarifaSesion <= 0) {
		errores.Agregar("tarifaSesion", "tarifaSesion es obligatoria y debe ser mayor a cero para pacientes de origen extra")
	}
	return errores
}

func esErrorDocumentoDuplicado(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}
