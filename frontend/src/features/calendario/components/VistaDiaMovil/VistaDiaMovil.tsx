import type { PointerEvent as EventoPunteroReact } from 'react'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { GrillaHoraria } from '../GrillaHoraria/GrillaHoraria'
import type { RangoHorario } from '../../lib'
import type { AutorizacionResumen, Cita } from '../../types'
import type { PosicionArrastre } from '../../hooks/useArrastreMovil'
import styles from './VistaDiaMovil.module.css'

export interface PropsVistaDiaMovil {
  fechaISO: string
  citasDelDia: Cita[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onAbrirCita: (cita: Cita) => void
  /** Posición optimista de la cita arrastrada (ver PropsGrillaHoraria.citaArrastrada). */
  citaArrastrada?: PosicionArrastre | null
  /** Inicia el long-press que arma el arrastre de `cita` (ver useArrastreMovil). */
  onIniciarArrastre?: (cita: Cita) => (evento: EventoPunteroReact<HTMLButtonElement>) => void
}

export function VistaDiaMovil({
  fechaISO,
  citasDelDia,
  rango,
  autorizaciones,
  onAbrirCita,
  citaArrastrada,
  onIniciarArrastre,
}: PropsVistaDiaMovil) {
  return (
    <>
      <GrillaHoraria
        columnas={[{ fechaISO, citas: citasDelDia }]}
        rango={rango}
        autorizaciones={autorizaciones}
        onAbrirCita={onAbrirCita}
        citaArrastrada={citaArrastrada}
        onIniciarArrastre={onIniciarArrastre}
      />

      {citasDelDia.length === 0 && (
        <div className={styles.vacio}>
          <Icono nombre="calendario" tamano={22} grosor={1.6} />
          <p>No hay citas agendadas para este día.</p>
        </div>
      )}
    </>
  )
}
