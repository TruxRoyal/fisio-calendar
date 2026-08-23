import { analizarFechaHora, formatearFechaISO } from '../../shared/lib/fecha'
import type { Cita } from './types'

export function contarVisitasPorDia(citas: Cita[], dia: Date): number {
  const iso = formatearFechaISO(dia)
  return citas.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada').length
}

/** Incremento de encaje (minutos) usado por el arrastre de citas en las grillas horarias. */
export const MINUTOS_SNAP = 15

/** Redondea `minutos` al múltiplo de MINUTOS_SNAP más cercano. */
export function snap(minutos: number): number {
  return Math.round(minutos / MINUTOS_SNAP) * MINUTOS_SNAP
}

/** Minutos transcurridos desde `horaBase` (hora entera) hasta la hora de `iso`, dentro del mismo día. */
export function minutosDesdeHoraBase(iso: string, horaBase: number): number {
  const fecha = analizarFechaHora(iso)
  return (fecha.getHours() - horaBase) * 60 + fecha.getMinutes()
}

export interface RangoHorario {
  horaInicio: number
  horaFin: number
}

export interface OpcionesRangoHorario {
  /** Duración mínima del rango, en horas. Por defecto 4. */
  spanMinimoHoras?: number
  /** Rango a usar cuando `citas` está vacío. Por defecto 08:00–18:00. */
  rangoPorDefecto?: RangoHorario
}

const RANGO_HORARIO_POR_DEFECTO: RangoHorario = { horaInicio: 8, horaFin: 18 }
const SPAN_MINIMO_HORAS_POR_DEFECTO = 4

/**
 * Calcula el rango de horas (enteras) que debe cubrir una grilla horaria para mostrar `citas`
 * sin recortarlas: se ajusta a la cita más temprana y a la más tardía, con una duración mínima
 * de `spanMinimoHoras` (por defecto 4h). Si no hay citas, usa `rangoPorDefecto` (08:00–18:00).
 * Para Vista Semana, se le pasa la unión de citas de los días visibles (Lun-Sáb) para compartir
 * un solo eje Y.
 */
export function rangoHorarioDelDia(citas: Cita[], opciones?: OpcionesRangoHorario): RangoHorario {
  const rangoPorDefecto = opciones?.rangoPorDefecto ?? RANGO_HORARIO_POR_DEFECTO
  if (citas.length === 0) return { ...rangoPorDefecto }

  const spanMinimoHoras = opciones?.spanMinimoHoras ?? SPAN_MINIMO_HORAS_POR_DEFECTO

  let minMinutos = Infinity
  let maxMinutos = -Infinity
  for (const cita of citas) {
    const inicio = analizarFechaHora(cita.inicio)
    const fin = analizarFechaHora(cita.fin)
    const minutosInicio = inicio.getHours() * 60 + inicio.getMinutes()
    const minutosFin = fin.getHours() * 60 + fin.getMinutes()
    if (minutosInicio < minMinutos) minMinutos = minutosInicio
    if (minutosFin > maxMinutos) maxMinutos = minutosFin
  }

  const horaInicio = Math.max(0, Math.floor(minMinutos / 60))
  let horaFin = Math.min(24, Math.ceil(maxMinutos / 60))
  if (horaFin - horaInicio < spanMinimoHoras) horaFin = Math.min(24, horaInicio + spanMinimoHoras)

  return { horaInicio, horaFin }
}
