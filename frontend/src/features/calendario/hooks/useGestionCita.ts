import { useState } from 'react'
import { useCalendarioStore } from '../store'
import { useDeteccionChoque } from './useDeteccionChoque'
import { sumarMinutos } from '../../../shared/lib/fecha'
import { ErrorPeticion } from '../../../shared/api/cliente'
import type { TipoTerapia } from '../../../shared/types/comun'
import type { Cita, CitaBorrador, EstadoCita, PacienteBusqueda } from '../types'

const DURACION_DEFECTO = 30
const TIPO_TERAPIA_DEFECTO: TipoTerapia = 'fisica'

// citaBorradorVacia acepta un tipoTerapia opcional (por defecto 'fisica',
// igual al backfill de la migracion 0005) para que abrirCitaParaPaciente
// pueda sembrar el tipo preferido del paciente elegido; abrirCitaNueva (sin
// paciente aun conocido) usa el valor por defecto.
export function citaBorradorVacia(inicio: string, tipoTerapia: TipoTerapia = TIPO_TERAPIA_DEFECTO): CitaBorrador {
  return {
    id: 0,
    pacienteId: 0,
    autorizacionId: null,
    tipoTerapia,
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
  // advertencias transporta Cita.advertencias (respuesta transitoria de
  // Crear/Actualizar cuando no hay autorizacion activa del tipo de la cita;
  // ver spec "advertencia-sin-autorizacion"). DrawerCita (Work Unit 6) la
  // renderiza como banner no bloqueante.
  const [advertencias, setAdvertencias] = useState<string[]>([])

  function abrirCitaExistente(cita: Cita) {
    setAdvertencias([])
    setCitaSeleccionada({
      id: cita.id,
      pacienteId: cita.pacienteId,
      autorizacionId: cita.autorizacionId,
      tipoTerapia: cita.tipoTerapia,
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
    setAdvertencias([])
    setCitaSeleccionada(citaBorradorVacia(inicio))
  }

  function abrirCitaParaPaciente(inicio: string, paciente: PacienteBusqueda) {
    setAdvertencias([])
    setCitaSeleccionada({
      ...citaBorradorVacia(inicio, paciente.tipoTerapia ?? TIPO_TERAPIA_DEFECTO),
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
    setAdvertencias([])
  }

  async function onCrear(solicitud: { pacienteId: number; tipoTerapia: TipoTerapia; inicio: string; fin: string; notas?: string | null }) {
    const conflicto = await verificar(solicitud.inicio, solicitud.fin)
    if (conflicto) {
      setMensajeError('Esta cita choca con otra existente.')
      return false
    }
    try {
      const creada = await crearCita(solicitud)
      setAdvertencias(creada.advertencias ?? [])
      return true
    } catch (error) {
      if (error instanceof ErrorPeticion) setMensajeError(error.message)
      return false
    }
  }

  async function onGuardarCampos(id: number, cambios: { inicio: string; fin: string; tipoTerapia: TipoTerapia; notas: string | null }) {
    const conflicto = await verificar(cambios.inicio, cambios.fin, id)
    if (conflicto) {
      setMensajeError('Esta cita choca con otra existente.')
      return false
    }
    try {
      const actualizada = await actualizarCita(id, {
        inicio: cambios.inicio,
        fin: cambios.fin,
        autorizacionId: citaSeleccionada?.autorizacionId ?? null,
        tipoTerapia: cambios.tipoTerapia,
        notas: cambios.notas,
      })
      setAdvertencias(actualizada.advertencias ?? [])
      setCitaSeleccionada((actual) =>
        actual ? { ...actual, inicio: actualizada.inicio, fin: actualizada.fin, tipoTerapia: actualizada.tipoTerapia, notas: actualizada.notas } : actual,
      )
      return true
    } catch (error) {
      if (error instanceof ErrorPeticion) setMensajeError(error.message)
      return false
    }
  }

  async function onCambiarEstado(estado: EstadoCita) {
    if (!citaSeleccionada) return
    try {
      const actualizada = await cambiarEstadoCita(citaSeleccionada.id, { estado })
      setCitaSeleccionada((actual) =>
        actual ? { ...actual, estado: actualizada.estado, valorSesion: actualizada.valorSesion, copagoCobrado: actualizada.copagoCobrado } : actual,
      )
    } catch (error) {
      if (error instanceof ErrorPeticion) setMensajeError(error.message)
    }
  }

  async function onActualizarCopago(id: number, copago: number) {
    if (!citaSeleccionada) return
    try {
      const actualizada = await cambiarEstadoCita(id, { estado: citaSeleccionada.estado, copagoCobrado: copago })
      setCitaSeleccionada((actual) => (actual ? { ...actual, copagoCobrado: actualizada.copagoCobrado } : actual))
    } catch (error) {
      if (error instanceof ErrorPeticion) setMensajeError(error.message)
    }
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
    advertencias,
    verificar,
    actualizarCita,
  }
}
