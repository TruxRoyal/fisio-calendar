import { createContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ReactNode } from 'react'
import { type IdTema, TEMAS, resolverAccent } from './paletas'
import './base.css'

const CLAVE_TEMA = 'fisio.tema'
const CLAVE_OSCURO = 'fisio.oscuro'

export interface OrigenTransicionTema {
  x: number
  y: number
}

export interface ContextoTema {
  idTema: IdTema
  oscuro: boolean
  cambiarTema: (id: IdTema, origen?: OrigenTransicionTema) => void
  alternarOscuro: (origen?: OrigenTransicionTema) => void
  temasDisponibles: typeof TEMAS
}

export const ContextoTemaReact = createContext<ContextoTema | null>(null)

function leerTemaGuardado(): IdTema {
  const guardado = localStorage.getItem(CLAVE_TEMA)
  return guardado && guardado in TEMAS ? (guardado as IdTema) : 'rojo'
}

function leerOscuroGuardado(): boolean {
  const guardado = localStorage.getItem(CLAVE_OSCURO)
  if (guardado !== null) return guardado === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [idTema, setIdTema] = useState<IdTema>(leerTemaGuardado)
  const [oscuro, setOscuro] = useState<boolean>(leerOscuroGuardado)
  const conOnda = useRef(false)

  useLayoutEffect(() => {
    const raiz = document.documentElement
    const accent = resolverAccent(idTema, oscuro)

    const usoOnda = conOnda.current
    conOnda.current = false
    if (!usoOnda) raiz.classList.add('temaTransicion')

    raiz.dataset.oscuro = String(oscuro)
    raiz.style.setProperty('--ac', accent.ac)
    raiz.style.setProperty('--acT', accent.acT)
    raiz.style.setProperty('--acS', accent.acS)
    raiz.style.setProperty('--acS2', accent.acS2)
    raiz.style.setProperty('--acL', accent.acL)
    raiz.style.setProperty('--acD', accent.acD)

    localStorage.setItem(CLAVE_TEMA, idTema)
    localStorage.setItem(CLAVE_OSCURO, String(oscuro))

    if (usoOnda) return
    const quitarTransicion = setTimeout(() => raiz.classList.remove('temaTransicion'), 350)
    return () => clearTimeout(quitarTransicion)
  }, [idTema, oscuro])

  function conTransicion(origen: OrigenTransicionTema | undefined, aplicar: () => void) {
    const raiz = document.documentElement
    const soportaOnda = typeof document.startViewTransition === 'function'
    const reducida = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!soportaOnda || reducida) {
      aplicar()
      return
    }

    const { x, y } = origen ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    raiz.style.setProperty('--tx', `${x}px`)
    raiz.style.setProperty('--ty', `${y}px`)
    raiz.style.setProperty('--tr', `${radio}px`)

    conOnda.current = true
    document.startViewTransition(() => flushSync(aplicar))
  }

  const valor = useMemo<ContextoTema>(
    () => ({
      idTema,
      oscuro,
      cambiarTema: (id, origen) => conTransicion(origen, () => setIdTema(id)),
      alternarOscuro: (origen) => conTransicion(origen, () => setOscuro((actual) => !actual)),
      temasDisponibles: TEMAS,
    }),
    [idTema, oscuro],
  )

  return <ContextoTemaReact.Provider value={valor}>{children}</ContextoTemaReact.Provider>
}
