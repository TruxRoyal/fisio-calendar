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

export function formatearFechaLarga(iso: string): string {
  const fecha = analizarFechaHora(iso)
  const dia = NOMBRES_DIA[fecha.getDay()]
  const mes = NOMBRES_MES[fecha.getMonth()]
  return `${dia} ${fecha.getDate()} de ${mes}`
}

export function minutosRestantes(iso: string): number {
  const objetivo = analizarFechaHora(iso)
  return Math.round((objetivo.getTime() - Date.now()) / 60000)
}

export function formatearMinutosRestantes(minutos: number): string {
  if (minutos < 60) return `en ${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `en ${horas} h` : `en ${horas} h ${resto} min`
}

export function formatearDuracionHoras(minutos: number): string {
  const horas = minutos / 60
  const horasRedondeadas = Math.round(horas * 10) / 10
  return `${horasRedondeadas.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`
}

export function calcularEdad(fechaNacimientoISO: string): number {
  const nacimiento = analizarFechaHora(fechaNacimientoISO)
  const ahora = hoy()
  let edad = ahora.getFullYear() - nacimiento.getFullYear()
  const aunNoCumpleEsteAnio =
    ahora.getMonth() < nacimiento.getMonth() ||
    (ahora.getMonth() === nacimiento.getMonth() && ahora.getDate() < nacimiento.getDate())
  if (aunNoCumpleEsteAnio) edad -= 1
  return edad
}

export function diasHasta(iso: string): number {
  const objetivo = analizarFechaHora(iso.length > 10 ? iso : `${iso}T00:00:00`)
  const diferenciaMs = objetivo.getTime() - hoy().getTime()
  return Math.round(diferenciaMs / (1000 * 60 * 60 * 24))
}

export function inicioMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

export function finMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
}
