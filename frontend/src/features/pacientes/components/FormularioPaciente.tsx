import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { Input, TextArea } from '../../../shared/components/Input'
import { Boton } from '../../../shared/components/Boton'
import type { Paciente, SolicitudPaciente } from '../types'
import type { TipoTerapia } from '../../../shared/types/comun'

interface PropiedadesFormularioPaciente {
  abierto: boolean
  pacienteInicial?: Paciente | null
  onCerrar: () => void
  onGuardar: (solicitud: SolicitudPaciente) => Promise<void>
}

function solicitudVacia(): SolicitudPaciente {
  return {
    nombre: '',
    direccion: '',
    documento: '',
    telefono: '',
    diagnostico: '',
    eps: '',
    tipoTerapia: 'fisica',
  }
}

function solicitudDesdePaciente(paciente: Paciente): SolicitudPaciente {
  return {
    nombre: paciente.nombre,
    direccion: paciente.direccion ?? '',
    documento: paciente.documento ?? '',
    telefono: paciente.telefono ?? '',
    diagnostico: paciente.diagnostico ?? '',
    eps: paciente.eps ?? '',
    tipoTerapia: paciente.tipoTerapia ?? 'fisica',
    lat: paciente.lat,
    lng: paciente.lng,
  }
}

export function FormularioPaciente({ abierto, pacienteInicial, onCerrar, onGuardar }: PropiedadesFormularioPaciente) {
  const [solicitud, setSolicitud] = useState<SolicitudPaciente>(
    pacienteInicial ? solicitudDesdePaciente(pacienteInicial) : solicitudVacia(),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actualizarCampo<K extends keyof SolicitudPaciente>(campo: K, valor: SolicitudPaciente[K]) {
    setSolicitud((actual) => ({ ...actual, [campo]: valor }))
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(solicitud)
      setSolicitud(solicitudVacia())
      onCerrar()
    } catch {
      setError('No se pudo guardar el paciente. Verifica los datos.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo={pacienteInicial ? 'Editar paciente' : 'Nuevo paciente'}
      onCerrar={onCerrar}
      ancho="520px"
    >
      <form onSubmit={alEnviar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input
          etiqueta="Nombre completo"
          value={solicitud.nombre}
          onChange={(e) => actualizarCampo('nombre', e.target.value)}
          required
        />
        <Input
          etiqueta="Dirección"
          value={solicitud.direccion ?? ''}
          onChange={(e) => actualizarCampo('direccion', e.target.value)}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Input
            etiqueta="Documento"
            value={solicitud.documento ?? ''}
            onChange={(e) => actualizarCampo('documento', e.target.value)}
          />
          <Input
            etiqueta="Teléfono"
            value={solicitud.telefono ?? ''}
            onChange={(e) => actualizarCampo('telefono', e.target.value)}
          />
        </div>
        <Input etiqueta="EPS" value={solicitud.eps ?? ''} onChange={(e) => actualizarCampo('eps', e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>Tipo de terapia</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['respiratoria', 'fisica'] as TipoTerapia[]).map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => actualizarCampo('tipoTerapia', tipo)}
                style={{
                  flex: 1,
                  height: '38px',
                  borderRadius: '10px',
                  border: solicitud.tipoTerapia === tipo ? '1.5px solid var(--ac)' : '1px solid var(--bd)',
                  background: solicitud.tipoTerapia === tipo ? 'var(--acS)' : 'var(--s1)',
                  color: solicitud.tipoTerapia === tipo ? 'var(--acT)' : 'var(--t2)',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>
        <TextArea
          etiqueta="Diagnóstico"
          value={solicitud.diagnostico ?? ''}
          onChange={(e) => actualizarCampo('diagnostico', e.target.value)}
        />

        {error && <span style={{ fontSize: '13px', color: 'var(--dgFg)' }}>{error}</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
