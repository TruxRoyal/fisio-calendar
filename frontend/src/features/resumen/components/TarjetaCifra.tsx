interface ColorCifra {
  fg: string
  bg: string
  bd: string
}

interface PropiedadesTarjetaCifra {
  etiqueta: string
  valor: string
  color: ColorCifra
}

export function TarjetaCifra({ etiqueta, valor, color }: PropiedadesTarjetaCifra) {
  return (
    <div style={{ background: color.bg, border: `1px solid ${color.bd}`, borderRadius: '16px', padding: '16px' }}>
      <div style={{ fontSize: '22px', fontWeight: 700, color: color.fg, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
      <div style={{ fontSize: '12.5px', color: color.fg, marginTop: '2px', fontWeight: 500, opacity: 0.85 }}>
        {etiqueta}
      </div>
    </div>
  )
}
