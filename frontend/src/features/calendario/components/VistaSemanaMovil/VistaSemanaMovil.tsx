import { Icono } from '../../../../shared/components/Icono/Icono'
import { GrillaHoraria } from '../GrillaHoraria/GrillaHoraria'
import type { ColumnaGrillaHoraria } from '../GrillaHoraria/GrillaHoraria'
import { esMismoDia, formatearDiaSemana, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { RangoHorario } from '../../lib'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaSemanaMovil.module.css'

export interface PropsVistaSemanaMovil {
  columnas: ColumnaGrillaHoraria[]
  rango: RangoHorario
  autorizaciones: Record<number, AutorizacionResumen | null>
  onIrADia: (fechaISO: string) => void
  onAbrirCita: (cita: Cita) => void
}

export function VistaSemanaMovil({ columnas, rango, autorizaciones, onIrADia, onAbrirCita }: PropsVistaSemanaMovil) {
  const hoyIso = hoyISO()
  const hayCitas = columnas.some((columna) => columna.citas.length > 0)

  return (
    <>
      <div className={styles.tiraDias}>
        {columnas.map((columna) => {
          const esHoy = esMismoDia(columna.fechaISO, hoyIso)
          const tieneVisitas = columna.citas.some((c) => c.estado !== 'cancelada')
          return (
            <button
              key={columna.fechaISO}
              type="button"
              onClick={() => onIrADia(columna.fechaISO)}
              className={cn(styles.chipDia, esHoy && styles.hoy)}
            >
              <span className={styles.nombreChip}>{formatearDiaSemana(columna.fechaISO)}</span>
              <span className={styles.numeroChip}>{Number(columna.fechaISO.slice(8, 10))}</span>
              <span className={cn(styles.puntoChip, tieneVisitas && styles.visible)} />
            </button>
          )
        })}
      </div>

      <GrillaHoraria columnas={columnas} rango={rango} autorizaciones={autorizaciones} onAbrirCita={onAbrirCita} />

      {!hayCitas && (
        <div className={styles.vacio}>
          <Icono nombre="calendario" tamano={22} grosor={1.6} />
          <p>No hay citas agendadas en este rango.</p>
        </div>
      )}
    </>
  )
}
