import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface PropiedadesModal {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}

export function Modal({ abierto, titulo, onCerrar, children, ancho = '480px' }: PropiedadesModal) {
  useEffect(() => {
    if (!abierto) return

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: ancho,
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--s1)',
          border: '1px solid var(--bd)',
          borderRadius: '18px',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--t1)' }}>{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              width: '30px',
              height: '30px',
              border: 'none',
              background: 'var(--s3)',
              borderRadius: '9px',
              cursor: 'pointer',
              color: 'var(--t2)',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
