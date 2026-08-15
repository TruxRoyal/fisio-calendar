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
  return (
    <AlertDialog open={abierto} onOpenChange={(siguiente: boolean) => !siguiente && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction variant={peligro ? 'destructive' : 'default'} onClick={onConfirmar}>
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
