import { useState } from 'react'

const CLAVE_CONFIRMAR_EMPUJE = 'fisio.confirmarEmpujeCitas'

function leerPreferenciaGuardada(): boolean {
  const guardado = localStorage.getItem(CLAVE_CONFIRMAR_EMPUJE)
  return guardado === null ? true : guardado === 'true'
}

export function usePreferenciaConfirmarEmpuje() {
  const [confirmarEmpuje, setConfirmarEmpujeState] = useState<boolean>(leerPreferenciaGuardada)

  function setConfirmarEmpuje(valor: boolean) {
    localStorage.setItem(CLAVE_CONFIRMAR_EMPUJE, String(valor))
    setConfirmarEmpujeState(valor)
  }

  return { confirmarEmpuje, setConfirmarEmpuje }
}
