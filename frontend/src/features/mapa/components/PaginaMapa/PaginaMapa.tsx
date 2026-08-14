import { useEffect, useState } from 'react'
import { MapaDia } from '../MapaDia/MapaDia'
import { ListaVisitas } from '../ListaVisitas/ListaVisitas'
import { useGeocodificacion } from '../../hooks/useGeocodificacion'
import { mapaApi } from '../../api'
import { hoyISO } from '../../../../shared/lib/fecha'
import type { VisitaDia } from '../../types'
import styles from './PaginaMapa.module.css'

export function PaginaMapa() {
  const [visitas, setVisitas] = useState<VisitaDia[]>([])
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<number | null>(null)
  const { geocodificar, geocodificandoId } = useGeocodificacion()

  async function cargarVisitas() {
    const datos = await mapaApi.obtenerVisitasDelDia(hoyISO())
    setVisitas(datos)
  }

  useEffect(() => {
    cargarVisitas()
  }, [])

  async function alGeocodificar(visita: VisitaDia) {
    if (!visita.direccion) return
    const coordenadas = await geocodificar(visita.pacienteId, visita.direccion)
    if (coordenadas) await cargarVisitas()
  }

  return (
    <div className={styles.pagina}>
      <ListaVisitas
        visitas={visitas}
        visitaSeleccionada={visitaSeleccionada}
        onSeleccionar={setVisitaSeleccionada}
        onGeocodificar={alGeocodificar}
        geocodificandoId={geocodificandoId}
      />
      <div className={styles.panelMapa}>
        <div className={styles.contenedorMapa}>
          <MapaDia visitas={visitas} visitaSeleccionada={visitaSeleccionada} onSeleccionarMarcador={setVisitaSeleccionada} />
        </div>
      </div>
    </div>
  )
}
