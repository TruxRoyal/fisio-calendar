import { clienteApi } from '../../shared/api/cliente'
import type { Usuario } from '../../shared/types/comun'

export const authApi = {
  login: (email: string, password: string) => clienteApi.post<Usuario>('/auth/login', { email, password }),
  logout: () => clienteApi.post<void>('/auth/logout'),
  obtenerSesion: () => clienteApi.get<Usuario>('/auth/me'),
}
