import { useCallback, useState } from 'react'
import { mapaApi } from '../api'

interface ResultadoNominatim {
  lat: string
  lon: string
}

interface Coordenadas {
  lat: number
  lng: number
}

export function useGeocodificacion() {
  const [geocodificandoId, setGeocodificandoId] = useState<number | null>(null)

  const geocodificar = useCallback(async (pacienteId: number, direccion: string): Promise<Coordenadas | null> => {
    setGeocodificandoId(pacienteId)
    try {
      const consulta = `${direccion}, Bogotá, Colombia`
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&q=${encodeURIComponent(consulta)}`
      const respuesta = await fetch(url, { headers: { Accept: 'application/json' } })
      const resultados = (await respuesta.json()) as ResultadoNominatim[]

      if (resultados.length === 0) return null

      const coordenadas: Coordenadas = { lat: Number(resultados[0].lat), lng: Number(resultados[0].lon) }
      await mapaApi.actualizarCoordenadas(pacienteId, coordenadas.lat, coordenadas.lng)
      return coordenadas
    } finally {
      setGeocodificandoId(null)
    }
  }, [])

  return { geocodificar, geocodificandoId }
}
