import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from './api'
import type { Usuario } from '../../shared/types/comun'

interface ContextoAuth {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const ContextoAuthReact = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    authApi
      .obtenerSesion()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    function alExpirarSesion() {
      setUsuario(null)
    }

    window.addEventListener('sesion-expirada', alExpirarSesion)
    return () => window.removeEventListener('sesion-expirada', alExpirarSesion)
  }, [])

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      cargando,
      login: async (email, password) => {
        const sesion = await authApi.login(email, password)
        setUsuario(sesion)
      },
      logout: async () => {
        await authApi.logout()
        setUsuario(null)
      },
    }),
    [usuario, cargando],
  )

  return <ContextoAuthReact.Provider value={valor}>{children}</ContextoAuthReact.Provider>
}

export function useAuth() {
  const contexto = useContext(ContextoAuthReact)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return contexto
}
