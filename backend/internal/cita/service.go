package cita

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"fisio-backend/internal/shared/validate"
)

var ErrNoEncontrado = errors.New("cita no encontrada")
var ErrPacienteNoEncontrado = errors.New("paciente no encontrado")
var ErrCitaAtendidaNoSeMueve = errors.New("no se puede mover una cita que ya fue atendida")

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

func (s *Service) Crear(ctx context.Context, solicitud SolicitudCrearCita) (*Cita, *Conflicto, *AutorizacionVencida, validate.Errores, error) {
	errores := validarHorario(solicitud.Inicio, solicitud.Fin)
	validate.EnteroPositivo(int(solicitud.PacienteID), "pacienteId", errores)
	validate.Enum(solicitud.TipoTerapia, TiposTerapiaValidos, "tipoTerapia", errores)
	if errores.TieneErrores() {
		return nil, nil, nil, errores, nil
	}

	conflicto, err := s.repo.ExisteChoque(ctx, solicitud.Inicio, solicitud.Fin, nil)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if conflicto != nil {
		return nil, conflicto, nil, nil, nil
	}

	advertencias, err := s.resolverAutorizacionSiFalta(ctx, solicitud.PacienteID, solicitud.TipoTerapia, &solicitud.AutorizacionID)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	if solicitud.AutorizacionID != nil {
		vencida, err := s.verificarAutorizacionVencida(ctx, *solicitud.AutorizacionID)
		if err != nil {
			return nil, nil, nil, nil, err
		}
		if vencida != nil {
			return nil, nil, vencida, nil, nil
		}
	}

	creada, err := s.repo.Crear(ctx, solicitud)
	if err != nil {
		if esErrorReferenciaInexistente(err) {
			return nil, nil, nil, nil, ErrPacienteNoEncontrado
		}
		return nil, nil, nil, nil, err
	}
	creada.Advertencias = advertencias

	return creada, nil, nil, nil, nil
}

func (s *Service) verificarAutorizacionVencida(ctx context.Context, autorizacionID int64) (*AutorizacionVencida, error) {
	fechaVencimiento, err := s.repo.ObtenerFechaVencimientoAutorizacion(ctx, autorizacionID)
	if err != nil {
		return nil, err
	}
	if fechaVencimiento == nil || *fechaVencimiento == "" {
		return nil, nil
	}
	if (*fechaVencimiento)[:10] >= fechaHoyBogota() {
		return nil, nil
	}
	return &AutorizacionVencida{AutorizacionID: autorizacionID, FechaVencimiento: *fechaVencimiento}, nil
}

func fechaHoyBogota() string {
	ubicacion, err := time.LoadLocation("America/Bogota")
	if err != nil {
		return time.Now().UTC().Format("2006-01-02")
	}
	return time.Now().In(ubicacion).Format("2006-01-02")
}

func (s *Service) Actualizar(ctx context.Context, id int64, solicitud SolicitudActualizarCita) (*Cita, []Cita, *Conflicto, validate.Errores, error) {
	errores := validarHorario(solicitud.Inicio, solicitud.Fin)
	validate.Enum(solicitud.TipoTerapia, TiposTerapiaValidos, "tipoTerapia", errores)
	if errores.TieneErrores() {
		return nil, nil, nil, errores, nil
	}

	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if existente == nil {
		return nil, nil, nil, nil, ErrNoEncontrado
	}

	if existente.Estado == "atendida" {
		if solicitud.TipoTerapia != existente.TipoTerapia {
			errores.Agregar("tipoTerapia", "no se puede cambiar el tipo de terapia de una cita atendida")
		}
		if solicitud.Inicio != existente.Inicio || solicitud.Fin != existente.Fin {
			errores.Agregar("inicio", "no se puede mover una cita que ya fue atendida")
		}
		if errores.TieneErrores() {
			return nil, nil, nil, errores, nil
		}
	}

	fechaISO := solicitud.Inicio[:10]
	siguientes, err := s.repo.ListarActivasMismoDia(ctx, fechaISO, id)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	inicioFinal, finFinal, empujadas, conflicto := calcularCascadaEmpuje(solicitud.Inicio, solicitud.Fin, siguientes)
	if conflicto != nil {
		return nil, nil, conflicto, nil, nil
	}
	solicitud.Inicio, solicitud.Fin = inicioFinal, finFinal

	advertencias, err := s.resolverAutorizacionSiFalta(ctx, existente.PacienteID, solicitud.TipoTerapia, &solicitud.AutorizacionID)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	actualizada, citasEmpujadas, err := s.repo.ActualizarConEmpuje(ctx, id, solicitud, empujadas)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	actualizada.Advertencias = advertencias

	return actualizada, citasEmpujadas, nil, nil, nil
}

func (s *Service) PlanificarMovimiento(ctx context.Context, id int64, inicio, fin string) (inicioFinal, finFinal string, empujadas []CitaEmpujada, conflicto *Conflicto, err error) {
	existente, err := s.repo.ObtenerPorID(ctx, id)
	if err != nil {
		return "", "", nil, nil, err
	}
	if existente == nil {
		return "", "", nil, nil, ErrNoEncontrado
	}
	if existente.Estado == "atendida" && (inicio != existente.Inicio || fin != existente.Fin) {
		return "", "", nil, nil, ErrCitaAtendidaNoSeMueve
	}

	fechaISO := inicio[:10]
	siguientes, err := s.repo.ListarActivasMismoDia(ctx, fechaISO, id)
	if err != nil {
		return "", "", nil, nil, err
	}

	inicioFinal, finFinal, empujadas, conflicto = calcularCascadaEmpuje(inicio, fin, siguientes)
	return inicioFinal, finFinal, empujadas, conflicto, nil
}

func calcularCascadaEmpuje(nuevoInicio, nuevoFin string, siguientes []Cita) (inicioFinal, finFinal string, empujadas []CitaEmpujada, conflicto *Conflicto) {
	inicioFinal, finFinal = nuevoInicio, nuevoFin
	duracionMovida := diferenciaMinutosISO(nuevoInicio, nuevoFin)

	for _, c := range siguientes {
		if c.Inicio >= inicioFinal {
			break
		}
		if c.Fin > inicioFinal {
			inicioFinal = c.Fin
			finFinal = sumarMinutosISO(inicioFinal, duracionMovida)
		}
	}

	cursorFin := finFinal
	for _, c := range siguientes {
		if c.Fin <= inicioFinal {
			continue
		}
		if c.Inicio >= cursorFin {
			break
		}
		if c.Estado == "atendida" {
			return inicioFinal, finFinal, nil, &Conflicto{CitaID: c.ID, Inicio: c.Inicio, Fin: c.Fin}
		}
		duracionMinutos := diferenciaMinutosISO(c.Inicio, c.Fin)
		nuevoInicioC := cursorFin
		nuevoFinC := sumarMinutosISO(nuevoInicioC, duracionMinutos)
		empujadas = append(empujadas, CitaEmpujada{
			CitaID:         c.ID,
			InicioAnterior: c.Inicio,
			FinAnterior:    c.Fin,
			InicioNuevo:    nuevoInicioC,
			FinNuevo:       nuevoFinC,
		})
		cursorFin = nuevoFinC
	}

	return inicioFinal, finFinal, empujadas, nil
}

func diferenciaMinutosISO(inicio, fin string) int {
	const layout = "2006-01-02T15:04:05"
	i, errI := time.Parse(layout, inicio)
	f, errF := time.Parse(layout, fin)
	if errI != nil || errF != nil {
		return 0
	}
	return int(f.Sub(i).Minutes())
}

func sumarMinutosISO(iso string, minutos int) string {
	const layout = "2006-01-02T15:04:05"
	t, err := time.Parse(layout, iso)
	if err != nil {
		return iso
	}
	return t.Add(time.Duration(minutos) * time.Minute).Format(layout)
}

func (s *Service) resolverAutorizacionSiFalta(ctx context.Context, pacienteID int64, tipoTerapia string, autorizacionID **int64) ([]string, error) {
	if *autorizacionID != nil {
		return nil, nil
	}

	resuelta, err := s.repo.ResolverAutorizacionActiva(ctx, pacienteID, tipoTerapia)
	if err != nil {
		return nil, err
	}

	*autorizacionID = resuelta

	if resuelta == nil {
		return []string{fmt.Sprintf("El paciente no tiene una autorizacion activa de tipo %s", tipoTerapia)}, nil
	}

	return nil, nil
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
		valor, err := s.calcularValorSesion(ctx, existente.PacienteID, existente.Inicio)
		if err != nil {
			return nil, nil, err
		}
		valorSesion = &valor
	}

	copagoCobrado := solicitud.CopagoCobrado
	if solicitud.Estado == "atendida" && existente.Estado != "atendida" && copagoCobrado == nil && existente.AutorizacionID != nil {
		copago, err := s.repo.ObtenerCopagoAutorizacion(ctx, *existente.AutorizacionID)
		if err != nil {
			return nil, nil, err
		}
		copagoCobrado = &copago
	}

	actualizada, err := s.repo.CambiarEstado(ctx, id, solicitud.Estado, valorSesion, copagoCobrado)
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

func (s *Service) calcularValorSesion(ctx context.Context, pacienteID int64, inicio string) (int, error) {
	origen, tarifaSesion, err := s.repo.ObtenerOrigenPaciente(ctx, pacienteID)
	if err != nil {
		return 0, err
	}

	if origen == "extra" {
		if tarifaSesion == nil {
			return 0, errors.New("el paciente extra no tiene una tarifa por sesion configurada")
		}
		return *tarifaSesion, nil
	}

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
