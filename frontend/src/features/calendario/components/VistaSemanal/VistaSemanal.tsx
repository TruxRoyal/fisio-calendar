import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useCitas } from '../../hooks/useCitas'
import { useDeteccionChoque } from '../../hooks/useDeteccionChoque'
import { useCalendarioStore } from '../../store'
import { BloqueCita } from '../BloqueCita/BloqueCita'
import { PanelPacientes } from '../PanelPacientes/PanelPacientes'
import { DrawerCita } from '../DrawerCita/DrawerCita'
import { VistaDia } from '../VistaDia/VistaDia'
import { VistaMes } from '../VistaMes/VistaMes'
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
import { ErrorPeticion } from '../../../../shared/api/cliente'
import { cn } from '../../../../shared/lib/clases'
import type { Cita, CitaBorrador, EstadoCita, PacienteBusqueda, VistaCalendario } from '../../types'
import styles from './VistaSemanal.module.css'

const HORA_INICIO = 6
const HORA_FIN = 20
const ALTURA_HORA = 56
const MINUTOS_SNAP = 15
const DURACION_DEFECTO = 30

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

function citaBorradorVacia(inicio: string): CitaBorrador {
  return {
    id: 0,
    pacienteId: 0,
    autorizacionId: null,
    inicio,
    fin: sumarMinutos(inicio, DURACION_DEFECTO),
    estado: 'agendada',
    valorSesion: null,
    copagoCobrado: 0,
    notas: null,
    paciente: { id: 0, nombre: '', tipoTerapia: null },
  }
}

function minutosDesdeInicioDia(iso: string): number {
  const fecha = analizarFechaHora(iso)
  return (fecha.getHours() - HORA_INICIO) * 60 + fecha.getMinutes()
}

function snap(minutos: number): number {
  return Math.round(minutos / MINUTOS_SNAP) * MINUTOS_SNAP
}

function contarVisitasPorDia(citas: Cita[], dia: Date): number {
  const iso = formatearFechaISO(dia)
  return citas.filter((c) => c.inicio.startsWith(iso) && c.estado !== 'cancelada').length
}

export function VistaSemanal() {
  const { citas, inicioSemanaActual, irSemana, irHoy } = useCitas()
  const crearCita = useCalendarioStore((estado) => estado.crearCita)
  const actualizarCita = useCalendarioStore((estado) => estado.actualizarCita)
  const cambiarEstadoCita = useCalendarioStore((estado) => estado.cambiarEstadoCita)
  const { verificar } = useDeteccionChoque()

  const [vista, setVista] = useState<VistaCalendario>('semana')
  const [fechaDia, setFechaDia] = useState(() => new Date())
  const refGrilla = useRef<HTMLDivElement>(null)
  const refCuerpoSemana = useRef<HTMLDivElement>(null)
  const [anchoScrollbar, setAnchoScrollbar] = useState(0)
  const refCandidato = useRef<{ cita: Cita; diaIndice: number; modo: 'mover' | 'redimensionar'; pageX: number; pageY: number } | null>(null)
  const [arrastre, setArrastre] = useState<ArrastreActivo | null>(null)
  const refCandidatoPaciente = useRef<{ paciente: PacienteBusqueda; clientX: number; clientY: number } | null>(null)
  const [arrastrePaciente, setArrastrePaciente] = useState<ArrastrePacienteActivo | null>(null)
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaBorrador | null>(null)

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemanaActual, i))
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const alturaTotal = (HORA_FIN - HORA_INICIO) * ALTURA_HORA
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
      const deltaMinutos = snap((deltaY / ALTURA_HORA) * 60)

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

  // La cabecera de días vive fuera de .cuerpoSemana (para quedar fija mientras
  // la grilla hace scroll vertical), así que no pierde ancho automáticamente
  // cuando aparece la barra de scroll del navegador. Medimos ese ancho una
  // vez y lo reservamos también en la cabecera para que las columnas sigan
  // alineadas con las de la grilla.
  useEffect(() => {
    function medirScrollbar() {
      const el = refCuerpoSemana.current
      if (el) setAnchoScrollbar(el.offsetWidth - el.clientWidth)
    }
    medirScrollbar()
    window.addEventListener('resize', medirScrollbar)
    return () => window.removeEventListener('resize', medirScrollbar)
  }, [])

  async function finalizarArrastre(actual: ArrastreActivo) {
    if (actual.inicioPropuesto === actual.inicioOrigen && actual.finPropuesto === actual.finOrigen) return

    const conflicto = await verificar(actual.inicioPropuesto, actual.finPropuesto, actual.citaId)
    if (conflicto) {
      window.alert('No se puede mover la cita: choca con otra cita existente.')
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
      if (error instanceof ErrorPeticion) window.alert(error.message)
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
      Math.max(0, snap(((clientY - rect.top) / ALTURA_HORA) * 60)),
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

    setCitaSeleccionada({
      ...citaBorradorVacia(destino.inicio),
      pacienteId: actual.paciente.id,
      paciente: {
        id: actual.paciente.id,
        nombre: actual.paciente.nombre,
        tipoTerapia: actual.paciente.tipoTerapia,
        direccion: actual.paciente.direccion,
        color: actual.paciente.color,
      },
    })
  }

  function alDobleClicEnColumna(dia: Date, evento: ReactMouseEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget) return
    const rect = evento.currentTarget.getBoundingClientRect()
    const minutosDelDia = snap(((evento.clientY - rect.top) / ALTURA_HORA) * 60)
    const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
    const minutos = minutosDelDia % 60
    const inicio = combinarFechaHora(
      formatearFechaISO(dia),
      `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
    )
    setCitaSeleccionada(citaBorradorVacia(inicio))
  }

  function abrirCitaExistente(cita: Cita) {
    setCitaSeleccionada({
      id: cita.id,
      pacienteId: cita.pacienteId,
      autorizacionId: cita.autorizacionId,
      inicio: cita.inicio,
      fin: cita.fin,
      estado: cita.estado,
      valorSesion: cita.valorSesion,
      copagoCobrado: cita.copagoCobrado,
      notas: cita.notas,
      paciente: { id: cita.paciente.id, nombre: cita.paciente.nombre, tipoTerapia: cita.paciente.tipoTerapia, color: cita.paciente.color },
    })
  }

  const destinoPaciente = arrastrePaciente ? calcularSoltarEnGrilla(arrastrePaciente.clientX, arrastrePaciente.clientY) : null

  return (
    <div className={styles.contenedor}>
      <div className={styles.columnaPrincipal}>
        <BarraSuperior
          vista={vista}
          onCambiarVista={setVista}
          onNuevaCita={() => setCitaSeleccionada(citaBorradorVacia(combinarFechaHora(hoyISO(), '08:00')))}
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

            <div ref={refCuerpoSemana} className={styles.cuerpoSemana}>
              <div className={styles.columnaHoras}>
                <div className={styles.espaciadorHoras} />
                {horas.map((hora) => (
                  <div key={hora} className={styles.filaHora}>
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
                      style={{ height: alturaTotal }}
                    >
                      {esHoy && minutosAhora >= 0 && minutosAhora <= (HORA_FIN - HORA_INICIO) * 60 && (
                        <div className={styles.lineaAhora} style={{ top: (minutosAhora / 60) * ALTURA_HORA }}>
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
                            top={(minutosDesdeInicioDia(cita.inicio) / 60) * ALTURA_HORA}
                            altura={(diferenciaMinutos(cita.inicio, cita.fin) / 60) * ALTURA_HORA}
                            onAbrir={() => abrirCitaExistente(cita)}
                            onIniciarArrastre={(evento) => iniciarArrastre(cita, indiceDia, 'mover', evento)}
                            onIniciarRedimension={(evento) => iniciarArrastre(cita, indiceDia, 'redimensionar', evento)}
                          />
                        ))}

                      {arrastre && arrastre.diaPropuesto === indiceDia && (
                        <BloqueCitaFantasma
                          inicio={arrastre.inicioPropuesto}
                          fin={arrastre.finPropuesto}
                          top={(minutosDesdeInicioDia(arrastre.inicioPropuesto) / 60) * ALTURA_HORA}
                          altura={(diferenciaMinutos(arrastre.inicioPropuesto, arrastre.finPropuesto) / 60) * ALTURA_HORA}
                        />
                      )}

                      {destinoPaciente && destinoPaciente.diaIndice === indiceDia && (
                        <BloqueCitaFantasma
                          inicio={destinoPaciente.inicio}
                          fin={sumarMinutos(destinoPaciente.inicio, DURACION_DEFECTO)}
                          top={(minutosDesdeInicioDia(destinoPaciente.inicio) / 60) * ALTURA_HORA}
                          altura={(DURACION_DEFECTO / 60) * ALTURA_HORA}
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
            onCrearCita={(inicio) => setCitaSeleccionada(citaBorradorVacia(inicio))}
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

      <PanelPacientes
        onSeleccionarPaciente={(paciente: PacienteBusqueda) => {
          const inicio = combinarFechaHora(hoyISO(), '08:00')
          setCitaSeleccionada({
            ...citaBorradorVacia(inicio),
            pacienteId: paciente.id,
            paciente: { id: paciente.id, nombre: paciente.nombre, tipoTerapia: paciente.tipoTerapia, direccion: paciente.direccion, color: paciente.color },
          })
        }}
        onIniciarArrastrePaciente={iniciarArrastrePaciente}
      />

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
          onCerrar={() => setCitaSeleccionada(null)}
          onCrear={async (solicitud) => {
            const conflicto = await verificar(solicitud.inicio, solicitud.fin)
            if (conflicto) {
              window.alert('Esta cita choca con otra existente.')
              return false
            }
            await crearCita(solicitud)
            return true
          }}
          onGuardarCampos={async (id, cambios) => {
            const conflicto = await verificar(cambios.inicio, cambios.fin, id)
            if (conflicto) {
              window.alert('Esta cita choca con otra existente.')
              return
            }
            const actualizada = await actualizarCita(id, { inicio: cambios.inicio, fin: cambios.fin, autorizacionId: citaSeleccionada.autorizacionId, notas: cambios.notas })
            setCitaSeleccionada((actual) => (actual ? { ...actual, inicio: actualizada.inicio, fin: actualizada.fin, notas: actualizada.notas } : actual))
          }}
          onCambiarEstado={async (estado: EstadoCita) => {
            const actualizada = await cambiarEstadoCita(citaSeleccionada.id, { estado })
            setCitaSeleccionada((actual) =>
              actual ? { ...actual, estado: actualizada.estado, valorSesion: actualizada.valorSesion, copagoCobrado: actualizada.copagoCobrado } : actual,
            )
          }}
          onActualizarCopago={async (id, copago) => {
            const actualizada = await cambiarEstadoCita(id, { estado: citaSeleccionada.estado, copagoCobrado: copago })
            setCitaSeleccionada((actual) => (actual ? { ...actual, copagoCobrado: actualizada.copagoCobrado } : actual))
          }}
        />
      )}
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
  return (
    <div className={styles.barraSuperior}>
      <ToggleGroup
        type="single"
        value={vista}
        onValueChange={(valor) => valor && onCambiarVista(valor as VistaCalendario)}
        className={styles.selectorVista}
      >
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
