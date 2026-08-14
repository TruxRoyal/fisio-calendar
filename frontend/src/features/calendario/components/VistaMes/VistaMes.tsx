import { useEffect, useState } from 'react'
import { citasApi } from '../../api'
import { BotonIcono } from '../VistaSemanal/VistaSemanal'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import {
  esMismoDia,
  formatearFechaISO,
  formatearMesAnio,
  hoy,
  hoyISO,
  inicioMes,
  inicioSemana,
  sumarDias,
} from '../../../../shared/lib/fecha'
import type { Cita } from '../../types'
import styles from './VistaMes.module.css'

const NOMBRES_DIA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_CHIPS_POR_DIA = 3

interface PropiedadesVistaMes {
  onAbrirCita: (cita: Cita) => void
  onIrADia: (fecha: Date) => void
}

export function VistaMes({ onAbrirCita, onIrADia }: PropiedadesVistaMes) {
  const [mesReferencia, setMesReferencia] = useState(hoy())
  const [citas, setCitas] = useState<Cita[]>([])

  const primerDiaMes = inicioMes(mesReferencia)
  const inicioGrilla = inicioSemana(primerDiaMes)
  const diasGrilla = Array.from({ length: 42 }, (_, i) => sumarDias(inicioGrilla, i))

  useEffect(() => {
    const desde = formatearFechaISO(inicioGrilla)
    const hasta = formatearFechaISO(sumarDias(inicioGrilla, 41))
    citasApi.listarPorRango(desde, hasta).then(setCitas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesReferencia])

  return (
    <>
      <div className={styles.cabecera}>
        <div className={styles.navegacion}>
          <BotonIcono icono="chevronIzquierda" titulo="Mes anterior" onClick={() => setMesReferencia((f) => new Date(f.getFullYear(), f.getMonth() - 1, 1))} />
          <BotonIcono icono="chevronDerecha" titulo="Mes siguiente" onClick={() => setMesReferencia((f) => new Date(f.getFullYear(), f.getMonth() + 1, 1))} />
          <button type="button" onClick={() => setMesReferencia(hoy())} className={styles.botonHoy}>
            Hoy
          </button>
        </div>
        <div className={styles.tituloMes}>{formatearMesAnio(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1)}</div>
      </div>

      <div className={styles.cuerpo}>
        <div className={styles.filaDiasSemana}>
          {NOMBRES_DIA_CORTO.map((nombre) => (
            <div key={nombre} className={styles.nombreDiaSemana}>
              {nombre}
            </div>
          ))}
        </div>

        <div className={styles.grillaDias}>
          {diasGrilla.map((dia) => {
            const iso = formatearFechaISO(dia)
            const enMes = dia.getMonth() === primerDiaMes.getMonth()
            const esHoy = esMismoDia(iso, hoyISO())
            const citasDelDia = citas.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada')
            const visibles = citasDelDia.slice(0, MAX_CHIPS_POR_DIA)
            const restantes = citasDelDia.length - visibles.length

            return (
              <button
                type="button"
                key={iso}
                onClick={() => onIrADia(dia)}
                className={cn(styles.celdaDia, !enMes && styles.fueraDeMes, esHoy && styles.hoy)}
              >
                <div className={styles.filaNumeroDia}>
                  <span className={cn(styles.numeroDia, !enMes && styles.fueraDeMes, esHoy && styles.hoy)}>{dia.getDate()}</span>
                  {restantes > 0 && <span className={styles.contadorRestantes}>+{restantes}</span>}
                </div>

                {visibles.map((cita) => {
                  const colorTipo = cita.paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[cita.paciente.tipoTerapia] : null
                  const punto = cita.paciente.color ?? colorTipo?.fg ?? 'var(--ac)'
                  return (
                    <div
                      key={cita.id}
                      onClick={(evento) => {
                        evento.stopPropagation()
                        onAbrirCita(cita)
                      }}
                      className={styles.chipCita}
                    >
                      <span className={styles.puntoChip} style={{ background: punto }} />
                      {cita.paciente.nombre}
                    </div>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
