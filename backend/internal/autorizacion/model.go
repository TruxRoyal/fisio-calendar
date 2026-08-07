package autorizacion

type Autorizacion struct {
	ID                int64   `json:"id"`
	PacienteID        int64   `json:"pacienteId"`
	Numero            *string `json:"numero"`
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
	Copago           int     `json:"copago"`
	SesionesTotales  int     `json:"sesionesTotales"`
	FechaVencimiento *string `json:"fechaVencimiento"`
}

type SolicitudActualizarAutorizacion struct {
	Numero           *string `json:"numero"`
	Copago           int     `json:"copago"`
	SesionesTotales  int     `json:"sesionesTotales"`
	FechaVencimiento *string `json:"fechaVencimiento"`
	Activa           bool    `json:"activa"`
}

const (
	DiasAlertaVencimiento = 7
	SesionesAlertaMinimas = 3
)
