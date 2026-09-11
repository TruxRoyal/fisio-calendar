import type { ErrorApi } from '../types/comun'

const URL_BASE = '/api'

export class ErrorPeticion extends Error {
  status: number
  codigo: string
  detalles?: unknown

  constructor(status: number, cuerpo: ErrorApi) {
    super(cuerpo.mensaje)
    this.status = status
    this.codigo = cuerpo.error
    this.detalles = cuerpo.detalles
  }
}

const RUTAS_SIN_REINTENTO = new Set(['/auth/login', '/auth/refresh', '/auth/me'])

async function ejecutarFetch(ruta: string, opciones: RequestInit): Promise<Response> {
  return fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })
}

async function refrescarSesion(): Promise<boolean> {
  const respuesta = await fetch(`${URL_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
  return respuesta.ok
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta = await ejecutarFetch(ruta, opciones)

  if (respuesta.status === 401 && !RUTAS_SIN_REINTENTO.has(ruta)) {
    const refrescada = await refrescarSesion()
    if (refrescada) {
      respuesta = await ejecutarFetch(ruta, opciones)
    } else {
      window.dispatchEvent(new Event('sesion-expirada'))
    }
  }

  if (respuesta.status === 204) {
    return undefined as T
  }

  const cuerpo = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new ErrorPeticion(respuesta.status, cuerpo ?? { error: 'error_desconocido', mensaje: respuesta.statusText })
  }

  return cuerpo as T
}

export const clienteApi = {
  get: <T>(ruta: string) => peticion<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    peticion<T>(ruta, { method: 'POST', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  put: <T>(ruta: string, cuerpo?: unknown) =>
    peticion<T>(ruta, { method: 'PUT', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  patch: <T>(ruta: string, cuerpo?: unknown) =>
    peticion<T>(ruta, { method: 'PATCH', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  delete: <T>(ruta: string) => peticion<T>(ruta, { method: 'DELETE' }),
  descargar: async (ruta: string): Promise<Blob> => {
    const respuesta = await fetch(`${URL_BASE}${ruta}`, { credentials: 'include' })
    if (!respuesta.ok) {
      throw new Error(`No se pudo descargar el archivo (${respuesta.status})`)
    }
    return respuesta.blob()
  },
}
