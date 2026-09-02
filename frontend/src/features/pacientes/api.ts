import { clienteApi } from '../../shared/api/cliente'
import type {
  Autorizacion,
  EventoCronologia,
  Paciente,
  PacienteDetalle,
  ResumenFinancieroPaciente,
  SolicitudActualizarAutorizacion,
  SolicitudCrearAutorizacion,
  SolicitudPaciente,
} from './types'

export const pacientesApi = {
  listar: (busqueda?: string, mes?: string) => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (mes) parametros.set('mes', mes)
    const query = parametros.toString()
    // GET /pacientes returns PacienteDetalle[], not Paciente[] — see backend/internal/paciente/repository.go Listar.
    return clienteApi.get<PacienteDetalle[]>(`/pacientes${query ? `?${query}` : ''}`)
  },
  obtener: (id: number) => clienteApi.get<PacienteDetalle>(`/pacientes/${id}`),
  crear: (solicitud: SolicitudPaciente) => clienteApi.post<Paciente>('/pacientes', solicitud),
  actualizar: (id: number, solicitud: SolicitudPaciente) => clienteApi.put<Paciente>(`/pacientes/${id}`, solicitud),
  eliminar: (id: number) => clienteApi.delete<void>(`/pacientes/${id}`),
  obtenerCronologia: (id: number) => clienteApi.get<EventoCronologia[]>(`/pacientes/${id}/cronologia`),
  obtenerResumenFinanciero: (id: number, anio: number, mes: number) =>
    clienteApi.get<ResumenFinancieroPaciente>(`/pacientes/${id}/resumen-financiero?anio=${anio}&mes=${mes}`),
}

export const autorizacionesApi = {
  listarPorPaciente: (pacienteId: number) =>
    clienteApi.get<Autorizacion[]>(`/autorizaciones?pacienteId=${pacienteId}`),
  crear: (solicitud: SolicitudCrearAutorizacion) => clienteApi.post<Autorizacion>('/autorizaciones', solicitud),
  actualizar: (id: number, solicitud: SolicitudActualizarAutorizacion) =>
    clienteApi.put<Autorizacion>(`/autorizaciones/${id}`, solicitud),
  eliminar: (id: number) => clienteApi.delete<void>(`/autorizaciones/${id}`),
}
