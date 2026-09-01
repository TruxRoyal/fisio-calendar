import { useEffect } from 'react'
import { useCalendarioStore } from '../store'

export function useCitas() {
  const citas = useCalendarioStore((estado) => estado.citas)
  const cargando = useCalendarioStore((estado) => estado.cargando)
  const inicioSemanaActual = useCalendarioStore((estado) => estado.inicioSemanaActual)
  const cargarSemanaActual = useCalendarioStore((estado) => estado.cargarSemanaActual)
  const irSemana = useCalendarioStore((estado) => estado.irSemana)
  const irASemanaDe = useCalendarioStore((estado) => estado.irASemanaDe)
  const irHoy = useCalendarioStore((estado) => estado.irHoy)

  useEffect(() => {
    cargarSemanaActual()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { citas, cargando, inicioSemanaActual, irSemana, irASemanaDe, irHoy }
}
