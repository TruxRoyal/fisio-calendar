import { useEffect, useState } from 'react'
import { resumenApi } from '../api'
import type { ResumenMensual } from '../types'

export function useResumen(anio: number, mes: number) {
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setCargando(true)
    resumenApi.obtenerMensual(anio, mes).then((datos) => {
      setResumen(datos)
      setCargando(false)
    })
  }, [anio, mes])

  return { resumen, cargando }
}
