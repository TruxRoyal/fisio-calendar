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

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })

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
    const respuesta = await fetch(`${URL_BASE}${ruta}`)
    if (!respuesta.ok) {
      throw new Error(`No se pudo descargar el archivo (${respuesta.status})`)
    }
    return respuesta.blob()
  },
}
