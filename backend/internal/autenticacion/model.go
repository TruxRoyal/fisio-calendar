package autenticacion

type Usuario struct {
	ID     int64  `json:"id"`
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
	Rol    string `json:"rol"`
}

type usuarioConHash struct {
	ID               int64
	Nombre           string
	Email            string
	Rol              string
	PasswordHash     string
	IntentosFallidos int
	BloqueadoHasta   *string
}

type refreshTokenFila struct {
	ID        int64
	UsuarioID int64
	FamiliaID string
	ExpiraEn  string
	Revocado  bool
}

type SolicitudLogin struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

var RolesValidos = []string{"paciente", "fisio", "admin"}
