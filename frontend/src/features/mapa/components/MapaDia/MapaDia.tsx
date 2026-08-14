import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconoUrl from 'leaflet/dist/images/marker-icon.png'
import iconoRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import sombraUrl from 'leaflet/dist/images/marker-shadow.png'
import type { VisitaDia } from '../../types'
import styles from './MapaDia.module.css'

L.Icon.Default.mergeOptions({ iconUrl: iconoUrl, iconRetinaUrl: iconoRetinaUrl, shadowUrl: sombraUrl })

const CENTRO_SUBA: [number, number] = [4.7431, -74.0937]

interface PropiedadesMapaDia {
  visitas: VisitaDia[]
  visitaSeleccionada: number | null
  onSeleccionarMarcador: (citaId: number) => void
}

export function MapaDia({ visitas, visitaSeleccionada, onSeleccionarMarcador }: PropiedadesMapaDia) {
  const refContenedor = useRef<HTMLDivElement>(null)
  const refMapa = useRef<L.Map | null>(null)
  const refMarcadores = useRef<globalThis.Map<number, L.Marker>>(new globalThis.Map())

  useEffect(() => {
    if (!refContenedor.current || refMapa.current) return

    refMapa.current = L.map(refContenedor.current).setView(CENTRO_SUBA, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(refMapa.current)

    return () => {
      refMapa.current?.remove()
      refMapa.current = null
    }
  }, [])

  useEffect(() => {
    const mapa = refMapa.current
    if (!mapa) return

    refMarcadores.current.forEach((marcador) => marcador.remove())
    refMarcadores.current.clear()

    const conCoordenadas = visitas.filter((v) => v.lat !== null && v.lng !== null)

    conCoordenadas.forEach((visita, indice) => {
      const marcador = L.marker([visita.lat as number, visita.lng as number])
        .addTo(mapa)
        .bindTooltip(`${indice + 1}. ${visita.pacienteNombre}`)
        .on('click', () => onSeleccionarMarcador(visita.citaId))
      refMarcadores.current.set(visita.citaId, marcador)
    })

    if (conCoordenadas.length > 0) {
      const grupo = L.featureGroup(Array.from(refMarcadores.current.values()))
      mapa.fitBounds(grupo.getBounds().pad(0.2))
    }
  }, [visitas, onSeleccionarMarcador])

  useEffect(() => {
    if (visitaSeleccionada === null) return
    const marcador = refMarcadores.current.get(visitaSeleccionada)
    if (marcador) {
      refMapa.current?.panTo(marcador.getLatLng())
      marcador.openTooltip()
    }
  }, [visitaSeleccionada])

  return <div ref={refContenedor} className={styles.contenedor} />
}
