import { Icono } from '../../../../shared/components/Icono/Icono'
import { GrillaSemanal } from '../GrillaSemanal/GrillaSemanal'
import type { DiaGrillaSemanal } from '../GrillaSemanal/GrillaSemanal'
import type { RangoHorario } from '../../lib'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaSemanaMovil.module.css'

export interface PropsVistaSemanaMovil {
  dias: DiaGrillaSemanal[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onIrADia: (fechaISO: string) => void
  onAbrirCita: (cita: Cita) => void
}

export function VistaSemanaMovil({ dias, rango, autorizaciones, onIrADia, onAbrirCita }: PropsVistaSemanaMovil) {
  const hayCitas = dias.some((dia) => dia.citas.length > 0)

  return (
    <>
      <GrillaSemanal dias={dias} rango={rango} autorizaciones={autorizaciones} onAbrirCita={onAbrirCita} onIrADia={onIrADia} />

      {!hayCitas && (
        <div className={styles.vacio}>
          <Icono nombre="calendario" tamano={22} grosor={1.6} />
          <p>No hay citas agendadas en este rango.</p>
        </div>
      )}
    </>
  )
}
