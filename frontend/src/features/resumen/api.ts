import { clienteApi } from '../../shared/api/cliente'
import type { ResumenMensual } from './types'

export const resumenApi = {
  obtenerMensual: (anio: number, mes: number) =>
    clienteApi.get<ResumenMensual>(`/resumen/mensual?anio=${anio}&mes=${mes}`),
  descargarExcel: (anio: number, mes: number) =>
    clienteApi.descargar(`/resumen/mensual/exportar?anio=${anio}&mes=${mes}`),
}
