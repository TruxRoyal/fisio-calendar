const formateadorCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formateadorMiles = new Intl.NumberFormat('es-CO')

export function formatearCOP(valor: number): string {
  return formateadorCOP.format(valor)
}

export function formatearMiles(valor: number): string {
  return formateadorMiles.format(valor)
}
