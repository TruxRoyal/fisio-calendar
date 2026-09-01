package autorizacion

type Autorizacion struct {
	ID                int64   `json:"id"`
	PacienteID        int64   `json:"pacienteId"`
	Numero            *string `json:"numero"`
	TipoTerapia       string  `json:"tipoTerapia"`
	Copago            int     `json:"copago"`
	SesionesTotales   int     `json:"sesionesTotales"`
	SesionesUsadas    int     `json:"sesionesUsadas"`
	SesionesRestantes int     `json:"sesionesRestantes"`
	FechaVencimiento  *string `json:"fechaVencimiento"`
	Activa            bool    `json:"activa"`
	AlertaVencimiento bool    `json:"alertaVencimiento"`
	AlertaSesiones    bool    `json:"alertaSesiones"`
	CreadoEn          string  `json:"creadoEn"`
}

type SolicitudCrearAutorizacion struct {
	PacienteID       int64   `json:"pacienteId"`
	Numero           *string `json:"numero"`
	TipoTerapia      string  `json:"tipoTerapia"`
	Copago           int     `json:"copago"`
	SesionesTotales  int     `json:"sesionesTotales"`
	FechaVencimiento *string `json:"fechaVencimiento"`
}

type SolicitudActualizarAutorizacion struct {
	Numero           *string `json:"numero"`
	TipoTerapia      string  `json:"tipoTerapia"`
	Copago           int     `json:"copago"`
	SesionesTotales  int     `json:"sesionesTotales"`
	FechaVencimiento *string `json:"fechaVencimiento"`
	Activa           bool    `json:"activa"`
}

// TiposTerapiaValidos enumera los tipos de terapia validos para una
// autorizacion. Se mantiene local a este paquete, igual que en cita, para no
// acoplar el modulo autorizacion al modulo paciente (ver design.md, decision
// "Tipo freeze" y cita/model.go).
var TiposTerapiaValidos = []string{"respiratoria", "fisica"}

const (
	DiasAlertaVencimiento = 7
	SesionesAlertaMinimas = 3
)
