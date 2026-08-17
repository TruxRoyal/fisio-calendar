import type { CSSProperties, ReactElement, SVGProps } from 'react'

export type NombreIcono =
  | 'calendario'
  | 'mapa'
  | 'ingresos'
  | 'paciente'
  | 'buscar'
  | 'chevronIzquierda'
  | 'chevronDerecha'
  | 'mas'
  | 'cerrar'
  | 'check'
  | 'alerta'
  | 'reloj'
  | 'ubicacion'
  | 'masVertical'
  | 'pulso'
  | 'pulmon'
  | 'excel'
  | 'flechaExterna'
  | 'papelera'
  | 'sol'
  | 'luna'
  | 'telefono'
  | 'ajustes'

const CONTENIDO: Record<NombreIcono, ReactElement> = {
  calendario: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2.5" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </>
  ),
  mapa: (
    <>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </>
  ),
  ingresos: (
    <>
      <rect width="20" height="13" x="2" y="6" rx="2.5" />
      <circle cx="12" cy="12.5" r="2.4" />
      <path d="M6 12.5h.01M18 12.5h.01" />
    </>
  ),
  paciente: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  chevronIzquierda: <path d="m15 18-6-6 6-6" />,
  chevronDerecha: <path d="m9 18 6-6-6-6" />,
  mas: <path d="M5 12h14M12 5v14" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5L20 7" />,
  alerta: (
    <>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.2 1.9" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  masVertical: (
    <>
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </>
  ),
  pulso: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  pulmon: <path d="M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2" />,
  excel: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13l6 5M15 13l-6 5" />
    </>
  ),
  flechaExterna: <path d="M7 17 17 7M9 7h8v8" />,
  papelera: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  sol: <path d="M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15M12 1v1.6M12 21.4V23M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M1 12h1.6M21.4 12H23M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1" />,
  luna: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11" />,
  telefono: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
}

interface PropiedadesIcono extends SVGProps<SVGSVGElement> {
  nombre: NombreIcono
  tamano?: number
  grosor?: number
  relleno?: boolean
  style?: CSSProperties
}

export function Icono({ nombre, tamano = 18, grosor = 1.9, relleno = false, style, ...resto }: PropiedadesIcono) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={relleno ? 'currentColor' : 'none'}
      stroke={relleno ? 'none' : 'currentColor'}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      {...resto}
    >
      {CONTENIDO[nombre]}
    </svg>
  )
}
