import { Icono } from '../../../../shared/components/Icono/Icono'
import { GrillaHoraria } from '../GrillaHoraria/GrillaHoraria'
import type { RangoHorario } from '../../lib'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaDiaMovil.module.css'

export interface PropsVistaDiaMovil {
  fechaISO: string
  citasDelDia: Cita[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onAbrirCita: (cita: Cita) => void
}

export function VistaDiaMovil({ fechaISO, citasDelDia, rango, autorizaciones, onAbrirCita }: PropsVistaDiaMovil) {
  return (
    <>
      <GrillaHoraria
        columnas={[{ fechaISO, citas: citasDelDia }]}
        rango={rango}
        autorizaciones={autorizaciones}
        onAbrirCita={onAbrirCita}
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
