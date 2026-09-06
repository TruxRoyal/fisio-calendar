import { create } from 'zustand'

interface EventoAntesDeInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface EstadoPwa {
  promptEvento: EventoAntesDeInstalar | null
  instalada: boolean
  setPromptEvento: (evento: EventoAntesDeInstalar | null) => void
  setInstalada: (valor: boolean) => void
}

function detectarInstalada(): boolean {
  if (typeof window === 'undefined') return false
  const navegadorIOS = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navegadorIOS.standalone === true
}

const usePwaStore = create<EstadoPwa>((set) => ({
  promptEvento: null,
  instalada: detectarInstalada(),
  setPromptEvento: (evento) => set({ promptEvento: evento }),
  setInstalada: (valor) => set({ instalada: valor }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    usePwaStore.getState().setPromptEvento(evento as EventoAntesDeInstalar)
  })
  window.addEventListener('appinstalled', () => {
    usePwaStore.getState().setInstalada(true)
    usePwaStore.getState().setPromptEvento(null)
  })
}

export function esIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export async function instalarPwa(): Promise<'accepted' | 'dismissed' | 'no-disponible'> {
  const evento = usePwaStore.getState().promptEvento
  if (!evento) return 'no-disponible'
  await evento.prompt()
  const eleccion = await evento.userChoice
  if (eleccion.outcome === 'accepted') {
    usePwaStore.getState().setPromptEvento(null)
  }
  return eleccion.outcome
}

export function usePwaInstalable() {
  const promptEvento = usePwaStore((estado) => estado.promptEvento)
  const instalada = usePwaStore((estado) => estado.instalada)
  return {
    puedeInstalar: promptEvento !== null && !instalada,
    instalada,
    esIOS: esIOS(),
    instalar: instalarPwa,
  }
}
