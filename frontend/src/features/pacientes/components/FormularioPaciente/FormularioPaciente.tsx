import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../../shared/components/Modal/Modal'
import { Input, TextArea } from '../../../../shared/components/Input/Input'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { COLORES_PACIENTE } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import type { OrigenPaciente, Paciente, SolicitudPaciente } from '../../types'
import type { TipoTerapia } from '../../../../shared/types/comun'
import { ETIQUETA_TIPO_TERAPIA } from '../../../../shared/types/comun'
import styles from './FormularioPaciente.module.css'

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
    fechaNacimiento: '',
    observaciones: '',
    color: null,
    origen: 'trabajo',
    tarifaSesion: null,
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
    fechaNacimiento: paciente.fechaNacimiento ?? '',
    observaciones: paciente.observaciones ?? '',
    color: paciente.color,
    origen: paciente.origen,
    tarifaSesion: paciente.tarifaSesion,
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
    <Modal abierto={abierto} titulo={pacienteInicial ? 'Editar paciente' : 'Nuevo paciente'} onCerrar={onCerrar} ancho="520px">
      <form onSubmit={alEnviar} className={styles.formulario}>
        <Input etiqueta="Nombre completo" value={solicitud.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} required />
        <div className={styles.filaCampos}>
          <Input
            etiqueta="Fecha de nacimiento"
            type="date"
            value={solicitud.fechaNacimiento ?? ''}
            onChange={(e) => actualizarCampo('fechaNacimiento', e.target.value)}
          />
          <Input etiqueta="Teléfono" value={solicitud.telefono ?? ''} onChange={(e) => actualizarCampo('telefono', e.target.value)} />
        </div>
        <Input etiqueta="Dirección" value={solicitud.direccion ?? ''} onChange={(e) => actualizarCampo('direccion', e.target.value)} />
        <div className={styles.filaCampos}>
          <Input etiqueta="Documento" value={solicitud.documento ?? ''} onChange={(e) => actualizarCampo('documento', e.target.value)} />
          <Input etiqueta="EPS" value={solicitud.eps ?? ''} onChange={(e) => actualizarCampo('eps', e.target.value)} />
        </div>
        <div className={styles.grupo}>
          <span className={styles.etiquetaGrupo}>Tipo de terapia</span>
          <div className={styles.filaChips}>
            {(['respiratoria', 'fisica'] as TipoTerapia[]).map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => actualizarCampo('tipoTerapia', tipo)}
                className={cn(styles.chip, solicitud.tipoTerapia === tipo && styles.activo)}
              >
                {ETIQUETA_TIPO_TERAPIA[tipo]}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.grupo}>
          <span className={styles.etiquetaGrupo}>Origen</span>
          <div className={styles.filaChips}>
            {(
              [
                { id: 'trabajo' as OrigenPaciente, etiqueta: 'Del trabajo' },
                { id: 'extra' as OrigenPaciente, etiqueta: 'Extra' },
              ]
            ).map((opcion) => (
              <button
                type="button"
                key={opcion.id}
                onClick={() => actualizarCampo('origen', opcion.id)}
                className={cn(styles.chip, solicitud.origen === opcion.id && styles.activo)}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          {solicitud.origen === 'extra' && (
            <Input
              etiqueta="Tarifa por sesión"
              type="number"
              min={0}
              value={solicitud.tarifaSesion ?? ''}
              onChange={(e) => actualizarCampo('tarifaSesion', e.target.value ? Number(e.target.value) : null)}
              placeholder="Ej. 40000"
              required
            />
          )}
        </div>
        <div className={styles.grupo}>
          <span className={styles.etiquetaGrupo}>Color en el calendario</span>
          <div className={styles.filaColores}>
            <button
              type="button"
              title="Automático (según tipo de terapia)"
              onClick={() => actualizarCampo('color', null)}
              className={cn(styles.colorAuto, !solicitud.color && styles.activo)}
            >
              <Icono nombre="cerrar" tamano={11} grosor={2.4} />
            </button>
            {COLORES_PACIENTE.map((hex) => (
              <button
                type="button"
                key={hex}
                title={hex}
                onClick={() => actualizarCampo('color', hex)}
                className={cn(styles.colorSwatch, solicitud.color === hex && styles.activo)}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
        <TextArea etiqueta="Diagnóstico" value={solicitud.diagnostico ?? ''} onChange={(e) => actualizarCampo('diagnostico', e.target.value)} />
        <TextArea
          etiqueta="Observaciones generales"
          value={solicitud.observaciones ?? ''}
          onChange={(e) => actualizarCampo('observaciones', e.target.value)}
          placeholder="Accesos, acompañante, condiciones especiales…"
        />

        {error && <span className={styles.mensajeError}>{error}</span>}

        <div className={styles.filaAcciones}>
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
