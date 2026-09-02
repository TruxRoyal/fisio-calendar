package cita

type PacienteResumen struct {
	ID          int64   `json:"id"`
	Nombre      string  `json:"nombre"`
	Direccion   *string `json:"direccion"`
	TipoTerapia *string `json:"tipoTerapia"`
	Color       *string `json:"color"`
}

type Cita struct {
	ID             int64            `json:"id"`
	PacienteID     int64            `json:"pacienteId"`
	AutorizacionID *int64           `json:"autorizacionId"`
	TipoTerapia    string           `json:"tipoTerapia"`
	Inicio         string           `json:"inicio"`
	Fin            string           `json:"fin"`
	Estado         string           `json:"estado"`
	ValorSesion    *int             `json:"valorSesion"`
	CopagoCobrado  int              `json:"copagoCobrado"`
	Notas          *string          `json:"notas"`
	CreadoEn       string           `json:"creadoEn"`
	ActualizadoEn  string           `json:"actualizadoEn"`
	Paciente       *PacienteResumen `json:"paciente"`
	Advertencias   []string         `json:"advertencias,omitempty"`
}

type Conflicto struct {
	CitaID int64  `json:"citaId"`
	Inicio string `json:"inicio"`
	Fin    string `json:"fin"`
}

type SolicitudCrearCita struct {
	PacienteID     int64   `json:"pacienteId"`
	AutorizacionID *int64  `json:"autorizacionId"`
	TipoTerapia    string  `json:"tipoTerapia"`
	Inicio         string  `json:"inicio"`
	Fin            string  `json:"fin"`
	Notas          *string `json:"notas"`
}

type SolicitudActualizarCita struct {
	AutorizacionID *int64  `json:"autorizacionId"`
	TipoTerapia    string  `json:"tipoTerapia"`
	Inicio         string  `json:"inicio"`
	Fin            string  `json:"fin"`
	Notas          *string `json:"notas"`
}

type SolicitudCambiarEstado struct {
	Estado        string `json:"estado"`
	CopagoCobrado *int   `json:"copagoCobrado"`
}

type SolicitudVerificarChoque struct {
	Inicio        string `json:"inicio"`
	Fin           string `json:"fin"`
	ExcluirCitaID *int64 `json:"excluirCitaId"`
}

var EstadosValidos = []string{"agendada", "atendida", "cancelada"}

var TiposTerapiaValidos = []string{"respiratoria", "fisica"}

const (
	ValorSesionBase    = 23500
	ValorSesionEscalon = 25000
	UmbralEscalon      = 71
)
