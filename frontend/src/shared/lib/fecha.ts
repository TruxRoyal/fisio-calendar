const CERO = (n: number) => String(n).padStart(2, '0')

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const NOMBRES_DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const NOMBRES_MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function analizarFechaHora(iso: string): Date {
  const [parteFecha, parteHora] = iso.split('T')
  const [anio, mes, dia] = parteFecha.split('-').map(Number)
  const [hora, minuto, segundo] = (parteHora ?? '00:00:00').split(':').map(Number)
  return new Date(anio, mes - 1, dia, hora, minuto ?? 0, segundo ?? 0)
}

export function formatearFechaHoraISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${CERO(fecha.getMonth() + 1)}-${CERO(fecha.getDate())}T${CERO(fecha.getHours())}:${CERO(fecha.getMinutes())}:${CERO(fecha.getSeconds())}`
}

export function formatearFechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${CERO(fecha.getMonth() + 1)}-${CERO(fecha.getDate())}`
}

export function formatearHora(iso: string): string {
  const fecha = analizarFechaHora(iso)
  return `${CERO(fecha.getHours())}:${CERO(fecha.getMinutes())}`
}

export function formatearFechaCorta(iso: string): string {
  const fecha = analizarFechaHora(iso)
  return `${fecha.getDate()} ${NOMBRES_MES_CORTO[fecha.getMonth()]}`
}

export function formatearDiaSemana(iso: string, corto = true): string {
  const fecha = analizarFechaHora(iso)
  return corto ? NOMBRES_DIA_CORTO[fecha.getDay()] : NOMBRES_DIA[fecha.getDay()]
}

export function formatearMesAnio(anio: number, mes: number): string {
  const nombre = NOMBRES_MES[mes - 1]
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`
}

export function hoy(): Date {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
}

export function hoyISO(): string {
  return formatearFechaISO(hoy())
}

export function inicioSemana(fecha: Date): Date {
  const copia = new Date(fecha)
  const dia = copia.getDay()
  const diferencia = dia === 0 ? -6 : 1 - dia
  copia.setDate(copia.getDate() + diferencia)
  return copia
}

export function rangoSemana(fecha: Date): { desde: string; hasta: string } {
  const inicio = inicioSemana(fecha)
  const fin = sumarDias(inicio, 6)
  return { desde: formatearFechaISO(inicio), hasta: formatearFechaISO(fin) }
}

export function combinarFechaHora(fechaISO: string, horaHHMM: string): string {
  return `${fechaISO}T${horaHHMM}:00`
}

export function sumarMinutos(iso: string, minutos: number): string {
  const fecha = analizarFechaHora(iso)
  fecha.setMinutes(fecha.getMinutes() + minutos)
  return formatearFechaHoraISO(fecha)
}

export function diferenciaMinutos(inicioISO: string, finISO: string): number {
  const inicio = analizarFechaHora(inicioISO)
  const fin = analizarFechaHora(finISO)
  return Math.round((fin.getTime() - inicio.getTime()) / 60000)
}

export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

export function esMismoDia(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10)
}
