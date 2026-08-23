export type IdTema = 'rojo' | 'azul' | 'menta' | 'lavanda' | 'beige' | 'rosa' | 'durazno' | 'cielo' | 'salmon'

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

// Dos "familias" de receta S/L (solo rota el matiz — H de HSL — dentro de
// cada una), en vez de 8 tonos elegidos a mano sin relación entre sí:
//  - vívida (rojo/azul/menta/lavanda/beige): color de marca con cuerpo.
//  - pastel (rosa/durazno/cielo): misma lógica pero con menos saturación y
//    superficies (acS/acS2/acL) más suaves — un verdadero pastel, no solo
//    una versión clara del vívido. El acento en sí (`ac`/`acT`, el color de
//    texto/botón) no puede ser tan pálido como el resto de la familia porque
//    debe mantener ≥4.5:1 de contraste sobre blanco; el carácter "pastel" se
//    nota principalmente en los fondos, bordes y en AtmosferaFondo.
// Rangos verificados con contraste WCAG AA: ac/acT ≥4.5:1 sobre blanco
// (texto de botón/enlace), acD ≥4.5:1 sobre el texto oscuro del modo noche.
export const TEMAS: Record<IdTema, Accent> = {
  rojo: {
    nombre: 'Rojo',
    ac: '#82272A',
    acT: '#6D1D20',
    acS: '#F8EDED',
    acS2: '#F3DDDE',
    acL: '#E8C9CA',
    acD: '#EBADAF',
    oscuro: { acT: '#E3B5B7', acS: '#341D1E', acS2: '#402627', acL: '#523233' },
  },
  azul: {
    nombre: 'Azul',
    ac: '#275982',
    acT: '#1D496D',
    acS: '#EDF3F8',
    acS2: '#DDE9F3',
    acL: '#C9DAE8',
    acD: '#ADCFEB',
    oscuro: { acT: '#B5CEE3', acS: '#1D2A34', acS2: '#263440', acL: '#324452' },
  },
  menta: {
    nombre: 'Verde menta',
    ac: '#278263',
    acT: '#1D6D52',
    acS: '#EDF8F4',
    acS2: '#DDF3EC',
    acL: '#C9E8DE',
    acD: '#ADEBD6',
    oscuro: { acT: '#B5E3D4', acS: '#1D342D', acS2: '#264037', acL: '#325248' },
  },
  lavanda: {
    nombre: 'Lavanda',
    ac: '#422782',
    acT: '#351D6D',
    acS: '#F0EDF8',
    acS2: '#E4DDF3',
    acL: '#D3C9E8',
    acD: '#C0ADEB',
    oscuro: { acT: '#C3B5E3', acS: '#241D34', acS2: '#2E2640', acL: '#3C3252' },
  },
  beige: {
    nombre: 'Beige cálido',
    ac: '#825727',
    acT: '#6D481D',
    acS: '#F8F3ED',
    acS2: '#F3E9DD',
    acL: '#E8DAC9',
    acD: '#EBCEAD',
    oscuro: { acT: '#E3CEB5', acS: '#342A1D', acS2: '#403426', acL: '#524332' },
  },
  rosa: {
    nombre: 'Rosa pastel',
    ac: '#933963',
    acT: '#7A294F',
    acS: '#F8F1F5',
    acS2: '#F4E6ED',
    acL: '#E9D3DD',
    acD: '#E8BFD2',
    oscuro: { acT: '#DFB9CB', acS: '#34232B', acS2: '#3F2C35', acL: '#503A44' },
  },
  durazno: {
    nombre: 'Durazno',
    ac: '#935139',
    acT: '#7A3F29',
    acS: '#F8F3F1',
    acS2: '#F4EAE6',
    acL: '#E9D9D3',
    acD: '#E8CABF',
    oscuro: { acT: '#DFC3B9', acS: '#342723', acS2: '#3F312C', acL: '#50403A' },
  },
  cielo: {
    nombre: 'Cielo pastel',
    ac: '#397C93',
    acT: '#29667A',
    acS: '#F1F7F8',
    acS2: '#E6F1F4',
    acL: '#D3E3E9',
    acD: '#BFDEE8',
    oscuro: { acT: '#B9D6DF', acS: '#233034', acS2: '#2C3A3F', acL: '#3A4A50' },
  },
  salmon: {
    nombre: 'Salmón',
    ac: '#93393E',
    acT: '#7A292D',
    acS: '#F8F1F1',
    acS2: '#F4E6E7',
    acL: '#E9D3D4',
    acD: '#E8A9AC',
    oscuro: { acT: '#DFB9BB', acS: '#342324', acS2: '#3F2C2D', acL: '#503A3B' },
  },
}

export function resolverAccent(id: IdTema, oscuro: boolean): VariablesAccent {
  const tema = TEMAS[id] ?? TEMAS.rojo

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
  respiratoria: { fg: '#1D496D', bg: '#EDF3F8', bd: '#C9DAE8' },
  fisica: { fg: '#1D6D52', bg: '#EDF8F4', bd: '#C9E8DE' },
} as const

// Mismo par S/L "vívido" (54%, 33%) que TEMAS, en los mismos 8 matices que
// los 8 temas de acento — así los colores de identificación de pacientes
// son reconocibles como parte de la misma familia, sean o no el tema activo.
export const COLORES_PACIENTE: string[] = [
  '#82272A',
  '#275982',
  '#278263',
  '#422782',
  '#825727',
  '#822751',
  '#823F27',
  '#276B82',
]
