import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import { minutosDesdeHoraBase } from '../../lib'
import type { RangoHorario } from '../../lib'
import { diferenciaMinutos, esMismoDia, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './GrillaHoraria.module.css'

const ALTURA_HORA = 56
const ALTURA_MINIMA_BLOQUE = 30
// Por debajo de este alto, dirección/badges no caben sin recortarse (una cita de 30-45 min a
// esta escala mide 28-42px; el nombre + el padding de la tarjeta ya ocupan buena parte de eso) —
// se pide la variante compacta (solo nombre + check) en vez de dejar que overflow:hidden corte
// contenido a la mitad. 60 min (56px) y más sí entran completas.
const ALTURA_COMPACTA = 48

export interface ColumnaGrillaHoraria {
  fechaISO: string
  citas: Cita[]
}

export interface PropsGrillaHoraria {
  columnas: ColumnaGrillaHoraria[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onAbrirCita: (cita: Cita) => void
}

/**
 * Grilla horaria compartida por Vista Día (1 columna) y Vista Semana (7 columnas).
 * Presentacional pura: recibe las citas ya agrupadas por columna y el rango de horas
 * a mostrar (ver rangoHorarioDelDia en lib.ts). El posicionamiento por arrastre táctil
 * se agrega en S5; aquí las tarjetas se posicionan de forma estática según su horario.
 */
export function GrillaHoraria({ columnas, rango, autorizaciones, onAbrirCita }: PropsGrillaHoraria) {
  const { horaInicio, horaFin } = rango
  const horas = Array.from({ length: horaFin - horaInicio }, (_, i) => horaInicio + i)
  const alturaTotal = (horaFin - horaInicio) * ALTURA_HORA
  const minutosTotales = (horaFin - horaInicio) * 60
  const hoyIso = hoyISO()
  const ahora = new Date()
  const minutosAhora = (ahora.getHours() - horaInicio) * 60 + ahora.getMinutes()
  const multiple = columnas.length > 1

  return (
    <div className={styles.cuerpo}>
      <div className={styles.columnaHoras}>
        <div className={styles.espaciadorHoras} />
        {horas.map((hora) => (
          <div key={hora} className={styles.filaHora}>
            <span className={styles.textoHora}>{String(hora).padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>

      <div className={cn(styles.columnas, multiple && styles.multiple)}>
        {columnas.map((columna) => {
          const esHoy = esMismoDia(columna.fechaISO, hoyIso)
          return (
            <div key={columna.fechaISO} className={cn(styles.columna, esHoy && styles.hoy)} style={{ height: alturaTotal }}>
              {esHoy && minutosAhora >= 0 && minutosAhora <= minutosTotales && (
                <div className={styles.lineaAhora} style={{ top: (minutosAhora / 60) * ALTURA_HORA }}>
                  <span className={styles.puntoAhora} />
                </div>
              )}

              {columna.citas.map((cita) => {
                const altura = Math.max((diferenciaMinutos(cita.inicio, cita.fin) / 60) * ALTURA_HORA, ALTURA_MINIMA_BLOQUE)
                return (
                  <TarjetaCitaMovil
                    key={cita.id}
                    cita={cita}
                    autorizacion={autorizaciones[cita.pacienteId]}
                    onAbrir={() => onAbrirCita(cita)}
                    variante="grilla"
                    compacto={altura < ALTURA_COMPACTA}
                    style={{ top: (minutosDesdeHoraBase(cita.inicio, horaInicio) / 60) * ALTURA_HORA, height: altura }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
