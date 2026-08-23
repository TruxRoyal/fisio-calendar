import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as EventoPunteroReact } from 'react'
import { minutosDesdeHoraBase, snap } from '../lib'
import type { RangoHorario } from '../lib'
import { combinarFechaHora, diferenciaMinutos, sumarMinutos } from '../../../shared/lib/fecha'
import type { Cita } from '../types'

const RETARDO_ARMADO_MS = 350

const UMBRAL_CANCELACION_PX = 8

export interface PosicionArrastre {
  citaId: number
  nuevoInicio: string
  nuevoFin: string
}

export interface OpcionesArrastreMovil {
  eje?: 'vertical' | 'horizontal'
  alturaHora?: number
  anchoHora?: number
  rango: RangoHorario
  obtenerDiaEnPunto?: (clientX: number, clientY: number) => string | null
  onArrastreInicio: (posicion: PosicionArrastre) => void
  onArrastrar: (posicion: PosicionArrastre) => void
  onSoltar: (posicion: PosicionArrastre) => void
  onCancelar: () => void
}

export function useArrastreMovil(opciones: OpcionesArrastreMovil) {
  const opcionesRef = useRef(opciones)
  opcionesRef.current = opciones

  const citaRef = useRef<Cita | null>(null)
  const origenXRef = useRef(0)
  const origenYRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const armadoRef = useRef(false)
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bloqueoClicRef = useRef<((evento: Event) => void) | null>(null)
  const fechaObjetivoRef = useRef<string | null>(null)

  const limpiarTemporizador = useCallback(() => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }
  }, [])

  const calcularPosicion = useCallback((cita: Cita, clientX: number, clientY: number): PosicionArrastre => {
    const { eje, alturaHora, anchoHora, rango, obtenerDiaEnPunto } = opcionesRef.current
    const duracion = diferenciaMinutos(cita.inicio, cita.fin)
    const minutoDiaOriginal = minutosDesdeHoraBase(cita.inicio, 0)
    const deltaMinutos =
      eje === 'horizontal'
        ? snap(((clientX - origenXRef.current) / (anchoHora as number)) * 60)
        : snap(((clientY - origenYRef.current) / (alturaHora as number)) * 60)
    const minPermitido = rango.horaInicio * 60
    const maxPermitido = rango.horaFin * 60 - duracion
    const minutoDiaPropuesto = Math.min(Math.max(minutoDiaOriginal + deltaMinutos, minPermitido), maxPermitido)

    if (obtenerDiaEnPunto) {
      const fechaBajoElPuntero = obtenerDiaEnPunto(clientX, clientY)
      if (fechaBajoElPuntero) fechaObjetivoRef.current = fechaBajoElPuntero
    }
    const fechaISO = fechaObjetivoRef.current ?? cita.inicio.slice(0, 10)

    const fechaBaseISO = combinarFechaHora(fechaISO, '00:00')
    const nuevoInicio = sumarMinutos(fechaBaseISO, minutoDiaPropuesto)
    const nuevoFin = sumarMinutos(nuevoInicio, duracion)
    return { citaId: cita.id, nuevoInicio, nuevoFin }
  }, [])

  const manejarMove = useCallback((evento: PointerEvent) => {
    if (pointerIdRef.current !== evento.pointerId) return
    const cita = citaRef.current
    if (!cita) return
    if (!armadoRef.current) {
      const dx = Math.abs(evento.clientX - origenXRef.current)
      const dy = Math.abs(evento.clientY - origenYRef.current)
      if (dx > UMBRAL_CANCELACION_PX || dy > UMBRAL_CANCELACION_PX) {
        limpiarTemporizador()
        quitarListeners()
        citaRef.current = null
        pointerIdRef.current = null
      }
      return
    }
    evento.preventDefault()
    opcionesRef.current.onArrastrar(calcularPosicion(cita, evento.clientX, evento.clientY))
  }, [])

  const manejarUp = useCallback((evento: PointerEvent) => {
    if (pointerIdRef.current !== evento.pointerId) return
    const cita = citaRef.current
    const estabaArmado = armadoRef.current
    limpiarTemporizador()
    quitarListeners()
    citaRef.current = null
    pointerIdRef.current = null
    armadoRef.current = false
    if (estabaArmado && cita) {
      bloquearProximoClic()
      opcionesRef.current.onSoltar(calcularPosicion(cita, evento.clientX, evento.clientY))
    }
  }, [])

  const manejarCancelarPuntero = useCallback((evento: PointerEvent) => {
    if (pointerIdRef.current !== evento.pointerId) return
    const estabaArmado = armadoRef.current
    limpiarTemporizador()
    quitarListeners()
    citaRef.current = null
    pointerIdRef.current = null
    armadoRef.current = false
    if (estabaArmado) opcionesRef.current.onCancelar()
  }, [])

  const bloquearProximoClic = useCallback(() => {
    const descartar = (evento: Event) => {
      evento.preventDefault()
      evento.stopPropagation()
      bloqueoClicRef.current = null
    }
    bloqueoClicRef.current = descartar
    window.addEventListener('click', descartar, { capture: true, once: true })
  }, [])

  const quitarListeners = useCallback(() => {
    window.removeEventListener('pointermove', manejarMove)
    window.removeEventListener('pointerup', manejarUp)
    window.removeEventListener('pointercancel', manejarCancelarPuntero)
  }, [])

  const iniciarArrastre = useCallback(
    (cita: Cita) => (evento: EventoPunteroReact<HTMLButtonElement>) => {
      if (cita.estado === 'cancelada') return
      if (armadoRef.current) return
      quitarListeners()
      limpiarTemporizador()
      citaRef.current = cita
      origenXRef.current = evento.clientX
      origenYRef.current = evento.clientY
      fechaObjetivoRef.current = cita.inicio.slice(0, 10)
      pointerIdRef.current = evento.pointerId
      armadoRef.current = false
      window.addEventListener('pointermove', manejarMove)
      window.addEventListener('pointerup', manejarUp)
      window.addEventListener('pointercancel', manejarCancelarPuntero)
      temporizadorRef.current = setTimeout(() => {
        if (!citaRef.current) return
        armadoRef.current = true
        opcionesRef.current.onArrastreInicio(calcularPosicion(citaRef.current, origenXRef.current, origenYRef.current))
      }, RETARDO_ARMADO_MS)
    },
    [],
  )

  useEffect(() => {
    return () => {
      limpiarTemporizador()
      quitarListeners()
      if (bloqueoClicRef.current) {
        window.removeEventListener('click', bloqueoClicRef.current, { capture: true })
        bloqueoClicRef.current = null
      }
    }
  }, [])

  return { iniciarArrastre }
}
