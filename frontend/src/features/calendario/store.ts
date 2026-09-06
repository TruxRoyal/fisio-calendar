import { create } from 'zustand'
import { citasApi } from './api'
import { hoy, inicioSemana, rangoSemana, sumarDias } from '../../shared/lib/fecha'
import type { Cita, SolicitudActualizarCita, SolicitudCambiarEstado, SolicitudCrearCita } from './types'

interface EstadoCalendario {
  citas: Cita[]
  inicioSemanaActual: Date
  cargando: boolean
  cargarSemanaActual: () => Promise<void>
  irSemana: (direccion: -1 | 1) => Promise<void>
  irASemanaDe: (fecha: Date) => Promise<void>
  irHoy: () => Promise<void>
  crearCita: (solicitud: SolicitudCrearCita) => Promise<Cita>
  actualizarCita: (id: number, solicitud: SolicitudActualizarCita) => Promise<Cita>
  cambiarEstadoCita: (id: number, solicitud: SolicitudCambiarEstado) => Promise<Cita>
  eliminarCita: (id: number) => Promise<void>
}

export const useCalendarioStore = create<EstadoCalendario>((set, get) => ({
  citas: [],
  inicioSemanaActual: inicioSemana(hoy()),
  cargando: false,

  cargarSemanaActual: async () => {
    set({ cargando: true })
    const { desde, hasta } = rangoSemana(get().inicioSemanaActual)
    const citas = await citasApi.listarPorRango(desde, hasta)
    set({ citas, cargando: false })
  },

  irSemana: async (direccion) => {
    set((estado) => ({ inicioSemanaActual: sumarDias(estado.inicioSemanaActual, direccion * 7) }))
    await get().cargarSemanaActual()
  },

  irASemanaDe: async (fecha) => {
    set({ inicioSemanaActual: inicioSemana(fecha) })
    await get().cargarSemanaActual()
  },

  irHoy: async () => {
    set({ inicioSemanaActual: inicioSemana(hoy()) })
    await get().cargarSemanaActual()
  },

  crearCita: async (solicitud) => {
    const creada = await citasApi.crear(solicitud)
    set((estado) => ({ citas: [...estado.citas, creada].sort((a, b) => a.inicio.localeCompare(b.inicio)) }))
    return creada
  },

  actualizarCita: async (id, solicitud) => {
    const { cita: actualizada, empujadas } = await citasApi.actualizar(id, solicitud)
    set((estado) => {
      const { desde, hasta } = rangoSemana(estado.inicioSemanaActual)
      const dentroDeSemana = (c: Cita) => {
        const fecha = c.inicio.slice(0, 10)
        return fecha >= desde && fecha <= hasta
      }
      const idsTocados = new Set([actualizada.id, ...empujadas.map((c) => c.id)])
      const sinTocados = estado.citas.filter((cita) => !idsTocados.has(cita.id))
      const tocadosEnSemana = [actualizada, ...empujadas].filter(dentroDeSemana)
      const citas = [...sinTocados, ...tocadosEnSemana].sort((a, b) => a.inicio.localeCompare(b.inicio))
      return { citas }
    })
    return actualizada
  },

  cambiarEstadoCita: async (id, solicitud) => {
    const actualizada = await citasApi.cambiarEstado(id, solicitud)
    set((estado) => ({ citas: estado.citas.map((cita) => (cita.id === id ? actualizada : cita)) }))
    return actualizada
  },

  eliminarCita: async (id) => {
    await citasApi.eliminar(id)
    set((estado) => ({ citas: estado.citas.filter((cita) => cita.id !== id) }))
  },
}))
