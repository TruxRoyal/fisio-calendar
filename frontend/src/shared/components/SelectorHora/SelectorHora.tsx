import { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '../../lib/clases'
import styles from './SelectorHora.module.css'

interface PropiedadesSelectorHora {
  value: string
  onChange: (valor: string) => void
  id?: string
  className?: string
  intervaloMinutos?: number
  horaMin?: number
  horaMax?: number
}

function generarOpciones(intervaloMinutos: number, horaMin: number, horaMax: number): string[] {
  if (intervaloMinutos <= 0 || horaMax < horaMin) return []
  const opciones: string[] = []
  for (let minutos = horaMin * 60; minutos <= horaMax * 60; minutos += intervaloMinutos) {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    opciones.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return opciones
}

export function SelectorHora({
  value,
  onChange,
  id,
  className,
  intervaloMinutos = 15,
  horaMin = 6,
  horaMax = 21,
}: PropiedadesSelectorHora) {
  const [abierto, setAbierto] = useState(false)
  const opciones = generarOpciones(intervaloMinutos, horaMin, horaMax)
  const refSeleccionado = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (abierto) refSeleccionado.current?.scrollIntoView({ block: 'center' })
  }, [abierto])

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" id={id} className={cn(styles.disparador, className)}>
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-0" align="start">
        <div className={styles.lista}>
          {opciones.map((hora) => (
            <button
              key={hora}
              ref={hora === value ? refSeleccionado : undefined}
              type="button"
              className={cn(styles.opcion, hora === value && styles.activo)}
              onClick={() => {
                onChange(hora)
                setAbierto(false)
              }}
            >
              {hora}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
