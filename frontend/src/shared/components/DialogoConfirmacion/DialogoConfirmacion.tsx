import { useState } from 'react'
import type { MouseEvent } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

interface PropiedadesDialogoConfirmacion {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void | Promise<void>
  titulo: string
  descripcion?: string
  textoConfirmar?: string
  textoCancelar?: string
  peligro?: boolean
}

export function DialogoConfirmacion({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
}: PropiedadesDialogoConfirmacion) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alConfirmar(evento: MouseEvent<HTMLButtonElement>) {
    evento.preventDefault()
    setConfirmando(true)
    setError(null)
    try {
      await onConfirmar()
      onCerrar()
    } catch {
      setError('No se pudo completar la acción. Intenta de nuevo.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(siguiente: boolean) => {
        if (!siguiente) {
          setError(null)
          onCerrar()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirmando}>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction variant={peligro ? 'destructive' : 'default'} disabled={confirmando} onClick={alConfirmar}>
            {confirmando ? 'Procesando…' : textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
