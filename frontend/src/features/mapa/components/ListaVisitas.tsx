import { formatearHora } from '../../../shared/lib/fecha'
import { Boton } from '../../../shared/components/Boton'
import type { VisitaDia } from '../types'

interface PropiedadesListaVisitas {
  visitas: VisitaDia[]
  visitaSeleccionada: number | null
  onSeleccionar: (citaId: number) => void
  onGeocodificar: (visita: VisitaDia) => void
  geocodificandoId: number | null
}

const ESTILO_ESTADO: Record<VisitaDia['estado'], { fg: string; bg: string }> = {
  agendada: { fg: 'var(--t2)', bg: 'var(--s3)' },
  atendida: { fg: 'var(--okFg)', bg: 'var(--okBg)' },
  cancelada: { fg: 'var(--t3)', bg: 'var(--s2)' },
}

export function ListaVisitas({
  visitas,
  visitaSeleccionada,
  onSeleccionar,
  onGeocodificar,
  geocodificandoId,
}: PropiedadesListaVisitas) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', padding: '16px', width: '300px', flex: '0 0 300px' }}>
      {visitas.map((visita) => {
        const estilo = ESTILO_ESTADO[visita.estado]
        const activa = visitaSeleccionada === visita.citaId

        return (
          <button
            key={visita.citaId}
            type="button"
            onClick={() => onSeleccionar(visita.citaId)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '12px',
              borderRadius: '13px',
              border: activa ? '1.5px solid var(--ac)' : '1px solid var(--bd)',
              background: activa ? 'var(--acS)' : 'var(--s1)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--t1)' }}>
                {formatearHora(visita.hora)}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: estilo.fg,
                  background: estilo.bg,
                  borderRadius: '99px',
                  padding: '2px 8px',
                }}
              >
                {visita.estado}
              </span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{visita.pacienteNombre}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--t3)' }}>{visita.direccion ?? 'Sin dirección registrada'}</span>
            {visita.lat === null && visita.direccion && (
              <Boton
                tamano="sm"
                variante="secundario"
                disabled={geocodificandoId === visita.pacienteId}
                onClick={(evento) => {
                  evento.stopPropagation()
                  onGeocodificar(visita)
                }}
              >
                {geocodificandoId === visita.pacienteId ? 'Ubicando…' : 'Ubicar en el mapa'}
              </Boton>
            )}
          </button>
        )
      })}
      {visitas.length === 0 && (
        <p style={{ color: 'var(--t3)', fontSize: '13.5px' }}>No hay visitas programadas para hoy</p>
      )}
    </div>
  )
}
