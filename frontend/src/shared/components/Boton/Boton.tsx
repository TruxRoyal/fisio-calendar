import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/clases'
import styles from './Boton.module.css'

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma'
type TamanoBoton = 'sm' | 'md'

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  children: ReactNode
}

export function Boton({ variante = 'secundario', tamano = 'md', children, className, ...resto }: PropiedadesBoton) {
  return (
    <button {...resto} className={cn(styles.boton, styles[tamano], styles[variante], className)}>
      {children}
    </button>
  )
}
