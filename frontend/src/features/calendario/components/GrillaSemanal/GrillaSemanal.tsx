import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import { minutosDesdeHoraBase } from '../../lib'
import type { RangoHorario } from '../../lib'
import { diferenciaMinutos, esMismoDia, formatearDiaSemana, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './GrillaSemanal.module.css'

const PIXELES_POR_HORA = 150
const ANCHO_MINIMO_BLOQUE = 64
// La altura del encabezado de horas (28px) vive en GrillaSemanal.module.css (.celdaEncabezadoDias
// / .encabezadoHoras) — ambas deben coincidir para que la columna de días y el área con scroll
// horizontal queden alineadas fila por fila.
const ALTURA_FILA = 64

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
}

/**
 * Grilla de Vista Semana: filas por día (LUN-DOM) × columnas por hora, con desplazamiento
 * horizontal (para ver más horas) y la columna de días fijada visualmente a la izquierda
 * (no forma parte del área con scroll horizontal, así que nunca se mueve con ella). El
 * desplazamiento vertical (para ver los 7 días) lo entrega el contenedor de la página
 * (`.lista` en VistaAgendaMovil), no un scroll anidado propio.
 *
 * Reemplaza, solo para Semana, el uso de GrillaHoraria (que sigue vigente para Vista Día,
 * eje de tiempo vertical de una sola columna) — ver decisión de transposición del grid.
 * El posicionamiento de las tarjetas reutiliza la misma matemática de tiempo continuo
 * (minutosDesdeHoraBase/diferenciaMinutos de lib.ts) que GrillaHoraria, solo que aplicada al
 * eje horizontal (left/width) en vez del vertical (top/height).
 */
export function GrillaSemanal({ dias, rango, autorizaciones, onAbrirCita, onIrADia }: PropsGrillaSemanal) {
  const { horaInicio, horaFin } = rango
  const horas = Array.from({ length: horaFin - horaInicio }, (_, i) => horaInicio + i)
  const anchoTotal = (horaFin - horaInicio) * PIXELES_POR_HORA
  const minutosTotales = (horaFin - horaInicio) * 60
  const hoyIso = hoyISO()
  const ahora = new Date()
  const minutosAhora = (ahora.getHours() - horaInicio) * 60 + ahora.getMinutes()

  return (
    <div className={styles.raiz}>
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
          return (
            <div
              key={dia.fechaISO}
              className={cn(styles.filaCitas, esHoy && styles.hoy)}
              style={{ width: anchoTotal, height: ALTURA_FILA }}
            >
              {esHoy && minutosAhora >= 0 && minutosAhora <= minutosTotales && (
                <div className={styles.lineaAhora} style={{ left: (minutosAhora / 60) * PIXELES_POR_HORA }}>
                  <span className={styles.puntoAhora} />
                </div>
              )}

              {dia.citas.map((cita) => (
                <TarjetaCitaMovil
                  key={cita.id}
                  cita={cita}
                  autorizacion={autorizaciones[cita.pacienteId]}
                  onAbrir={() => onAbrirCita(cita)}
                  variante="grillaHorizontal"
                  style={{
                    left: (minutosDesdeHoraBase(cita.inicio, horaInicio) / 60) * PIXELES_POR_HORA,
                    width: Math.max((diferenciaMinutos(cita.inicio, cita.fin) / 60) * PIXELES_POR_HORA, ANCHO_MINIMO_BLOQUE),
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
