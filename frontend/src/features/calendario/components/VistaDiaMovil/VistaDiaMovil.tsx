import { Icono } from '../../../../shared/components/Icono/Icono'
import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaDiaMovil.module.css'

export interface PropsVistaDiaMovil {
  citasDelDia: Cita[]
  autorizaciones: Record<number, AutorizacionResumen | null>
  indiceAhora: number
  onAbrirCita: (cita: Cita) => void
}

export function VistaDiaMovil({ citasDelDia, autorizaciones, indiceAhora, onAbrirCita }: PropsVistaDiaMovil) {
  return (
    <>
      {citasDelDia.map((cita, indice) => (
        <div key={cita.id}>
          {indice === indiceAhora && (
            <div className={styles.divisorAhora}>
              <span className={styles.puntoAhora} />
              <span className={styles.textoAhora}>AHORA</span>
              <span className={styles.lineaAhora} />
            </div>
          )}
          <TarjetaCitaMovil cita={cita} autorizacion={autorizaciones[cita.pacienteId]} onAbrir={() => onAbrirCita(cita)} />
        </div>
      ))}

      {citasDelDia.length === 0 && (
        <div className={styles.vacio}>
          <Icono nombre="calendario" tamano={22} grosor={1.6} />
          <p>No hay citas agendadas para este día.</p>
        </div>
      )}
    </>
  )
}
