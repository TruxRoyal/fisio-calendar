import { useEffect, useState } from 'react'
import { DialogoConfirmacion } from '../DialogoConfirmacion/DialogoConfirmacion'
import { usePwaInstalable } from '../../pwa/usePwaInstalable'

const CLAVE_BANNER_VISTO = 'fisio.pwaBannerVisto'

export function BannerInstalarPwa() {
  const { puedeInstalar, instalada, esIOS, instalar } = usePwaInstalable()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (instalada) return
    if (localStorage.getItem(CLAVE_BANNER_VISTO)) return
    if (!puedeInstalar && !esIOS) return
    setAbierto(true)
  }, [puedeInstalar, instalada, esIOS])

  function cerrar() {
    localStorage.setItem(CLAVE_BANNER_VISTO, 'true')
    setAbierto(false)
  }

  async function confirmar() {
    if (!esIOS) await instalar()
    cerrar()
  }

  return (
    <DialogoConfirmacion
      abierto={abierto}
      onCerrar={cerrar}
      onConfirmar={confirmar}
      titulo="Instalá Physinow"
      descripcion={
        esIOS
          ? 'Tocá el botón Compartir de Safari y elegí "Agregar a inicio" para abrirla como una app, incluso sin conexión.'
          : 'Agregala a tu pantalla de inicio para abrirla más rápido y usarla incluso sin conexión.'
      }
      textoConfirmar={esIOS ? 'Entendido' : 'Instalar'}
      textoCancelar={esIOS ? 'Cerrar' : 'Ahora no'}
    />
  )
}
