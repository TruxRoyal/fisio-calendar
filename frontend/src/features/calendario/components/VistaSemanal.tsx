import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useCitas } from '../hooks/useCitas'
import { useDeteccionChoque } from '../hooks/useDeteccionChoque'
import { useCalendarioStore } from '../store'
import { BloqueCita } from './BloqueCita'
import { PanelPacientes } from './PanelPacientes'
import {
  analizarFechaHora,
  combinarFechaHora,
  diferenciaMinutos,
  formatearDiaSemana,
  formatearFechaISO,
  formatearHora,
  sumarDias,
  sumarMinutos,
} from '../../../shared/lib/fecha'
import { Modal } from '../../../shared/components/Modal'
import { Boton } from '../../../shared/components/Boton'
import { ErrorPeticion } from '../../../shared/api/cliente'
import type { Cita, PacienteBusqueda } from '../types'

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

interface CreacionPendiente {
  dia: Date
  inicio: string
  fin: string
}

function minutosDesdeInicioDia(iso: string): number {
  const fecha = analizarFechaHora(iso)
  return (fecha.getHours() - HORA_INICIO) * 60 + fecha.getMinutes()
}

function snap(minutos: number): number {
  return Math.round(minutos / MINUTOS_SNAP) * MINUTOS_SNAP
}

export function VistaSemanal() {
  const { citas, inicioSemanaActual, irSemana, irHoy } = useCitas()
  const crearCita = useCalendarioStore((estado) => estado.crearCita)
  const actualizarCita = useCalendarioStore((estado) => estado.actualizarCita)
  const cambiarEstadoCita = useCalendarioStore((estado) => estado.cambiarEstadoCita)
  const { verificar } = useDeteccionChoque()

  const refGrilla = useRef<HTMLDivElement>(null)
  const [arrastre, setArrastre] = useState<ArrastreActivo | null>(null)
  const [conflictoActivo, setConflictoActivo] = useState(false)
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null)
  const [creacionPendiente, setCreacionPendiente] = useState<CreacionPendiente | null>(null)

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemanaActual, i))
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const alturaTotal = (HORA_FIN - HORA_INICIO) * ALTURA_HORA

  useEffect(() => {
    if (!arrastre) return

    function alMover(evento: MouseEvent) {
      setArrastre((actual) => {
        if (!actual || !refGrilla.current) return actual

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

        const fechaBase = sumarDias(inicioSemanaActual, diaPropuesto)
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
      })
    }

    async function alSoltar() {
      setArrastre((actual) => {
        if (actual) finalizarArrastre(actual)
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
  }, [arrastre !== null])

  useEffect(() => {
    if (!arrastre) {
      setConflictoActivo(false)
      return
    }
    verificar(arrastre.inicioPropuesto, arrastre.finPropuesto, arrastre.citaId).then((conflicto) => {
      setConflictoActivo(conflicto !== null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastre?.inicioPropuesto, arrastre?.finPropuesto])

  async function finalizarArrastre(actual: ArrastreActivo) {
    if (actual.inicioPropuesto === actual.inicioOrigen && actual.finPropuesto === actual.finOrigen) return

    const conflicto = await verificar(actual.inicioPropuesto, actual.finPropuesto, actual.citaId)
    if (conflicto) {
      window.alert('No se puede mover la cita: choca con otra cita existente.')
      return
    }

    const cita = citas.find((c) => c.id === actual.citaId)
    try {
      await actualizarCita(actual.citaId, {
        inicio: actual.inicioPropuesto,
        fin: actual.finPropuesto,
        autorizacionId: cita?.autorizacionId ?? null,
        notas: cita?.notas ?? null,
      })
    } catch (error) {
      if (error instanceof ErrorPeticion) {
        window.alert(error.message)
      }
    }
  }

  function iniciarArrastre(cita: Cita, diaIndice: number, modo: 'mover' | 'redimensionar', evento: ReactMouseEvent) {
    setArrastre({
      citaId: cita.id,
      modo,
      diaOrigen: diaIndice,
      inicioOrigen: cita.inicio,
      finOrigen: cita.fin,
      pageXInicial: evento.pageX,
      pageYInicial: evento.pageY,
      diaPropuesto: diaIndice,
      inicioPropuesto: cita.inicio,
      finPropuesto: cita.fin,
    })
  }

  function alClicEnColumna(dia: Date, evento: ReactMouseEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget) return
    const rect = evento.currentTarget.getBoundingClientRect()
    const minutosDelDia = snap(((evento.clientY - rect.top) / ALTURA_HORA) * 60)
    const horaCalculada = HORA_INICIO + Math.floor(minutosDelDia / 60)
    const minutos = minutosDelDia % 60
    const inicio = combinarFechaHora(
      formatearFechaISO(dia),
      `${String(horaCalculada).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
    )
    setCreacionPendiente({ dia, inicio, fin: sumarMinutos(inicio, DURACION_DEFECTO) })
  }

  function citasPorDia(dia: Date): Cita[] {
    const iso = formatearFechaISO(dia)
    return citas.filter((cita) => cita.inicio.startsWith(iso))
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CabeceraSemana
          dias={dias}
          inicioSemanaActual={inicioSemanaActual}
          onSemanaAnterior={() => irSemana(-1)}
          onSemanaSiguiente={() => irSemana(1)}
          onHoy={irHoy}
        />

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
          <div style={{ width: '52px', flex: '0 0 52px' }}>
            <div style={{ height: '28px' }} />
            {horas.map((hora) => (
              <div key={hora} style={{ height: ALTURA_HORA, textAlign: 'right', paddingRight: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--t3)', position: 'relative', top: '-6px' }}>
                  {String(hora).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          <div ref={refGrilla} style={{ flex: 1, display: 'flex' }}>
            {dias.map((dia, indiceDia) => (
              <div
                key={dia.toISOString()}
                onMouseDown={(evento) => alClicEnColumna(dia, evento)}
                style={{
                  flex: 1,
                  position: 'relative',
                  borderLeft: '1px solid var(--grid)',
                  height: alturaTotal,
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, var(--grid) 0, var(--grid) 1px, transparent 1px, transparent ' +
                    ALTURA_HORA +
                    'px)',
                }}
              >
                {citasPorDia(dia)
                  .filter((cita) => !(arrastre && arrastre.citaId === cita.id))
                  .map((cita) => (
                    <BloqueCita
                      key={cita.id}
                      cita={cita}
                      top={(minutosDesdeInicioDia(cita.inicio) / 60) * ALTURA_HORA}
                      altura={(diferenciaMinutos(cita.inicio, cita.fin) / 60) * ALTURA_HORA}
                      enConflicto={false}
                      onAbrir={() => setCitaSeleccionada(cita)}
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
                    conflicto={conflictoActivo}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <PanelPacientes
        onSeleccionarPaciente={(paciente: PacienteBusqueda) => {
          const inicio = combinarFechaHora(formatearFechaISO(new Date()), '08:00')
          setCreacionPendiente({ dia: new Date(), inicio, fin: sumarMinutos(inicio, DURACION_DEFECTO) })
          setCitaSeleccionada({
            id: 0,
            pacienteId: paciente.id,
            autorizacionId: null,
            inicio,
            fin: sumarMinutos(inicio, DURACION_DEFECTO),
            estado: 'agendada',
            valorSesion: null,
            copagoCobrado: 0,
            notas: null,
            creadoEn: '',
            actualizadoEn: '',
            paciente: { id: paciente.id, nombre: paciente.nombre, tipoTerapia: paciente.tipoTerapia },
          })
        }}
      />

      {citaSeleccionada && (
        <ModalDetalleCita
          cita={citaSeleccionada}
          esNueva={citaSeleccionada.id === 0}
          onCerrar={() => setCitaSeleccionada(null)}
          onCrear={async (solicitud) => {
            await crearCita(solicitud)
            setCitaSeleccionada(null)
          }}
          onCambiarEstado={async (estado, copagoCobrado) => {
            await cambiarEstadoCita(citaSeleccionada.id, { estado, copagoCobrado })
            setCitaSeleccionada(null)
          }}
        />
      )}

      {creacionPendiente && !citaSeleccionada && (
        <Modal abierto titulo="Nueva cita" onCerrar={() => setCreacionPendiente(null)}>
          <p style={{ fontSize: '13.5px', color: 'var(--t3)' }}>
            Selecciona un paciente del panel derecho para agendar el {formatearDiaSemana(creacionPendiente.inicio, false)}{' '}
            a las {formatearHora(creacionPendiente.inicio)}.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Boton variante="secundario" onClick={() => setCreacionPendiente(null)}>
              Cerrar
            </Boton>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CabeceraSemana({
  dias,
  inicioSemanaActual,
  onSemanaAnterior,
  onSemanaSiguiente,
  onHoy,
}: {
  dias: Date[]
  inicioSemanaActual: Date
  onSemanaAnterior: () => void
  onSemanaSiguiente: () => void
  onHoy: () => void
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--bd)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--t1)' }}>
          Semana del {formatearFechaISO(inicioSemanaActual)}
        </h1>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Boton tamano="sm" variante="secundario" onClick={onSemanaAnterior}>
            ←
          </Boton>
          <Boton tamano="sm" variante="secundario" onClick={onHoy}>
            Hoy
          </Boton>
          <Boton tamano="sm" variante="secundario" onClick={onSemanaSiguiente}>
            →
          </Boton>
        </div>
      </div>
      <div style={{ display: 'flex', paddingLeft: '52px' }}>
        {dias.map((dia) => (
          <div key={dia.toISOString()} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>
              {formatearDiaSemana(formatearFechaISO(dia))}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>{dia.getDate()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BloqueCitaFantasma({
  inicio,
  fin,
  top,
  altura,
  conflicto,
}: {
  inicio: string
  fin: string
  top: number
  altura: number
  conflicto: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        height: Math.max(altura, 24),
        left: 4,
        right: 4,
        borderRadius: '8px',
        background: conflicto ? 'var(--dgBg)' : 'var(--acS)',
        border: `1.5px dashed ${conflicto ? 'var(--dgFg)' : 'var(--ac)'}`,
        padding: '4px 7px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, color: conflicto ? 'var(--dgFg)' : 'var(--acT)' }}>
        {formatearHora(inicio)}–{formatearHora(fin)}
      </div>
    </div>
  )
}

function ModalDetalleCita({
  cita,
  esNueva,
  onCerrar,
  onCrear,
  onCambiarEstado,
}: {
  cita: Cita
  esNueva: boolean
  onCerrar: () => void
  onCrear: (solicitud: { pacienteId: number; inicio: string; fin: string; notas?: string | null }) => Promise<void>
  onCambiarEstado: (estado: Cita['estado'], copagoCobrado?: number) => Promise<void>
}) {
  const [copago, setCopago] = useState(cita.copagoCobrado)

  return (
    <Modal abierto titulo={esNueva ? 'Nueva cita' : 'Detalle de la cita'} onCerrar={onCerrar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>{cita.paciente.nombre}</p>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--t3)' }}>
          {formatearDiaSemana(cita.inicio, false)} · {formatearHora(cita.inicio)}–{formatearHora(cita.fin)}
        </p>

        {esNueva ? (
          <Boton
            variante="primario"
            onClick={() => onCrear({ pacienteId: cita.pacienteId, inicio: cita.inicio, fin: cita.fin })}
          >
            Agendar cita
          </Boton>
        ) : (
          <>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>
              Copago cobrado
              <input
                type="number"
                min={0}
                value={copago}
                onChange={(e) => setCopago(Number(e.target.value))}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '38px',
                  marginTop: '6px',
                  border: '1px solid var(--bd)',
                  borderRadius: '10px',
                  padding: '0 10px',
                  background: 'var(--bg)',
                  color: 'var(--t1)',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cita.estado !== 'atendida' && (
                <Boton variante="primario" tamano="sm" onClick={() => onCambiarEstado('atendida', copago)}>
                  Marcar atendida
                </Boton>
              )}
              {cita.estado !== 'cancelada' && (
                <Boton variante="peligro" tamano="sm" onClick={() => onCambiarEstado('cancelada')}>
                  Cancelar cita
                </Boton>
              )}
              {cita.estado !== 'agendada' && (
                <Boton variante="secundario" tamano="sm" onClick={() => onCambiarEstado('agendada')}>
                  Volver a agendada
                </Boton>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
