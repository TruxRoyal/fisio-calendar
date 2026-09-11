import { useEffect, useState } from 'react'
import { DialogoConfirmacion } from '../DialogoConfirmacion/DialogoConfirmacion'
import { usePwaActualizable } from '../../pwa/usePwaActualizable'

export function BannerActualizarPwa() {
  const { necesitaActualizar, actualizar } = usePwaActualizable()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!necesitaActualizar) return
    setAbierto(true)
  }, [necesitaActualizar])

  function cerrar() {
    setAbierto(false)
  }

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onCerrar={cerrar}
      onConfirmar={actualizar}
      titulo="Nueva versión disponible"
      descripcion="Actualizá para tener las últimas mejoras y correcciones."
      textoConfirmar="Actualizar"
      textoCancelar="Ahora no"
      icono="descargar"
    />
  )
}
