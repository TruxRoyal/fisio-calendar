import { create } from 'zustand'
import { pacientesApi } from './api'
import type { Paciente, PacienteDetalle, SolicitudPaciente } from './types'

interface EstadoPacientes {
  pacientes: Paciente[]
  seleccionado: PacienteDetalle | null
  cargando: boolean
  busqueda: string
  cargarPacientes: () => Promise<void>
  buscar: (texto: string) => void
  seleccionarPaciente: (id: number) => Promise<void>
  limpiarSeleccion: () => void
  crearPaciente: (solicitud: SolicitudPaciente) => Promise<Paciente>
  actualizarPaciente: (id: number, solicitud: SolicitudPaciente) => Promise<Paciente>
  eliminarPaciente: (id: number) => Promise<void>
}

let tokenSeleccion = 0

export const usePacientesStore = create<EstadoPacientes>((set, get) => ({
  pacientes: [],
  seleccionado: null,
  cargando: false,
  busqueda: '',

  cargarPacientes: async () => {
    set({ cargando: true })
    const pacientes = await pacientesApi.listar(get().busqueda)
    set({ pacientes, cargando: false })
  },

  buscar: (texto) => {
    set({ busqueda: texto })
    get().cargarPacientes()
  },

  seleccionarPaciente: async (id) => {
    const token = ++tokenSeleccion
    const detalle = await pacientesApi.obtener(id)
    if (token !== tokenSeleccion) return
    set({ seleccionado: detalle })
  },

  limpiarSeleccion: () => set({ seleccionado: null }),

  crearPaciente: async (solicitud) => {
    const creado = await pacientesApi.crear(solicitud)
    await get().cargarPacientes()
    return creado
  },

  actualizarPaciente: async (id, solicitud) => {
    const actualizado = await pacientesApi.actualizar(id, solicitud)
    await get().cargarPacientes()
    if (get().seleccionado?.id === id) {
      await get().seleccionarPaciente(id)
    }
    return actualizado
  },

  eliminarPaciente: async (id) => {
    await pacientesApi.eliminar(id)
    await get().cargarPacientes()
    if (get().seleccionado?.id === id) {
      set({ seleccionado: null })
    }
  },
}))
