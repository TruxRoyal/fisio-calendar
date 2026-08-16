import { formatearFechaLarga, formatearHora, hoyISO } from '../../../../shared/lib/fecha'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { AtmosferaFondo } from '../../../../shared/components/AtmosferaFondo/AtmosferaFondo'
import { cn } from '../../../../shared/lib/clases'
import type { VisitaDia } from '../../types'
import styles from './ListaVisitas.module.css'

interface PropiedadesListaVisitas {
  visitas: VisitaDia[]
  visitaSeleccionada: number | null
  onSeleccionar: (citaId: number) => void
  onGeocodificar: (visita: VisitaDia) => void
  geocodificandoId: number | null
}

export function ListaVisitas({
  visitas,
  visitaSeleccionada,
  onSeleccionar,
  onGeocodificar,
  geocodificandoId,
}: PropiedadesListaVisitas) {
  const conCoordenadas = visitas.filter((v) => v.lat !== null).length

  return (
    <div className={styles.panel}>
      <AtmosferaFondo intensidad="suave" origen="superior-derecha" className={styles.heroCabecera}>
        <div className={styles.cabecera}>
          <div className={styles.etiqueta}>Ruta del día</div>
          <div className={styles.fecha}>{formatearFechaLarga(hoyISO())}</div>
          <div className={styles.filaStats}>
            <div>
              <div className={styles.valorStat}>{visitas.length}</div>
              <div className={styles.etiquetaStat}>Paradas</div>
            </div>
            <div>
              <div className={styles.valorStat}>{conCoordenadas}</div>
              <div className={styles.etiquetaStat}>Ubicadas</div>
            </div>
          </div>
        </div>
      </AtmosferaFondo>

      <div className={styles.lista}>
        {visitas.map((visita, indice) => {
          const activa = visitaSeleccionada === visita.citaId
          const esUltima = indice === visitas.length - 1

          return (
            <div key={visita.citaId} className={styles.filaVisita}>
              <div className={styles.columnaIndice}>
                <div className={cn(styles.circuloIndice, activa && styles.activa)}>{indice + 1}</div>
                {!esUltima && <div className={styles.lineaConectora} />}
              </div>

              <button type="button" onClick={() => onSeleccionar(visita.citaId)} className={styles.botonVisita}>
                <div className={cn(styles.tarjetaVisita, styles[visita.estado], activa && styles.activa)}>
                  <div className={styles.filaTitulo}>
                    <span className={cn(styles.horaVisita, styles[visita.estado], activa && styles.activa)}>
                      {formatearHora(visita.hora)}
                    </span>
                    <span className={cn(styles.nombreVisita, styles[visita.estado], activa && styles.activa)}>
                      {visita.pacienteNombre}
                    </span>
                    {visita.estado === 'atendida' && <Icono nombre="check" tamano={14} grosor={2.6} className={styles.iconoCheckVisita} />}
                  </div>
                  <div className={styles.direccionVisita}>{visita.direccion ?? 'Sin dirección registrada'}</div>
                  {visita.lat === null && visita.direccion && (
                    <div className={styles.accionGeocodificar}>
                      <Boton
                        tamano="sm"
                        variante="secundario"
                        disabled={geocodificandoId === visita.pacienteId}
                        onClick={(evento) => {
                          evento.stopPropagation()
                          onGeocodificar(visita)
                        }}
                      >
                        <Icono nombre="ubicacion" tamano={13} grosor={2} />
                        {geocodificandoId === visita.pacienteId ? 'Ubicando…' : 'Ubicar en el mapa'}
                      </Boton>
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}
        {visitas.length === 0 && (
          <AtmosferaFondo intensidad="suave" origen="inferior-derecha" className={styles.heroVacio}>
            <div className={styles.contenidoVacio}>
              <Icono nombre="mapa" tamano={20} grosor={1.6} />
              <p className={styles.vacio}>No hay visitas programadas para hoy</p>
            </div>
          </AtmosferaFondo>
        )}
      </div>
    </div>
  )
}
