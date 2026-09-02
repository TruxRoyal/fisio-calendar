import { Icono } from '../../../../shared/components/Icono/Icono'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { esMismoDia, formatearDiaSemana, formatearFechaCorta, formatearFechaISO, combinarFechaHora, hoyISO } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import { contarVisitasPorDia } from '../../lib'
import { TarjetaCitaMovil } from '../TarjetaCitaMovil/TarjetaCitaMovil'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './VistaMesMovil.module.css'

const NOMBRES_DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MAX_PUNTOS_CATEGORIA = 3

export interface PropsVistaMesMovil {
  diasGrilla: Date[]
  mesReferencia: Date
  diaSeleccionadoISO: string
  citasMes: Cita[]
  citasDelDiaSeleccionado: Cita[]
  autorizaciones: Record<number, AutorizacionResumen | null>
  cargando: boolean
  error: boolean
  onSeleccionarDia: (dia: Date) => void
  onReintentar: () => void
  onIrADia: (fechaISO: string) => void
  onAbrirCita: (cita: Cita) => void
}

function colorCategoriaCita(cita: Cita): string {
  const colorTipo = TIPO_TERAPIA_COLOR[cita.tipoTerapia]
  return cita.paciente.color ?? colorTipo.fg ?? 'var(--ac)'
}

function coloresCategoriaDelDia(citasMes: Cita[], dia: Date): string[] {
  const iso = formatearFechaISO(dia)
  const citasDelDia = citasMes.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada')
  const colores = Array.from(new Set(citasDelDia.map(colorCategoriaCita)))
  return colores.slice(0, MAX_PUNTOS_CATEGORIA)
}

export function VistaMesMovil({
  diasGrilla,
  mesReferencia,
  diaSeleccionadoISO,
  citasMes,
  citasDelDiaSeleccionado,
  autorizaciones,
  cargando,
  error,
  onSeleccionarDia,
  onReintentar,
  onIrADia,
  onAbrirCita,
}: PropsVistaMesMovil) {
  const esHoySeleccionado = esMismoDia(diaSeleccionadoISO, hoyISO())

  return (
    <div className={styles.tarjetaMes}>
      <div className={styles.filaNombresGrilla}>
        {NOMBRES_DIAS_SEMANA.map((n, i) => (
          <div key={`${n}-${i}`} className={styles.nombreDiaGrilla}>
            {n}
          </div>
        ))}
      </div>

      <div className={styles.grillaMes}>
        {diasGrilla.map((dia) => {
          const iso = formatearFechaISO(dia)
          const enMes = dia.getMonth() === mesReferencia.getMonth()
          const esHoy = esMismoDia(iso, hoyISO())
          const seleccionado = iso === diaSeleccionadoISO
          const totalVisitas = contarVisitasPorDia(citasMes, dia)
          const coloresCategoria = coloresCategoriaDelDia(citasMes, dia)
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSeleccionarDia(dia)}
              className={cn(
                styles.celdaMes,
                !enMes && styles.fueraDeMes,
                !seleccionado && esHoy && styles.hoyCelda,
                seleccionado && styles.seleccionadaCelda,
              )}
            >
              <span className={styles.numeroCelda}>{dia.getDate()}</span>
              <span className={styles.filaPuntos}>
                {coloresCategoria.map((color, i) => (
                  <span key={i} className={styles.puntoCategoria} style={{ background: color }} />
                ))}
              </span>
              {totalVisitas > 0 && <span className={styles.insigniaConteo}>{totalVisitas}</span>}
            </button>
          )
        })}
      </div>

      <div className={styles.costura} aria-hidden="true">
        <span className={styles.pin} />
      </div>

      <div className={styles.panelDia}>
        <button type="button" onClick={() => onIrADia(diaSeleccionadoISO)} className={styles.cabeceraPanel}>
          <span className={cn(esHoySeleccionado && styles.hoyPanel)}>
            {formatearDiaSemana(diaSeleccionadoISO, false)} {formatearFechaCorta(combinarFechaHora(diaSeleccionadoISO, '00:00'))}
          </span>
          <Icono nombre="chevronDerecha" tamano={14} grosor={2} />
        </button>

        {cargando && (
          <div className={styles.vacio}>
            <p>Cargando…</p>
          </div>
        )}

        {!cargando && error && (
          <div className={styles.vacio}>
            <Icono nombre="alerta" tamano={22} grosor={1.6} />
            <p>No se pudo cargar el mes.</p>
            <button type="button" onClick={onReintentar} className={styles.botonReintentar}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && (
          <>
            {citasDelDiaSeleccionado.map((cita) => (
              <TarjetaCitaMovil
                key={cita.id}
                cita={cita}
                autorizacion={autorizaciones[cita.pacienteId]}
                onAbrir={() => onAbrirCita(cita)}
              />
            ))}
            {citasDelDiaSeleccionado.length === 0 && (
              <div className={styles.vacio}>
                <Icono nombre="calendario" tamano={22} grosor={1.6} />
                <p>No hay citas agendadas este día.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
