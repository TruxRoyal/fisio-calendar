import type { CSSProperties } from 'react'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { cn } from '../../../../shared/lib/clases'
import styles from './TarjetaCifra.module.css'

interface ColorCifra {
  fg: string
  bg: string
  bd: string
}

export interface DeltaCifra {
  texto: string
  positivo: boolean
}

interface PropiedadesTarjetaCifra {
  etiqueta: string
  valor: string
  color: ColorCifra
  nota?: string
  delta?: DeltaCifra | null
}

export function TarjetaCifra({ etiqueta, valor, color, nota, delta }: PropiedadesTarjetaCifra) {
  return (
    <div
      className={styles.tarjeta}
      style={{ '--fg-cifra': color.fg, '--bg-cifra': color.bg, '--bd-cifra': color.bd } as CSSProperties}
    >
      <div className={styles.filaEtiqueta}>
        <div className={styles.etiqueta}>{etiqueta}</div>
        {delta && (
          <div className={cn(styles.delta, delta.positivo ? styles.deltaPositivo : styles.deltaNegativo)}>
            <Icono nombre="chevronDerecha" tamano={10} grosor={2.6} className={styles.iconoDelta} />
            {delta.texto}
          </div>
        )}
      </div>
      <div className={styles.valor}>{valor}</div>
      {nota && <div className={styles.nota}>{nota}</div>}
    </div>
  )
}
