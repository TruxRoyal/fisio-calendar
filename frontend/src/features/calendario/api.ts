import { clienteApi } from '../../shared/api/cliente'
import type {
  AutorizacionResumen,
  CapacidadMensual,
  Cita,
  PacienteBusqueda,
  PacienteParaDrawer,
  RespuestaVerificarChoque,
  SolicitudActualizarCita,
  SolicitudCambiarEstado,
  SolicitudCrearCita,
} from './types'

export const citasApi = {
  listarPorRango: (desde: string, hasta: string) =>
    clienteApi.get<Cita[]>(`/citas?desde=${desde}&hasta=${hasta}`),
  obtener: (id: number) => clienteApi.get<Cita>(`/citas/${id}`),
  crear: (solicitud: SolicitudCrearCita) => clienteApi.post<Cita>('/citas', solicitud),
  actualizar: (id: number, solicitud: SolicitudActualizarCita) =>
    clienteApi.put<Cita>(`/citas/${id}`, solicitud),
  cambiarEstado: (id: number, solicitud: SolicitudCambiarEstado) =>
    clienteApi.patch<Cita>(`/citas/${id}/estado`, solicitud),
  verificarChoque: (inicio: string, fin: string, excluirCitaId?: number) =>
    clienteApi.post<RespuestaVerificarChoque>('/citas/verificar-choque', { inicio, fin, excluirCitaId }),
  eliminar: (id: number) => clienteApi.delete<void>(`/citas/${id}`),
}

export const pacientesBusquedaApi = {
  listar: (busqueda: string, mes?: string) => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (mes) parametros.set('mes', mes)
    const query = parametros.toString()
    const ruta = query ? `/pacientes?${query}` : '/pacientes'
    return clienteApi.get<PacienteBusqueda[]>(ruta)
  },
  obtenerParaDrawer: (id: number) => clienteApi.get<PacienteParaDrawer>(`/pacientes/${id}`),
}

export const autorizacionesResumenApi = {
  listarActivas: async (pacienteId: number): Promise<AutorizacionResumen[]> => {
    const autorizaciones = await clienteApi.get<(AutorizacionResumen & { activa: boolean })[]>(
      `/autorizaciones?pacienteId=${pacienteId}`,
    )
    return autorizaciones.filter((a) => a.activa)
  },
}

export const capacidadApi = {
  obtener: () => clienteApi.get<CapacidadMensual>('/resumen/capacidad-mensual'),
}
