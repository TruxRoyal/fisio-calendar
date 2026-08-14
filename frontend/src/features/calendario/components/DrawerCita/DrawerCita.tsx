import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { autorizacionesResumenApi, pacientesBusquedaApi } from '../../api'
import {
  combinarFechaHora,
  diferenciaMinutos,
  formatearDiaSemana,
  formatearFechaCorta,
  formatearHora,
  sumarMinutos,
} from '../../../../shared/lib/fecha'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, CitaBorrador, EstadoCita, PacienteParaDrawer } from '../../types'
import styles from './DrawerCita.module.css'

const DURACIONES = [30, 60, 90]
const ESTADOS: { valor: EstadoCita; etiqueta: string; icono: 'reloj' | 'check' | 'cerrar' }[] = [
  { valor: 'agendada', etiqueta: 'Pendiente', icono: 'reloj' },
  { valor: 'atendida', etiqueta: 'Hecha', icono: 'check' },
  { valor: 'cancelada', etiqueta: 'Cancelada', icono: 'cerrar' },
]

interface PropiedadesDrawerCita {
  cita: CitaBorrador
  onCerrar: () => void
  onCrear: (solicitud: { pacienteId: number; inicio: string; fin: string; notas?: string | null }) => Promise<void>
  onGuardarCampos: (id: number, cambios: { inicio: string; fin: string; notas: string | null }) => Promise<void>
  onCambiarEstado: (estado: EstadoCita) => Promise<void>
  onActualizarCopago: (id: number, copago: number) => Promise<void>
}

export function DrawerCita({ cita, onCerrar, onCrear, onGuardarCampos, onCambiarEstado, onActualizarCopago }: PropiedadesDrawerCita) {
  const esNueva = cita.id === 0
  const navegar = useNavigate()

  const [duracion, setDuracion] = useState(diferenciaMinutos(cita.inicio, cita.fin))
  const [notas, setNotas] = useState(cita.notas ?? '')
  const [copago, setCopago] = useState(cita.copagoCobrado)
  const [autorizacion, setAutorizacion] = useState<AutorizacionResumen | null>(null)
  const [pacienteCompleto, setPacienteCompleto] = useState<PacienteParaDrawer | null>(null)
  const [creando, setCreando] = useState(false)
  const [guardadoVisible, setGuardadoVisible] = useState(false)

  const listo = useRef(false)
  const listoCopago = useRef(false)

  useEffect(() => {
    if (cita.pacienteId) autorizacionesResumenApi.obtenerActiva(cita.pacienteId).then(setAutorizacion)
  }, [cita.pacienteId])

  useEffect(() => {
    if (!esNueva && cita.pacienteId) pacientesBusquedaApi.obtenerParaDrawer(cita.pacienteId).then(setPacienteCompleto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cita.id])

  function mostrarGuardado() {
    setGuardadoVisible(true)
    setTimeout(() => setGuardadoVisible(false), 1800)
  }

  useEffect(() => {
    if (esNueva) return
    if (!listo.current) {
      listo.current = true
      return
    }
    const temporizador = setTimeout(async () => {
      await onGuardarCampos(cita.id, { inicio: cita.inicio, fin: sumarMinutos(cita.inicio, duracion), notas: notas || null })
      mostrarGuardado()
    }, 700)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duracion, notas])

  useEffect(() => {
    if (esNueva) return
    if (!listoCopago.current) {
      listoCopago.current = true
      return
    }
    const temporizador = setTimeout(async () => {
      await onActualizarCopago(cita.id, copago)
      mostrarGuardado()
    }, 700)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copago])

  async function alCrear() {
    setCreando(true)
    try {
      await onCrear({ pacienteId: cita.pacienteId, inicio: cita.inicio, fin: sumarMinutos(cita.inicio, duracion) })
    } finally {
      setCreando(false)
    }
  }

  const direccion = pacienteCompleto?.direccion ?? cita.paciente.direccion
  const epsPaga = cita.valorSesion !== null ? cita.valorSesion - copago : null

  return (
    <>
      <div onClick={onCerrar} className={styles.fondo} />
      <div className={styles.panel}>
        <div className={styles.cabecera}>
          <div className={styles.filaCabecera}>
            <div
              className={styles.avatar}
              style={
                cita.paciente.color
                  ? ({ '--avatar-bg': `${cita.paciente.color}22`, '--avatar-fg': cita.paciente.color } as CSSProperties)
                  : undefined
              }
            >
              {cita.paciente.nombre ? cita.paciente.nombre.slice(0, 2).toUpperCase() : '—'}
            </div>
            <div className={styles.infoCabecera}>
              <div className={styles.nombreTitulo}>{cita.paciente.nombre || 'Selecciona un paciente'}</div>
              <div className={styles.subtitulo}>
                <span className={styles.tipoTerapia}>{cita.paciente.tipoTerapia ?? '—'}</span> · {duracion} min
              </div>
            </div>
            {guardadoVisible && (
              <span className={styles.badgeGuardado}>
                <Icono nombre="check" tamano={13} grosor={2.6} />
                Guardado
              </span>
            )}
            <button type="button" onClick={onCerrar} className={styles.botonCerrarCabecera}>
              <Icono nombre="cerrar" tamano={17} grosor={2.1} />
            </button>
          </div>
        </div>

        <div className={styles.cuerpo}>
          <TituloSeccion texto="Cuándo" />
          <div className={styles.filaCuando}>
            <Icono nombre="calendario" tamano={16} grosor={1.9} className={styles.iconoMuted} />
            <span>{formatearDiaSemana(cita.inicio, false)}, {formatearFechaCorta(cita.inicio)}</span>
            <div className={styles.espaciador} />
            <Icono nombre="reloj" tamano={16} grosor={1.9} className={styles.iconoMuted} />
            <span className={styles.horaTexto}>{formatearHora(cita.inicio)}</span>
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
                  <span className={styles.valorSesionesRestantes}>{autorizacion.sesionesRestantes}</span>
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
                    type="number"
                    min={0}
                    value={copago}
                    onChange={(e) => setCopago(Number(e.target.value))}
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
          {!esNueva && (
            <Boton variante="secundario" onClick={() => navegar(`/pacientes?paciente=${cita.pacienteId}`)}>
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
            <Boton variante="primario" onClick={alCrear} disabled={creando || !cita.pacienteId}>
              {creando ? 'Agendando…' : 'Agendar cita'}
            </Boton>
          ) : (
            <Boton variante="primario" onClick={onCerrar}>
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
