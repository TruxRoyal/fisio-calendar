import { clienteApi } from '../../shared/api/cliente'
import type { DesglosePaciente, ResumenMensual } from './types'

export const resumenApi = {
  obtenerMensual: (anio: number, mes: number) =>
    clienteApi.get<ResumenMensual>(`/resumen/mensual?anio=${anio}&mes=${mes}`),
  descargarExcel: (anio: number, mes: number) =>
    clienteApi.descargar(`/resumen/mensual/exportar?anio=${anio}&mes=${mes}`),
  obtenerHistorico: (meses = 6, anio?: number, mes?: number) => {
    const ancla = anio && mes ? `&anio=${anio}&mes=${mes}` : ''
    return clienteApi.get<ResumenMensual[]>(`/resumen/historico?meses=${meses}${ancla}`)
  },
  obtenerDesglose: (anio: number, mes: number) =>
    clienteApi.get<DesglosePaciente[]>(`/resumen/desglose?anio=${anio}&mes=${mes}`),
}
