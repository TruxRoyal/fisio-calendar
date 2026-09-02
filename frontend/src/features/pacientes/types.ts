import type { TipoTerapia } from '../../shared/types/comun'

export type OrigenPaciente = 'trabajo' | 'extra'

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
  fechaNacimiento: string | null
  observaciones: string | null
  color: string | null
  origen: OrigenPaciente
  tarifaSesion: number | null
  creadoEn: string
  actualizadoEn: string
}

export interface AutorizacionResumen {
  id: number
  tipoTerapia: TipoTerapia
  sesionesTotales: number
  sesionesUsadas: number
  sesionesRestantes: number
  fechaVencimiento: string | null
  activa: boolean
}

export interface PacienteDetalle extends Paciente {
  autorizacionesActivas: AutorizacionResumen[]
  tiposTerapia: TipoTerapia[]
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
  fechaNacimiento?: string | null
  observaciones?: string | null
  color?: string | null
  origen: OrigenPaciente
  tarifaSesion?: number | null
}

export interface Autorizacion {
  id: number
  pacienteId: number
  numero: string | null
  tipoTerapia: TipoTerapia
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
  tipoTerapia: TipoTerapia
  copago: number
  sesionesTotales: number
  fechaVencimiento?: string | null
}

export interface SolicitudActualizarAutorizacion {
  numero?: string | null
  tipoTerapia: TipoTerapia
  copago: number
  sesionesTotales: number
  fechaVencimiento?: string | null
  activa: boolean
}

export type TipoEventoCronologia = 'sesion_atendida' | 'sesion_cancelada' | 'copago' | 'autorizacion'

export interface EventoCronologia {
  tipo: TipoEventoCronologia
  fecha: string
  titulo: string
  detalle: string | null
  monto: number | null
}

export interface FinancieroTipo {
  tipoTerapia: TipoTerapia
  facturado: number
  copagosRecibidos: number
}

export interface ResumenFinancieroPaciente {
  anio: number
  mes: number
  facturado: number
  copagosRecibidos: number
  porTipo: FinancieroTipo[]
}
