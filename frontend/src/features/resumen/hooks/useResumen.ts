import { useEffect, useState } from 'react'
import { resumenApi } from '../api'
import type { DesglosePaciente, ResumenMensual } from '../types'

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

export function useResumenHistorico(anio: number, mes: number, meses = 6) {
  const [historico, setHistorico] = useState<ResumenMensual[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setCargando(true)
    resumenApi.obtenerHistorico(meses, anio, mes).then((datos) => {
      setHistorico(datos)
      setCargando(false)
    })
  }, [anio, mes, meses])

  return { historico, cargando }
}

export function useDesglosePorPaciente(anio: number, mes: number) {
  const [desglose, setDesglose] = useState<DesglosePaciente[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setCargando(true)
    resumenApi.obtenerDesglose(anio, mes).then((datos) => {
      setDesglose(datos)
      setCargando(false)
    })
  }, [anio, mes])

  return { desglose, cargando }
}
