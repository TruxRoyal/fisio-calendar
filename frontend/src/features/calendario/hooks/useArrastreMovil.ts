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
  /**
   * Eje del puntero que controla la HORA de la cita: 'vertical' (Vista Día, GrillaHoraria) usa
   * el desplazamiento en Y contra `alturaHora`; 'horizontal' (Vista Semana, GrillaSemanal) usa
   * el desplazamiento en X contra `anchoHora`, porque esa grilla tiene las horas como columnas.
   * Por defecto 'vertical'.
   */
  eje?: 'vertical' | 'horizontal'
  /** Alto en píxeles de una hora completa (ALTURA_HORA de GrillaHoraria). Requerido si eje='vertical'. */
  alturaHora?: number
  /** Ancho en píxeles de una hora completa (PIXELES_POR_HORA de GrillaSemanal). Requerido si eje='horizontal'. */
  anchoHora?: number
  rango: RangoHorario
  /**
   * Solo Vista Semana (2 ejes): dado un punto de pantalla (clientX/clientY), retorna la
   * fechaISO de la fila de día que está bajo el puntero en ese instante, o null si el puntero
   * no está sobre ninguna fila (p. ej. se salió de la grilla). Si no se provee, el día de la
   * cita permanece fijo — es el caso de Vista Día, que no tiene eje de día.
   */
  obtenerDiaEnPunto?: (clientX: number, clientY: number) => string | null
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
 * Máquina de estados de Pointer Events para arrastrar una tarjeta de cita y cambiar su horario.
 * Comparte esta misma máquina de estados Vista Día (eje único, vertical/hora — GrillaHoraria
 * siempre tiene 1 sola columna, no hay eje de día que mover) y Vista Semana (2 ejes: horizontal
 * controla la hora vía `anchoHora`, vertical controla el día vía `obtenerDiaEnPunto`, ya que
 * GrillaSemanal tiene los días como filas). El eje de día se resuelve por hit-test de posición
 * (qué fila hay bajo el puntero) en vez de por delta, porque las filas de GrillaSemanal tienen
 * alto variable (flex, no un píxel fijo por fila como ALTURA_HORA) — un delta en px no se podría
 * traducir de forma confiable a "cuántas filas" se cruzaron.
 *
 * No mantiene estado de posición propio: delega el renderizado (posición optimista durante el
 * arrastre y tras soltar) a quien instancia el hook, para que ambas fases compartan el mismo
 * estado sin saltos visuales entre "arrastrando" y "recién soltado".
 */
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
  // Último día válido bajo el puntero durante un arrastre de Vista Semana (obtenerDiaEnPunto):
  // se inicializa al día original de la cita y solo se actualiza cuando el hit-test encuentra
  // una fila real bajo el puntero. Si el puntero se sale de la grilla (p. ej. arrastra más
  // abajo del último día visible), el día simplemente se queda en el último válido — esto es lo
  // que produce el "clamp" al Lun-Sáb sin lógica de rango aparte: nunca hay una fila fuera de
  // ese rango con la que el hit-test pueda actualizar esta ref.
  const fechaObjetivoRef = useRef<string | null>(null)

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

  const calcularPosicion = useCallback((cita: Cita, clientX: number, clientY: number): PosicionArrastre => {
    const { eje, alturaHora, anchoHora, rango, obtenerDiaEnPunto } = opcionesRef.current
    // Se encaja el DESPLAZAMIENTO (delta), no el horario absoluto resultante — igual que
    // finalizarArrastre en VistaSemanal.tsx (desktop). Si se encajara el absoluto, una cita
    // cuyo horario original no cae en un múltiplo de 15 min (p. ej. 09:05) se movería sola con
    // delta=0 (long-press sin arrastre real) al redondear 09:05 a 09:00 o 09:15.
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
      // Se compara el desplazamiento en AMBOS ejes (no solo Y): GrillaSemanal tiene scroll
      // horizontal Y vertical, así que un tap que empieza a deslizar en cualquiera de las dos
      // direcciones antes de que se arme el long-press debe interpretarse como scroll, igual
      // que ya pasaba solo con Y para Vista Día (que no tiene scroll horizontal propio, por lo
      // que este chequeo no le cambia el comportamiento).
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
      // El botón de la tarjeta dispara su propio "click" nativo justo después de este
      // pointerup (mousedown+mouseup sobre el mismo elemento producen click sin importar
      // cuánto se movió el puntero entre medio): sin esto, soltar un arrastre real también
      // abriría el drawer de la cita como si hubiera sido un tap. Se intercepta ese único
      // click en fase de captura y se descarta.
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
    // Se guarda la referencia para poder quitarla explícitamente en el cleanup de unmount: si
    // el componente se desmonta (o cambia de vista) entre el pointerup y el click nativo que le
    // sigue, `once: true` nunca llega a dispararse y el listener quedaría pegado en `window`
    // interceptando el próximo click de CUALQUIER parte de la app, no solo de esta tarjeta.
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
      // Si ya hay un arrastre armado (long-press ya disparado) para OTRA tarjeta, ignorar este
      // nuevo pointerdown en vez de reemplazarlo: quitarListeners() cortaría los listeners del
      // primero sin que su onSoltar/onCancelar se dispare nunca, dejando su posición optimista
      // pegada. Vista Día es de un solo dedo, así que esto es solo defensivo.
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
