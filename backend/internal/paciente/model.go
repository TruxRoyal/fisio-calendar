package paciente

type Paciente struct {
	ID            int64    `json:"id"`
	Nombre        string   `json:"nombre"`
	Direccion     *string  `json:"direccion"`
	Documento     *string  `json:"documento"`
	Telefono      *string  `json:"telefono"`
	Diagnostico   *string  `json:"diagnostico"`
	EPS           *string  `json:"eps"`
	TipoTerapia   *string  `json:"tipoTerapia"`
	Lat           *float64 `json:"lat"`
	Lng           *float64 `json:"lng"`
	CreadoEn      string   `json:"creadoEn"`
	ActualizadoEn string   `json:"actualizadoEn"`
}

type AutorizacionResumen struct {
	ID                int64   `json:"id"`
	SesionesTotales   int     `json:"sesionesTotales"`
	SesionesUsadas    int     `json:"sesionesUsadas"`
	SesionesRestantes int     `json:"sesionesRestantes"`
	FechaVencimiento  *string `json:"fechaVencimiento"`
	Activa            bool    `json:"activa"`
}

type PacienteDetalle struct {
	Paciente
	AutorizacionActiva *AutorizacionResumen `json:"autorizacionActiva"`
}

type SolicitudCrearPaciente struct {
	Nombre      string   `json:"nombre"`
	Direccion   *string  `json:"direccion"`
	Documento   *string  `json:"documento"`
	Telefono    *string  `json:"telefono"`
	Diagnostico *string  `json:"diagnostico"`
	EPS         *string  `json:"eps"`
	TipoTerapia string   `json:"tipoTerapia"`
	Lat         *float64 `json:"lat"`
	Lng         *float64 `json:"lng"`
}

type SolicitudActualizarPaciente struct {
	Nombre      string   `json:"nombre"`
	Direccion   *string  `json:"direccion"`
	Documento   *string  `json:"documento"`
	Telefono    *string  `json:"telefono"`
	Diagnostico *string  `json:"diagnostico"`
	EPS         *string  `json:"eps"`
	TipoTerapia string   `json:"tipoTerapia"`
	Lat         *float64 `json:"lat"`
	Lng         *float64 `json:"lng"`
}

var TiposTerapiaValidos = []string{"respiratoria", "fisica"}
