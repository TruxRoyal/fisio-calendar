export type TipoTerapia = 'respiratoria' | 'fisica'

export type EstadoCita = 'agendada' | 'atendida' | 'cancelada'

export interface ErrorApi {
  error: string
  mensaje: string
  detalles?: unknown
}
