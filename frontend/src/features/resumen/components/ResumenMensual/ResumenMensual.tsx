import { useState } from 'react'
import { useResumen } from '../../hooks/useResumen'
import { TarjetaCifra } from '../TarjetaCifra/TarjetaCifra'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { formatearMesAnio } from '../../../../shared/lib/fecha'
import { resumenApi } from '../../api'
import styles from './ResumenMensual.module.css'

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
    <div className={styles.pagina}>
      <div className={styles.contenedor}>
        <div className={styles.filaCabecera}>
          <div className={styles.infoTitulo}>
            <h1 className={styles.titulo}>{formatearMesAnio(anio, mes)}</h1>
            <div className={styles.subtitulo}>Ingresos y sesiones del mes</div>
          </div>
          <div className={styles.selectorMes}>
            <BotonMes onClick={() => cambiarMes(-1)} icono="chevronIzquierda" />
            <BotonMes onClick={() => cambiarMes(1)} icono="chevronDerecha" />
          </div>
          <Boton variante="secundario" onClick={exportar} disabled={exportando || !resumen}>
            <Icono nombre="excel" tamano={16} grosor={1.9} className={styles.iconoExcel} />
            {exportando ? 'Exportando…' : 'Exportar Excel'}
          </Boton>
        </div>

        {cargando || !resumen ? (
          <p className={styles.textoCargando}>Cargando…</p>
        ) : (
          <div className={styles.gridCifras}>
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
              color={{ fg: 'var(--t1)', bg: 'var(--s1)', bd: 'var(--bd)' }}
            />
            <TarjetaCifra
              etiqueta="Sesiones atendidas"
              valor={String(resumen.sesionesAtendidas)}
              color={{ fg: 'var(--t1)', bg: 'var(--s1)', bd: 'var(--bd)' }}
              nota={resumen.umbralAlcanzado ? '✓ Escalón de $25.000 alcanzado (sesión 72+)' : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function BotonMes({ onClick, icono }: { onClick: () => void; icono: 'chevronIzquierda' | 'chevronDerecha' }) {
  return (
    <button type="button" onClick={onClick} className={styles.botonMes}>
      <Icono nombre={icono} tamano={16} grosor={2} />
    </button>
  )
}
