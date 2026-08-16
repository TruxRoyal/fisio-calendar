import { useMediaQuery } from './useMediaQuery'

export const PUNTO_QUIEBRE_MOVIL = 768

export function useEsMovil(): boolean {
  return useMediaQuery(`(max-width: ${PUNTO_QUIEBRE_MOVIL}px)`)
}
