import { useState } from 'react'
import { useCalendarioStore } from '../store'
import { useDeteccionChoque } from './useDeteccionChoque'
import { sumarMinutos } from '../../../shared/lib/fecha'
import type { Cita, CitaBorrador, EstadoCita, PacienteBusqueda } from '../types'

const DURACION_DEFECTO = 30

export function citaBorradorVacia(inicio: string): CitaBorrador {
  return {
    id: 0,
    pacienteId: 0,
    autorizacionId: null,
    inicio,
    fin: sumarMinutos(inicio, DURACION_DEFECTO),
    estado: 'agendada',
    valorSesion: null,
    copagoCobrado: 0,
    notas: null,
    paciente: { id: 0, nombre: '', tipoTerapia: null },
  }
}

export function useGestionCita() {
  const crearCita = useCalendarioStore((estado) => estado.crearCita)
  const actualizarCita = useCalendarioStore((estado) => estado.actualizarCita)
  const cambiarEstadoCita = useCalendarioStore((estado) => estado.cambiarEstadoCita)
  const { verificar } = useDeteccionChoque()
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaBorrador | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  function abrirCitaExistente(cita: Cita) {
    setCitaSeleccionada({
      id: cita.id,
      pacienteId: cita.pacienteId,
      autorizacionId: cita.autorizacionId,
      inicio: cita.inicio,
      fin: cita.fin,
      estado: cita.estado,
      valorSesion: cita.valorSesion,
      copagoCobrado: cita.copagoCobrado,
      notas: cita.notas,
      paciente: { id: cita.paciente.id, nombre: cita.paciente.nombre, tipoTerapia: cita.paciente.tipoTerapia, color: cita.paciente.color },
    })
  }

  function abrirCitaNueva(inicio: string) {
    setCitaSeleccionada(citaBorradorVacia(inicio))
  }

  function abrirCitaParaPaciente(inicio: string, paciente: PacienteBusqueda) {
    setCitaSeleccionada({
      ...citaBorradorVacia(inicio),
      pacienteId: paciente.id,
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        tipoTerapia: paciente.tipoTerapia,
        direccion: paciente.direccion,
        color: paciente.color,
      },
    })
  }

  function cerrarDrawer() {
    setCitaSeleccionada(null)
  }

  async function onCrear(solicitud: { pacienteId: number; inicio: string; fin: string; notas?: string | null }) {
    const conflicto = await verificar(solicitud.inicio, solicitud.fin)
    if (conflicto) {
      setMensajeError('Esta cita choca con otra existente.')
      return false
    }
    await crearCita(solicitud)
    return true
  }

  async function onGuardarCampos(id: number, cambios: { inicio: string; fin: string; notas: string | null }) {
    const conflicto = await verificar(cambios.inicio, cambios.fin, id)
    if (conflicto) {
      setMensajeError('Esta cita choca con otra existente.')
      return
    }
    const actualizada = await actualizarCita(id, {
      inicio: cambios.inicio,
      fin: cambios.fin,
      autorizacionId: citaSeleccionada?.autorizacionId ?? null,
      notas: cambios.notas,
    })
    setCitaSeleccionada((actual) => (actual ? { ...actual, inicio: actualizada.inicio, fin: actualizada.fin, notas: actualizada.notas } : actual))
  }

  async function onCambiarEstado(estado: EstadoCita) {
    if (!citaSeleccionada) return
    const actualizada = await cambiarEstadoCita(citaSeleccionada.id, { estado })
    setCitaSeleccionada((actual) =>
      actual ? { ...actual, estado: actualizada.estado, valorSesion: actualizada.valorSesion, copagoCobrado: actualizada.copagoCobrado } : actual,
    )
  }

  async function onActualizarCopago(id: number, copago: number) {
    if (!citaSeleccionada) return
    const actualizada = await cambiarEstadoCita(id, { estado: citaSeleccionada.estado, copagoCobrado: copago })
    setCitaSeleccionada((actual) => (actual ? { ...actual, copagoCobrado: actualizada.copagoCobrado } : actual))
  }

  return {
    citaSeleccionada,
    abrirCitaExistente,
    abrirCitaNueva,
    abrirCitaParaPaciente,
    cerrarDrawer,
    onCrear,
    onGuardarCampos,
    onCambiarEstado,
    onActualizarCopago,
    mensajeError,
    setMensajeError,
    verificar,
    actualizarCita,
  }
}
