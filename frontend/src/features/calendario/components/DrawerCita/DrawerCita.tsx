import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { es } from 'date-fns/locale'
import { autorizacionesResumenApi, pacientesBusquedaApi } from '../../api'
import {
  analizarFechaHora,
  combinarFechaHora,
  diferenciaMinutos,
  formatearFechaCorta,
  formatearFechaISO,
  sumarMinutos,
} from '../../../../shared/lib/fecha'
import { formatearCOP, formatearMiles } from '../../../../shared/lib/moneda'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { Calendar } from '../../../../shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../shared/components/ui/popover'
import { SelectorHora } from '../../../../shared/components/SelectorHora/SelectorHora'
import { cn } from '../../../../shared/lib/clases'
import { ETIQUETA_TIPO_TERAPIA } from '../../../../shared/types/comun'
import type { AutorizacionResumen, CitaBorrador, EstadoCita, PacienteBusqueda, PacienteParaDrawer } from '../../types'
import styles from './DrawerCita.module.css'

const DURACION_SALIDA_MS = 200

const DURACIONES = [30, 45, 60, 90]
const ESTADOS: { valor: EstadoCita; etiqueta: string; icono: 'reloj' | 'check' | 'cerrar' }[] = [
  { valor: 'agendada', etiqueta: 'Pendiente', icono: 'reloj' },
  { valor: 'atendida', etiqueta: 'Hecha', icono: 'check' },
  { valor: 'cancelada', etiqueta: 'Cancelada', icono: 'cerrar' },
]

interface PropiedadesDrawerCita {
  cita: CitaBorrador
  onCerrar: () => void
  onCrear: (solicitud: { pacienteId: number; inicio: string; fin: string; notas?: string | null }) => Promise<boolean>
  onGuardarCampos: (id: number, cambios: { inicio: string; fin: string; notas: string | null }) => Promise<boolean>
  onCambiarEstado: (estado: EstadoCita) => Promise<void>
  onActualizarCopago: (id: number, copago: number) => Promise<void>
}

export function DrawerCita({ cita, onCerrar, onCrear, onGuardarCampos, onCambiarEstado, onActualizarCopago }: PropiedadesDrawerCita) {
  const esNueva = cita.id === 0
  const navegar = useNavigate()

  const [duracion, setDuracion] = useState(diferenciaMinutos(cita.inicio, cita.fin))
  const [fecha, setFecha] = useState(() => cita.inicio.slice(0, 10))
  const [horaInicio, setHoraInicio] = useState(() => cita.inicio.slice(11, 16))
  const [notas, setNotas] = useState(cita.notas ?? '')
  const [copago, setCopago] = useState(cita.copagoCobrado)
  const [autorizacion, setAutorizacion] = useState<AutorizacionResumen | null>(null)
  const [pacienteCompleto, setPacienteCompleto] = useState<PacienteParaDrawer | null>(null)
  const [pacienteElegido, setPacienteElegido] = useState<PacienteBusqueda | null>(null)
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [resultadosPaciente, setResultadosPaciente] = useState<PacienteBusqueda[]>([])
  const [creando, setCreando] = useState(false)
  const [guardadoVisible, setGuardadoVisible] = useState(false)
  const [selectorFechaAbierto, setSelectorFechaAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  const listo = useRef(false)
  const listoCopago = useRef(false)
  const guardarCamposPendiente = useRef<(() => void) | null>(null)
  const guardarCopagoPendiente = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      listo.current = false
      listoCopago.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      guardarCamposPendiente.current?.()
      guardarCopagoPendiente.current?.()
    }
  }, [])

  const pacienteInfo = !cita.pacienteId && pacienteElegido
    ? { id: pacienteElegido.id, nombre: pacienteElegido.nombre, tipoTerapia: pacienteElegido.tipoTerapia, direccion: pacienteElegido.direccion, color: pacienteElegido.color }
    : cita.paciente
  const pacienteIdActivo = cita.pacienteId || pacienteElegido?.id || 0

  useEffect(() => {
    if (!pacienteIdActivo) return
    let vigente = true
    autorizacionesResumenApi
      .obtenerActiva(pacienteIdActivo)
      .then((resultado) => {
        if (vigente) setAutorizacion(resultado)
      })
      .catch(() => {
        if (vigente) setAutorizacion(null)
      })
    return () => {
      vigente = false
    }
  }, [pacienteIdActivo])

  useEffect(() => {
    if (esNueva || !cita.pacienteId) return
    let vigente = true
    pacientesBusquedaApi
      .obtenerParaDrawer(cita.pacienteId)
      .then((resultado) => {
        if (vigente) setPacienteCompleto(resultado)
      })
      .catch(() => {
        if (vigente) setPacienteCompleto(null)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cita.id])

  useEffect(() => {
    if (!esNueva || pacienteIdActivo) return
    let vigente = true
    pacientesBusquedaApi
      .listar(busquedaPaciente)
      .then((resultados) => {
        if (vigente) setResultadosPaciente(resultados)
      })
      .catch(() => {
        if (vigente) setResultadosPaciente([])
      })
    return () => {
      vigente = false
    }
  }, [esNueva, pacienteIdActivo, busquedaPaciente])

  const temporizadorCierre = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (temporizadorCierre.current) clearTimeout(temporizadorCierre.current)
    }
  }, [])

  function mostrarGuardado() {
    setGuardadoVisible(true)
    setTimeout(() => setGuardadoVisible(false), 1800)
  }

  function cerrar() {
    if (temporizadorCierre.current) return
    setSaliendo(true)
    temporizadorCierre.current = setTimeout(onCerrar, DURACION_SALIDA_MS)
  }

  useEffect(() => {
    if (esNueva) return
    if (!listo.current) {
      listo.current = true
      return
    }
    const inicioActual = combinarFechaHora(fecha, horaInicio)
    const ejecutar = () => {
      guardarCamposPendiente.current = null
      onGuardarCampos(cita.id, { inicio: inicioActual, fin: sumarMinutos(inicioActual, duracion), notas: notas || null }).then((guardado) => {
        if (guardado) mostrarGuardado()
      })
    }
    guardarCamposPendiente.current = ejecutar
    const temporizador = setTimeout(ejecutar, 700)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duracion, notas, fecha, horaInicio])

  useEffect(() => {
    if (esNueva) return
    if (!listoCopago.current) {
      listoCopago.current = true
      return
    }
    const ejecutar = () => {
      guardarCopagoPendiente.current = null
      onActualizarCopago(cita.id, copago).then(() => mostrarGuardado())
    }
    guardarCopagoPendiente.current = ejecutar
    const temporizador = setTimeout(ejecutar, 700)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copago])

  async function alCrear() {
    setCreando(true)
    try {
      const inicioActual = combinarFechaHora(fecha, horaInicio)
      const creado = await onCrear({
        pacienteId: pacienteIdActivo,
        inicio: inicioActual,
        fin: sumarMinutos(inicioActual, duracion),
        notas: notas || null,
      })
      if (creado) cerrar()
    } finally {
      setCreando(false)
    }
  }

  const direccion = pacienteCompleto?.direccion ?? pacienteInfo.direccion
  const epsPaga = cita.valorSesion !== null ? cita.valorSesion - copago : null
  const porcentajeSesiones = autorizacion
    ? Math.min(100, Math.round(((autorizacion.sesionesTotales - autorizacion.sesionesRestantes) / Math.max(1, autorizacion.sesionesTotales)) * 100))
    : 0

  return (
    <>
      <div onClick={cerrar} className={cn(styles.fondo, saliendo && styles.saliendo)} />
      <div className={cn(styles.panel, saliendo && styles.saliendo)}>
        <div className={styles.cabecera}>
          <div className={styles.filaCabecera}>
            <div
              className={styles.avatar}
              style={
                pacienteInfo.color
                  ? ({ '--avatar-bg': `${pacienteInfo.color}22`, '--avatar-fg': pacienteInfo.color } as CSSProperties)
                  : undefined
              }
            >
              {pacienteInfo.nombre ? pacienteInfo.nombre.slice(0, 2).toUpperCase() : '—'}
            </div>
            <div className={styles.infoCabecera}>
              <div className={styles.nombreTitulo}>{pacienteInfo.nombre || 'Selecciona un paciente'}</div>
              <div className={styles.subtitulo}>
                {pacienteInfo.tipoTerapia ? ETIQUETA_TIPO_TERAPIA[pacienteInfo.tipoTerapia] : '—'} · {duracion} min
              </div>
            </div>
            {guardadoVisible && (
              <span className={styles.badgeGuardado}>
                <Icono nombre="check" tamano={13} grosor={2.6} />
                Guardado
              </span>
            )}
            <button type="button" onClick={cerrar} className={styles.botonCerrarCabecera}>
              <Icono nombre="cerrar" tamano={17} grosor={2.1} />
            </button>
          </div>

          {esNueva && !pacienteIdActivo && (
            <div className={styles.buscadorPaciente}>
              <div className={styles.contenedorBusquedaPaciente}>
                <Icono nombre="buscar" tamano={15} className={styles.iconoBusquedaPaciente} />
                <input
                  autoFocus
                  value={busquedaPaciente}
                  onChange={(e) => setBusquedaPaciente(e.target.value)}
                  placeholder="Buscar paciente para agendar…"
                  className={styles.inputBusquedaPaciente}
                />
              </div>
              {resultadosPaciente.length > 0 && (
                <div className={styles.listaResultados}>
                  {resultadosPaciente.map((p) => (
                    <button type="button" key={p.id} className={styles.itemResultado} onClick={() => setPacienteElegido(p)}>
                      <span className={styles.nombreResultado}>{p.nombre}</span>
                      <span className={styles.subResultado}>{p.eps ?? 'Particular'}</span>
                    </button>
                  ))}
                </div>
              )}
              {busquedaPaciente && resultadosPaciente.length === 0 && (
                <p className={styles.sinResultados}>No se encontraron pacientes</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.cuerpo}>
          <TituloSeccion texto="Cuándo" />
          <div className={styles.filaCuando}>
            <Icono nombre="calendario" tamano={16} grosor={1.9} className={styles.iconoMuted} />
            <Popover open={selectorFechaAbierto} onOpenChange={setSelectorFechaAbierto}>
              <PopoverTrigger asChild>
                <button type="button" className={styles.inputFecha}>
                  {formatearFechaCorta(`${fecha}T00:00:00`)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  locale={es}
                  selected={analizarFechaHora(fecha)}
                  defaultMonth={analizarFechaHora(fecha)}
                  onSelect={(dia) => {
                    if (!dia) return
                    setFecha(formatearFechaISO(dia))
                    setSelectorFechaAbierto(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <div className={styles.espaciador} />
            <Icono nombre="reloj" tamano={16} grosor={1.9} className={styles.iconoMuted} />
            <SelectorHora value={horaInicio} onChange={setHoraInicio} className={styles.inputHora} />
          </div>
          <div className={styles.filaDuraciones}>
            {DURACIONES.map((min) => {
              const activo = duracion === min
              return (
                <button
                  type="button"
                  key={min}
                  onClick={() => setDuracion(min)}
                  className={cn(styles.botonDuracion, activo && styles.activo)}
                >
                  {min} min
                </button>
              )
            })}
          </div>

          {!esNueva && (
            <>
              <TituloSeccion texto="Estado" margenSuperior />
              <div className={styles.filaEstados}>
                {ESTADOS.map((opcion) => {
                  const activo = cita.estado === opcion.valor
                  return (
                    <button
                      type="button"
                      key={opcion.valor}
                      onClick={() => onCambiarEstado(opcion.valor)}
                      className={cn(styles.botonEstado, activo && styles.activo)}
                    >
                      <Icono nombre={opcion.icono} tamano={13} grosor={2.3} />
                      {opcion.etiqueta}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {autorizacion && (
            <>
              <TituloSeccion texto="Autorización" margenSuperior />
              <div className={styles.tarjeta}>
                <div className={styles.filaTarjeta}>
                  <span className={styles.etiqueta}>Sesiones restantes</span>
                  <span className={styles.valorSesionesRestantes}>
                    {autorizacion.sesionesRestantes} de {autorizacion.sesionesTotales}
                  </span>
                </div>
                <div className={styles.pistaSesiones}>
                  <div className={styles.rellenoSesiones} style={{ '--ancho': `${porcentajeSesiones}%` } as CSSProperties} />
                </div>
                {autorizacion.fechaVencimiento && (
                  <div className={cn(styles.filaTarjeta, styles.filaDividida)}>
                    <span className={styles.etiqueta}>Vence</span>
                    <span className={cn(styles.valorVence, autorizacion.alertaVencimiento && styles.alerta)}>
                      {formatearFechaCorta(combinarFechaHora(autorizacion.fechaVencimiento, '00:00'))}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {!esNueva && (
            <>
              <TituloSeccion texto="Cobro" margenSuperior />
              <div className={styles.tarjeta}>
                <div className={cn(styles.filaTarjeta, styles.filaValorSesion)}>
                  <span className={styles.etiqueta}>Valor de la sesión</span>
                  <span className={styles.valorSesion}>
                    {cita.valorSesion !== null ? formatearCOP(cita.valorSesion) : 'Se calcula al marcar hecha'}
                  </span>
                </div>
                <div className={cn(styles.filaTarjeta, styles.filaCopago)}>
                  <span className={styles.etiqueta}>Copago en efectivo</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={`$ ${formatearMiles(copago)}`}
                    onChange={(e) => {
                      const digitos = e.target.value.replace(/\D/g, '')
                      setCopago(digitos ? Number(digitos) : 0)
                    }}
                    className={styles.inputCopago}
                  />
                </div>
                {epsPaga !== null && (
                  <div className={cn(styles.filaTarjeta, styles.filaEpsPaga)}>
                    <span className={styles.etiquetaChica}>EPS paga</span>
                    <span className={styles.valorEpsPaga}>{formatearCOP(epsPaga)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {direccion && (
            <>
              <TituloSeccion texto="Dirección" margenSuperior />
              <div className={styles.tarjetaDireccion}>
                <Icono nombre="ubicacion" tamano={17} grosor={1.9} className={styles.iconoMuted} />
                <div className={styles.textoDireccion}>{direccion}</div>
              </div>
            </>
          )}

          <TituloSeccion texto="Notas" margenSuperior />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas de la sesión…"
            className={styles.textareaNotas}
          />
        </div>

        <div className={styles.piePagina}>
          {!!pacienteIdActivo && (
            <Boton variante="secundario" onClick={() => navegar(`/pacientes?paciente=${pacienteIdActivo}`)}>
              Ver ficha
            </Boton>
          )}
          <div className={styles.espaciador} />
          {!esNueva && cita.estado !== 'cancelada' && (
            <button type="button" title="Cancelar cita" onClick={() => onCambiarEstado('cancelada')} className={styles.botonPapelera}>
              <Icono nombre="papelera" tamano={17} grosor={2} />
            </button>
          )}
          {esNueva ? (
            <Boton variante="primario" onClick={alCrear} disabled={creando || !pacienteIdActivo}>
              {creando ? 'Agendando…' : 'Agendar cita'}
            </Boton>
          ) : (
            <Boton variante="primario" onClick={cerrar}>
              Cerrar
            </Boton>
          )}
        </div>
      </div>
    </>
  )
}

function TituloSeccion({ texto, margenSuperior }: { texto: string; margenSuperior?: boolean }) {
  return <div className={cn(styles.tituloSeccion, margenSuperior && styles.margenSuperior)}>{texto}</div>
}
