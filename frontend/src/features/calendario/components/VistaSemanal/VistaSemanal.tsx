import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useCitas } from '../../hooks/useCitas'
import { useGestionCita } from '../../hooks/useGestionCita'
import { MINUTOS_SNAP, contarVisitasPorDia, minutosDesdeHoraBase, snap } from '../../lib'
import { BloqueCita } from '../BloqueCita/BloqueCita'
import { PanelPacientes } from '../PanelPacientes/PanelPacientes'
import { DrawerCita } from '../DrawerCita/DrawerCita'
import { VistaDia } from '../VistaDia/VistaDia'
import { VistaMes } from '../VistaMes/VistaMes'
import { VistaAgendaMovil } from '../VistaAgendaMovil/VistaAgendaMovil'
import { AlertaMensaje } from '../../../../shared/components/AlertaMensaje/AlertaMensaje'
import {
  analizarFechaHora,
  combinarFechaHora,
  diferenciaMinutos,
  esMismoDia,
  formatearDiaSemana,
  formatearFechaCorta,
  formatearFechaISO,
  formatearHora,
  hoyISO,
  sumarDias,
  sumarMinutos,
} from '../../../../shared/lib/fecha'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { ToggleGroup, ToggleGroupItem } from '../../../../shared/components/ui/toggle-group'
import { useEsMovil } from '../../../../shared/hooks/useEsMovil'
import { ErrorPeticion } from '../../../../shared/api/cliente'
import { cn } from '../../../../shared/lib/clases'
import type { Cita, PacienteBusqueda, VistaCalendario } from '../../types'
import styles from './VistaSemanal.module.css'

const HORA_INICIO = 6
const HORA_FIN = 20
const ALTURA_HORA_MINIMA = 56
const DURACION_DEFECTO = 30

export function VistaSemanal() {
  const esMovil = useEsMovil()
  return esMovil ? <VistaAgendaMovil /> : <VistaSemanalEscritorio />
}

interface ArrastreActivo {
  citaId: number
  modo: 'mover' | 'redimensionar'
  diaOrigen: number
  inicioOrigen: string
  finOrigen: string
  pageXInicial: number
  pageYInicial: number
  diaPropuesto: number
  inicioPropuesto: string
  finPropuesto: string
}

interface ArrastrePacienteActivo {
  paciente: PacienteBusqueda
  clientX: number
  clientY: number
}

function VistaSemanalEscritorio() {
  const { citas, inicioSemanaActual, irSemana, irHoy } = useCitas()
  const {
    citaSeleccionada,
    abrirCitaExistente,
    abrirCitaNueva,
    abrirCitaParaPaciente,
    cerrarDrawer,
    onCrear,
    onGuardarCampos,
    onCambiarEstado,
    onActualizarCopago,
    mensajeError,
    setMensajeError,
    verificar,
    actualizarCita,
  } = useGestionCita()

  const [vista, setVista] = useState<VistaCalendario>('semana')
  const [fechaDia, setFechaDia] = useState(() => new Date())
  const refGrilla = useRef<HTMLDivElement>(null)
  const refCuerpoSemana = useRef<HTMLDivElement>(null)
  const [anchoScrollbar, setAnchoScrollbar] = useState(0)
  const [alturaHora, setAlturaHora] = useState(ALTURA_HORA_MINIMA)
  const alturaHoraRef = useRef(ALTURA_HORA_MINIMA)
  const observadorCuerpoSemanaRef = useRef<ResizeObserver | null>(null)
  const refCandidato = useRef<{ cita: Cita; diaIndice: number; modo: 'mover' | 'redimensionar'; pageX: number; pageY: number } | null>(null)
  const [arrastre, setArrastre] = useState<ArrastreActivo | null>(null)
  const refCandidatoPaciente = useRef<{ paciente: PacienteBusqueda; clientX: number; clientY: number } | null>(null)
  const [arrastrePaciente, setArrastrePaciente] = useState<ArrastrePacienteActivo | null>(null)

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemanaActual, i))
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const alturaTotal = (HORA_FIN - HORA_INICIO) * alturaHora
  const UMBRAL_ARRASTRE = 4

  const refCitas = useRef(citas)
  refCitas.current = citas
  const refSemana = useRef(inicioSemanaActual)
  refSemana.current = inicioSemanaActual
  const refVista = useRef(vista)
  refVista.current = vista

  useEffect(() => {
    function calcularPropuesta(actual: ArrastreActivo, evento: MouseEvent): ArrastreActivo {
      if (!refGrilla.current) return actual

      const rect = refGrilla.current.getBoundingClientRect()
      const anchoColumna = rect.width / 7
      const deltaY = evento.pageY - actual.pageYInicial
      const deltaMinutos = snap((deltaY / alturaHoraRef.current) * 60)

      if (actual.modo === 'redimensionar') {
        const duracionOriginal = diferenciaMinutos(actual.inicioOrigen, actual.finOrigen)
        const nuevaDuracion = Math.max(MINUTOS_SNAP, duracionOriginal + deltaMinutos)
        return { ...actual, finPropuesto: sumarMinutos(actual.inicioOrigen, nuevaDuracion) }
      }

      const deltaX = evento.pageX - actual.pageXInicial
      const deltaDias = Math.round(deltaX / anchoColumna)
      const diaPropuesto = Math.min(6, Math.max(0, actual.diaOrigen + deltaDias))
      const duracion = diferenciaMinutos(actual.inicioOrigen, actual.finOrigen)

      const fechaBase = sumarDias(refSemana.current, diaPropuesto)
      const horaOrigen = analizarFechaHora(actual.inicioOrigen)
      let minutosDelDia = (horaOrigen.getHours() - HORA_INICIO) * 60 + horaOrigen.getMinutes() + deltaMinutos
      minutosDelDia = Math.min((HORA_FIN - HORA_INICIO) * 60 - duracion, Math.max(0, minutosDelDia))

      const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
      const minutos = minutosDelDia % 60
      const inicioPropuesto = combinarFechaHora(
        formatearFechaISO(fechaBase),
        `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
      )
      const finPropuesto = sumarMinutos(inicioPropuesto, duracion)

      return { ...actual, diaPropuesto, inicioPropuesto, finPropuesto }
    }

    function alMover(evento: MouseEvent) {
      setArrastre((actual) => {
        if (actual) return calcularPropuesta(actual, evento)

        const candidato = refCandidato.current
        if (!candidato) return actual

        const distancia = Math.hypot(evento.pageX - candidato.pageX, evento.pageY - candidato.pageY)
        if (distancia < UMBRAL_ARRASTRE) return actual

        return {
          citaId: candidato.cita.id,
          modo: candidato.modo,
          diaOrigen: candidato.diaIndice,
          inicioOrigen: candidato.cita.inicio,
          finOrigen: candidato.cita.fin,
          pageXInicial: candidato.pageX,
          pageYInicial: candidato.pageY,
          diaPropuesto: candidato.diaIndice,
          inicioPropuesto: candidato.cita.inicio,
          finPropuesto: candidato.cita.fin,
        }
      })

      setArrastrePaciente((actual) => {
        if (actual) return { ...actual, clientX: evento.clientX, clientY: evento.clientY }

        const candidato = refCandidatoPaciente.current
        if (!candidato) return actual

        const distancia = Math.hypot(evento.clientX - candidato.clientX, evento.clientY - candidato.clientY)
        if (distancia < UMBRAL_ARRASTRE) return actual

        return { paciente: candidato.paciente, clientX: evento.clientX, clientY: evento.clientY }
      })
    }

    function alSoltar() {
      refCandidato.current = null
      refCandidatoPaciente.current = null
      setArrastre((actual) => {
        if (actual) finalizarArrastre(actual)
        return null
      })
      setArrastrePaciente((actual) => {
        if (actual) finalizarArrastrePaciente(actual)
        return null
      })
    }

    window.addEventListener('mousemove', alMover)
    window.addEventListener('mouseup', alSoltar)
    return () => {
      window.removeEventListener('mousemove', alMover)
      window.removeEventListener('mouseup', alSoltar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refCuerpoSemanaCallback = useCallback((nodo: HTMLDivElement | null) => {
    refCuerpoSemana.current = nodo
    observadorCuerpoSemanaRef.current?.disconnect()
    observadorCuerpoSemanaRef.current = null
    if (!nodo) return
    const observador = new ResizeObserver(([entrada]) => {
      if (!entrada) return
      setAnchoScrollbar(nodo.offsetWidth - nodo.clientWidth)
      const nuevaAltura = Math.max(ALTURA_HORA_MINIMA, entrada.contentRect.height / (HORA_FIN - HORA_INICIO))
      alturaHoraRef.current = nuevaAltura
      setAlturaHora(nuevaAltura)
    })
    observador.observe(nodo)
    observadorCuerpoSemanaRef.current = observador
  }, [])

  useEffect(() => () => observadorCuerpoSemanaRef.current?.disconnect(), [])

  async function finalizarArrastre(actual: ArrastreActivo) {
    if (actual.inicioPropuesto === actual.inicioOrigen && actual.finPropuesto === actual.finOrigen) return

    const conflicto = await verificar(actual.inicioPropuesto, actual.finPropuesto, actual.citaId)
    if (conflicto) {
      setMensajeError('No se puede mover la cita: choca con otra cita existente.')
      return
    }

    const cita = refCitas.current.find((c) => c.id === actual.citaId)
    try {
      await actualizarCita(actual.citaId, {
        inicio: actual.inicioPropuesto,
        fin: actual.finPropuesto,
        autorizacionId: cita?.autorizacionId ?? null,
        notas: cita?.notas ?? null,
      })
    } catch (error) {
      if (error instanceof ErrorPeticion) setMensajeError(error.message)
    }
  }


  function iniciarArrastre(cita: Cita, diaIndice: number, modo: 'mover' | 'redimensionar', evento: ReactMouseEvent) {
    refCandidato.current = { cita, diaIndice, modo, pageX: evento.pageX, pageY: evento.pageY }
  }

  function iniciarArrastrePaciente(paciente: PacienteBusqueda, evento: ReactMouseEvent) {
    refCandidatoPaciente.current = { paciente, clientX: evento.clientX, clientY: evento.clientY }
  }

  function calcularSoltarEnGrilla(clientX: number, clientY: number): { diaIndice: number; inicio: string } | null {
    if (refVista.current !== 'semana' || !refGrilla.current) return null

    const rect = refGrilla.current.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null

    const anchoColumna = rect.width / 7
    const diaIndice = Math.min(6, Math.max(0, Math.floor((clientX - rect.left) / anchoColumna)))
    const minutosDelDia = Math.min(
      (HORA_FIN - HORA_INICIO) * 60 - MINUTOS_SNAP,
      Math.max(0, snap(((clientY - rect.top) / alturaHora) * 60)),
    )
    const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
    const minutos = minutosDelDia % 60
    const fechaDia = sumarDias(refSemana.current, diaIndice)
    const inicio = combinarFechaHora(
      formatearFechaISO(fechaDia),
      `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
    )

    return { diaIndice, inicio }
  }

  function finalizarArrastrePaciente(actual: ArrastrePacienteActivo) {
    const destino = calcularSoltarEnGrilla(actual.clientX, actual.clientY)
    if (!destino) return

    abrirCitaParaPaciente(destino.inicio, actual.paciente)
  }

  function alDobleClicEnColumna(dia: Date, evento: ReactMouseEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget) return
    const rect = evento.currentTarget.getBoundingClientRect()
    const minutosDelDia = snap(((evento.clientY - rect.top) / alturaHora) * 60)
    const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
    const minutos = minutosDelDia % 60
    const inicio = combinarFechaHora(
      formatearFechaISO(dia),
      `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
    )
    abrirCitaNueva(inicio)
  }

  const destinoPaciente = arrastrePaciente ? calcularSoltarEnGrilla(arrastrePaciente.clientX, arrastrePaciente.clientY) : null

  return (
    <div className={styles.contenedor}>
      <div className={styles.columnaPrincipal}>
        <BarraSuperior
          vista={vista}
          onCambiarVista={setVista}
          onNuevaCita={() => abrirCitaNueva(combinarFechaHora(hoyISO(), '08:00'))}
        />

        {vista === 'semana' && (
          <>
            <CabeceraSemana
              dias={dias}
              citas={citas}
              anchoScrollbar={anchoScrollbar}
              onSemanaAnterior={() => irSemana(-1)}
              onSemanaSiguiente={() => irSemana(1)}
              onHoy={irHoy}
            />

            <div ref={refCuerpoSemanaCallback} className={styles.cuerpoSemana}>
              <div className={styles.columnaHoras}>
                <div className={styles.espaciadorHoras} />
                {horas.map((hora) => (
                  <div key={hora} className={styles.filaHora} style={{ height: alturaHora }}>
                    <span className={styles.textoHora}>{String(hora).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              <div ref={refGrilla} className={styles.grillaDias}>
                {dias.map((dia, indiceDia) => {
                  const esHoy = esMismoDia(formatearFechaISO(dia), hoyISO())
                  const minutosAhora = esHoy ? (new Date().getHours() - HORA_INICIO) * 60 + new Date().getMinutes() : -1
                  return (
                    <div
                      key={dia.toISOString()}
                      onDoubleClick={(evento) => alDobleClicEnColumna(dia, evento)}
                      className={cn(styles.columnaDia, esHoy && styles.hoy)}
                      style={{
                        height: alturaTotal,
                        backgroundImage: `repeating-linear-gradient(to bottom, var(--grid) 0 1px, transparent 1px ${alturaHora}px)`,
                      }}
                    >
                      {esHoy && minutosAhora >= 0 && minutosAhora <= (HORA_FIN - HORA_INICIO) * 60 && (
                        <div className={styles.lineaAhora} style={{ top: (minutosAhora / 60) * alturaHora }}>
                          <span className={styles.puntoAhora} />
                        </div>
                      )}

                      {citas
                        .filter((cita) => cita.inicio.startsWith(formatearFechaISO(dia)))
                        .filter((cita) => !(arrastre && arrastre.citaId === cita.id))
                        .map((cita) => (
                          <BloqueCita
                            key={cita.id}
                            cita={cita}
                            top={(minutosDesdeHoraBase(cita.inicio, HORA_INICIO) / 60) * alturaHora}
                            altura={(diferenciaMinutos(cita.inicio, cita.fin) / 60) * alturaHora}
                            onAbrir={() => abrirCitaExistente(cita)}
                            onIniciarArrastre={(evento) => iniciarArrastre(cita, indiceDia, 'mover', evento)}
                            onIniciarRedimension={(evento) => iniciarArrastre(cita, indiceDia, 'redimensionar', evento)}
                          />
                        ))}

                      {arrastre && arrastre.diaPropuesto === indiceDia && (
                        <BloqueCitaFantasma
                          inicio={arrastre.inicioPropuesto}
                          fin={arrastre.finPropuesto}
                          top={(minutosDesdeHoraBase(arrastre.inicioPropuesto, HORA_INICIO) / 60) * alturaHora}
                          altura={(diferenciaMinutos(arrastre.inicioPropuesto, arrastre.finPropuesto) / 60) * alturaHora}
                        />
                      )}

                      {destinoPaciente && destinoPaciente.diaIndice === indiceDia && (
                        <BloqueCitaFantasma
                          inicio={destinoPaciente.inicio}
                          fin={sumarMinutos(destinoPaciente.inicio, DURACION_DEFECTO)}
                          top={(minutosDesdeHoraBase(destinoPaciente.inicio, HORA_INICIO) / 60) * alturaHora}
                          altura={(DURACION_DEFECTO / 60) * alturaHora}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {vista === 'dia' && (
          <VistaDia
            fecha={fechaDia}
            onCambiarFecha={setFechaDia}
            onAbrirCita={abrirCitaExistente}
            onCrearCita={abrirCitaNueva}
            abrirCitaParaPaciente={abrirCitaParaPaciente}
          />
        )}

        {vista === 'mes' && (
          <VistaMes
            onAbrirCita={abrirCitaExistente}
            onIrADia={(fecha) => {
              setFechaDia(fecha)
              setVista('dia')
            }}
          />
        )}
      </div>

      {vista !== 'dia' && (
        <PanelPacientes
          onSeleccionarPaciente={(paciente: PacienteBusqueda) => abrirCitaParaPaciente(combinarFechaHora(hoyISO(), '08:00'), paciente)}
          onIniciarArrastrePaciente={iniciarArrastrePaciente}
        />
      )}

      {arrastrePaciente && (
        <div
          className={styles.ghostPaciente}
          style={{ left: arrastrePaciente.clientX + 14, top: arrastrePaciente.clientY + 14 }}
        >
          <Icono nombre="calendario" tamano={14} grosor={2} />
          {arrastrePaciente.paciente.nombre}
          {!destinoPaciente && <span className={styles.notaGhost}>· suelta sobre la semana</span>}
        </div>
      )}

      {citaSeleccionada && (
        <DrawerCita
          cita={citaSeleccionada}
          onCerrar={cerrarDrawer}
          onCrear={onCrear}
          onGuardarCampos={onGuardarCampos}
          onCambiarEstado={onCambiarEstado}
          onActualizarCopago={onActualizarCopago}
        />
      )}

      <AlertaMensaje mensaje={mensajeError} onCerrar={() => setMensajeError(null)} />
    </div>
  )
}

function BarraSuperior({
  vista,
  onCambiarVista,
  onNuevaCita,
}: {
  vista: VistaCalendario
  onCambiarVista: (vista: VistaCalendario) => void
  onNuevaCita: () => void
}) {
  const refSelectorVista = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const contenedor = refSelectorVista.current
    const activo = contenedor?.querySelector<HTMLElement>('[data-state="on"]')
    if (!contenedor || !activo) return
    contenedor.style.setProperty('--pila-x', `${activo.offsetLeft}px`)
    contenedor.style.setProperty('--pila-w', `${activo.offsetWidth}px`)
  }, [vista])

  return (
    <div className={styles.barraSuperior}>
      <ToggleGroup
        ref={refSelectorVista}
        type="single"
        value={vista}
        onValueChange={(valor) => valor && onCambiarVista(valor as VistaCalendario)}
        className={styles.selectorVista}
      >
        <span className={styles.indicadorVista} />
        <ToggleGroupItem value="semana" className={styles.botonVista}>
          Semana
        </ToggleGroupItem>
        <ToggleGroupItem value="dia" className={styles.botonVista}>
          Día
        </ToggleGroupItem>
        <ToggleGroupItem value="mes" className={styles.botonVista}>
          Mes
        </ToggleGroupItem>
      </ToggleGroup>
      <div className={styles.espaciador} />
      <Boton variante="primario" onClick={onNuevaCita}>
        <Icono nombre="mas" tamano={17} grosor={2.2} />
        Nueva cita
      </Boton>
    </div>
  )
}

function CabeceraSemana({
  dias,
  citas,
  anchoScrollbar,
  onSemanaAnterior,
  onSemanaSiguiente,
  onHoy,
}: {
  dias: Date[]
  citas: Cita[]
  anchoScrollbar: number
  onSemanaAnterior: () => void
  onSemanaSiguiente: () => void
  onHoy: () => void
}) {
  const rangoLabel = `${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[0]), '00:00'))} – ${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[6]), '00:00'))}`

  return (
    <div>
      <div className={styles.filaCabeceraSemana}>
        <div className={styles.navegacion}>
          <BotonIcono icono="chevronIzquierda" titulo="Semana anterior" onClick={onSemanaAnterior} />
          <BotonIcono icono="chevronDerecha" titulo="Semana siguiente" onClick={onSemanaSiguiente} />
          <button type="button" onClick={onHoy} className={styles.botonHoy}>
            Hoy
          </button>
        </div>
        <div className={styles.rangoSemana}>{rangoLabel}</div>
      </div>

      <div className={styles.filaDiasCabecera} style={{ paddingRight: anchoScrollbar }}>
        {dias.map((dia) => {
          const esHoy = esMismoDia(formatearFechaISO(dia), hoyISO())
          const cuenta = contarVisitasPorDia(citas, dia)
          return (
            <div key={dia.toISOString()} className={styles.columnaDiaCabecera}>
              <div className={cn(styles.nombreDiaCabecera, esHoy && styles.hoy)}>{formatearDiaSemana(formatearFechaISO(dia))}</div>
              <div className={styles.filaNumeroCuenta}>
                <span className={cn(styles.numeroDiaCabecera, esHoy && styles.hoy)}>{dia.getDate()}</span>
                {cuenta > 0 && <span className={styles.cuentaDia}>{cuenta} visitas</span>} 
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BotonIcono({ icono, titulo, onClick }: { icono: 'chevronIzquierda' | 'chevronDerecha'; titulo: string; onClick: () => void }) {
  return (
    <button type="button" title={titulo} onClick={onClick} className={styles.botonIcono}>
      <Icono nombre={icono} tamano={17} grosor={2} />
    </button>
  )
}

function BloqueCitaFantasma({ inicio, fin, top, altura }: { inicio: string; fin: string; top: number; altura: number }) {
  return (
    <div className={styles.fantasma} style={{ top, height: Math.max(altura, 24) } as CSSProperties}>
      <div className={styles.horaFantasma}>
        {formatearHora(inicio)}–{formatearHora(fin)}
      </div>
    </div>
  )
}
