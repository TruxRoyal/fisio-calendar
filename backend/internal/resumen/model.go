package resumen

type ResumenMensual struct {
	Anio              int  `json:"anio"`
	Mes               int  `json:"mes"`
	SesionesAtendidas int  `json:"sesionesAtendidas"`
	SesionesTrabajo   int  `json:"sesionesTrabajo"`
	UmbralEscalon     int  `json:"umbralEscalon"`
	UmbralAlcanzado   bool `json:"umbralAlcanzado"`
	PagoNeto          int  `json:"pagoNeto"`
	CopagosRecaudados int  `json:"copagosRecaudados"`
	Total             int  `json:"total"`
}

type DesglosePaciente struct {
	PacienteId int    `json:"pacienteId"`
	Nombre     string `json:"nombre"`
	Sesiones   int    `json:"sesiones"`
	PagoNeto   int    `json:"pagoNeto"`
	Copagos    int    `json:"copagos"`
	Total      int    `json:"total"`
}

type FilaAgregadoMensual struct {
	AnioMes           string
	SesionesAtendidas int
	SesionesTrabajo   int
	PagoNeto          int
	CopagosRecaudados int
}

type DetalleSesion struct {
	Fecha          string
	PacienteNombre string
	ValorSesion    int
	CopagoCobrado  int
}

type CapacidadMensual struct {
	MinutosEstimados int `json:"minutosEstimados"`
	MinutosReales    int `json:"minutosReales"`
}

const UmbralEscalon = 71
const DuracionEstimadaMin = 30
