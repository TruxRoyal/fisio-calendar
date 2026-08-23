import type { CSSProperties, PointerEvent as EventoPunteroReact } from 'react'
import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import { minutosDesdeHoraBase } from '../../lib'
import type { RangoHorario } from '../../lib'
import { diferenciaMinutos, esMismoDia, formatearDiaSemana, formatearHora, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import type { PosicionArrastre } from '../../hooks/useArrastreMovil'
import styles from './GrillaSemanal.module.css'

export const PIXELES_POR_HORA = 150
const ANCHO_MINIMO_BLOQUE = 64

export interface DiaGrillaSemanal {
  fechaISO: string
  citas: Cita[]
}

export interface PropsGrillaSemanal {
  dias: DiaGrillaSemanal[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onAbrirCita: (cita: Cita) => void
  onIrADia: (fechaISO: string) => void
  citaArrastrada?: PosicionArrastre | null
  onIniciarArrastre?: (cita: Cita) => (evento: EventoPunteroReact<HTMLButtonElement>) => void
}

export function GrillaSemanal({ dias, rango, autorizaciones, onAbrirCita, onIrADia, citaArrastrada, onIniciarArrastre }: PropsGrillaSemanal) {
  const { horaInicio, horaFin } = rango
  const horas = Array.from({ length: horaFin - horaInicio }, (_, i) => horaInicio + i)
  const anchoTotal = (horaFin - horaInicio) * PIXELES_POR_HORA
  const minutosTotales = (horaFin - horaInicio) * 60
  const hoyIso = hoyISO()
  const ahora = new Date()
  const minutosAhora = (ahora.getHours() - horaInicio) * 60 + ahora.getMinutes()
  const citaArrastradaObjeto = citaArrastrada
    ? dias.flatMap((dia) => dia.citas).find((cita) => cita.id === citaArrastrada.citaId)
    : undefined

  return (
    <div className={styles.raiz} style={{ '--filas': dias.length } as CSSProperties}>
      <div className={styles.columnaDias}>
        <div className={styles.celdaEncabezadoDias} />
        {dias.map((dia) => {
          const esHoy = esMismoDia(dia.fechaISO, hoyIso)
          const conteo = dia.citas.filter((c) => c.estado !== 'cancelada').length
          return (
            <button
              key={dia.fechaISO}
              type="button"
              onClick={() => onIrADia(dia.fechaISO)}
              className={cn(styles.etiquetaDia, esHoy && styles.hoy)}
            >
              <span className={styles.nombreDia}>{formatearDiaSemana(dia.fechaISO)}</span>
              <span className={styles.numeroDia}>{Number(dia.fechaISO.slice(8, 10))}</span>
              {conteo > 0 && <span className={styles.conteoDia}>{conteo}</span>}
            </button>
          )
        })}
      </div>

      <div className={styles.scrollHorizontal}>
        <div className={styles.encabezadoHoras} style={{ width: anchoTotal }}>
          {horas.map((hora) => (
            <div key={hora} className={styles.celdaHora} style={{ width: PIXELES_POR_HORA }}>
              <span className={styles.textoHora}>{String(hora).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {dias.map((dia) => {
          const esHoy = esMismoDia(dia.fechaISO, hoyIso)
          const citasDeFila = dia.citas.filter((cita) => cita.id !== citaArrastrada?.citaId)
          const arrastradaEnEstaFila =
            citaArrastrada && citaArrastradaObjeto && citaArrastrada.nuevoInicio.slice(0, 10) === dia.fechaISO
              ? citaArrastradaObjeto
              : null
          return (
            <div
              key={dia.fechaISO}
              data-fecha-iso={dia.fechaISO}
              className={cn(styles.filaCitas, esHoy && styles.hoy)}
              style={{ width: anchoTotal }}
            >
              {esHoy && minutosAhora >= 0 && minutosAhora <= minutosTotales && (
                <div className={styles.lineaAhora} style={{ left: (minutosAhora / 60) * PIXELES_POR_HORA }}>
                  <span className={styles.puntoAhora} />
                </div>
              )}

              {citasDeFila.map((cita) => (
                <TarjetaCitaMovil
                  key={cita.id}
                  cita={cita}
                  autorizacion={autorizaciones[cita.pacienteId]}
                  onAbrir={() => onAbrirCita(cita)}
                  variante="grillaHorizontal"
                  onPointerDown={onIniciarArrastre?.(cita)}
                  style={{
                    left: (minutosDesdeHoraBase(cita.inicio, horaInicio) / 60) * PIXELES_POR_HORA,
                    width: Math.max((diferenciaMinutos(cita.inicio, cita.fin) / 60) * PIXELES_POR_HORA, ANCHO_MINIMO_BLOQUE),
                  }}
                />
              ))}

              {arrastradaEnEstaFila && citaArrastrada && (
                <>
                  <TarjetaCitaMovil
                    key={arrastradaEnEstaFila.id}
                    cita={arrastradaEnEstaFila}
                    autorizacion={autorizaciones[arrastradaEnEstaFila.pacienteId]}
                    onAbrir={() => onAbrirCita(arrastradaEnEstaFila)}
                    variante="grillaHorizontal"
                    arrastrando
                    onPointerDown={onIniciarArrastre?.(arrastradaEnEstaFila)}
                    style={{
                      left: (minutosDesdeHoraBase(citaArrastrada.nuevoInicio, horaInicio) / 60) * PIXELES_POR_HORA,
                      width: Math.max(
                        (diferenciaMinutos(citaArrastrada.nuevoInicio, citaArrastrada.nuevoFin) / 60) * PIXELES_POR_HORA,
                        ANCHO_MINIMO_BLOQUE,
                      ),
                    }}
                  />
                  <div
                    className={styles.chipHora}
                    style={{ left: (minutosDesdeHoraBase(citaArrastrada.nuevoInicio, horaInicio) / 60) * PIXELES_POR_HORA }}
                  >
                    {formatearHora(citaArrastrada.nuevoInicio)} – {formatearHora(citaArrastrada.nuevoFin)}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
