export type IdTema = 'rosa' | 'azul' | 'menta' | 'lavanda' | 'beige'

interface AccentOscuro {
  acT: string
  acS: string
  acS2: string
  acL: string
}

interface Accent {
  nombre: string
  ac: string
  acT: string
  acS: string
  acS2: string
  acL: string
  acD: string
  oscuro: AccentOscuro
}

export interface VariablesAccent {
  ac: string
  acT: string
  acS: string
  acS2: string
  acL: string
  acD: string
}

export const TEMAS: Record<IdTema, Accent> = {
  rosa: {
    nombre: 'Rosa pastel',
    ac: '#7A3E85',
    acT: '#6E3479',
    acS: '#F5EAF5',
    acS2: '#F2E1F4',
    acL: '#ECD4EA',
    acD: '#E6B9EA',
    oscuro: { acT: '#EBC4EF', acS: '#2E2333', acS2: '#392B3E', acL: '#473652' },
  },
  azul: {
    nombre: 'Azul pastel',
    ac: '#2F5B8C',
    acT: '#2A5280',
    acS: '#EBF1F8',
    acS2: '#DEE9F5',
    acL: '#CFDDEE',
    acD: '#A9C6E8',
    oscuro: { acT: '#BAD6F4', acS: '#1E2733', acS2: '#25313F', acL: '#2F3E51' },
  },
  menta: {
    nombre: 'Verde menta',
    ac: '#1F6650',
    acT: '#1C5C48',
    acS: '#E8F4EF',
    acS2: '#D9EDE4',
    acL: '#C6E2D5',
    acD: '#9AD1BB',
    oscuro: { acT: '#A9DEC7', acS: '#1B2A24', acS2: '#21332C', acL: '#2B4238' },
  },
  lavanda: {
    nombre: 'Lavanda',
    ac: '#4E3E96',
    acT: '#47388A',
    acS: '#EFECF8',
    acS2: '#E4DEF5',
    acL: '#D6CEEE',
    acD: '#B7ABE4',
    oscuro: { acT: '#C8BEF0', acS: '#26243A', acS2: '#2E2B46', acL: '#3A3657' },
  },
  beige: {
    nombre: 'Beige cálido',
    ac: '#7A5C2E',
    acT: '#6E5329',
    acS: '#F5F1E9',
    acS2: '#EFE7D9',
    acL: '#E5D9C5',
    acD: '#D3BE96',
    oscuro: { acT: '#E0CBA3', acS: '#2A2519', acS2: '#332C1E', acL: '#413826' },
  },
}

export function resolverAccent(id: IdTema, oscuro: boolean): VariablesAccent {
  const tema = TEMAS[id] ?? TEMAS.rosa

  if (!oscuro) {
    return { ac: tema.ac, acT: tema.acT, acS: tema.acS, acS2: tema.acS2, acL: tema.acL, acD: tema.acD }
  }

  return {
    ac: tema.acD,
    acT: tema.oscuro.acT,
    acS: tema.oscuro.acS,
    acS2: tema.oscuro.acS2,
    acL: tema.oscuro.acL,
    acD: tema.acD,
  }
}

export const TIPO_TERAPIA_COLOR = {
  respiratoria: { fg: '#2A5280', bg: '#EBF1F8', bd: '#CFDDEE' },
  fisica: { fg: '#1C5C48', bg: '#E8F4EF', bd: '#C6E2D5' },
} as const
