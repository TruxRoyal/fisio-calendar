import type { MouseEvent } from 'react'
import { formatearHora } from '../../../shared/lib/fecha'
import { TIPO_TERAPIA_COLOR } from '../../../shared/theme/paletas'
import type { Cita } from '../types'

interface PropiedadesBloqueCita {
  cita: Cita
  top: number
  altura: number
  enConflicto: boolean
  onAbrir: () => void
  onIniciarArrastre: (evento: MouseEvent<HTMLDivElement>) => void
  onIniciarRedimension: (evento: MouseEvent<HTMLDivElement>) => void
}

const ESTILO_ESTADO: Record<Cita['estado'], { bg: string; bd: string; fg: string; opacidad: number }> = {
  agendada: { bg: 'var(--s1)', bd: 'var(--bd2)', fg: 'var(--t1)', opacidad: 1 },
  atendida: { bg: 'var(--dnBg)', bd: 'var(--dnBd)', fg: 'var(--t2)', opacidad: 1 },
  cancelada: { bg: 'var(--s2)', bd: 'var(--bd)', fg: 'var(--t3)', opacidad: 0.65 },
}

export function BloqueCita({
  cita,
  top,
  altura,
  enConflicto,
  onAbrir,
  onIniciarArrastre,
  onIniciarRedimension,
}: PropiedadesBloqueCita) {
  const colorTipo = cita.paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[cita.paciente.tipoTerapia] : null
  const estilo = ESTILO_ESTADO[cita.estado]

  return (
    <div
      onClick={onAbrir}
      onMouseDown={(evento) => {
        if (cita.estado !== 'cancelada') onIniciarArrastre(evento)
      }}
      style={{
        position: 'absolute',
        top,
        height: Math.max(altura, 24),
        left: 4,
        right: 4,
        borderRadius: '8px',
        background: estilo.bg,
        border: `1px solid ${enConflicto ? 'var(--dgFg)' : estilo.bd}`,
        borderLeft: `3px solid ${colorTipo?.fg ?? 'var(--ac)'}`,
        opacity: estilo.opacidad,
        padding: '4px 7px',
        overflow: 'hidden',
        cursor: cita.estado === 'cancelada' ? 'pointer' : 'grab',
        boxShadow: enConflicto ? '0 0 0 2px var(--dgFg)' : 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, color: estilo.fg }}>
        {formatearHora(cita.inicio)}–{formatearHora(cita.fin)}
      </div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: estilo.fg,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cita.paciente.nombre}
      </div>
      {altura > 46 && cita.estado !== 'cancelada' && (
        <div
          onMouseDown={(evento) => {
            evento.stopPropagation()
            onIniciarRedimension(evento)
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            cursor: 'ns-resize',
          }}
        />
      )}
    </div>
  )
}
