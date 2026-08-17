import { formatearFechaISO } from '../../shared/lib/fecha'
import type { Cita } from './types'

export function contarVisitasPorDia(citas: Cita[], dia: Date): number {
  const iso = formatearFechaISO(dia)
  return citas.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada').length
}
