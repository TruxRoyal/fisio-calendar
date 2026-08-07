import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './shared/components/Layout'
import { Boton } from './shared/components/Boton'
import { VistaSemanal } from './features/calendario/components/VistaSemanal'
import { usePacientes } from './features/pacientes/hooks/usePacientes'
import { usePacientesStore } from './features/pacientes/store'
import { FichaPaciente } from './features/pacientes/components/FichaPaciente'
import { FormularioPaciente } from './features/pacientes/components/FormularioPaciente'
import { ResumenMensual } from './features/resumen/components/ResumenMensual'
import { MapaDia } from './features/mapa/components/MapaDia'
import { ListaVisitas } from './features/mapa/components/ListaVisitas'
import { useGeocodificacion } from './features/mapa/hooks/useGeocodificacion'
import { mapaApi } from './features/mapa/api'
import { hoyISO } from './shared/lib/fecha'
import { TIPO_TERAPIA_COLOR } from './shared/theme/paletas'
import type { VisitaDia } from './features/mapa/types'

function PaginaPacientes() {
  const { pacientes, busqueda, buscar } = usePacientes()
  const seleccionado = usePacientesStore((estado) => estado.seleccionado)
  const seleccionarPaciente = usePacientesStore((estado) => estado.seleccionarPaciente)
  const crearPaciente = usePacientesStore((estado) => estado.crearPaciente)
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: '320px', flex: '0 0 320px', borderRight: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={busqueda}
            onChange={(e) => buscar(e.target.value)}
            placeholder="Buscar paciente…"
            style={{
              flex: 1,
              height: '38px',
              border: '1px solid var(--bd)',
              borderRadius: '11px',
              padding: '0 12px',
              fontSize: '13.5px',
              background: 'var(--bg)',
              color: 'var(--t1)',
              outline: 'none',
            }}
          />
          <Boton tamano="sm" variante="primario" onClick={() => setFormularioAbierto(true)}>
            + Nuevo
          </Boton>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pacientes.map((paciente) => {
            const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
            return (
              <button
                key={paciente.id}
                type="button"
                onClick={() => seleccionarPaciente(paciente.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  padding: '10px 12px',
                  borderRadius: '11px',
                  border: seleccionado?.id === paciente.id ? '1.5px solid var(--ac)' : '1px solid var(--bd)',
                  background: seleccionado?.id === paciente.id ? 'var(--acS)' : 'var(--s1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--t1)' }}>{paciente.nombre}</span>
                <span style={{ fontSize: '11.5px', color: color?.fg ?? 'var(--t3)' }}>
                  {paciente.tipoTerapia ?? 'Sin tipo'} · {paciente.eps ?? 'Particular'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {seleccionado ? (
          <FichaPaciente paciente={seleccionado} />
        ) : (
          <p style={{ color: 'var(--t3)' }}>Selecciona un paciente de la lista o crea uno nuevo.</p>
        )}
      </div>

      <FormularioPaciente
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        onGuardar={async (solicitud) => {
          await crearPaciente(solicitud)
        }}
      />
    </div>
  )
}

function PaginaMapa() {
  const [visitas, setVisitas] = useState<VisitaDia[]>([])
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<number | null>(null)
  const { geocodificar, geocodificandoId } = useGeocodificacion()

  async function cargarVisitas() {
    const datos = await mapaApi.obtenerVisitasDelDia(hoyISO())
    setVisitas(datos)
  }

  useEffect(() => {
    cargarVisitas()
  }, [])

  async function alGeocodificar(visita: VisitaDia) {
    if (!visita.direccion) return
    const coordenadas = await geocodificar(visita.pacienteId, visita.direccion)
    if (coordenadas) await cargarVisitas()
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <ListaVisitas
        visitas={visitas}
        visitaSeleccionada={visitaSeleccionada}
        onSeleccionar={setVisitaSeleccionada}
        onGeocodificar={alGeocodificar}
        geocodificandoId={geocodificandoId}
      />
      <MapaDia visitas={visitas} visitaSeleccionada={visitaSeleccionada} onSeleccionarMarcador={setVisitaSeleccionada} />
    </div>
  )
}

export function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/calendario" replace />} />
          <Route path="/calendario" element={<VistaSemanal />} />
          <Route path="/pacientes" element={<PaginaPacientes />} />
          <Route path="/resumen" element={<ResumenMensual />} />
          <Route path="/mapa" element={<PaginaMapa />} />
        </Routes>
      </Layout>
    </Router>
  )
}
