import { useCallback, useState } from 'react'
import { citasApi } from '../api'
import type { Conflicto } from '../types'

export function useDeteccionChoque() {
  const [verificando, setVerificando] = useState(false)

  const verificar = useCallback(
    async (inicio: string, fin: string, excluirCitaId?: number): Promise<Conflicto | null> => {
      setVerificando(true)
      try {
        const respuesta = await citasApi.verificarChoque(inicio, fin, excluirCitaId)
        return respuesta.conflicto
      } finally {
        setVerificando(false)
      }
    },
    [],
  )

  const planificar = useCallback(async (id: number, inicio: string, fin: string) => {
    setVerificando(true)
    try {
      return await citasApi.planificarMovimiento(id, inicio, fin)
    } finally {
      setVerificando(false)
    }
  }, [])

  return { verificar, planificar, verificando }
}
