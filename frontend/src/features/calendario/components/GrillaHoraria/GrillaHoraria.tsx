import type { PointerEvent as EventoPunteroReact } from 'react'
import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import { minutosDesdeHoraBase } from '../../lib'
import type { RangoHorario } from '../../lib'
import { diferenciaMinutos, esMismoDia, formatearHora, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import type { PosicionArrastre } from '../../hooks/useArrastreMovil'
import styles from './GrillaHoraria.module.css'

export const ALTURA_HORA = 56
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
  /**
   * Posición optimista de la cita actualmente arrastrada (durante el gesto y mientras se
   * confirma el drop en el servidor): reemplaza el horario real para calcular su top/height,
   * para que la tarjeta no salte de "posición vieja" a "posición nueva" al soltar. Reservado
   * para Vista Día (eje único); Vista Semana (2 ejes) es un slice separado.
   */
  citaArrastrada?: PosicionArrastre | null
  /** Inicia el long-press que arma el arrastre de `cita` (ver useArrastreMovil). */
  onIniciarArrastre?: (cita: Cita) => (evento: EventoPunteroReact<HTMLButtonElement>) => void
}

/**
 * Grilla horaria compartida por Vista Día (1 columna) y Vista Semana (7 columnas).
 * Presentacional pura: recibe las citas ya agrupadas por columna y el rango de horas a mostrar
 * (ver rangoHorarioDelDia en lib.ts). El estado del arrastre táctil vive en useArrastreMovil,
 * instanciado por el contenedor (VistaAgendaMovil) — esta grilla solo aplica la posición
 * optimista recibida y reenvía el inicio del gesto por tarjeta.
 */
export function GrillaHoraria({ columnas, rango, autorizaciones, onAbrirCita, citaArrastrada, onIniciarArrastre }: PropsGrillaHoraria) {
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
                const arrastrandoEstaCita = citaArrastrada?.citaId === cita.id
                const inicioEfectivo = arrastrandoEstaCita ? citaArrastrada.nuevoInicio : cita.inicio
                const finEfectivo = arrastrandoEstaCita ? citaArrastrada.nuevoFin : cita.fin
                const altura = Math.max((diferenciaMinutos(inicioEfectivo, finEfectivo) / 60) * ALTURA_HORA, ALTURA_MINIMA_BLOQUE)
                const top = (minutosDesdeHoraBase(inicioEfectivo, horaInicio) / 60) * ALTURA_HORA
                return (
                  <TarjetaCitaMovil
                    key={cita.id}
                    cita={cita}
                    autorizacion={autorizaciones[cita.pacienteId]}
                    onAbrir={() => onAbrirCita(cita)}
                    variante="grilla"
                    compacto={altura < ALTURA_COMPACTA}
                    arrastrando={arrastrandoEstaCita}
                    onPointerDown={onIniciarArrastre?.(cita)}
                    style={{ top, height: altura }}
                  />
                )
              })}

              {citaArrastrada && columna.citas.some((cita) => cita.id === citaArrastrada.citaId) && (
                <div
                  className={styles.chipHora}
                  style={{ top: (minutosDesdeHoraBase(citaArrastrada.nuevoInicio, horaInicio) / 60) * ALTURA_HORA - 26 }}
                >
                  {formatearHora(citaArrastrada.nuevoInicio)} – {formatearHora(citaArrastrada.nuevoFin)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
