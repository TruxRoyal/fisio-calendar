import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [coincide, setCoincide] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)

    function actualizar() {
      setCoincide(media.matches)
    }

    actualizar()
    media.addEventListener('change', actualizar)
    window.addEventListener('resize', actualizar)
    const reintento = window.setTimeout(actualizar, 150)
    return () => {
      media.removeEventListener('change', actualizar)
      window.removeEventListener('resize', actualizar)
      window.clearTimeout(reintento)
    }
  }, [query])

  return coincide
}
