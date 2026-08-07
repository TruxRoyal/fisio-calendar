import type { TipoTerapia } from '../../shared/types/comun'

export interface Paciente {
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
  creadoEn: string
  actualizadoEn: string
}

export interface AutorizacionResumen {
  id: number
  sesionesTotales: number
  sesionesUsadas: number
  sesionesRestantes: number
  fechaVencimiento: string | null
  activa: boolean
}

export interface PacienteDetalle extends Paciente {
  autorizacionActiva: AutorizacionResumen | null
}

export interface SolicitudPaciente {
  nombre: string
  direccion?: string | null
  documento?: string | null
  telefono?: string | null
  diagnostico?: string | null
  eps?: string | null
  tipoTerapia: TipoTerapia
  lat?: number | null
  lng?: number | null
}

export interface Autorizacion {
  id: number
  pacienteId: number
  numero: string | null
  copago: number
  sesionesTotales: number
  sesionesUsadas: number
  sesionesRestantes: number
  fechaVencimiento: string | null
  activa: boolean
  alertaVencimiento: boolean
  alertaSesiones: boolean
  creadoEn: string
}

export interface SolicitudCrearAutorizacion {
  pacienteId: number
  numero?: string | null
  copago: number
  sesionesTotales: number
  fechaVencimiento?: string | null
}

export interface SolicitudActualizarAutorizacion {
  numero?: string | null
  copago: number
  sesionesTotales: number
  fechaVencimiento?: string | null
  activa: boolean
}
