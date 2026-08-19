import { Icono } from '../../../../shared/components/Icono/Icono'
import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import { esMismoDia, formatearDiaSemana, formatearFechaCorta, combinarFechaHora, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaSemanaMovil.module.css'

export interface GrupoDiaSemana {
  fechaISO: string
  citas: Cita[]
}

export interface PropsVistaSemanaMovil {
  gruposSemana: GrupoDiaSemana[]
  autorizaciones: Record<number, AutorizacionResumen | null>
  onIrADia: (fechaISO: string) => void
  onAbrirCita: (cita: Cita) => void
}

export function VistaSemanaMovil({ gruposSemana, autorizaciones, onIrADia, onAbrirCita }: PropsVistaSemanaMovil) {
  return (
    <>
      {gruposSemana.map((grupo) => (
        <div key={grupo.fechaISO}>
          <button type="button" onClick={() => onIrADia(grupo.fechaISO)} className={styles.cabeceraGrupo}>
            <span className={cn(esMismoDia(grupo.fechaISO, hoyISO()) && styles.hoyGrupo)}>
              {formatearDiaSemana(grupo.fechaISO, false)} {formatearFechaCorta(combinarFechaHora(grupo.fechaISO, '00:00'))}
            </span>
            <Icono nombre="chevronDerecha" tamano={14} grosor={2} />
          </button>
          {grupo.citas.map((cita) => (
            <TarjetaCitaMovil key={cita.id} cita={cita} autorizacion={autorizaciones[cita.pacienteId]} onAbrir={() => onAbrirCita(cita)} />
          ))}
        </div>
      ))}

      {gruposSemana.length === 0 && (
        <div className={styles.vacio}>
          <Icono nombre="calendario" tamano={22} grosor={1.6} />
          <p>No hay citas agendadas en este rango.</p>
        </div>
      )}
    </>
  )
}
