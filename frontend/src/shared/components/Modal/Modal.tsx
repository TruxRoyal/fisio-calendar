import type { ReactNode } from 'react'
import { useEffect } from 'react'
import styles from './Modal.module.css'

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
    <div className={styles.fondo} onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
        className={styles.panel}
        style={{ maxWidth: ancho }}
      >
        <div className={styles.cabecera}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className={styles.botonCerrar}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
