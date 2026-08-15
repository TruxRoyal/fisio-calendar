import type { EstadoCita, TipoTerapia } from '../../shared/types/comun'

export type { EstadoCita }

export interface PacienteResumen {
  id: number
  nombre: string
  tipoTerapia: TipoTerapia | null
  color: string | null
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
  direccion: string | null
  tipoTerapia: TipoTerapia | null
  color: string | null
  origen: 'trabajo' | 'extra'
}

export interface PacienteParaDrawer {
  id: number
  nombre: string
  direccion: string | null
  tipoTerapia: TipoTerapia | null
  color: string | null
}

export interface AutorizacionResumen {
  copago: number
  sesionesTotales: number
  sesionesRestantes: number
  fechaVencimiento: string | null
  alertaVencimiento: boolean
}

export interface CitaBorrador {
  id: number
  pacienteId: number
  autorizacionId: number | null
  inicio: string
  fin: string
  estado: EstadoCita
  valorSesion: number | null
  copagoCobrado: number
  notas: string | null
  paciente: { id: number; nombre: string; tipoTerapia: TipoTerapia | null; direccion?: string | null; color?: string | null }
}

export type VistaCalendario = 'semana' | 'dia' | 'mes'

export interface CapacidadMensual {
  minutosEstimados: number
  minutosReales: number
}
