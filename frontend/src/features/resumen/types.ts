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
}

export interface DesglosePaciente {
  pacienteId: number
  nombre: string
  sesiones: number
  pagoNeto: number
  copagos: number
  total: number
}
