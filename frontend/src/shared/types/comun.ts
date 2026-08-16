export type TipoTerapia = 'respiratoria' | 'fisica'

export const ETIQUETA_TIPO_TERAPIA: Record<TipoTerapia, string> = {
  respiratoria: 'Fisioterapia respiratoria',
  fisica: 'Fisioterapia física',
}

export type EstadoCita = 'agendada' | 'atendida' | 'cancelada'

export interface ErrorApi {
  error: string
  mensaje: string
  detalles?: unknown
}
