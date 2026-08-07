import { useContext } from 'react'
import { ContextoTemaReact } from './ThemeProvider'

export function useTheme() {
  const contexto = useContext(ContextoTemaReact)
  if (!contexto) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return contexto
}
