import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme/useTheme'
import type { IdTema } from '../../theme/paletas'
import { Icono } from '../Icono/Icono'
import type { NombreIcono } from '../Icono/Icono'
import { cn } from '../../lib/clases'
import { useEsMovil } from '../../hooks/useEsMovil'
import { usePreferenciaConfirmarEmpuje } from '../../../features/calendario/hooks/usePreferenciaConfirmarEmpuje'
import { usePwaInstalable } from '../../pwa/usePwaInstalable'
import { useAuth } from '../../../features/auth/AuthContext'
import styles from './PaginaAjustes.module.css'

function centroDe(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

interface Categoria {
  id: string
  etiqueta: string
  icono: NombreIcono
  descripcion: string
}

const CATEGORIAS: Categoria[] = [
  { id: 'apariencia', etiqueta: 'Apariencia', icono: 'sol', descripcion: 'Tema y color de acento de la aplicación.' },
  { id: 'agenda', etiqueta: 'Agenda', icono: 'calendario', descripcion: 'Cómo se comporta el calendario al reagendar citas.' },
  { id: 'aplicacion', etiqueta: 'Aplicación', icono: 'descargar', descripcion: 'Instalá Physinow en este dispositivo para abrirla más rápido.' },
]

export function PaginaAjustes() {
  const esMovil = useEsMovil()
  return esMovil ? <PaginaAjustesMovil /> : <PaginaAjustesEscritorio />
}

function PaginaAjustesMovil() {
  return (
    <div className={styles.pagina}>
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Ajustes</h1>

        <div className={styles.seccion}>
          <div className={styles.tituloSeccion}>Apariencia</div>
          <SeccionApariencia />
        </div>

        <div className={styles.seccion}>
          <div className={styles.tituloSeccion}>Agenda</div>
          <SeccionAgenda />
        </div>

        <div className={styles.seccion}>
          <div className={styles.tituloSeccion}>Aplicación</div>
          <SeccionAplicacion />
        </div>
      </div>
    </div>
  )
}

function PaginaAjustesEscritorio() {
  const [categoriaActiva, setCategoriaActiva] = useState<string>(CATEGORIAS[0].id)
  const categoria = CATEGORIAS.find((c) => c.id === categoriaActiva) ?? CATEGORIAS[0]

  return (
    <div className={styles.paginaEscritorioFondo}>
      <div className={styles.paginaEscritorio}>
        <aside className={styles.navLateral}>
          <div className={styles.tituloNav}>Ajustes</div>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaActiva(c.id)}
              aria-pressed={c.id === categoriaActiva}
              className={cn(styles.itemNav, c.id === categoriaActiva && styles.itemNavActivo)}
            >
              <Icono nombre={c.icono} tamano={17} grosor={1.9} />
              {c.etiqueta}
            </button>
          ))}
        </aside>

        <div className={styles.panelContenido}>
          <h1 className={styles.tituloCategoria}>{categoria.etiqueta}</h1>
          <p className={styles.descripcionCategoria}>{categoria.descripcion}</p>

          {categoria.id === 'apariencia' && <SeccionApariencia />}
          {categoria.id === 'agenda' && <SeccionAgenda />}
          {categoria.id === 'aplicacion' && <SeccionAplicacion />}
        </div>
      </div>
    </div>
  )
}

function SeccionApariencia() {
  const { oscuro, alternarOscuro, idTema, cambiarTema, temasDisponibles } = useTheme()

  return (
    <>
      <div className={styles.grupo}>
        <div className={styles.tituloGrupo}>Modo</div>
        <div className={styles.segmentado}>
          <button
            type="button"
            onClick={(e) => oscuro && alternarOscuro(centroDe(e.currentTarget))}
            aria-pressed={!oscuro}
            className={cn(styles.segmento, !oscuro && styles.segmentoActivo)}
          >
            <Icono nombre="sol" tamano={16} grosor={2} />
            Claro
          </button>
          <button
            type="button"
            onClick={(e) => !oscuro && alternarOscuro(centroDe(e.currentTarget))}
            aria-pressed={oscuro}
            className={cn(styles.segmento, oscuro && styles.segmentoActivo)}
          >
            <Icono nombre="luna" tamano={16} grosor={2} />
            Oscuro
          </button>
        </div>
      </div>

      <div className={styles.grupo}>
        <div className={styles.tituloGrupo}>Color de acento</div>
        <div className={styles.filaSwatches}>
          {(Object.keys(temasDisponibles) as IdTema[]).map((id) => {
            const seleccionado = id === idTema
            return (
              <button
                key={id}
                type="button"
                title={temasDisponibles[id].nombre}
                onClick={(e) => cambiarTema(id, centroDe(e.currentTarget))}
                aria-pressed={seleccionado}
                className={cn(styles.swatch, seleccionado && styles.swatchSeleccionado)}
                style={{ background: temasDisponibles[id].ac }}
              >
                {seleccionado && <Icono nombre="check" tamano={16} grosor={3} className={styles.swatchCheck} />}
              </button>
            )
          })}
        </div>
        <div className={styles.nombreTemaActivo}>{temasDisponibles[idTema].nombre}</div>
      </div>
    </>
  )
}

function SeccionAgenda() {
  const { confirmarEmpuje, setConfirmarEmpuje } = usePreferenciaConfirmarEmpuje()

  return (
    <div className={styles.grupo}>
      <div className={styles.tituloGrupo}>Al mover una cita sobre otra</div>
      <div className={styles.segmentado}>
        <button
          type="button"
          onClick={() => setConfirmarEmpuje(true)}
          aria-pressed={confirmarEmpuje}
          className={cn(styles.segmento, confirmarEmpuje && styles.segmentoActivo)}
        >
          Preguntar
        </button>
        <button
          type="button"
          onClick={() => setConfirmarEmpuje(false)}
          aria-pressed={!confirmarEmpuje}
          className={cn(styles.segmento, !confirmarEmpuje && styles.segmentoActivo)}
        >
          Directo
        </button>
      </div>
      <p className={styles.textoAyuda}>
        {confirmarEmpuje
          ? 'Te va a mostrar qué citas se corren antes de aplicar el cambio.'
          : 'Va a correr las citas siguientes sin pedir confirmación.'}
      </p>
    </div>
  )
}

function SeccionAplicacion() {
  const { puedeInstalar, instalada, esIOS, instalar } = usePwaInstalable()
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function alCerrarSesion() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <div className={styles.grupo}>
        <div className={styles.tituloGrupo}>Instalación</div>
        <ContenidoInstalacion puedeInstalar={puedeInstalar} instalada={instalada} esIOS={esIOS} instalar={instalar} />
      </div>

      <div className={styles.grupo}>
        <div className={styles.tituloGrupo}>Cuenta</div>
        <button type="button" onClick={alCerrarSesion} className={styles.botonPeligro}>
          <Icono nombre="salir" tamano={17} grosor={1.9} />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

function ContenidoInstalacion({
  puedeInstalar,
  instalada,
  esIOS,
  instalar,
}: {
  puedeInstalar: boolean
  instalada: boolean
  esIOS: boolean
  instalar: () => void
}) {
  if (instalada) {
    return <p className={styles.textoAyuda}>Ya tenés Physinow instalada en este dispositivo.</p>
  }
  if (esIOS) {
    return <p className={styles.textoAyuda}>Tocá el botón Compartir de Safari y elegí "Agregar a inicio" para instalarla.</p>
  }
  if (puedeInstalar) {
    return (
      <button type="button" onClick={instalar} className={styles.botonInstalar}>
        <Icono nombre="descargar" tamano={17} grosor={1.9} />
        Instalar app
      </button>
    )
  }
  return (
    <p className={styles.textoAyuda}>Tu navegador no ofreció la instalación en esta sesión. Recargá la página e intentá de nuevo.</p>
  )
}
