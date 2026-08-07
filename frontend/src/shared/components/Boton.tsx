import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma'
type TamanoBoton = 'sm' | 'md'

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  children: ReactNode
}

const ALTURA: Record<TamanoBoton, string> = { sm: '34px', md: '40px' }
const RELLENO: Record<TamanoBoton, string> = { sm: '0 12px', md: '0 16px' }
const TAMANO_FUENTE: Record<TamanoBoton, string> = { sm: '13px', md: '14px' }

function estilosVariante(variante: VarianteBoton): CSSProperties {
  switch (variante) {
    case 'primario':
      return {
        background: 'var(--ac)',
        color: 'var(--acFg)',
        border: '0',
        boxShadow: '0 2px 8px rgba(0,0,0,.12)',
      }
    case 'peligro':
      return { background: 'var(--dgFg)', color: 'var(--acFg)', border: '0' }
    case 'fantasma':
      return { background: 'transparent', color: 'var(--t2)', border: '0' }
    case 'secundario':
    default:
      return { background: 'var(--s1)', color: 'var(--t2)', border: '1px solid var(--bd)' }
  }
}

export function Boton({ variante = 'secundario', tamano = 'md', children, style, ...resto }: PropiedadesBoton) {
  return (
    <button
      {...resto}
      style={{
        height: ALTURA[tamano],
        padding: RELLENO[tamano],
        borderRadius: '10px',
        fontSize: TAMANO_FUENTE[tamano],
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        transition: 'filter .15s, transform .1s',
        ...estilosVariante(variante),
        ...style,
      }}
      onMouseDown={(evento) => {
        evento.currentTarget.style.transform = 'translateY(1px)'
      }}
      onMouseUp={(evento) => {
        evento.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </button>
  )
}
