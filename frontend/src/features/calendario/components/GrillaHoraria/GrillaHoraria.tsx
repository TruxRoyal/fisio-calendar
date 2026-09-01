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
  citaArrastrada?: PosicionArrastre | null
  onIniciarArrastre?: (cita: Cita) => (evento: EventoPunteroReact<HTMLButtonElement>) => void
  alturaHora?: number
}

export function GrillaHoraria({
  columnas,
  rango,
  autorizaciones,
  onAbrirCita,
  citaArrastrada,
  onIniciarArrastre,
  alturaHora,
}: PropsGrillaHoraria) {
  const altura = alturaHora ?? ALTURA_HORA
  const { horaInicio, horaFin } = rango
  const horas = Array.from({ length: horaFin - horaInicio }, (_, i) => horaInicio + i)
  const alturaTotal = (horaFin - horaInicio) * altura
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
          <div key={hora} className={styles.filaHora} style={{ height: altura }}>
            <span className={styles.textoHora}>{String(hora).padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>

      <div className={cn(styles.columnas, multiple && styles.multiple)}>
        {columnas.map((columna) => {
          const esHoy = esMismoDia(columna.fechaISO, hoyIso)
          return (
            <div
              key={columna.fechaISO}
              className={cn(styles.columna, esHoy && styles.hoy)}
              style={{
                height: alturaTotal,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--grid) 0 1px, transparent 1px ${altura}px)`,
              }}
            >
              {esHoy && minutosAhora >= 0 && minutosAhora <= minutosTotales && (
                <div className={styles.lineaAhora} style={{ top: (minutosAhora / 60) * altura }}>
                  <span className={styles.puntoAhora} />
                </div>
              )}

              {columna.citas.map((cita) => {
                const arrastrandoEstaCita = citaArrastrada?.citaId === cita.id
                const inicioEfectivo = arrastrandoEstaCita ? citaArrastrada.nuevoInicio : cita.inicio
                const finEfectivo = arrastrandoEstaCita ? citaArrastrada.nuevoFin : cita.fin
                const alturaBloque = Math.max((diferenciaMinutos(inicioEfectivo, finEfectivo) / 60) * altura, ALTURA_MINIMA_BLOQUE)
                const top = (minutosDesdeHoraBase(inicioEfectivo, horaInicio) / 60) * altura
                return (
                  <TarjetaCitaMovil
                    key={cita.id}
                    cita={cita}
                    autorizacion={autorizaciones[cita.pacienteId]}
                    onAbrir={() => onAbrirCita(cita)}
                    variante="grilla"
                    compacto={alturaBloque < ALTURA_COMPACTA}
                    arrastrando={arrastrandoEstaCita}
                    onPointerDown={onIniciarArrastre?.(cita)}
                    style={{ top, height: alturaBloque }}
                  />
                )
              })}

              {citaArrastrada && columna.citas.some((cita) => cita.id === citaArrastrada.citaId) && (
                <div
                  className={styles.chipHora}
                  style={{ top: (minutosDesdeHoraBase(citaArrastrada.nuevoInicio, horaInicio) / 60) * altura - 26 }}
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
