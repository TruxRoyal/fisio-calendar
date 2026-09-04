import { useEffect, useState } from 'react'
import { resumenApi } from '../api'
import type { DesglosePaciente, DetalleSesion, ProyeccionMensual, ResumenMensual } from '../types'

export function useResumen(anio: number, mes: number) {
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setResumen(null)
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

export function useProyeccion(anio: number, mes: number) {
  const [proyeccion, setProyeccion] = useState<ProyeccionMensual | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setProyeccion(null)
    setCargando(true)
    resumenApi.obtenerProyeccion(anio, mes).then((datos) => {
      if (!vigente) return
      setProyeccion(datos)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [anio, mes])

  return { proyeccion, cargando }
}

export function useResumenHistorico(anio: number, mes: number, meses = 6) {
  const [historico, setHistorico] = useState<ResumenMensual[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setHistorico([])
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
    setDesglose([])
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

export function useDetalleMensual(anio: number, mes: number) {
  const [detalle, setDetalle] = useState<DetalleSesion[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    let vigente = true
    setDetalle([])
    setCargando(true)
    resumenApi.obtenerDetalle(anio, mes).then((datos) => {
      if (!vigente) return
      setDetalle(datos)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [anio, mes])

  return { detalle, cargando }
}
