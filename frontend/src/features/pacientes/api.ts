import { clienteApi } from '../../shared/api/cliente'
import type {
  Autorizacion,
  Paciente,
  PacienteDetalle,
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
    return clienteApi.get<Paciente[]>(`/pacientes${query ? `?${query}` : ''}`)
  },
  obtener: (id: number) => clienteApi.get<PacienteDetalle>(`/pacientes/${id}`),
  crear: (solicitud: SolicitudPaciente) => clienteApi.post<Paciente>('/pacientes', solicitud),
  actualizar: (id: number, solicitud: SolicitudPaciente) => clienteApi.put<Paciente>(`/pacientes/${id}`, solicitud),
  eliminar: (id: number) => clienteApi.delete<void>(`/pacientes/${id}`),
}

export const autorizacionesApi = {
  listarPorPaciente: (pacienteId: number) =>
    clienteApi.get<Autorizacion[]>(`/autorizaciones?pacienteId=${pacienteId}`),
  crear: (solicitud: SolicitudCrearAutorizacion) => clienteApi.post<Autorizacion>('/autorizaciones', solicitud),
  actualizar: (id: number, solicitud: SolicitudActualizarAutorizacion) =>
    clienteApi.put<Autorizacion>(`/autorizaciones/${id}`, solicitud),
  eliminar: (id: number) => clienteApi.delete<void>(`/autorizaciones/${id}`),
}
