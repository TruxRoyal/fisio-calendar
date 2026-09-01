import { useId, useState } from 'react'
import { es } from 'date-fns/locale'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Icono } from '../Icono/Icono'
import { analizarFechaHora, formatearFechaCorta, formatearFechaISO } from '../../lib/fecha'
import { cn } from '../../lib/clases'
import styles from './SelectorFecha.module.css'

interface PropiedadesSelectorFecha {
  etiqueta?: string
  value: string
  onChange: (valor: string) => void
  id?: string
  placeholder?: string
}

export function SelectorFecha({ etiqueta, value, onChange, id, placeholder = 'Selecciona una fecha' }: PropiedadesSelectorFecha) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const [abierto, setAbierto] = useState(false)
  const fecha = value ? analizarFechaHora(value) : undefined

  return (
    <div className={styles.grupo}>
      {etiqueta && (
        <label htmlFor={idCampo} className={styles.etiqueta}>
          {etiqueta}
        </label>
      )}
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button type="button" id={idCampo} className={styles.campo}>
            <Icono nombre="calendario" tamano={15} grosor={1.9} className={styles.icono} />
            <span className={cn(styles.texto, !fecha && styles.placeholder)}>
              {fecha ? `${formatearFechaCorta(value)} de ${fecha.getFullYear()}` : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            locale={es}
            selected={fecha}
            defaultMonth={fecha}
            onSelect={(dia) => {
              onChange(dia ? formatearFechaISO(dia) : '')
              setAbierto(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
