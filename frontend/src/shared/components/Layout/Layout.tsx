import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../../theme/useTheme'
import type { IdTema } from '../../theme/paletas'
import { cn } from '../../lib/clases'
import { Icono } from '../Icono/Icono'
import type { NombreIcono } from '../Icono/Icono'
import { AtmosferaFondo } from '../AtmosferaFondo/AtmosferaFondo'
import { PaletaComandos } from '../PaletaComandos/PaletaComandos'
import styles from './Layout.module.css'

function centroDe(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const ITEMS_NAV: { ruta: string; etiqueta: string; icono: NombreIcono }[] = [
  { ruta: '/calendario', etiqueta: 'Agenda', icono: 'calendario' },
  { ruta: '/pacientes', etiqueta: 'Pacientes', icono: 'paciente' },
  { ruta: '/resumen', etiqueta: 'Ingresos', icono: 'ingresos' },
  { ruta: '/mapa', etiqueta: 'Ruta del día', icono: 'mapa' },
]

export function Layout({ children }: { children: ReactNode }) {
  const ubicacion = useLocation()

  return (
    <div className={styles.layout}>
      <RailIconos rutaActiva={ubicacion.pathname} />
      <main className={styles.contenido}>{children}</main>
    </div>
  )
}

function RailIconos({ rutaActiva }: { rutaActiva: string }) {
  const [paletaAbierta, setPaletaAbierta] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const { oscuro, alternarOscuro } = useTheme()

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault()
        setBuscadorAbierto((actual) => !actual)
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [])

  return (
    <div className={styles.rail}>
      <AtmosferaFondo intensidad="intensa" base="tinta" origen="superior-derecha" className={styles.marca}>
        <Icono nombre="pulso" tamano={19} grosor={2.1} />
      </AtmosferaFondo>

      {ITEMS_NAV.map((item) => {
        const activo = rutaActiva.startsWith(item.ruta)
        return (
          <NavLink key={item.ruta} to={item.ruta} title={item.etiqueta}>
            <BotonRail activo={activo} icono={item.icono} />
          </NavLink>
        )
      })}

      <div className={styles.espaciador} />

      <button
        type="button"
        onClick={() => setBuscadorAbierto(true)}
        title="Buscar (Ctrl/Cmd + K)"
        className={styles.botonUtilidad}
      >
        <Icono nombre="buscar" tamano={19} grosor={1.9} />
      </button>

      <button
        type="button"
        onClick={(e) => alternarOscuro(centroDe(e.currentTarget))}
        title={oscuro ? 'Modo claro' : 'Modo oscuro'}
        className={styles.botonUtilidad}
      >
        <Icono nombre={oscuro ? 'sol' : 'luna'} tamano={19} grosor={1.9} />
      </button>

      <PaletaComandos abierta={buscadorAbierto} onCerrar={() => setBuscadorAbierto(false)} />

      <div className={styles.contenedorPaleta}>
        <button
          type="button"
          onClick={() => setPaletaAbierta((actual) => !actual)}
          title="Color de acento"
          className={styles.botonUtilidad}
        >
          <span className={styles.puntoAcento} />
        </button>

        {paletaAbierta && <PaletaTemas onCerrar={() => setPaletaAbierta(false)} />}
      </div>
    </div>
  )
}

function BotonRail({ activo, icono }: { activo: boolean; icono: NombreIcono }) {
  return (
    <div className={cn(styles.botonRail, activo && styles.activo)}>
      <Icono nombre={icono} tamano={20} grosor={1.8} />
    </div>
  )
}

function PaletaTemas({ onCerrar }: { onCerrar: () => void }) {
  const { idTema, cambiarTema, temasDisponibles } = useTheme()

  return (
    <>
      <div className={styles.fondoPaleta} onClick={onCerrar} />
      <div className={styles.panelPaleta}>
        <div className={styles.tituloPaleta}>Color de acento</div>
        {(Object.keys(temasDisponibles) as IdTema[]).map((id) => {
          const seleccionado = id === idTema
          return (
            <button
              key={id}
              type="button"
              onClick={(e) => {
                cambiarTema(id, centroDe(e.currentTarget))
                onCerrar()
              }}
              className={cn(styles.opcionTema, seleccionado && styles.seleccionado)}
            >
              <span
                className={styles.puntoTema}
                style={{ background: temasDisponibles[id].ac, border: `1.5px solid ${temasDisponibles[id].acL}` }}
              />
              <span className={styles.nombreTema}>{temasDisponibles[id].nombre}</span>
              {seleccionado && <Icono nombre="check" tamano={15} grosor={2.6} className={styles.iconoCheck} />}
            </button>
          )
        })}
      </div>
    </>
  )
}
