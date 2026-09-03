export interface ResumenTipo {
  tipoTerapia: string
  sesionesAtendidas: number
  pagoNeto: number
  copagosRecaudados: number
}

export interface ResumenMensual {
  anio: number
  mes: number
  sesionesAtendidas: number
  sesionesTrabajo: number
  umbralEscalon: number
  umbralAlcanzado: boolean
  pagoNeto: number
  copagosRecaudados: number
  total: number
  porTipo: ResumenTipo[]
}

export interface ProyeccionMensual {
  anio: number
  mes: number
  umbralEscalon: number
  sesionesTrabajoActual: number
  sesionesTrabajoProyectadas: number
  sesionesRestantes: number
  sesionesRestantesTrabajo: number
  sesionesRestantesExtra: number
  sesionesSinTarifa: number
  pagoNetoActual: number
  pagoNetoProyectado: number
  totalActual: number
  totalProyectado: number
  valorPromedioSesionRestante: number
}

export interface DesglosePaciente {
  pacienteId: number
  nombre: string
  sesiones: number
  pagoNeto: number
  copagos: number
  total: number
  porTipo: ResumenTipo[]
}
