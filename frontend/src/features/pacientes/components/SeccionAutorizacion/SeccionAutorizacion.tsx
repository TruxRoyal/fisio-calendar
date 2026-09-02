import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Input } from '../../../../shared/components/Input/Input'
import { SelectorFecha } from '../../../../shared/components/SelectorFecha/SelectorFecha'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearFechaCorta, diasHasta } from '../../../../shared/lib/fecha'
import { autorizacionesApi } from '../../api'
import { ErrorPeticion } from '../../../../shared/api/cliente'
import type { Autorizacion, SolicitudCrearAutorizacion } from '../../types'
import type { TipoTerapia } from '../../../../shared/types/comun'
import { ETIQUETA_TIPO_TERAPIA } from '../../../../shared/types/comun'
import styles from './SeccionAutorizacion.module.css'

const TIPOS_TERAPIA: TipoTerapia[] = ['respiratoria', 'fisica']

type ModoEdicion = 'editar' | 'nueva'

interface PropiedadesSeccionAutorizacion {
  pacienteId: number
  autorizacionesActivas: Autorizacion[]
  onActualizado: () => Promise<void>
}

function solicitudVacia(pacienteId: number, tipoTerapia: TipoTerapia): SolicitudCrearAutorizacion {
  return { pacienteId, tipoTerapia, numero: '', copago: 0, sesionesTotales: 10, fechaVencimiento: '' }
}

function solicitudDesdeAutorizacion(autorizacion: Autorizacion): SolicitudCrearAutorizacion {
  return {
    pacienteId: autorizacion.pacienteId,
    tipoTerapia: autorizacion.tipoTerapia,
    numero: autorizacion.numero ?? '',
    copago: autorizacion.copago,
    sesionesTotales: autorizacion.sesionesTotales,
    fechaVencimiento: autorizacion.fechaVencimiento ?? '',
  }
}

function textoBotonGuardar(modo: ModoEdicion, hayAutorizacionVigente: boolean): string {
  if (modo === 'editar') return 'Guardar cambios'
  return hayAutorizacionVigente ? 'Renovar autorización' : 'Registrar autorización'
}

function esVencida(autorizacion: Autorizacion): boolean {
  if (!autorizacion.fechaVencimiento) return false
  return diasHasta(autorizacion.fechaVencimiento) < 0
}

function estadoVacioPorTipo<T>(valor: T): Record<TipoTerapia, T> {
  return Object.fromEntries(TIPOS_TERAPIA.map((tipo) => [tipo, valor])) as Record<TipoTerapia, T>
}

function estadoInicialSolicitudes(pacienteId: number): Record<TipoTerapia, SolicitudCrearAutorizacion> {
  return Object.fromEntries(TIPOS_TERAPIA.map((tipo) => [tipo, solicitudVacia(pacienteId, tipo)])) as Record<
    TipoTerapia,
    SolicitudCrearAutorizacion
  >
}

export function SeccionAutorizacion({ pacienteId, autorizacionesActivas, onActualizado }: PropiedadesSeccionAutorizacion) {
  const [editando, setEditando] = useState<Record<TipoTerapia, boolean>>(() => estadoVacioPorTipo(false))
  const [modo, setModo] = useState<Record<TipoTerapia, ModoEdicion>>(() => estadoVacioPorTipo<ModoEdicion>('nueva'))
  const [solicitudes, setSolicitudes] = useState<Record<TipoTerapia, SolicitudCrearAutorizacion>>(() =>
    estadoInicialSolicitudes(pacienteId),
  )
  const [guardandoTipo, setGuardandoTipo] = useState<TipoTerapia | null>(null)
  const [erroresFecha, setErroresFecha] = useState<Record<TipoTerapia, boolean>>(() => estadoVacioPorTipo(false))
  const [erroresGuardado, setErroresGuardado] = useState<Record<TipoTerapia, string | null>>(() => estadoVacioPorTipo(null))

  useEffect(() => {
    setEditando(estadoVacioPorTipo(false))
    setSolicitudes(estadoInicialSolicitudes(pacienteId))
    setErroresFecha(estadoVacioPorTipo(false))
    setErroresGuardado(estadoVacioPorTipo(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId])

  function actualizarCampo<K extends keyof SolicitudCrearAutorizacion>(
    tipo: TipoTerapia,
    campo: K,
    valor: SolicitudCrearAutorizacion[K],
  ) {
    setSolicitudes((actual) => ({ ...actual, [tipo]: { ...actual[tipo], [campo]: valor } }))
  }

  function abrirEdicion(tipo: TipoTerapia, autorizacion: Autorizacion) {
    setModo((actual) => ({ ...actual, [tipo]: 'editar' }))
    setSolicitudes((actual) => ({ ...actual, [tipo]: solicitudDesdeAutorizacion(autorizacion) }))
    setErroresGuardado((actual) => ({ ...actual, [tipo]: null }))
    setEditando((actual) => ({ ...actual, [tipo]: true }))
  }

  function abrirRegistroONovacion(tipo: TipoTerapia) {
    setModo((actual) => ({ ...actual, [tipo]: 'nueva' }))
    setSolicitudes((actual) => ({ ...actual, [tipo]: solicitudVacia(pacienteId, tipo) }))
    setErroresGuardado((actual) => ({ ...actual, [tipo]: null }))
    setEditando((actual) => ({ ...actual, [tipo]: true }))
  }

  async function alEnviar(tipo: TipoTerapia, evento: FormEvent) {
    evento.preventDefault()
    if (guardandoTipo) return
    const solicitud = solicitudes[tipo]
    if (!solicitud.fechaVencimiento) {
      setErroresFecha((actual) => ({ ...actual, [tipo]: true }))
      return
    }
    setErroresFecha((actual) => ({ ...actual, [tipo]: false }))
    setErroresGuardado((actual) => ({ ...actual, [tipo]: null }))
    setGuardandoTipo(tipo)
    try {
      const vigente = autorizacionesActivas.find((a) => a.tipoTerapia === tipo)
      if (modo[tipo] === 'editar' && vigente) {
        await autorizacionesApi.actualizar(vigente.id, {
          numero: solicitud.numero,
          tipoTerapia: tipo,
          copago: solicitud.copago,
          sesionesTotales: solicitud.sesionesTotales,
          fechaVencimiento: solicitud.fechaVencimiento,
          activa: true,
        })
      } else {
        if (vigente) {
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
      }
      await onActualizado()
      setEditando((actual) => ({ ...actual, [tipo]: false }))
      setSolicitudes((actual) => ({ ...actual, [tipo]: solicitudVacia(pacienteId, tipo) }))
    } catch (err) {
      setErroresGuardado((actual) => ({
        ...actual,
        [tipo]: err instanceof ErrorPeticion ? err.message : 'No se pudo guardar la autorización. Intenta de nuevo.',
      }))
    } finally {
      setGuardandoTipo(null)
    }
  }

  return (
    <div className={styles.contenedor}>
      {TIPOS_TERAPIA.map((tipo) => {
        const autorizacion = autorizacionesActivas.find((a) => a.tipoTerapia === tipo) ?? null
        return (
          <BloqueAutorizacionTipo
            key={tipo}
            tipo={tipo}
            autorizacion={autorizacion}
            vencida={autorizacion ? esVencida(autorizacion) : false}
            editando={editando[tipo]}
            modo={modo[tipo]}
            solicitud={solicitudes[tipo]}
            guardando={guardandoTipo === tipo}
            errorFechaVencimiento={erroresFecha[tipo]}
            errorGuardado={erroresGuardado[tipo]}
            onCambiarCampo={(campo, valor) => actualizarCampo(tipo, campo, valor)}
            onEnviar={(evento) => alEnviar(tipo, evento)}
            onEditar={() => (autorizacion ? abrirEdicion(tipo, autorizacion) : abrirRegistroONovacion(tipo))}
            onRenovar={() => abrirRegistroONovacion(tipo)}
            onCancelar={() => setEditando((actual) => ({ ...actual, [tipo]: false }))}
          />
        )
      })}
    </div>
  )
}

interface PropiedadesBloqueAutorizacionTipo {
  tipo: TipoTerapia
  autorizacion: Autorizacion | null
  vencida: boolean
  editando: boolean
  modo: ModoEdicion
  solicitud: SolicitudCrearAutorizacion
  guardando: boolean
  errorFechaVencimiento: boolean
  errorGuardado: string | null
  onCambiarCampo: <K extends keyof SolicitudCrearAutorizacion>(campo: K, valor: SolicitudCrearAutorizacion[K]) => void
  onEnviar: (evento: FormEvent) => void
  onEditar: () => void
  onRenovar: () => void
  onCancelar: () => void
}

function BloqueAutorizacionTipo({
  tipo,
  autorizacion,
  vencida,
  editando,
  modo,
  solicitud,
  guardando,
  errorFechaVencimiento,
  errorGuardado,
  onCambiarCampo,
  onEnviar,
  onEditar,
  onRenovar,
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
          {errorGuardado && (
            <p className={styles.errorGuardado}>
              <Icono nombre="alerta" tamano={13} grosor={2} />
              {errorGuardado}
            </p>
          )}
          <div className={styles.filaAcciones}>
            {autorizacion && (
              <Boton type="button" tamano="sm" variante="secundario" onClick={onCancelar}>
                Cancelar
              </Boton>
            )}
            <Boton type="submit" tamano="sm" variante="primario" disabled={guardando}>
              {guardando ? 'Guardando…' : textoBotonGuardar(modo, Boolean(autorizacion))}
            </Boton>
          </div>
        </form>
      ) : autorizacion ? (
        <TarjetaAutorizacionTipo autorizacion={autorizacion} vencida={vencida} onEditar={onEditar} onRenovar={onRenovar} />
      ) : (
        <div className={styles.vacio}>
          <p className={styles.textoVacio}>Sin autorización activa</p>
          <Boton tamano="sm" variante="primario" onClick={onRenovar}>
            Registrar autorización
          </Boton>
        </div>
      )}
    </div>
  )
}

function TarjetaAutorizacionTipo({
  autorizacion,
  vencida,
  onEditar,
  onRenovar,
}: {
  autorizacion: Autorizacion
  vencida: boolean
  onEditar: () => void
  onRenovar: () => void
}) {
  const porcentaje = Math.min(100, Math.round((autorizacion.sesionesUsadas / Math.max(1, autorizacion.sesionesTotales)) * 100))
  const alertaSesiones = autorizacion.sesionesRestantes <= 3

  return (
    <div className={styles.tarjeta}>
      <div className={styles.filaCabecera}>
        <span className={styles.tituloSesiones}>
          Sesiones restantes: {autorizacion.sesionesRestantes} de {autorizacion.sesionesTotales}
        </span>
        {vencida ? (
          <button type="button" onClick={onRenovar} className={styles.botonRenovar}>
            Renovar
          </button>
        ) : (
          <button type="button" onClick={onEditar} className={styles.botonRenovar}>
            Editar
          </button>
        )}
      </div>
      <div className={styles.pista}>
        <div className={styles.relleno} style={{ '--ancho': `${porcentaje}%` } as CSSProperties} />
      </div>
      {autorizacion.fechaVencimiento && (
        <p className={vencida ? styles.notaVencida : styles.notaVence}>
          {vencida ? 'Venció el' : 'Vence el'} {formatearFechaCorta(autorizacion.fechaVencimiento)}
        </p>
      )}
      {alertaSesiones && (
        <p className={styles.alertaSesiones}>
          <Icono nombre="alerta" tamano={13} grosor={2.1} />
          Quedan pocas sesiones disponibles
        </p>
      )}
    </div>
  )
}
