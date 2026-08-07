import { useEffect } from 'react'
import { usePacientesStore } from '../store'

export function usePacientes() {
  const pacientes = usePacientesStore((estado) => estado.pacientes)
  const cargando = usePacientesStore((estado) => estado.cargando)
  const busqueda = usePacientesStore((estado) => estado.busqueda)
  const buscar = usePacientesStore((estado) => estado.buscar)
  const cargarPacientes = usePacientesStore((estado) => estado.cargarPacientes)

  useEffect(() => {
    cargarPacientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { pacientes, cargando, busqueda, buscar }
}
