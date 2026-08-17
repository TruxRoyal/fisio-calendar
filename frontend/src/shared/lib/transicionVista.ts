import { flushSync } from 'react-dom'

export interface OrigenTransicionVista {
  x: number
  y: number
}

export function conTransicionVisual(origen: OrigenTransicionVista | undefined, aplicar: () => void): boolean {
  const raiz = document.documentElement
  const soportaOnda = typeof document.startViewTransition === 'function'
  const reducida = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!soportaOnda || reducida) {
    aplicar()
    return false
  }

  const { x, y } = origen ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  raiz.style.setProperty('--tx', `${x}px`)
  raiz.style.setProperty('--ty', `${y}px`)
  raiz.style.setProperty('--tr', `${radio}px`)

  document.startViewTransition(() => flushSync(aplicar))
  return true
}
