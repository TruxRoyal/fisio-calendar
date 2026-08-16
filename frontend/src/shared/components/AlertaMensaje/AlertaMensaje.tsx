import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Icono } from '../Icono/Icono'

interface PropiedadesAlertaMensaje {
  mensaje: string | null
  onCerrar: () => void
  titulo?: string
}

export function AlertaMensaje({ mensaje, onCerrar, titulo = 'No se pudo completar' }: PropiedadesAlertaMensaje) {
  return (
    <AlertDialog open={mensaje !== null} onOpenChange={(siguiente) => !siguiente && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="border border-[var(--dgBd)] bg-[var(--dgBg)] text-[var(--dgFg)]">
            <Icono nombre="alerta" grosor={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{mensaje}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onCerrar}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
