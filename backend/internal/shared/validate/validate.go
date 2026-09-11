package validate

import (
	"fmt"
	"net/mail"
	"time"
)

type Errores map[string]string

func Nuevo() Errores {
	return Errores{}
}

func (e Errores) Agregar(campo, mensaje string) {
	e[campo] = mensaje
}

func (e Errores) TieneErrores() bool {
	return len(e) > 0
}

func TextoNoVacio(valor, campo string, errores Errores) {
	if valor == "" {
		errores.Agregar(campo, fmt.Sprintf("%s es obligatorio", campo))
	}
}

func EnteroPositivo(valor int, campo string, errores Errores) {
	if valor <= 0 {
		errores.Agregar(campo, fmt.Sprintf("%s debe ser mayor a cero", campo))
	}
}

func EnteroNoNegativo(valor int, campo string, errores Errores) {
	if valor < 0 {
		errores.Agregar(campo, fmt.Sprintf("%s no puede ser negativo", campo))
	}
}

func Enum(valor string, permitidos []string, campo string, errores Errores) {
	for _, opcion := range permitidos {
		if valor == opcion {
			return
		}
	}
	errores.Agregar(campo, fmt.Sprintf("%s debe ser uno de: %v", campo, permitidos))
}

func FechaHoraISO(valor, campo string, errores Errores) {
	if _, err := time.Parse("2006-01-02T15:04:05", valor); err != nil {
		errores.Agregar(campo, fmt.Sprintf("%s debe tener formato ISO-8601 (YYYY-MM-DDTHH:MM:SS)", campo))
	}
}

func Email(valor, campo string, errores Errores) {
	if _, err := mail.ParseAddress(valor); err != nil {
		errores.Agregar(campo, fmt.Sprintf("%s debe ser un email valido", campo))
	}
}

func LongitudMinima(valor string, min int, campo string, errores Errores) {
	if len(valor) < min {
		errores.Agregar(campo, fmt.Sprintf("%s debe tener al menos %d caracteres", campo, min))
	}
}
