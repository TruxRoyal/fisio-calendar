import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface PropiedadesInput extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  error?: string
}

const estiloCampo = {
  width: '100%',
  height: '42px',
  border: '1px solid var(--bd)',
  borderRadius: '11px',
  padding: '0 13px',
  fontSize: '14px',
  fontFamily: 'inherit',
  background: 'var(--bg)',
  color: 'var(--t1)',
  outline: 'none',
  transition: 'border-color .15s, background .15s',
}

export function Input({ etiqueta, error, id, style, ...resto }: PropiedadesInput) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {etiqueta && (
        <label htmlFor={idCampo} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>
          {etiqueta}
        </label>
      )}
      <input
        id={idCampo}
        {...resto}
        style={{ ...estiloCampo, borderColor: error ? 'var(--dgFg)' : 'var(--bd)', ...style }}
        onFocus={(evento) => {
          evento.currentTarget.style.borderColor = 'var(--ac)'
          evento.currentTarget.style.background = 'var(--s1)'
          resto.onFocus?.(evento)
        }}
        onBlur={(evento) => {
          evento.currentTarget.style.borderColor = error ? 'var(--dgFg)' : 'var(--bd)'
          evento.currentTarget.style.background = 'var(--bg)'
          resto.onBlur?.(evento)
        }}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--dgFg)' }}>{error}</span>}
    </div>
  )
}

interface PropiedadesTextarea extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string
}

export function TextArea({ etiqueta, id, style, ...resto }: PropiedadesTextarea) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {etiqueta && (
        <label htmlFor={idCampo} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>
          {etiqueta}
        </label>
      )}
      <textarea
        id={idCampo}
        {...resto}
        style={{
          ...estiloCampo,
          height: 'auto',
          minHeight: '74px',
          padding: '11px 13px',
          lineHeight: 1.55,
          resize: 'vertical',
          ...style,
        }}
      />
    </div>
  )
}
