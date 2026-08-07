import { clienteApi } from '../../shared/api/cliente'
import type { EstadoCita, TipoTerapia } from '../../shared/types/comun'
import type { VisitaDia } from './types'

interface CitaCruda {
  id: number
  pacienteId: number
  inicio: string
  estado: EstadoCita
  paciente: { id: number; nombre: string; tipoTerapia: TipoTerapia | null }
}

interface PacienteCrudo {
  id: number
  nombre: string
  direccion: string | null
  documento: string | null
  telefono: string | null
  diagnostico: string | null
  eps: string | null
  tipoTerapia: TipoTerapia | null
  lat: number | null
  lng: number | null
}

export const mapaApi = {
  obtenerVisitasDelDia: async (fechaISO: string): Promise<VisitaDia[]> => {
    const citas = await clienteApi.get<CitaCruda[]>(`/citas?desde=${fechaISO}&hasta=${fechaISO}`)
    const pendientes = citas.filter((cita) => cita.estado !== 'cancelada')

    const visitas = await Promise.all(
      pendientes.map(async (cita) => {
        const paciente = await clienteApi.get<PacienteCrudo>(`/pacientes/${cita.pacienteId}`)
        const visita: VisitaDia = {
          citaId: cita.id,
          pacienteId: cita.pacienteId,
          pacienteNombre: cita.paciente.nombre,
          direccion: paciente.direccion,
          lat: paciente.lat,
          lng: paciente.lng,
          hora: cita.inicio,
          estado: cita.estado,
        }
        return visita
      }),
    )

    return visitas.sort((a, b) => a.hora.localeCompare(b.hora))
  },

  actualizarCoordenadas: async (pacienteId: number, lat: number, lng: number): Promise<void> => {
    const paciente = await clienteApi.get<PacienteCrudo>(`/pacientes/${pacienteId}`)
    await clienteApi.put(`/pacientes/${pacienteId}`, {
      nombre: paciente.nombre,
      direccion: paciente.direccion,
      documento: paciente.documento,
      telefono: paciente.telefono,
      diagnostico: paciente.diagnostico,
      eps: paciente.eps,
      tipoTerapia: paciente.tipoTerapia ?? 'fisica',
      lat,
      lng,
    })
  },
}
