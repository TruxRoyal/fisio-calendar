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
  AlertDialogMedia,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Icono } from '../Icono/Icono'
import { cn } from '@/shared/lib/clases'

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
          <AlertDialogMedia
            className={cn(
              'border',
              peligro
                ? 'border-[var(--dgBd)] bg-[var(--dgBg)] text-[var(--dgFg)]'
                : 'border-[var(--acL)] bg-[var(--acS)] text-[var(--acT)]'
            )}
          >
            <Icono nombre={peligro ? 'papelera' : 'check'} grosor={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-[var(--dgBd)] bg-[var(--dgBg)] px-3 py-2 text-sm font-medium text-[var(--dgFg)]"
          >
            <Icono nombre="alerta" tamano={16} grosor={2} />
            <span>{error}</span>
          </div>
        )}
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
