import { AnilloObjetivo } from './AnilloObjetivo'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearCOP } from '../../../../shared/lib/moneda'
import type { ProyeccionMensual, ResumenMensual } from '../../types'
import styles from './PanelPresupuesto.module.css'

interface PropiedadesPanelPresupuesto {
  resumen: ResumenMensual
  proyeccion: ProyeccionMensual | null
  cargando: boolean
}

export function PanelPresupuesto({ resumen, proyeccion, cargando }: PropiedadesPanelPresupuesto) {
  return (
    <div className={styles.panel}>
      <div className={styles.tituloPanel}>Presupuesto</div>
      <div className={styles.subtituloPanel}>Proyección con tu agenda actual</div>

      {cargando || !proyeccion ? (
        <p className={styles.textoCargando}>Cargando…</p>
      ) : (
        <>
          <div className={styles.filaObjetivo}>
            <div className={styles.columnaAnillo}>
              <AnilloObjetivo
                pagoNetoActual={proyeccion.pagoNetoActual}
                pagoNetoProyectado={proyeccion.pagoNetoProyectado}
              />
            </div>
            <div className={styles.columnaEstadisticas}>
              <div className={styles.miniEstadistica}>
                <div className={styles.miniEtiqueta}>Sesiones agendadas restantes</div>
                <div className={styles.miniValor}>{proyeccion.sesionesRestantes}</div>
              </div>
              <div className={styles.miniEstadistica}>
                <div className={styles.miniEtiqueta}>Valor promedio · sesión restante</div>
                <div className={styles.miniValor}>
                  {proyeccion.sesionesRestantesTrabajo + proyeccion.sesionesRestantesExtra > 0
                    ? formatearCOP(proyeccion.valorPromedioSesionRestante)
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <EscalonTarifa resumen={resumen} proyeccion={proyeccion} />

          {proyeccion.sesionesSinTarifa > 0 && (
            <div className={styles.notaPie}>
              {proyeccion.sesionesSinTarifa} sesión{proyeccion.sesionesSinTarifa === 1 ? '' : 'es'} de pacientes con
              tarifa extra sin configurar, excluida{proyeccion.sesionesSinTarifa === 1 ? '' : 's'} de la proyección.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EscalonTarifa({ resumen, proyeccion }: { resumen: ResumenMensual; proyeccion: ProyeccionMensual }) {
  const dominio = Math.max(resumen.umbralEscalon + 5, proyeccion.sesionesTrabajoProyectadas + 3, 10)
  const actualPct = Math.min(100, (resumen.sesionesTrabajo / dominio) * 100)
  const finProyectadoPct = Math.min(100, (proyeccion.sesionesTrabajoProyectadas / dominio) * 100)
  const proyectadoAnchoPct = Math.max(0, finProyectadoPct - actualPct)
  const umbralPct = Math.min(100, (resumen.umbralEscalon / dominio) * 100)

  return (
    <div className={styles.bloqueEscalon}>
      <div className={styles.filaEscalon}>
        <div>
          <div className={styles.tituloEscalon}>Escalón de tarifa</div>
          <div className={styles.subtituloEscalon}>
            {resumen.umbralAlcanzado
              ? `Alcanzado — desde la sesión ${resumen.umbralEscalon + 1} el valor sube a $25.000`
              : `${resumen.sesionesTrabajo} de ${resumen.umbralEscalon} sesiones del trabajo para subir a $25.000`}
          </div>
          {proyeccion.sesionesRestantesTrabajo > 0 && (
            <div className={styles.notaProyectada}>
              Con lo agendado, terminarías el mes en la sesión {proyeccion.sesionesTrabajoProyectadas} de trabajo.
            </div>
          )}
        </div>
        {resumen.umbralAlcanzado && (
          <div className={styles.badgeEscalon}>
            <Icono nombre="check" tamano={13} grosor={2.6} />
            Alcanzado
          </div>
        )}
      </div>

      <div className={styles.pistaEscalon}>
        <div className={styles.rellenoActual} style={{ width: `${actualPct}%` }} />
        <div
          className={styles.rellenoProyectado}
          style={{ left: `${actualPct}%`, width: `${proyectadoAnchoPct}%` }}
        />
        <div className={styles.marcadorUmbral} style={{ left: `${umbralPct}%` }}>
          <div className={styles.etiquetaUmbral}>Umbral · sesión {resumen.umbralEscalon + 1}</div>
        </div>
      </div>

      <div className={styles.leyendaEscalon}>
        <div className={styles.itemLeyenda}>
          <span className={styles.swatchActual} />
          Atendidas ($23.500)
        </div>
        <div className={styles.itemLeyenda}>
          <span className={styles.swatchProyectado} />
          Agendadas restantes
        </div>
        <div className={styles.itemLeyenda}>
          <span className={styles.swatchUmbral} />
          Desde sesión {resumen.umbralEscalon + 1} → $25.000
        </div>
      </div>
    </div>
  )
}
