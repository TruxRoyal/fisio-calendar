package resumen

type ResumenTipo struct {
	TipoTerapia       string `json:"tipoTerapia"`
	SesionesAtendidas int    `json:"sesionesAtendidas"`
	PagoNeto          int    `json:"pagoNeto"`
	CopagosRecaudados int    `json:"copagosRecaudados"`
}

type ResumenMensual struct {
	Anio              int           `json:"anio"`
	Mes               int           `json:"mes"`
	SesionesAtendidas int           `json:"sesionesAtendidas"`
	SesionesTrabajo   int           `json:"sesionesTrabajo"`
	UmbralEscalon     int           `json:"umbralEscalon"`
	UmbralAlcanzado   bool          `json:"umbralAlcanzado"`
	PagoNeto          int           `json:"pagoNeto"`
	CopagosRecaudados int           `json:"copagosRecaudados"`
	Total             int           `json:"total"`
	PorTipo           []ResumenTipo `json:"porTipo"`
}

type DesglosePaciente struct {
	PacienteId int           `json:"pacienteId"`
	Nombre     string        `json:"nombre"`
	Sesiones   int           `json:"sesiones"`
	PagoNeto   int           `json:"pagoNeto"`
	Copagos    int           `json:"copagos"`
	Total      int           `json:"total"`
	PorTipo    []ResumenTipo `json:"porTipo"`
}

type FilaAgregadoMensual struct {
	AnioMes           string
	TipoTerapia       string
	SesionesAtendidas int
	SesionesTrabajo   int
	PagoNeto          int
	CopagosRecaudados int
}

type DetalleSesion struct {
	Fecha          string  `json:"fecha"`
	PacienteNombre string  `json:"pacienteNombre"`
	Documento      *string `json:"documento"`
	TipoTerapia    string  `json:"tipoTerapia"`
	Origen         string  `json:"origen"`
	ValorSesion    int     `json:"valorSesion"`
	CopagoCobrado  int     `json:"copagoCobrado"`
}

type CapacidadMensual struct {
	MinutosEstimados         int `json:"minutosEstimados"`
	MinutosReales            int `json:"minutosReales"`
	SesionesHechasMes        int `json:"sesionesHechasMes"`
	SesionesTotalesMes       int `json:"sesionesTotalesMes"`
	SesionesAutorizadasTotal int `json:"sesionesAutorizadasTotal"`
	SesionesRegistradasTotal int `json:"sesionesRegistradasTotal"`
}

const UmbralEscalon = 71
const DuracionEstimadaMin = 30

type FilaAgendadaProyeccion struct {
	PacienteID   int64
	Origen       string
	TarifaSesion *int
	Inicio       string
}

type ProyeccionMensual struct {
	Anio                        int `json:"anio"`
	Mes                         int `json:"mes"`
	UmbralEscalon               int `json:"umbralEscalon"`
	SesionesTrabajoActual       int `json:"sesionesTrabajoActual"`
	SesionesTrabajoProyectadas  int `json:"sesionesTrabajoProyectadas"`
	SesionesRestantes           int `json:"sesionesRestantes"`
	SesionesRestantesTrabajo    int `json:"sesionesRestantesTrabajo"`
	SesionesRestantesExtra      int `json:"sesionesRestantesExtra"`
	SesionesSinTarifa           int `json:"sesionesSinTarifa"`
	PagoNetoActual               int `json:"pagoNetoActual"`
	PagoNetoProyectado           int `json:"pagoNetoProyectado"`
	TotalActual                  int `json:"totalActual"`
	TotalProyectado              int `json:"totalProyectado"`
	ValorPromedioSesionRestante  int `json:"valorPromedioSesionRestante"`
}
