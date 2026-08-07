import { useEffect, useState } from 'react'
import { pacientesBusquedaApi } from '../api'
import { TIPO_TERAPIA_COLOR } from '../../../shared/theme/paletas'
import type { PacienteBusqueda } from '../types'

interface PropiedadesPanelPacientes {
  onSeleccionarPaciente: (paciente: PacienteBusqueda) => void
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function PanelPacientes({ onSeleccionarPaciente }: PropiedadesPanelPacientes) {
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<PacienteBusqueda[]>([])

  useEffect(() => {
    pacientesBusquedaApi.listar(busqueda).then(setPacientes)
  }, [busqueda])

  return (
    <aside
      style={{
        width: '260px',
        flex: '0 0 260px',
        borderLeft: '1px solid var(--bd)',
        background: 'var(--s1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar paciente…"
        style={{
          width: '100%',
          height: '38px',
          border: '1px solid var(--bd)',
          borderRadius: '11px',
          padding: '0 12px',
          fontSize: '13.5px',
          background: 'var(--bg)',
          color: 'var(--t1)',
          outline: 'none',
          marginBottom: '12px',
        }}
      />
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {pacientes.map((paciente) => {
          const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
          return (
            <button
              key={paciente.id}
              type="button"
              onClick={() => onSeleccionarPaciente(paciente)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '11px',
                border: '1px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--s2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  flex: '0 0 34px',
                  borderRadius: '10px',
                  background: color?.bg ?? 'var(--s3)',
                  color: color?.fg ?? 'var(--t3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12.5px',
                  fontWeight: 700,
                }}
              >
                {iniciales(paciente.nombre)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--t1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {paciente.nombre}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--t3)' }}>{paciente.eps ?? 'Particular'}</div>
              </div>
            </button>
          )
        })}
        {pacientes.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--t3)', textAlign: 'center', marginTop: '20px' }}>
            No hay pacientes que coincidan
          </p>
        )}
      </div>
    </aside>
  )
}
