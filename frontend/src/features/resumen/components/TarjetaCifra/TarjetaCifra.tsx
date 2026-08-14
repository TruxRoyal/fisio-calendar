import type { CSSProperties } from 'react'
import styles from './TarjetaCifra.module.css'

interface ColorCifra {
  fg: string
  bg: string
  bd: string
}

interface PropiedadesTarjetaCifra {
  etiqueta: string
  valor: string
  color: ColorCifra
  nota?: string
}

export function TarjetaCifra({ etiqueta, valor, color, nota }: PropiedadesTarjetaCifra) {
  return (
    <div
      className={styles.tarjeta}
      style={{ '--fg-cifra': color.fg, '--bg-cifra': color.bg, '--bd-cifra': color.bd } as CSSProperties}
    >
      <div className={styles.etiqueta}>{etiqueta}</div>
      <div className={styles.valor}>{valor}</div>
      {nota && <div className={styles.nota}>{nota}</div>}
    </div>
  )
}
