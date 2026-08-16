import { useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/clases'
import { Icono } from '../Icono/Icono'
import { ITEMS_NAV } from './Layout'
import styles from './BarraTabsMovil.module.css'

const ITEM_AJUSTES = { ruta: '/ajustes', etiqueta: 'Ajustes', icono: 'ajustes' } as const

export function BarraTabsMovil({ rutaActiva }: { rutaActiva: string }) {
  const navegar = useNavigate()
  const refBarra = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    function sincronizarIndicador() {
      const contenedor = refBarra.current
      const activo = contenedor?.querySelector<HTMLElement>('[data-activo="true"]')
      if (!contenedor || !activo) return
      contenedor.style.setProperty('--pila-x', `${activo.offsetLeft}px`)
      contenedor.style.setProperty('--pila-w', `${activo.offsetWidth}px`)
    }

    sincronizarIndicador()
    window.addEventListener('resize', sincronizarIndicador)
    return () => window.removeEventListener('resize', sincronizarIndicador)
  }, [rutaActiva])

  return (
    <nav ref={refBarra} className={styles.barra}>
      <span className={styles.indicador} />
      {[...ITEMS_NAV, ITEM_AJUSTES].map((item) => {
        const activo = rutaActiva.startsWith(item.ruta)
        return (
          <button
            key={item.ruta}
            type="button"
            data-activo={activo}
            onClick={() => !activo && navegar(item.ruta)}
            className={cn(styles.tab, activo && styles.activo)}
          >
            <Icono nombre={item.icono} tamano={20} grosor={activo ? 2.2 : 1.8} />
            <span className={styles.etiqueta}>{item.etiqueta === 'Ruta del día' ? 'Ruta' : item.etiqueta}</span>
          </button>
        )
      })}
    </nav>
  )
}
