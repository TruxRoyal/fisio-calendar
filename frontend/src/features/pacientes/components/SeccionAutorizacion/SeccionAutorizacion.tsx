import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Input } from '../../../../shared/components/Input/Input'
import { SelectorFecha } from '../../../../shared/components/SelectorFecha/SelectorFecha'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearFechaCorta } from '../../../../shared/lib/fecha'
import { autorizacionesApi } from '../../api'
import type { Autorizacion, SolicitudCrearAutorizacion } from '../../types'
import type { TipoTerapia } from '../../../../shared/types/comun'
import { ETIQUETA_TIPO_TERAPIA } from '../../../../shared/types/comun'
import styles from './SeccionAutorizacion.module.css'

const TIPOS_TERAPIA: TipoTerapia[] = ['respiratoria', 'fisica']

interface PropiedadesSeccionAutorizacion {
  pacienteId: number
  // Nota: se usa el tipo completo `Autorizacion` (no `AutorizacionResumen`) para
  // conservar `numero`/`copago` de la autorizacion vigente al desactivarla antes
  // de registrar la renovacion (ver alEnviar) sin perder esos datos.
  autorizacionesActivas: Autorizacion[]
  onActualizado: () => Promise<void>
}

function solicitudVacia(pacienteId: number, tipoTerapia: TipoTerapia): SolicitudCrearAutorizacion {
  return { pacienteId, tipoTerapia, numero: '', copago: 0, sesionesTotales: 10, fechaVencimiento: '' }
}

function estadoInicialEditando(autorizacionesActivas: Autorizacion[]): Record<TipoTerapia, boolean> {
  return Object.fromEntries(
    TIPOS_TERAPIA.map((tipo) => [tipo, !autorizacionesActivas.some((a) => a.tipoTerapia === tipo)]),
  ) as Record<TipoTerapia, boolean>
}

function estadoInicialSolicitudes(pacienteId: number): Record<TipoTerapia, SolicitudCrearAutorizacion> {
  return Object.fromEntries(TIPOS_TERAPIA.map((tipo) => [tipo, solicitudVacia(pacienteId, tipo)])) as Record<
    TipoTerapia,
    SolicitudCrearAutorizacion
  >
}

export function SeccionAutorizacion({ pacienteId, autorizacionesActivas, onActualizado }: PropiedadesSeccionAutorizacion) {
  const [editando, setEditando] = useState<Record<TipoTerapia, boolean>>(() => estadoInicialEditando(autorizacionesActivas))
  const [solicitudes, setSolicitudes] = useState<Record<TipoTerapia, SolicitudCrearAutorizacion>>(() =>
    estadoInicialSolicitudes(pacienteId),
  )
  const [guardandoTipo, setGuardandoTipo] = useState<TipoTerapia | null>(null)
  const [erroresFecha, setErroresFecha] = useState<Record<TipoTerapia, boolean>>({ respiratoria: false, fisica: false })

  useEffect(() => {
    setEditando(estadoInicialEditando(autorizacionesActivas))
    setSolicitudes(estadoInicialSolicitudes(pacienteId))
    setErroresFecha({ respiratoria: false, fisica: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId])

  function actualizarCampo<K extends keyof SolicitudCrearAutorizacion>(
    tipo: TipoTerapia,
    campo: K,
    valor: SolicitudCrearAutorizacion[K],
  ) {
    setSolicitudes((actual) => ({ ...actual, [tipo]: { ...actual[tipo], [campo]: valor } }))
  }

  async function alEnviar(tipo: TipoTerapia, evento: FormEvent) {
    evento.preventDefault()
    const solicitud = solicitudes[tipo]
    if (!solicitud.fechaVencimiento) {
      setErroresFecha((actual) => ({ ...actual, [tipo]: true }))
      return
    }
    setErroresFecha((actual) => ({ ...actual, [tipo]: false }))
    setGuardandoTipo(tipo)
    try {
      const vigente = autorizacionesActivas.find((a) => a.tipoTerapia === tipo)
      if (vigente) {
        // idx_autoriz_activa_por_tipo permite a lo sumo una autorizacion activa
        // por (paciente, tipo): hay que desactivar la vigente antes de crear la
        // renovacion, o el POST siguiente responde 409 (autorizacion_activa_duplicada).
        await autorizacionesApi.actualizar(vigente.id, {
          numero: vigente.numero,
          tipoTerapia: vigente.tipoTerapia,
          copago: vigente.copago,
          sesionesTotales: vigente.sesionesTotales,
          fechaVencimiento: vigente.fechaVencimiento,
          activa: false,
        })
      }
      await autorizacionesApi.crear(solicitud)
      await onActualizado()
      setEditando((actual) => ({ ...actual, [tipo]: false }))
      setSolicitudes((actual) => ({ ...actual, [tipo]: solicitudVacia(pacienteId, tipo) }))
    } finally {
      setGuardandoTipo(null)
    }
  }

  return (
    <div className={styles.contenedor}>
      {TIPOS_TERAPIA.map((tipo) => (
        <BloqueAutorizacionTipo
          key={tipo}
          tipo={tipo}
          autorizacion={autorizacionesActivas.find((a) => a.tipoTerapia === tipo) ?? null}
          editando={editando[tipo]}
          solicitud={solicitudes[tipo]}
          guardando={guardandoTipo === tipo}
          errorFechaVencimiento={erroresFecha[tipo]}
          onCambiarCampo={(campo, valor) => actualizarCampo(tipo, campo, valor)}
          onEnviar={(evento) => alEnviar(tipo, evento)}
          onEditar={() => setEditando((actual) => ({ ...actual, [tipo]: true }))}
          onCancelar={() => setEditando((actual) => ({ ...actual, [tipo]: false }))}
        />
      ))}
    </div>
  )
}

interface PropiedadesBloqueAutorizacionTipo {
  tipo: TipoTerapia
  autorizacion: Autorizacion | null
  editando: boolean
  solicitud: SolicitudCrearAutorizacion
  guardando: boolean
  errorFechaVencimiento: boolean
  onCambiarCampo: <K extends keyof SolicitudCrearAutorizacion>(campo: K, valor: SolicitudCrearAutorizacion[K]) => void
  onEnviar: (evento: FormEvent) => void
  onEditar: () => void
  onCancelar: () => void
}

function BloqueAutorizacionTipo({
  tipo,
  autorizacion,
  editando,
  solicitud,
  guardando,
  errorFechaVencimiento,
  onCambiarCampo,
  onEnviar,
  onEditar,
  onCancelar,
}: PropiedadesBloqueAutorizacionTipo) {
  return (
    <div className={styles.bloqueTipo}>
      <span className={styles.etiquetaTipo}>{ETIQUETA_TIPO_TERAPIA[tipo]}</span>

      {editando ? (
        <form onSubmit={onEnviar} className={styles.formulario}>
          <Input
            etiqueta="Número de autorización"
            value={solicitud.numero ?? ''}
            onChange={(e) => onCambiarCampo('numero', e.target.value)}
          />
          <div className={styles.filaCampos}>
            <Input
              etiqueta="Sesiones autorizadas"
              type="number"
              min={1}
              value={solicitud.sesionesTotales}
              onChange={(e) => onCambiarCampo('sesionesTotales', Number(e.target.value))}
              required
            />
            <Input
              etiqueta="Copago por sesión"
              type="number"
              min={0}
              value={solicitud.copago}
              onChange={(e) => onCambiarCampo('copago', Number(e.target.value))}
            />
          </div>
          <SelectorFecha
            etiqueta="Fecha de vencimiento *"
            value={solicitud.fechaVencimiento ?? ''}
            onChange={(valor) => {
              onCambiarCampo('fechaVencimiento', valor)
            }}
          />
          {errorFechaVencimiento && <p className={styles.errorCampo}>La fecha de vencimiento es obligatoria</p>}
          <div className={styles.filaAcciones}>
            {autorizacion && (
              <Boton type="button" tamano="sm" variante="secundario" onClick={onCancelar}>
                Cancelar
              </Boton>
            )}
            <Boton type="submit" tamano="sm" variante="primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar autorización'}
            </Boton>
          </div>
        </form>
      ) : autorizacion ? (
        <TarjetaAutorizacionTipo autorizacion={autorizacion} onRenovar={onEditar} />
      ) : (
        <div className={styles.vacio}>
          <p className={styles.textoVacio}>Sin autorización activa</p>
          <Boton tamano="sm" variante="primario" onClick={onEditar}>
            Registrar autorización
          </Boton>
        </div>
      )}
    </div>
  )
}

function TarjetaAutorizacionTipo({ autorizacion, onRenovar }: { autorizacion: Autorizacion; onRenovar: () => void }) {
  const porcentaje = Math.min(100, Math.round((autorizacion.sesionesUsadas / Math.max(1, autorizacion.sesionesTotales)) * 100))
  const alertaSesiones = autorizacion.sesionesRestantes <= 3

  return (
    <div className={styles.tarjeta}>
      <div className={styles.filaCabecera}>
        <span className={styles.tituloSesiones}>
          Sesiones restantes: {autorizacion.sesionesRestantes} de {autorizacion.sesionesTotales}
        </span>
        <button type="button" onClick={onRenovar} className={styles.botonRenovar}>
          Renovar
        </button>
      </div>
      <div className={styles.pista}>
        <div className={styles.relleno} style={{ '--ancho': `${porcentaje}%` } as CSSProperties} />
      </div>
      {autorizacion.fechaVencimiento && <p className={styles.notaVence}>Vence el {formatearFechaCorta(autorizacion.fechaVencimiento)}</p>}
      {alertaSesiones && (
        <p className={styles.alertaSesiones}>
          <Icono nombre="alerta" tamano={13} grosor={2.1} />
          Quedan pocas sesiones disponibles
        </p>
      )}
    </div>
  )
}
