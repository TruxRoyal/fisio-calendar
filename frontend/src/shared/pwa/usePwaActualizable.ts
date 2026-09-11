import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'

interface EstadoPwaActualizacion {
  necesitaActualizar: boolean
  listoOffline: boolean
  setNecesitaActualizar: (valor: boolean) => void
  setListoOffline: (valor: boolean) => void
}

const usePwaActualizacionStore = create<EstadoPwaActualizacion>((set) => ({
  necesitaActualizar: false,
  listoOffline: false,
  setNecesitaActualizar: (valor) => set({ necesitaActualizar: valor }),
  setListoOffline: (valor) => set({ listoOffline: valor }),
}))

let actualizarServiceWorker: ((recargar?: boolean) => Promise<void>) | null = null

if (typeof window !== 'undefined') {
  actualizarServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      usePwaActualizacionStore.getState().setNecesitaActualizar(true)
    },
    onOfflineReady() {
      usePwaActualizacionStore.getState().setListoOffline(true)
    },
  })
}

export async function actualizarApp(): Promise<void> {
  if (!actualizarServiceWorker) return
  await actualizarServiceWorker(true)
}

export function usePwaActualizable() {
  const necesitaActualizar = usePwaActualizacionStore((estado) => estado.necesitaActualizar)
  return {
    necesitaActualizar,
    actualizar: actualizarApp,
  }
}
