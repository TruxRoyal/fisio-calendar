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

  return { verificar, verificando }
}
