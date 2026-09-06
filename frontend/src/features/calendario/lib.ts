import { analizarFechaHora, formatearFechaISO } from '../../shared/lib/fecha'
import type { Cita } from './types'

export function contarVisitasPorDia(citas: Cita[], dia: Date): number {
  const iso = formatearFechaISO(dia)
  return citas.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada').length
}

export const MINUTOS_SNAP = 15

export function snap(minutos: number): number {
  return Math.round(minutos / MINUTOS_SNAP) * MINUTOS_SNAP
}

export function minutosDesdeHoraBase(iso: string, horaBase: number): number {
  const fecha = analizarFechaHora(iso)
  return (fecha.getHours() - horaBase) * 60 + fecha.getMinutes()
}

export interface RangoHorario {
  horaInicio: number
  horaFin: number
}

export interface OpcionesRangoHorario {
  spanMinimoHoras?: number
  rangoPorDefecto?: RangoHorario
}

const RANGO_HORARIO_POR_DEFECTO: RangoHorario = { horaInicio: 8, horaFin: 18 }
const SPAN_MINIMO_HORAS_POR_DEFECTO = 4

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

  let horaInicio = Math.max(0, Math.floor(minMinutos / 60))
  let horaFin = Math.min(24, Math.ceil(maxMinutos / 60))
  if (horaFin - horaInicio < spanMinimoHoras) {
    horaFin = Math.min(24, horaInicio + spanMinimoHoras)
    if (horaFin - horaInicio < spanMinimoHoras) horaInicio = Math.max(0, horaFin - spanMinimoHoras)
  }

  return { horaInicio, horaFin }
}

export interface DisposicionSolape {
  indiceColumna: number
  totalColumnas: number
}

export function calcularDisposicionSolapes(citas: Cita[]): Map<number, DisposicionSolape> {
  const resultado = new Map<number, DisposicionSolape>()
  const ordenadas = [...citas].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fin.localeCompare(b.fin))

  let clusterMiembros: { id: number; indiceColumna: number }[] = []
  let columnasActivas: { finIso: string; indiceColumna: number }[] = []
  let finMaximoCluster = ''

  function cerrarCluster() {
    if (clusterMiembros.length === 0) return
    const totalColumnas = Math.max(...clusterMiembros.map((m) => m.indiceColumna)) + 1
    for (const m of clusterMiembros) resultado.set(m.id, { indiceColumna: m.indiceColumna, totalColumnas })
    clusterMiembros = []
    columnasActivas = []
    finMaximoCluster = ''
  }

  for (const cita of ordenadas) {
    if (clusterMiembros.length > 0 && cita.inicio >= finMaximoCluster) {
      cerrarCluster()
    }
    columnasActivas = columnasActivas.filter((c) => c.finIso > cita.inicio)
    const usadas = new Set(columnasActivas.map((c) => c.indiceColumna))
    let indiceColumna = 0
    while (usadas.has(indiceColumna)) indiceColumna++
    columnasActivas.push({ finIso: cita.fin, indiceColumna })
    clusterMiembros.push({ id: cita.id, indiceColumna })
    if (finMaximoCluster === '' || cita.fin > finMaximoCluster) finMaximoCluster = cita.fin
  }
  cerrarCluster()

  return resultado
}
