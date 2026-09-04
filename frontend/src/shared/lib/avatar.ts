export function inicialesNombre(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function colorDesdeTexto(texto: string): string {
  let hash = 0
  for (let i = 0; i < texto.length; i++) {
    hash = (hash << 5) - hash + texto.charCodeAt(i)
    hash |= 0
  }
  const matiz = Math.abs(hash) % 360
  return `hsl(${matiz}deg 58% 42%)`
}
