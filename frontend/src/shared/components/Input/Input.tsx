import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/clases'
import { Icono } from '../Icono/Icono'
import styles from './Input.module.css'

interface PropiedadesInput extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  error?: string
}

export function Input({ etiqueta, error, id, className, ...resto }: PropiedadesInput) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado

  return (
    <div className={styles.grupo}>
      {etiqueta && (
        <label htmlFor={idCampo} className={styles.etiqueta}>
          {etiqueta}
        </label>
      )}
      <input id={idCampo} {...resto} className={cn(styles.campo, error && styles.error, className)} />
      {error && (
        <span className={styles.mensajeError}>
          <Icono nombre="alerta" tamano={13} grosor={2} />
          {error}
        </span>
      )}
    </div>
  )
}

interface PropiedadesTextarea extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string
}

export function TextArea({ etiqueta, id, className, ...resto }: PropiedadesTextarea) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado

  return (
    <div className={styles.grupo}>
      {etiqueta && (
        <label htmlFor={idCampo} className={styles.etiqueta}>
          {etiqueta}
        </label>
      )}
      <textarea id={idCampo} {...resto} className={cn(styles.campo, styles.textarea, className)} />
    </div>
  )
}
