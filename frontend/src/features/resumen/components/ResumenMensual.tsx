import { useState } from 'react'
import { useResumen } from '../hooks/useResumen'
import { TarjetaCifra } from './TarjetaCifra'
import { Boton } from '../../../shared/components/Boton'
import { formatearCOP } from '../../../shared/lib/moneda'
import { formatearMesAnio } from '../../../shared/lib/fecha'
import { resumenApi } from '../api'

export function ResumenMensual() {
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth() + 1)
  const { resumen, cargando } = useResumen(anio, mes)
  const [exportando, setExportando] = useState(false)

  function cambiarMes(delta: number) {
    const fecha = new Date(anio, mes - 1 + delta, 1)
    setAnio(fecha.getFullYear())
    setMes(fecha.getMonth() + 1)
  }

  async function exportar() {
    setExportando(true)
    try {
      const archivo = await resumenApi.descargarExcel(anio, mes)
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `resumen-${anio}-${String(mes).padStart(2, '0')}.xlsx`
      enlace.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Boton tamano="sm" variante="secundario" onClick={() => cambiarMes(-1)}>
            ←
          </Boton>
          <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--t1)', textTransform: 'capitalize' }}>
            {formatearMesAnio(anio, mes)}
          </h1>
          <Boton tamano="sm" variante="secundario" onClick={() => cambiarMes(1)}>
            →
          </Boton>
        </div>
        <Boton variante="primario" onClick={exportar} disabled={exportando || !resumen}>
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </Boton>
      </div>

      {cargando || !resumen ? (
        <p style={{ color: 'var(--t3)' }}>Cargando…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <TarjetaCifra
              etiqueta="Pago neto"
              valor={formatearCOP(resumen.pagoNeto)}
              color={{ fg: 'var(--okFg)', bg: 'var(--okBg)', bd: 'var(--okBd)' }}
            />
            <TarjetaCifra
              etiqueta="Copagos recaudados"
              valor={formatearCOP(resumen.copagosRecaudados)}
              color={{ fg: 'var(--acT)', bg: 'var(--acS)', bd: 'var(--acL)' }}
            />
            <TarjetaCifra
              etiqueta="Total"
              valor={formatearCOP(resumen.total)}
              color={{ fg: 'var(--t1)', bg: 'var(--s3)', bd: 'var(--bd)' }}
            />
          </div>

          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', padding: '18px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--t3)' }}>Sesiones atendidas este mes</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                {resumen.sesionesAtendidas}
              </span>
              {resumen.umbralAlcanzado && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--wrFg)',
                    background: 'var(--wrBg)',
                    border: '1px solid var(--wrBd)',
                    borderRadius: '99px',
                    padding: '2px 9px',
                  }}
                >
                  ✓ Escalón de $25.000 alcanzado (sesión 72+)
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
