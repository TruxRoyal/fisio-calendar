import { useState } from 'react'
import { Boton } from '../../../shared/components/Boton'
import { usePacientesStore } from '../store'
import { FormularioPaciente } from './FormularioPaciente'
import { SeccionAutorizacion } from './SeccionAutorizacion'
import { TIPO_TERAPIA_COLOR } from '../../../shared/theme/paletas'
import type { PacienteDetalle } from '../types'

interface PropiedadesFichaPaciente {
  paciente: PacienteDetalle
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function FichaPaciente({ paciente }: PropiedadesFichaPaciente) {
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const actualizarPaciente = usePacientesStore((estado) => estado.actualizarPaciente)
  const eliminarPaciente = usePacientesStore((estado) => estado.eliminarPaciente)
  const seleccionarPaciente = usePacientesStore((estado) => estado.seleccionarPaciente)

  const colorTipo = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null

  async function confirmarEliminacion() {
    if (!window.confirm(`¿Eliminar a ${paciente.nombre}? Esta acción no se puede deshacer.`)) return
    await eliminarPaciente(paciente.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            flex: '0 0 56px',
            borderRadius: '16px',
            background: 'var(--acS2)',
            color: 'var(--acT)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px',
            fontWeight: 700,
          }}
        >
          {iniciales(paciente.nombre)}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--t1)' }}>{paciente.nombre}</h2>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
            {colorTipo && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 9px',
                  borderRadius: '99px',
                  color: colorTipo.fg,
                  background: colorTipo.bg,
                  border: `1px solid ${colorTipo.bd}`,
                  textTransform: 'capitalize',
                }}
              >
                {paciente.tipoTerapia}
              </span>
            )}
            {paciente.eps && <span style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{paciente.eps}</span>}
          </div>
        </div>
        <Boton tamano="sm" variante="secundario" onClick={() => setFormularioAbierto(true)}>
          Editar
        </Boton>
      </div>

      <SeccionAutorizacion
        pacienteId={paciente.id}
        autorizacionActiva={paciente.autorizacionActiva}
        onActualizado={() => seleccionarPaciente(paciente.id)}
      />

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: 0 }}>
        <CampoDato etiqueta="Documento" valor={paciente.documento} />
        <CampoDato etiqueta="Teléfono" valor={paciente.telefono} />
        <CampoDato etiqueta="Dirección" valor={paciente.direccion} ancho />
        <CampoDato etiqueta="Diagnóstico" valor={paciente.diagnostico} ancho />
      </dl>

      <Boton variante="peligro" tamano="sm" onClick={confirmarEliminacion} style={{ alignSelf: 'flex-start' }}>
        Eliminar paciente
      </Boton>

      <FormularioPaciente
        abierto={formularioAbierto}
        pacienteInicial={paciente}
        onCerrar={() => setFormularioAbierto(false)}
        onGuardar={async (solicitud) => {
          await actualizarPaciente(paciente.id, solicitud)
        }}
      />
    </div>
  )
}

function CampoDato({ etiqueta, valor, ancho }: { etiqueta: string; valor: string | null; ancho?: boolean }) {
  return (
    <div style={{ gridColumn: ancho ? 'span 2' : undefined }}>
      <dt style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--t3)' }}>
        {etiqueta}
      </dt>
      <dd style={{ margin: '3px 0 0', fontSize: '14px', color: 'var(--t1)' }}>{valor || '—'}</dd>
    </div>
  )
}
