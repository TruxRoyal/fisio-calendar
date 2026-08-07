import type { EstadoCita } from '../../shared/types/comun'

export interface VisitaDia {
  citaId: number
  pacienteId: number
  pacienteNombre: string
  direccion: string | null
  lat: number | null
  lng: number | null
  hora: string
  estado: EstadoCita
}
