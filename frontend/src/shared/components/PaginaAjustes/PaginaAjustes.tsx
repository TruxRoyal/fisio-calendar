import { useTheme } from '../../theme/useTheme'
import type { IdTema } from '../../theme/paletas'
import { Icono } from '../Icono/Icono'
import { cn } from '../../lib/clases'
import styles from './PaginaAjustes.module.css'

function centroDe(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function PaginaAjustes() {
  const { oscuro, alternarOscuro, idTema, cambiarTema, temasDisponibles } = useTheme()

  return (
    <div className={styles.pagina}>
      <div className={styles.contenedor}>
        <div className={styles.etiqueta}>Ajustes</div>
        <h1 className={styles.titulo}>Apariencia</h1>

        <div className={styles.seccion}>
          <div className={styles.tituloSeccion}>Modo</div>
          <div className={styles.filaModo}>
            <button
              type="button"
              onClick={(e) => oscuro && alternarOscuro(centroDe(e.currentTarget))}
              className={cn(styles.opcionModo, !oscuro && styles.activo)}
            >
              <Icono nombre="sol" tamano={18} grosor={1.9} />
              Claro
            </button>
            <button
              type="button"
              onClick={(e) => !oscuro && alternarOscuro(centroDe(e.currentTarget))}
              className={cn(styles.opcionModo, oscuro && styles.activo)}
            >
              <Icono nombre="luna" tamano={18} grosor={1.9} />
              Oscuro
            </button>
          </div>
        </div>

        <div className={styles.seccion}>
          <div className={styles.tituloSeccion}>Color de acento</div>
          <div className={styles.gridTemas}>
            {(Object.keys(temasDisponibles) as IdTema[]).map((id) => {
              const seleccionado = id === idTema
              return (
                <button
                  key={id}
                  type="button"
                  onClick={(e) => cambiarTema(id, centroDe(e.currentTarget))}
                  className={cn(styles.opcionTema, seleccionado && styles.seleccionado)}
                >
                  <span
                    className={styles.puntoTema}
                    style={{ background: temasDisponibles[id].ac, border: `1.5px solid ${temasDisponibles[id].acL}` }}
                  />
                  <span className={styles.nombreTema}>{temasDisponibles[id].nombre}</span>
                  {seleccionado && <Icono nombre="check" tamano={14} grosor={2.6} className={styles.iconoCheck} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
