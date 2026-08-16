import { useEffect, useState } from 'react'
import { resumenApi } from '../api'
import type { DesglosePaciente, ResumenMensual } from '../types'

export function useResumen(anio: number, mes: number) {
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    resumenApi.obtenerMensual(anio, mes).then((datos) => {
      if (!vigente) return
      setResumen(datos)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [anio, mes])

  return { resumen, cargando }
}

export function useResumenHistorico(anio: number, mes: number, meses = 6) {
  const [historico, setHistorico] = useState<ResumenMensual[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    resumenApi.obtenerHistorico(meses, anio, mes).then((datos) => {
      if (!vigente) return
      setHistorico(datos)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [anio, mes, meses])

  return { historico, cargando }
}

export function useDesglosePorPaciente(anio: number, mes: number) {
  const [desglose, setDesglose] = useState<DesglosePaciente[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    resumenApi.obtenerDesglose(anio, mes).then((datos) => {
      if (!vigente) return
      setDesglose(datos)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [anio, mes])

  return { desglose, cargando }
}
