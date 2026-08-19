import type { CSSProperties, PointerEventHandler } from 'react'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { formatearHora } from '../../../../shared/lib/fecha'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita } from '../../types'
import styles from './TarjetaCitaMovil.module.css'

export interface PropsTarjetaCitaMovil {
  cita: Cita
  autorizacion?: AutorizacionResumen | null
  onAbrir: () => void
  /** 'lista' (por defecto) para listas verticales; 'grilla' se posiciona por tiempo (S5). */
  variante?: 'lista' | 'grilla'
  /** Reservado para el arrastre táctil (S5): true mientras la tarjeta se está moviendo. */
  arrastrando?: boolean
  /** Reservado para el arrastre táctil (S5): inicia el long-press que arma el drag. */
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  /** Reservado para el posicionamiento absoluto de la variante 'grilla' (S5). */
  style?: CSSProperties
}

export function TarjetaCitaMovil({ cita, autorizacion, onAbrir, variante = 'lista', arrastrando, onPointerDown, style }: PropsTarjetaCitaMovil) {
  const estado = cita.estado
  const colorTipo = cita.paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[cita.paciente.tipoTerapia] : null
  const colorBorde = cita.paciente.color ?? colorTipo?.fg ?? 'var(--ac)'
  const sesionesBajas = !!autorizacion && (autorizacion.sesionesRestantes <= 1 || autorizacion.alertaVencimiento)

  return (
    <button
      type="button"
      onClick={onAbrir}
      onPointerDown={onPointerDown}
      className={cn(styles.filaCita, styles[variante], arrastrando && styles.arrastrando)}
      style={style}
    >
      <div className={styles.columnaHora}>
        <span className={cn(styles.hora, styles[estado])}>{formatearHora(cita.inicio)}</span>
      </div>
      <div className={cn(styles.tarjeta, styles[estado])} style={{ '--color-borde': colorBorde } as CSSProperties}>
        <div className={styles.filaNombre}>
          <span className={styles.nombre}>{cita.paciente.nombre}</span>
          {cita.paciente.tipoTerapia && (
            <Icono
              nombre={cita.paciente.tipoTerapia === 'respiratoria' ? 'pulmon' : 'pulso'}
              tamano={13}
              grosor={1.9}
              className={styles.iconoTipo}
            />
          )}
          {estado === 'atendida' && <Icono nombre="check" tamano={14} grosor={2.6} className={styles.iconoCheck} />}
        </div>
        {cita.paciente.direccion && (
          <div className={styles.filaDireccion}>
            <Icono nombre="ubicacion" tamano={12} grosor={1.9} />
            <span>{cita.paciente.direccion}</span>
          </div>
        )}
        {(autorizacion || cita.copagoCobrado > 0) && (
          <div className={styles.filaBadges}>
            {autorizacion && (
              <span className={cn(styles.badgeSesiones, sesionesBajas && styles.urgente)}>
                {autorizacion.sesionesRestantes <= 1
                  ? `${autorizacion.sesionesRestantes} sesión restante`
                  : `${autorizacion.sesionesRestantes} sesiones`}
              </span>
            )}
            {cita.copagoCobrado > 0 && <span className={styles.badgeCopago}>Copago {formatearCOP(cita.copagoCobrado)}</span>}
          </div>
        )}
      </div>
    </button>
  )
}
