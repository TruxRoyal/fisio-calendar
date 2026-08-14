import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { citasApi } from '../../api'
import { BotonIcono } from '../VistaSemanal/VistaSemanal'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import {
  analizarFechaHora,
  combinarFechaHora,
  diferenciaMinutos,
  esMismoDia,
  formatearFechaISO,
  formatearFechaLarga,
  formatearHora,
  hoy,
  hoyISO,
  sumarDias,
} from '../../../../shared/lib/fecha'
import type { Cita } from '../../types'
import styles from './VistaDia.module.css'

const HORA_INICIO = 6
const HORA_FIN = 20
const ALTURA_HORA = 60
const MINUTOS_SNAP = 15

interface PropiedadesVistaDia {
  fecha: Date
  onCambiarFecha: (fecha: Date) => void
  onAbrirCita: (cita: Cita) => void
  onCrearCita: (inicio: string) => void
}

export function VistaDia({ fecha, onCambiarFecha, onAbrirCita, onCrearCita }: PropiedadesVistaDia) {
  const [citas, setCitas] = useState<Cita[]>([])
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const alturaTotal = (HORA_FIN - HORA_INICIO) * ALTURA_HORA
  const iso = formatearFechaISO(fecha)
  const esHoy = esMismoDia(iso, hoyISO())
  const minutosAhora = esHoy ? (new Date().getHours() - HORA_INICIO) * 60 + new Date().getMinutes() : -1

  useEffect(() => {
    citasApi.listarPorRango(iso, iso).then(setCitas)
  }, [iso])

  function alDobleClic(evento: React.MouseEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget) return
    const rect = evento.currentTarget.getBoundingClientRect()
    const minutosDelDia = Math.round((((evento.clientY - rect.top) / ALTURA_HORA) * 60) / MINUTOS_SNAP) * MINUTOS_SNAP
    const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
    const minutos = minutosDelDia % 60
    onCrearCita(combinarFechaHora(iso, `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`))
  }

  return (
    <>
      <div className={styles.cabecera}>
        <div className={styles.navegacion}>
          <BotonIcono icono="chevronIzquierda" titulo="Día anterior" onClick={() => onCambiarFecha(sumarDias(fecha, -1))} />
          <BotonIcono icono="chevronDerecha" titulo="Día siguiente" onClick={() => onCambiarFecha(sumarDias(fecha, 1))} />
          <button type="button" onClick={() => onCambiarFecha(hoy())} className={styles.botonHoy}>
            Hoy
          </button>
        </div>
        <div className={styles.tituloDia}>{formatearFechaLarga(iso)}</div>
      </div>

      <div className={styles.cuerpo}>
        <div className={styles.grilla}>
          <div className={styles.columnaHoras}>
            {horas.map((h) => (
              <div key={h} className={styles.etiquetaHora} style={{ top: (h - HORA_INICIO) * ALTURA_HORA }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
            <div style={{ height: alturaTotal }} />
          </div>

          <div onDoubleClick={alDobleClic} className={styles.pista} style={{ height: alturaTotal }}>
            {esHoy && minutosAhora >= 0 && minutosAhora <= (HORA_FIN - HORA_INICIO) * 60 && (
              <div className={styles.lineaAhora} style={{ top: (minutosAhora / 60) * ALTURA_HORA }}>
                <span className={styles.puntoAhora} />
              </div>
            )}

            {citas.map((cita) => {
              const inicioMin = (analizarFechaHora(cita.inicio).getHours() - HORA_INICIO) * 60 + analizarFechaHora(cita.inicio).getMinutes()
              const duracion = diferenciaMinutos(cita.inicio, cita.fin)
              const colorTipo = cita.paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[cita.paciente.tipoTerapia] : null
              const colorBorde = cita.paciente.color ?? colorTipo?.fg ?? 'var(--ac)'
              return (
                <div
                  key={cita.id}
                  onClick={() => onAbrirCita(cita)}
                  className={cn(styles.bloqueCita, cita.estado === 'atendida' && styles.atendida, cita.estado === 'cancelada' && styles.cancelada)}
                  style={{
                    top: (inicioMin / 60) * ALTURA_HORA,
                    height: Math.max((duracion / 60) * ALTURA_HORA, 34),
                    '--color-borde': colorBorde,
                  } as CSSProperties}
                >
                  <span className={styles.horaBloque}>{formatearHora(cita.inicio)}</span>
                  <div className={styles.infoBloque}>
                    <div className={styles.nombreBloque}>{cita.paciente.nombre}</div>
                    <div className={styles.notaBloque}>{cita.notas || (cita.paciente.tipoTerapia ?? '')}</div>
                  </div>
                  {cita.estado === 'atendida' && <Icono nombre="check" tamano={13} grosor={2.6} className={styles.iconoCheckBloque} />}
                  <span className={styles.duracionBloque}>{duracion} min</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
