import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as EventoPunteroReact } from 'react'
import { minutosDesdeHoraBase, snap } from '../lib'
import type { RangoHorario } from '../lib'
import { combinarFechaHora, diferenciaMinutos, sumarMinutos } from '../../../shared/lib/fecha'
import type { Cita } from '../types'

/**
 * Espera antes de armar el arrastre: evita que un tap normal o el inicio de un scroll vertical
 * se interpreten como un intento de mover la cita. Sigue la misma familia de temporizaciones
 * cortas del feature (ver DURACION_SALIDA_MS en DrawerCita.tsx), ajustada para long-press táctil.
 */
const RETARDO_ARMADO_MS = 350

/**
 * Movimiento (px) tolerado mientras se espera el long-press: superarlo antes de que se arme el
 * arrastre se interpreta como scroll y cancela el intento silenciosamente (sin abrir la cita ni
 * mover nada).
 */
const UMBRAL_CANCELACION_PX = 8

export interface PosicionArrastre {
  citaId: number
  nuevoInicio: string
  nuevoFin: string
}

export interface OpcionesArrastreMovil {
  /** Alto en píxeles de una hora completa en la grilla (ALTURA_HORA de GrillaHoraria). */
  alturaHora: number
  rango: RangoHorario
  /** Se dispara al armarse el long-press (antes de cualquier movimiento). */
  onArrastreInicio: (posicion: PosicionArrastre) => void
  /** Se dispara en cada movimiento, una vez armado el arrastre. */
  onArrastrar: (posicion: PosicionArrastre) => void
  /** Se dispara al soltar el puntero, con la posición final propuesta. */
  onSoltar: (posicion: PosicionArrastre) => void
  /** Se dispara si el gesto se cancela (pointercancel) después de haberse armado. */
  onCancelar: () => void
}

/**
 * Máquina de estados de Pointer Events para arrastrar una tarjeta de cita dentro de
 * GrillaHoraria y cambiar su hora de inicio. Eje único (vertical/hora): Vista Día siempre tiene
 * 1 sola columna, así que no hay eje de día que mover. El arrastre de 2 ejes de Vista Semana
 * (día + hora) es un slice separado, no implementado aquí.
 *
 * No mantiene estado de posición propio: delega el renderizado (posición optimista durante el
 * arrastre y tras soltar) a quien instancia el hook, para que ambas fases compartan el mismo
 * estado sin saltos visuales entre "arrastrando" y "recién soltado".
 */
export function useArrastreMovil(opciones: OpcionesArrastreMovil) {
  const opcionesRef = useRef(opciones)
  opcionesRef.current = opciones

  const citaRef = useRef<Cita | null>(null)
  const origenYRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const armadoRef = useRef(false)
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Todos los useCallback de este hook usan deps=[] a propósito: solo leen/escriben refs (nunca
  // props/estado directamente) y se llaman entre sí por closure, así que su identidad debe
  // mantenerse estable durante toda la vida del hook. Es intencional NO listar las funciones
  // hermanas (manejarMove/manejarUp/manejarCancelarPuntero/quitarListeners) como dependencias:
  // como se llaman mutuamente, hacerlo crearía un ciclo de recreación en cada render (cada una
  // cambiaría de identidad porque la otra cambió), rompiendo el emparejamiento addEventListener
  // /removeEventListener que depende de que sea exactamente la misma referencia de función.
  const limpiarTemporizador = useCallback(() => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }
  }, [])

  const calcularPosicion = useCallback((cita: Cita, clientY: number): PosicionArrastre => {
    const { alturaHora, rango } = opcionesRef.current
    // Se encaja el DESPLAZAMIENTO (delta), no el horario absoluto resultante — igual que
    // finalizarArrastre en VistaSemanal.tsx (desktop). Si se encajara el absoluto, una cita
    // cuyo horario original no cae en un múltiplo de 15 min (p. ej. 09:05) se movería sola con
    // delta=0 (long-press sin arrastre real) al redondear 09:05 a 09:00 o 09:15.
    const duracion = diferenciaMinutos(cita.inicio, cita.fin)
    const minutoDiaOriginal = minutosDesdeHoraBase(cita.inicio, 0)
    const deltaMinutos = snap(((clientY - origenYRef.current) / alturaHora) * 60)
    const minPermitido = rango.horaInicio * 60
    const maxPermitido = rango.horaFin * 60 - duracion
    const minutoDiaPropuesto = Math.min(Math.max(minutoDiaOriginal + deltaMinutos, minPermitido), maxPermitido)
    const fechaBaseISO = combinarFechaHora(cita.inicio.slice(0, 10), '00:00')
    const nuevoInicio = sumarMinutos(fechaBaseISO, minutoDiaPropuesto)
    const nuevoFin = sumarMinutos(nuevoInicio, duracion)
    return { citaId: cita.id, nuevoInicio, nuevoFin }
  }, [])

  const manejarMove = useCallback((evento: PointerEvent) => {
    if (pointerIdRef.current !== evento.pointerId) return
    const cita = citaRef.current
    if (!cita) return
    if (!armadoRef.current) {
      if (Math.abs(evento.clientY - origenYRef.current) > UMBRAL_CANCELACION_PX) {
        limpiarTemporizador()
        quitarListeners()
        citaRef.current = null
        pointerIdRef.current = null
      }
      return
    }
    evento.preventDefault()
    opcionesRef.current.onArrastrar(calcularPosicion(cita, evento.clientY))
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
      // El botón de la tarjeta dispara su propio "click" nativo justo después de este
      // pointerup (mousedown+mouseup sobre el mismo elemento producen click sin importar
      // cuánto se movió el puntero entre medio): sin esto, soltar un arrastre real también
      // abriría el drawer de la cita como si hubiera sido un tap. Se intercepta ese único
      // click en fase de captura y se descarta.
      bloquearProximoClic()
      opcionesRef.current.onSoltar(calcularPosicion(cita, evento.clientY))
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
    }
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
      quitarListeners()
      limpiarTemporizador()
      citaRef.current = cita
      origenYRef.current = evento.clientY
      pointerIdRef.current = evento.pointerId
      armadoRef.current = false
      window.addEventListener('pointermove', manejarMove)
      window.addEventListener('pointerup', manejarUp)
      window.addEventListener('pointercancel', manejarCancelarPuntero)
      temporizadorRef.current = setTimeout(() => {
        if (!citaRef.current) return
        armadoRef.current = true
        opcionesRef.current.onArrastreInicio(calcularPosicion(citaRef.current, origenYRef.current))
      }, RETARDO_ARMADO_MS)
    },
    [],
  )

  useEffect(() => {
    return () => {
      limpiarTemporizador()
      quitarListeners()
    }
  }, [])

  return { iniciarArrastre }
}
