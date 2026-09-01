import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { autorizacionesResumenApi, capacidadApi, citasApi, pacientesBusquedaApi } from '../../api'
import { minutosDesdeHoraBase } from '../../lib'
import { BotonIcono } from '../VistaSemanal/VistaSemanal'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { Badge } from '../../../../shared/components/ui/badge'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import { ETIQUETA_TIPO_TERAPIA } from '../../../../shared/types/comun'
import {
  combinarFechaHora,
  diasHasta,
  diferenciaMinutos,
  esMismoDia,
  formatearFechaISO,
  formatearFechaLarga,
  formatearHora,
  formatearMinutosRestantes,
  hoy,
  hoyISO,
  minutosRestantes,
  sumarDias,
  sumarMinutos,
} from '../../../../shared/lib/fecha'
import { formatearMiles } from '../../../../shared/lib/moneda'
import type { AutorizacionResumen, CapacidadMensual, Cita, PacienteBusqueda } from '../../types'
import styles from './VistaDia.module.css'

const HORA_INICIO = 6
const HORA_FIN = 20
const HORA_INICIO_MIN = HORA_INICIO * 60
const HORA_FIN_MIN = HORA_FIN * 60
const DURACION_BANDA_CORTA = 45
const MAX_ESPACIOS_SUGERIDOS = 5
const DIAS_ALERTA_VENCIMIENTO = 7

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

function horaTexto(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatearDuracionCorta(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas} h`
  return `${horas} h ${resto} min`
}

type SegmentoCita = { tipo: 'cita'; cita: Cita }
type SegmentoLibre = { tipo: 'libre'; inicioMin: number; finMin: number; finDeJornada: boolean }
type SegmentoAhora = { tipo: 'ahora'; min: number }
type Segmento = SegmentoCita | SegmentoLibre | SegmentoAhora

interface PropiedadesVistaDia {
  fecha: Date
  onCambiarFecha: (fecha: Date) => void
  onAbrirCita: (cita: Cita) => void
  onCrearCita: (inicio: string) => void
  abrirCitaParaPaciente: (inicio: string, paciente: PacienteBusqueda) => void
}

export function VistaDia({ fecha, onCambiarFecha, onAbrirCita, onCrearCita, abrirCitaParaPaciente }: PropiedadesVistaDia) {
  const [citas, setCitas] = useState<Cita[]>([])
  const [autorizaciones, setAutorizaciones] = useState<Record<number, AutorizacionResumen[]>>({})
  const [capacidad, setCapacidad] = useState<CapacidadMensual | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'respiratoria' | 'fisica' | 'porVencer'>('todos')
  const [pacientes, setPacientes] = useState<PacienteBusqueda[]>([])

  const iso = formatearFechaISO(fecha)
  const esHoy = esMismoDia(iso, hoyISO())
  const ahoraMin = esHoy ? new Date().getHours() * 60 + new Date().getMinutes() : -1

  useEffect(() => {
    citasApi.listarPorRango(iso, iso).then(setCitas)
  }, [iso])

  useEffect(() => {
    capacidadApi.obtener().then(setCapacidad)
  }, [citas])

  useEffect(() => {
    pacientesBusquedaApi.listar(busqueda).then(setPacientes)
  }, [busqueda, citas])

  const idsPacientesClave = useMemo(() => Array.from(new Set(citas.map((c) => c.pacienteId))).sort((a, b) => a - b).join(','), [citas])

  useEffect(() => {
    if (!idsPacientesClave) {
      setAutorizaciones({})
      return
    }
    let vigente = true
    const ids = idsPacientesClave.split(',').map(Number)
    Promise.allSettled(ids.map((id) => autorizacionesResumenApi.listarActivas(id).then((a) => [id, a] as const))).then((resultados) => {
      if (!vigente) return
      const entradas = resultados
        .filter((r): r is PromiseFulfilledResult<readonly [number, AutorizacionResumen[]]> => r.status === 'fulfilled')
        .map((r) => r.value)
      setAutorizaciones(Object.fromEntries(entradas))
    })
    return () => {
      vigente = false
    }
  }, [idsPacientesClave])

  const citasSinCancelar = useMemo(() => citas.filter((c) => c.estado !== 'cancelada'), [citas])
  const hechas = citasSinCancelar.filter((c) => c.estado === 'atendida').length
  const pendientesCount = citasSinCancelar.filter((c) => c.estado === 'agendada').length
  const recaudo = citasSinCancelar
    .filter((c) => c.estado === 'atendida')
    .reduce((total, c) => total + (c.valorSesion ?? 0) + c.copagoCobrado, 0)
  const ocupadoMin = citasSinCancelar.reduce((total, c) => total + diferenciaMinutos(c.inicio, c.fin), 0)
  const libreMin = Math.max(0, HORA_FIN_MIN - HORA_INICIO_MIN - ocupadoMin)

  const proximaCita = useMemo(() => {
    const pendientes = citas.filter((c) => c.estado === 'agendada')
    if (esHoy) {
      const ahoraMinuto = new Date().getHours() * 60 + new Date().getMinutes()
      return pendientes.filter((c) => minutosDesdeHoraBase(c.inicio, 0) >= ahoraMinuto).sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
    }
    return pendientes.sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
  }, [citas, esHoy])

  const segmentos = useMemo(() => {
    const ordenadas = [...citas].sort((a, b) => a.inicio.localeCompare(b.inicio))
    const resultado: Segmento[] = []
    let cursor = HORA_INICIO_MIN
    for (const cita of ordenadas) {
      const inicioMin = minutosDesdeHoraBase(cita.inicio, 0)
      const finMin = inicioMin + diferenciaMinutos(cita.inicio, cita.fin)
      if (inicioMin > cursor) resultado.push({ tipo: 'libre', inicioMin: cursor, finMin: inicioMin, finDeJornada: false })
      resultado.push({ tipo: 'cita', cita })
      cursor = Math.max(cursor, finMin)
    }
    if (cursor < HORA_FIN_MIN) resultado.push({ tipo: 'libre', inicioMin: cursor, finMin: HORA_FIN_MIN, finDeJornada: true })

    if (ahoraMin < HORA_INICIO_MIN || ahoraMin > HORA_FIN_MIN) return resultado
    const conAhora: Segmento[] = []
    let insertado = false
    for (const seg of resultado) {
      if (!insertado && seg.tipo === 'libre' && ahoraMin > seg.inicioMin && ahoraMin < seg.finMin) {
        conAhora.push({ ...seg, finMin: ahoraMin })
        conAhora.push({ tipo: 'ahora', min: ahoraMin })
        conAhora.push({ ...seg, inicioMin: ahoraMin })
        insertado = true
        continue
      }
      conAhora.push(seg)
    }
    return conAhora
  }, [citas, ahoraMin])

  const espaciosLibresHoy = useMemo(
    () =>
      segmentos
        .filter((s): s is SegmentoLibre => s.tipo === 'libre' && !s.finDeJornada)
        .reduce((total, s) => total + Math.floor((s.finMin - s.inicioMin) / 30), 0),
    [segmentos],
  )

  const primerEspacioLibreMin = useMemo(() => segmentos.find((s): s is SegmentoLibre => s.tipo === 'libre' && !s.finDeJornada)?.inicioMin, [segmentos])

  function tienePacienteAutorizacionPorVencer(p: PacienteBusqueda): boolean {
    return p.autorizacionesActivas.some((a) => {
      if (!a.fechaVencimiento) return false
      const dias = diasHasta(a.fechaVencimiento)
      return dias >= 0 && dias <= DIAS_ALERTA_VENCIMIENTO
    })
  }

  const pacientesFiltrados = pacientes.filter((p) => {
    if (filtro === 'todos') return true
    if (filtro === 'porVencer') return tienePacienteAutorizacionPorVencer(p)
    return p.tipoTerapia === filtro
  })

  const pacientesPorVencerNombres = pacientes
    .filter(tienePacienteAutorizacionPorVencer)
    .slice(0, 2)
    .map((p) => p.nombre.split(' ')[0])

  function alAgendarEnHora(minuto: number) {
    onCrearCita(sumarMinutos(combinarFechaHora(iso, '00:00'), minuto))
  }

  function alAgendarPaciente(paciente: PacienteBusqueda) {
    const minuto = primerEspacioLibreMin ?? HORA_INICIO_MIN
    abrirCitaParaPaciente(sumarMinutos(combinarFechaHora(iso, '00:00'), minuto), paciente)
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.columnaAgenda}>
        <div className={styles.cabecera}>
          <div className={styles.filaTitulo}>
            <div>
              <div className={styles.tituloDia}>{formatearFechaLarga(iso)}</div>
              <div className={styles.subtituloDia}>
                {citasSinCancelar.length} cita{citasSinCancelar.length === 1 ? '' : 's'} · {formatearDuracionCorta(ocupadoMin)} ocupadas ·{' '}
                {formatearDuracionCorta(libreMin)} libres
              </div>
            </div>
          </div>
          <div className={styles.navegacion}>
            <BotonIcono icono="chevronIzquierda" titulo="Día anterior" onClick={() => onCambiarFecha(sumarDias(fecha, -1))} />
            <BotonIcono icono="chevronDerecha" titulo="Día siguiente" onClick={() => onCambiarFecha(sumarDias(fecha, 1))} />
            <button type="button" onClick={() => onCambiarFecha(hoy())} className={styles.botonHoy}>
              Hoy
            </button>
          </div>
        </div>

        <div className={styles.listaAgenda}>
          {segmentos.map((seg, indice) => {
            if (seg.tipo === 'cita') {
              return (
                <TarjetaCitaDia
                  key={seg.cita.id}
                  cita={seg.cita}
                  esProxima={seg.cita.id === proximaCita?.id}
                  esHoy={esHoy}
                  autorizacion={autorizaciones[seg.cita.pacienteId]?.find((a) => a.tipoTerapia === seg.cita.tipoTerapia) ?? null}
                  onAbrir={onAbrirCita}
                />
              )
            }
            if (seg.tipo === 'ahora') {
              return (
                <div key={`ahora-${seg.min}`} className={styles.filaAhora}>
                  <span className={styles.chipAhora}>{horaTexto(seg.min)}</span>
                  <span className={styles.lineaAhora} />
                  <span className={styles.etiquetaAhora}>Ahora</span>
                </div>
              )
            }
            if (seg.finDeJornada) {
              return (
                <div key={`libre-${seg.inicioMin}`} className={styles.filaFinJornada}>
                  <span className={styles.finJornadaHora}>
                    {horaTexto(seg.inicioMin)} — {horaTexto(seg.finMin)}
                  </span>
                  <span className={styles.finJornadaTexto}>Fin de jornada</span>
                  <span className={styles.finJornadaLinea} />
                </div>
              )
            }
            return <BandaLibre key={`libre-${indice}-${seg.inicioMin}`} inicioMin={seg.inicioMin} finMin={seg.finMin} onAgendar={alAgendarEnHora} />
          })}
        </div>
      </div>

      <aside className={styles.panelLateral}>
        <div className={styles.seccionPanel}>
          <div className={styles.etiquetaPanel}>Este día</div>
          <div className={styles.gridEstadisticasDia}>
            <div className={styles.statDia}>
              <div className={styles.valorStatDia}>
                {hechas}/{citasSinCancelar.length}
              </div>
              <div className={styles.etiquetaStatDia}>Hechas</div>
            </div>
            <div className={styles.statDia}>
              <div className={styles.valorStatDia}>{pendientesCount}</div>
              <div className={styles.etiquetaStatDia}>Pendientes</div>
            </div>
            <div className={cn(styles.statDia, styles.statDiaAcentuada)}>
              <div className={styles.valorStatDia}>{formatearMiles(recaudo)}</div>
              <div className={styles.etiquetaStatDia}>Recaudo</div>
            </div>
          </div>

          {capacidad && (
            <div className={styles.cargaMes}>
              <div className={styles.filaCargaMes}>
                <span>Carga del mes · estimado</span>
                <span className={styles.valorCargaMes}>{formatearDuracionCorta(capacidad.minutosEstimados)}</span>
              </div>
              <div className={styles.pistaCargaMes}>
                <div className={styles.rellenoCargaMesEstimado} style={{ width: '100%' } as CSSProperties} />
              </div>
              <div className={styles.filaCargaMes}>
                <span>Real atendido</span>
                <span className={styles.valorCargaMes}>{formatearDuracionCorta(capacidad.minutosReales)}</span>
              </div>
              <div className={styles.pistaCargaMes}>
                <div
                  className={styles.rellenoCargaMesReal}
                  style={{ width: `${Math.min(100, (capacidad.minutosReales / Math.max(capacidad.minutosEstimados, 1)) * 100)}%` } as CSSProperties}
                />
              </div>
            </div>
          )}
        </div>

        <div className={cn(styles.seccionPanel, styles.seccionAgendar)}>
          <div className={styles.filaTituloAgendar}>
            <div className={styles.etiquetaPanel}>Agendar</div>
            <span className={styles.notaAgendar}>Click para colocar</span>
          </div>
          <div className={styles.contenedorBusqueda}>
            <Icono nombre="buscar" tamano={14} className={styles.iconoBusqueda} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente…"
              className={styles.inputBusqueda}
            />
          </div>
          <div className={styles.filaFiltros}>
            {(
              [
                { id: 'porVencer', label: 'Por vencer' },
                { id: 'respiratoria', label: ETIQUETA_TIPO_TERAPIA.respiratoria },
                { id: 'fisica', label: ETIQUETA_TIPO_TERAPIA.fisica },
                { id: 'todos', label: 'Todos' },
              ] as const
            ).map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(styles.chipFiltro, filtro === f.id && styles.chipFiltroActivo)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={styles.listaPacientesAgendar}>
            {pacientesFiltrados.map((paciente) => {
              const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
              const avatarBg = paciente.color ? `${paciente.color}22` : (color?.bg ?? 'var(--s3)')
              const avatarFg = paciente.color ?? color?.fg ?? 'var(--t3)'
              const autorizacion =
                paciente.autorizacionesActivas.find((a) => a.tipoTerapia === paciente.tipoTerapia) ?? paciente.autorizacionesActivas[0] ?? null
              const vence = autorizacion?.fechaVencimiento ? diasHasta(autorizacion.fechaVencimiento) : null
              return (
                <button type="button" key={paciente.id} onClick={() => alAgendarPaciente(paciente)} className={styles.filaPacienteAgendar}>
                  <div className={styles.avatarPacienteAgendar} style={{ '--avatar-bg': avatarBg, '--avatar-fg': avatarFg } as CSSProperties}>
                    {iniciales(paciente.nombre)}
                  </div>
                  <div className={styles.infoPacienteAgendar}>
                    <div className={styles.filaNombrePacienteAgendar}>
                      <span className={styles.nombrePacienteAgendar}>{paciente.nombre}</span>
                      {vence !== null && vence >= 0 && vence <= DIAS_ALERTA_VENCIMIENTO && (
                        <Badge variant="warning">{vence === 0 ? 'Vence hoy' : `Vence en ${vence}d`}</Badge>
                      )}
                      {paciente.origen === 'extra' && <Badge variant="accent">Extra</Badge>}
                    </div>
                    <div className={styles.subtituloPacienteAgendar}>
                      {paciente.tipoTerapia ? ETIQUETA_TIPO_TERAPIA[paciente.tipoTerapia] : (paciente.eps ?? 'Particular')}
                      {autorizacion && ` · ${autorizacion.sesionesUsadas} de ${autorizacion.sesionesTotales} sesiones`}
                    </div>
                  </div>
                  <span className={styles.botonAgendarPaciente}>+</span>
                </button>
              )
            })}
            {pacientesFiltrados.length === 0 && <p className={styles.vacioListaAgendar}>No hay pacientes que coincidan</p>}
          </div>

          {(espaciosLibresHoy > 0 || pacientesPorVencerNombres.length > 0) && (
            <div className={styles.notaInsight}>
              {espaciosLibresHoy > 0 && (
                <div className={styles.notaInsightTitulo}>
                  Quedan {espaciosLibresHoy} espacio{espaciosLibresHoy === 1 ? '' : 's'} libres este día
                </div>
              )}
              {pacientesPorVencerNombres.length > 0 && (
                <div className={styles.notaInsightTexto}>
                  {pacientesPorVencerNombres.join(' y ')} tiene{pacientesPorVencerNombres.length === 1 ? '' : 'n'} sesiones por vencer este mes.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function BandaLibre({ inicioMin, finMin, onAgendar }: { inicioMin: number; finMin: number; onAgendar: (minuto: number) => void }) {
  const duracion = finMin - inicioMin
  const esCorta = duracion < DURACION_BANDA_CORTA
  const espacios = Math.floor(duracion / 30)
  const slots = Array.from({ length: Math.min(espacios, MAX_ESPACIOS_SUGERIDOS) }, (_, i) => inicioMin + i * 30)

  return (
    <div className={styles.bandaLibre}>
      <span className={styles.bandaRango}>
        {horaTexto(inicioMin)} — {horaTexto(finMin)}
      </span>
      <span className={styles.bandaDuracion}>
        {formatearDuracionCorta(duracion)} libres{!esCorta && ` · ${espacios} espacio${espacios === 1 ? '' : 's'}`}
      </span>
      <div className={styles.bandaEspaciador} />
      {esCorta ? (
        <button type="button" className={styles.bandaBotonUnico} onClick={() => onAgendar(inicioMin)}>
          + Agendar aquí
        </button>
      ) : (
        <div className={styles.bandaSlots}>
          {slots.map((slot) => (
            <button type="button" key={slot} className={styles.bandaSlot} onClick={() => onAgendar(slot)}>
              {horaTexto(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TarjetaCitaDia({
  cita,
  esProxima,
  esHoy,
  autorizacion,
  onAbrir,
}: {
  cita: Cita
  esProxima: boolean
  esHoy: boolean
  autorizacion: AutorizacionResumen | null
  onAbrir: (cita: Cita) => void
}) {
  const colorTipo = TIPO_TERAPIA_COLOR[cita.tipoTerapia]
  const colorBorde = cita.paciente.color ?? colorTipo.fg ?? 'var(--ac)'
  const duracion = diferenciaMinutos(cita.inicio, cita.fin)
  const sesionesUsadas = autorizacion ? autorizacion.sesionesTotales - autorizacion.sesionesRestantes : null

  return (
    <button
      type="button"
      onClick={() => onAbrir(cita)}
      className={cn(styles.tarjetaCita, cita.estado === 'cancelada' && styles.tarjetaCitaCancelada, esProxima && styles.tarjetaCitaProxima)}
      style={{ '--color-borde': colorBorde } as CSSProperties}
    >
      <div className={styles.tarjetaCitaHora}>
        <span className={styles.horaGrande}>{formatearHora(cita.inicio)}</span>
        <span className={styles.duracionChica}>{duracion} min</span>
      </div>

      <div className={styles.tarjetaCitaInfo}>
        <div className={styles.avatarCita} style={{ background: colorTipo.bg, color: colorBorde } as CSSProperties}>
          {iniciales(cita.paciente.nombre)}
        </div>
        <div className={styles.tarjetaCitaTexto}>
          <div className={styles.filaNombreEstado}>
            <span className={styles.nombreCitaTarjeta}>{cita.paciente.nombre}</span>
            <EstadoCitaBadge cita={cita} esProxima={esProxima} esHoy={esHoy} />
          </div>
          <div className={styles.filaTipoDetalle}>
            <span className={styles.puntoTipo} style={{ background: colorBorde }} />
            <span>
              {ETIQUETA_TIPO_TERAPIA[cita.tipoTerapia]}
              {esProxima && cita.paciente.direccion && ` · ${cita.paciente.direccion}`}
              {!esProxima && cita.notas && ` · ${cita.notas}`}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.tarjetaCitaAcciones}>
        {autorizacion && autorizacion.sesionesTotales > 0 && (
          <div className={styles.progresoSesiones}>
            <span className={styles.progresoTexto}>
              {sesionesUsadas}/{autorizacion.sesionesTotales} sesiones
            </span>
            <div className={styles.progresoPista}>
              <div
                className={styles.progresoRelleno}
                style={{ width: `${Math.min(100, ((sesionesUsadas ?? 0) / autorizacion.sesionesTotales) * 100)}%`, background: colorBorde } as CSSProperties}
              />
            </div>
          </div>
        )}
        <span className={styles.botonAccionCita}>{cita.estado === 'atendida' ? 'Cobrar' : 'Mover'}</span>
        {cita.estado === 'atendida' && <Icono nombre="check" tamano={13} grosor={2.6} className={styles.iconoCheckTarjeta} />}
      </div>
    </button>
  )
}

function EstadoCitaBadge({ cita, esProxima, esHoy }: { cita: Cita; esProxima: boolean; esHoy: boolean }) {
  if (cita.estado === 'cancelada') return <Badge variant="secondary">Cancelada</Badge>
  if (cita.estado === 'atendida') {
    return cita.copagoCobrado > 0 ? (
      <Badge className="border-[var(--okBd)] bg-[var(--okBg)] text-[var(--okFg)] font-semibold">Hecha</Badge>
    ) : (
      <Badge variant="warning">Por cobrar</Badge>
    )
  }
  if (esProxima) {
    return <Badge variant="accent">Próxima{esHoy ? ` · ${formatearMinutosRestantes(minutosRestantes(cita.inicio))}` : ''}</Badge>
  }
  return <Badge variant="secondary">Confirmada</Badge>
}
