package paciente

type Paciente struct {
	ID              int64    `json:"id"`
	Nombre          string   `json:"nombre"`
	Direccion       *string  `json:"direccion"`
	Documento       *string  `json:"documento"`
	Telefono        *string  `json:"telefono"`
	Diagnostico     *string  `json:"diagnostico"`
	EPS             *string  `json:"eps"`
	TipoTerapia     *string  `json:"tipoTerapia"`
	Lat             *float64 `json:"lat"`
	Lng             *float64 `json:"lng"`
	FechaNacimiento *string  `json:"fechaNacimiento"`
	Observaciones   *string  `json:"observaciones"`
	Color           *string  `json:"color"`
	Origen          string   `json:"origen"`
	TarifaSesion    *int     `json:"tarifaSesion"`
	CreadoEn        string   `json:"creadoEn"`
	ActualizadoEn   string   `json:"actualizadoEn"`
}

type AutorizacionResumen struct {
	ID                int64   `json:"id"`
	TipoTerapia       string  `json:"tipoTerapia"`
	SesionesTotales   int     `json:"sesionesTotales"`
	SesionesUsadas    int     `json:"sesionesUsadas"`
	SesionesRestantes int     `json:"sesionesRestantes"`
	FechaVencimiento  *string `json:"fechaVencimiento"`
	CreadoEn          string  `json:"creadoEn"`
	Activa            bool    `json:"activa"`
}

type PacienteDetalle struct {
	Paciente
	AutorizacionesActivas []AutorizacionResumen `json:"autorizacionesActivas"`
	TiposTerapia          []string              `json:"tiposTerapia"`
}

type EventoCronologia struct {
	Tipo    string  `json:"tipo"`
	Fecha   string  `json:"fecha"`
	Titulo  string  `json:"titulo"`
	Detalle *string `json:"detalle"`
	Monto   *int    `json:"monto"`
}

type FinancieroTipo struct {
	TipoTerapia      string `json:"tipoTerapia"`
	Facturado        int    `json:"facturado"`
	CopagosRecibidos int    `json:"copagosRecibidos"`
}

type ResumenFinancieroPaciente struct {
	Anio             int              `json:"anio"`
	Mes              int              `json:"mes"`
	Facturado        int              `json:"facturado"`
	CopagosRecibidos int              `json:"copagosRecibidos"`
	PorTipo          []FinancieroTipo `json:"porTipo"`
}

type SolicitudCrearPaciente struct {
	Nombre          string   `json:"nombre"`
	Direccion       *string  `json:"direccion"`
	Documento       *string  `json:"documento"`
	Telefono        *string  `json:"telefono"`
	Diagnostico     *string  `json:"diagnostico"`
	EPS             *string  `json:"eps"`
	TipoTerapia     string   `json:"tipoTerapia"`
	Lat             *float64 `json:"lat"`
	Lng             *float64 `json:"lng"`
	FechaNacimiento *string  `json:"fechaNacimiento"`
	Observaciones   *string  `json:"observaciones"`
	Color           *string  `json:"color"`
	Origen          string   `json:"origen"`
	TarifaSesion    *int     `json:"tarifaSesion"`
}

type SolicitudActualizarPaciente struct {
	Nombre          string   `json:"nombre"`
	Direccion       *string  `json:"direccion"`
	Documento       *string  `json:"documento"`
	Telefono        *string  `json:"telefono"`
	Diagnostico     *string  `json:"diagnostico"`
	EPS             *string  `json:"eps"`
	TipoTerapia     string   `json:"tipoTerapia"`
	Lat             *float64 `json:"lat"`
	Lng             *float64 `json:"lng"`
	FechaNacimiento *string  `json:"fechaNacimiento"`
	Observaciones   *string  `json:"observaciones"`
	Color           *string  `json:"color"`
	Origen          string   `json:"origen"`
	TarifaSesion    *int     `json:"tarifaSesion"`
}

var TiposTerapiaValidos = []string{"respiratoria", "fisica"}
var OrigenesValidos = []string{"trabajo", "extra"}
