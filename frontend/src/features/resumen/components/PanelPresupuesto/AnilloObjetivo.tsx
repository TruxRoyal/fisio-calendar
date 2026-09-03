import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearCOP } from '../../../../shared/lib/moneda'
import styles from './AnilloObjetivo.module.css'

const RADIO = 52
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

interface PropiedadesAnilloObjetivo {
  pagoNetoActual: number
  pagoNetoProyectado: number
}

export function AnilloObjetivo({ pagoNetoActual, pagoNetoProyectado }: PropiedadesAnilloObjetivo) {
  const meta = pagoNetoActual + pagoNetoProyectado
  const progreso = meta > 0 ? Math.min(1, pagoNetoActual / meta) : 0
  const porcentaje = Math.round(progreso * 100)

  return (
    <div className={styles.contenedor}>
      <div className={styles.filaCabecera}>
        <div className={styles.etiquetaCabecera}>
          <Icono nombre="objetivo" tamano={14} grosor={2} />
          Objetivo mensual
        </div>
        <div className={styles.porcentaje}>{porcentaje}%</div>
      </div>

      <div className={styles.anillo}>
        <svg viewBox="0 0 120 120" className={styles.svgAnillo}>
          <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--s3)" strokeWidth={10} />
          <circle
            cx="60"
            cy="60"
            r={RADIO}
            fill="none"
            stroke="var(--okFg)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={CIRCUNFERENCIA * (1 - progreso)}
            className={styles.arco}
          />
        </svg>
        <div className={styles.centroAnillo}>
          <div className={styles.valorMeta}>{formatearCOP(meta)}</div>
          <div className={styles.etiquetaMeta}>objetivo</div>
        </div>
      </div>

      <NotaAnillo meta={meta} pagoNetoProyectado={pagoNetoProyectado} />
    </div>
  )
}

function NotaAnillo({ meta, pagoNetoProyectado }: { meta: number; pagoNetoProyectado: number }) {
  if (meta === 0) {
    return <div className={styles.notaAnilloMuted}>Todavía no hay sesiones este mes.</div>
  }
  if (pagoNetoProyectado > 0) {
    return (
      <div className={styles.notaAnillo}>
        Te faltan <strong>{formatearCOP(pagoNetoProyectado)}</strong> para llegar a tu meta.
      </div>
    )
  }
  return <div className={styles.notaAnillo}>Meta alcanzada con lo que ya atendiste este mes.</div>
}
