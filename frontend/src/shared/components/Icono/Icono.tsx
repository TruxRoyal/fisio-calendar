import type { CSSProperties, ReactElement, SVGProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  EllipsisVertical,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Moon,
  Phone,
  Plus,
  Search,
  Settings,
  Sun,
  Trash,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'

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

const CONTENIDO_PROPIO: Partial<Record<NombreIcono, ReactElement>> = {
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
  pulmon: <path d="M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2" />,
}

const ICONOS_LUCIDE: Partial<Record<NombreIcono, LucideIcon>> = {
  calendario: Calendar,
  paciente: User,
  buscar: Search,
  chevronIzquierda: ChevronLeft,
  chevronDerecha: ChevronRight,
  mas: Plus,
  cerrar: X,
  check: Check,
  alerta: TriangleAlert,
  reloj: Clock,
  ubicacion: MapPin,
  masVertical: EllipsisVertical,
  pulso: Activity,
  excel: FileSpreadsheet,
  flechaExterna: ExternalLink,
  papelera: Trash,
  sol: Sun,
  luna: Moon,
  telefono: Phone,
  ajustes: Settings,
}

interface PropiedadesIcono extends SVGProps<SVGSVGElement> {
  nombre: NombreIcono
  tamano?: number
  grosor?: number
  relleno?: boolean
  style?: CSSProperties
}

export function Icono({ nombre, tamano = 18, grosor = 1.9, relleno = false, style, ...resto }: PropiedadesIcono) {
  const fill = relleno ? 'currentColor' : 'none'
  const stroke = relleno ? 'none' : 'currentColor'
  const estilo = { flexShrink: 0, ...style }

  const ComponenteLucide = ICONOS_LUCIDE[nombre]
  if (ComponenteLucide) {
    return (
      <ComponenteLucide
        size={tamano}
        strokeWidth={grosor}
        fill={fill}
        stroke={stroke}
        style={estilo}
        {...resto}
      />
    )
  }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={estilo}
      {...resto}
    >
      {CONTENIDO_PROPIO[nombre]}
    </svg>
  )
}
