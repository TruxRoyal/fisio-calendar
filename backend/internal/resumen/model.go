package resumen

type ResumenMensual struct {
	Anio              int  `json:"anio"`
	Mes               int  `json:"mes"`
	SesionesAtendidas int  `json:"sesionesAtendidas"`
	UmbralAlcanzado   bool `json:"umbralAlcanzado"`
	PagoNeto          int  `json:"pagoNeto"`
	CopagosRecaudados int  `json:"copagosRecaudados"`
	Total             int  `json:"total"`
}

type DetalleSesion struct {
	Fecha          string
	PacienteNombre string
	ValorSesion    int
	CopagoCobrado  int
}

const UmbralEscalon = 71
