import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Input } from '../../../../shared/components/Input/Input'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearFechaCorta } from '../../../../shared/lib/fecha'
import { autorizacionesApi } from '../../api'
import type { AutorizacionResumen, SolicitudCrearAutorizacion } from '../../types'
import styles from './SeccionAutorizacion.module.css'

interface PropiedadesSeccionAutorizacion {
  pacienteId: number
  autorizacionActiva: AutorizacionResumen | null
  onActualizado: () => Promise<void>
}

function solicitudVacia(pacienteId: number): SolicitudCrearAutorizacion {
  return { pacienteId, numero: '', copago: 0, sesionesTotales: 10, fechaVencimiento: '' }
}

export function SeccionAutorizacion({ pacienteId, autorizacionActiva, onActualizado }: PropiedadesSeccionAutorizacion) {
  const [editando, setEditando] = useState(!autorizacionActiva)
  const [solicitud, setSolicitud] = useState<SolicitudCrearAutorizacion>(solicitudVacia(pacienteId))
  const [guardando, setGuardando] = useState(false)

  function actualizarCampo<K extends keyof SolicitudCrearAutorizacion>(campo: K, valor: SolicitudCrearAutorizacion[K]) {
    setSolicitud((actual) => ({ ...actual, [campo]: valor }))
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    try {
      await autorizacionesApi.crear(solicitud)
      await onActualizado()
      setEditando(false)
      setSolicitud(solicitudVacia(pacienteId))
    } finally {
      setGuardando(false)
    }
  }

  if (editando) {
    return (
      <form onSubmit={alEnviar} className={styles.formulario}>
        <Input
          etiqueta="Número de autorización"
          value={solicitud.numero ?? ''}
          onChange={(e) => actualizarCampo('numero', e.target.value)}
        />
        <div className={styles.filaCampos}>
          <Input
            etiqueta="Sesiones autorizadas"
            type="number"
            min={1}
            value={solicitud.sesionesTotales}
            onChange={(e) => actualizarCampo('sesionesTotales', Number(e.target.value))}
            required
          />
          <Input
            etiqueta="Copago por sesión"
            type="number"
            min={0}
            value={solicitud.copago}
            onChange={(e) => actualizarCampo('copago', Number(e.target.value))}
          />
        </div>
        <Input
          etiqueta="Fecha de vencimiento"
          type="date"
          value={solicitud.fechaVencimiento ?? ''}
          onChange={(e) => actualizarCampo('fechaVencimiento', e.target.value)}
        />
        <div className={styles.filaAcciones}>
          <Boton type="button" tamano="sm" variante="secundario" onClick={() => setEditando(false)}>
            Cancelar
          </Boton>
          <Boton type="submit" tamano="sm" variante="primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar autorización'}
          </Boton>
        </div>
      </form>
    )
  }

  if (!autorizacionActiva) {
    return (
      <div className={styles.vacio}>
        <p className={styles.textoVacio}>Sin autorización activa</p>
        <Boton tamano="sm" variante="primario" onClick={() => setEditando(true)}>
          Registrar autorización
        </Boton>
      </div>
    )
  }

  const porcentaje = Math.min(
    100,
    Math.round((autorizacionActiva.sesionesUsadas / Math.max(1, autorizacionActiva.sesionesTotales)) * 100),
  )
  const alertaSesiones = autorizacionActiva.sesionesRestantes <= 3

  return (
    <div className={styles.tarjeta}>
      <div className={styles.filaCabecera}>
        <span className={styles.tituloSesiones}>
          Sesiones restantes: {autorizacionActiva.sesionesRestantes} de {autorizacionActiva.sesionesTotales}
        </span>
        <button type="button" onClick={() => setEditando(true)} className={styles.botonRenovar}>
          Renovar
        </button>
      </div>
      <div className={styles.pista}>
        <div className={styles.relleno} style={{ '--ancho': `${porcentaje}%` } as CSSProperties} />
      </div>
      {autorizacionActiva.fechaVencimiento && (
        <p className={styles.notaVence}>Vence el {formatearFechaCorta(autorizacionActiva.fechaVencimiento)}</p>
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
