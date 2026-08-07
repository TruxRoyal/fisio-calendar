import type { EstadoCita, TipoTerapia } from '../../shared/types/comun'

export interface PacienteResumen {
  id: number
  nombre: string
  tipoTerapia: TipoTerapia | null
}

export interface Cita {
  id: number
  pacienteId: number
  autorizacionId: number | null
  inicio: string
  fin: string
  estado: EstadoCita
  valorSesion: number | null
  copagoCobrado: number
  notas: string | null
  creadoEn: string
  actualizadoEn: string
  paciente: PacienteResumen
}

export interface SolicitudCrearCita {
  pacienteId: number
  autorizacionId?: number | null
  inicio: string
  fin: string
  notas?: string | null
}

export interface SolicitudActualizarCita {
  autorizacionId?: number | null
  inicio: string
  fin: string
  notas?: string | null
}

export interface SolicitudCambiarEstado {
  estado: EstadoCita
  copagoCobrado?: number
}

export interface Conflicto {
  citaId: number
  inicio: string
  fin: string
}

export interface RespuestaVerificarChoque {
  choque: boolean
  conflicto: Conflicto | null
}

export interface PacienteBusqueda {
  id: number
  nombre: string
  eps: string | null
  tipoTerapia: TipoTerapia | null
}
