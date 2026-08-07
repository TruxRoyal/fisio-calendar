package cita

import (
	"context"
	"errors"
	"strings"

	"fisio-backend/internal/shared/validate"
)

var ErrNoEncontrado = errors.New("cita no encontrada")
var ErrPacienteNoEncontrado = errors.New("paciente no encontrado")

type Service struct {
	repo *Repository
}

func NuevoService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Listar(ctx context.Context, desde, hasta string) ([]Cita, error) {
	return s.repo.ListarPorRango(ctx, desde, hasta)
}

func (s *Service) ObtenerPorID(ctx context.Context, id int64) (*Cita, error) {
	c, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, ErrNoEncontrado
	}
	return c, nil
}

func (s *Service) VerificarChoque(ctx context.Context, solicitud SolicitudVerificarChoque) (*Conflicto, error) {
	return s.repo.ExisteChoque(ctx, solicitud.Inicio, solicitud.Fin, solicitud.ExcluirCitaID)
}

func (s *Service) Crear(ctx context.Context, solicitud SolicitudCrearCita) (*Cita, *Conflicto, validate.Errores, error) {
	errores := validarHorario(solicitud.Inicio, solicitud.Fin)
	validate.EnteroPositivo(int(solicitud.PacienteID), "pacienteId", errores)
	if errores.TieneErrores() {
		return nil, nil, errores, nil
	}

	conflicto, err := s.repo.ExisteChoque(ctx, solicitud.Inicio, solicitud.Fin, nil)
	if err != nil {
		return nil, nil, nil, err
	}
	if conflicto != nil {
		return nil, conflicto, nil, nil
	}

	creada, err := s.repo.Crear(ctx, solicitud)
	if err != nil {
		if esErrorReferenciaInexistente(err) {
			return nil, nil, nil, ErrPacienteNoEncontrado
		}
		return nil, nil, nil, err
	}

	return creada, nil, nil, nil
}

func (s *Service) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarCita) (*Cita, *Conflicto, validate.Errores, error) {
	errores := validarHorario(solicitud.Inicio, solicitud.Fin)
	if errores.TieneErrores() {
		return nil, nil, errores, nil
	}

	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, nil, nil, err
	}
	if existente == nil {
		return nil, nil, nil, ErrNoEncontrado
	}

	conflicto, err := s.repo.ExisteChoque(ctx, solicitud.Inicio, solicitud.Fin, &id)
	if err != nil {
		return nil, nil, nil, err
	}
	if conflicto != nil {
		return nil, conflicto, nil, nil
	}

	actualizada, err := s.repo.Actualizar(ctx, id, solicitud)
	if err != nil {
		return nil, nil, nil, err
	}

	return actualizada, nil, nil, nil
}

func (s *Service) CambiarEstado(ctx context.Context, id int64, solicitud SolicitudCambiarEstado) (*Cita, validate.Errores, error) {
	errores := validate.Nuevo()
	validate.Enum(solicitud.Estado, EstadosValidos, "estado", errores)
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

	var valorSesion *int
	if solicitud.Estado == "atendida" && existente.ValorSesion == nil {
		valor, err := s.calcularValorSesion(ctx, existente.Inicio)
		if err != nil {
			return nil, nil, err
		}
		valorSesion = &valor
	}

	actualizada, err := s.repo.CambiarEstado(ctx, id, solicitud.Estado, valorSesion, solicitud.CopagoCobrado)
	if err != nil {
		return nil, nil, err
	}

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

func (s *Service) calcularValorSesion(ctx context.Context, inicio string) (int, error) {
	previas, err := s.repo.ContarAtendidasAntesEnMes(ctx, inicio)
	if err != nil {
		return 0, err
	}

	if previas < UmbralEscalon {
		return ValorSesionBase, nil
	}
	return ValorSesionEscalon, nil
}

func validarHorario(inicio, fin string) validate.Errores {
	errores := validate.Nuevo()
	validate.FechaHoraISO(inicio, "inicio", errores)
	validate.FechaHoraISO(fin, "fin", errores)
	if !errores.TieneErrores() && fin <= inicio {
		errores.Agregar("fin", "fin debe ser posterior a inicio")
	}
	return errores
}

func esErrorReferenciaInexistente(err error) bool {
	return err != nil && strings.Contains(err.Error(), "FOREIGN KEY constraint failed")
}
