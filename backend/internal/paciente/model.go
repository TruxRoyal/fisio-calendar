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

// PacienteDetalle.AutorizacionesActivas reemplaza al antiguo campo singular
// AutorizacionActiva: un paciente puede tener a lo sumo una autorizacion
// activa POR tipoTerapia (ver migracion 0006 y autorizacion/model.go), asi
// que ahora puede haber hasta una por cada valor de TiposTerapiaValidos.
type PacienteDetalle struct {
	Paciente
	AutorizacionesActivas []AutorizacionResumen `json:"autorizacionesActivas"`
	// TiposTerapia es el conjunto derivado (sin duplicados) de los tipos de
	// las autorizaciones activas del paciente, unido con su tipo preferido.
	// Se usa para el filtrado/visualizacion en el listado de pacientes (ver
	// design.md, decision "Derived tiposTerapia set for filtering/display").
	TiposTerapia []string `json:"tiposTerapia"`
}

type EventoCronologia struct {
	Tipo    string  `json:"tipo"`
	Fecha   string  `json:"fecha"`
	Titulo  string  `json:"titulo"`
	Detalle *string `json:"detalle"`
	Monto   *int    `json:"monto"`
}

// FinancieroTipo es el desglose por tipoTerapia del resumen financiero
// mensual de un paciente (ver spec "resumen-por-tipo").
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
