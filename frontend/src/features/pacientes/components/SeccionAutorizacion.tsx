import { useState } from 'react'
import type { FormEvent } from 'react'
import { Input } from '../../../shared/components/Input'
import { Boton } from '../../../shared/components/Boton'
import { formatearFechaCorta } from '../../../shared/lib/fecha'
import { autorizacionesApi } from '../api'
import type { AutorizacionResumen, SolicitudCrearAutorizacion } from '../types'

interface PropiedadesSeccionAutorizacion {
  pacienteId: number
  autorizacionActiva: AutorizacionResumen | null
  onActualizado: () => Promise<void>
}

function solicitudVacia(pacienteId: number): SolicitudCrearAutorizacion {
  return { pacienteId, numero: '', copago: 0, sesionesTotales: 10, fechaVencimiento: '' }
}

export function SeccionAutorizacion({ pacienteId, autorizacionActiva, onActualizado }: PropiedadesSeccionAutorizacion) {
  const [editando, setEditando] = useState(false)
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
      <form
        onSubmit={alEnviar}
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--bd)',
          borderRadius: '14px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <Input
          etiqueta="Número de autorización"
          value={solicitud.numero ?? ''}
          onChange={(e) => actualizarCampo('numero', e.target.value)}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
      <div
        style={{
          background: 'var(--s2)',
          border: '1px dashed var(--bd2)',
          borderRadius: '14px',
          padding: '16px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 10px', fontSize: '13.5px', color: 'var(--t3)' }}>Sin autorización activa</p>
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
    <div style={{ background: 'var(--acS)', border: '1px solid var(--acL)', borderRadius: '14px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--acT)' }}>
          Sesiones restantes: {autorizacionActiva.sesionesRestantes} de {autorizacionActiva.sesionesTotales}
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          style={{ border: 'none', background: 'transparent', color: 'var(--acT)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
        >
          Renovar
        </button>
      </div>
      <div style={{ height: '6px', borderRadius: '99px', background: 'var(--s4)', marginTop: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${porcentaje}%`, background: 'var(--acD)', borderRadius: '99px' }} />
      </div>
      {autorizacionActiva.fechaVencimiento && (
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--acT)' }}>
          Vence el {formatearFechaCorta(autorizacionActiva.fechaVencimiento)}
        </p>
      )}
      {alertaSesiones && (
        <p style={{ margin: '8px 0 0', fontSize: '12.5px', fontWeight: 600, color: 'var(--wrFg)' }}>
          ⚠ Quedan pocas sesiones disponibles
        </p>
      )}
    </div>
  )
}
