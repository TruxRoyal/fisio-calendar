import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../theme/useTheme'
import type { IdTema } from '../theme/paletas'

const ITEMS_NAV = [
  { ruta: '/calendario', etiqueta: 'Calendario', icono: '🗓️' },
  { ruta: '/pacientes', etiqueta: 'Pacientes', icono: '🧑‍🦳' },
  { ruta: '/resumen', etiqueta: 'Resumen', icono: '💰' },
  { ruta: '/mapa', etiqueta: 'Mapa del día', icono: '📍' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}>
      <aside
        style={{
          width: '232px',
          flex: '0 0 232px',
          borderRight: '1px solid var(--bd)',
          background: 'var(--s1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px', marginBottom: '24px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--ac)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--acFg)',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,.18)',
            }}
          >
            F
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Fisio App</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          {ITEMS_NAV.map((item) => (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '40px',
                padding: '0 12px',
                borderRadius: '11px',
                fontSize: '14px',
                fontWeight: 600,
                color: isActive ? 'var(--acT)' : 'var(--t3)',
                background: isActive ? 'var(--acS)' : 'transparent',
              })}
            >
              <span aria-hidden>{item.icono}</span>
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>

        <SelectorTema />
      </aside>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</main>
    </div>
  )
}

function SelectorTema() {
  const { idTema, oscuro, cambiarTema, alternarOscuro, temasDisponibles } = useTheme()

  return (
    <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '14px', marginTop: '14px' }}>
      <div style={{ display: 'flex', gap: '7px', marginBottom: '10px' }}>
        {(Object.keys(temasDisponibles) as IdTema[]).map((id) => (
          <button
            key={id}
            title={temasDisponibles[id].nombre}
            onClick={() => cambiarTema(id)}
            aria-label={`Tema ${temasDisponibles[id].nombre}`}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '99px',
              background: temasDisponibles[id].ac,
              border: id === idTema ? '2px solid var(--t1)' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <button
        onClick={alternarOscuro}
        style={{
          width: '100%',
          height: '36px',
          borderRadius: '10px',
          border: '1px solid var(--bd)',
          background: 'var(--s2)',
          color: 'var(--t2)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {oscuro ? '☀️ Modo claro' : '🌙 Modo oscuro'}
      </button>
    </div>
  )
}
