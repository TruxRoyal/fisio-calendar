import type { TipoTerapia } from '../types/comun'

export type ModoOrdenPacientes = 'alfabetico' | 'vencimiento' | 'sesionesRestantes' | 'sesionesFisica' | 'sesionesRespiratoria'

export const OPCIONES_ORDEN_PACIENTES: { id: ModoOrdenPacientes; etiqueta: string }[] = [
  { id: 'alfabetico', etiqueta: 'Nombre' },
  { id: 'vencimiento', etiqueta: 'Vencimiento' },
  { id: 'sesionesRestantes', etiqueta: 'Sesiones' },
  { id: 'sesionesFisica', etiqueta: 'Física' },
  { id: 'sesionesRespiratoria', etiqueta: 'Respiratoria' },
]

interface AutorizacionOrdenable {
  tipoTerapia: TipoTerapia
  fechaVencimiento: string | null
  sesionesTotales: number
  sesionesUsadas: number
}

interface PacienteOrdenable {
  nombre: string
  autorizacionesActivas: AutorizacionOrdenable[]
}

function comparaAlfabetico(a: PacienteOrdenable, b: PacienteOrdenable): number {
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
}

function proximoVencimiento(paciente: PacienteOrdenable): string | null {
  const fechas = paciente.autorizacionesActivas
    .map((a) => a.fechaVencimiento)
    .filter((fecha): fecha is string => fecha !== null)
  if (fechas.length === 0) return null
  return fechas.reduce((minima, fecha) => (fecha < minima ? fecha : minima))
}

function minimoSesionesRestantes(paciente: PacienteOrdenable): number | null {
  if (paciente.autorizacionesActivas.length === 0) return null
  return paciente.autorizacionesActivas.reduce(
    (minimo, a) => Math.min(minimo, a.sesionesTotales - a.sesionesUsadas),
    Number.POSITIVE_INFINITY,
  )
}

function sesionesRestantesDeTipo(paciente: PacienteOrdenable, tipo: TipoTerapia): number | null {
  const autorizacion = paciente.autorizacionesActivas.find((a) => a.tipoTerapia === tipo)
  if (!autorizacion) return null
  return autorizacion.sesionesTotales - autorizacion.sesionesUsadas
}

/**
 * Compara dos pacientes por un valor extraído (fecha, cantidad de sesiones, etc.),
 * mandando al final a quien no tenga ese valor (en vez de tratarlo como el mínimo) y
 * usando el nombre como desempate cuando el valor coincide.
 */
function compararPorValor<T>(
  a: PacienteOrdenable,
  b: PacienteOrdenable,
  extraer: (p: PacienteOrdenable) => T | null,
  comparar: (x: T, y: T) => number,
): number {
  const va = extraer(a)
  const vb = extraer(b)
  if (va === null && vb === null) return comparaAlfabetico(a, b)
  if (va === null) return 1
  if (vb === null) return -1
  const resultado = comparar(va, vb)
  return resultado !== 0 ? resultado : comparaAlfabetico(a, b)
}

function compararFechas(x: string, y: string): number {
  if (x < y) return -1
  if (x > y) return 1
  return 0
}
const compararNumeros = (x: number, y: number) => x - y

export function compararPacientes(modo: ModoOrdenPacientes) {
  return (a: PacienteOrdenable, b: PacienteOrdenable): number => {
    switch (modo) {
      case 'vencimiento':
        return compararPorValor(a, b, proximoVencimiento, compararFechas)
      case 'sesionesRestantes':
        return compararPorValor(a, b, minimoSesionesRestantes, compararNumeros)
      case 'sesionesFisica':
        return compararPorValor(a, b, (p) => sesionesRestantesDeTipo(p, 'fisica'), compararNumeros)
      case 'sesionesRespiratoria':
        return compararPorValor(a, b, (p) => sesionesRestantesDeTipo(p, 'respiratoria'), compararNumeros)
      default:
        return comparaAlfabetico(a, b)
    }
  }
}
