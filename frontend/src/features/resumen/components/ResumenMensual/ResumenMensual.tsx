import { useState } from 'react'
import { useDesglosePorPaciente, useProyeccion, useResumen, useResumenHistorico } from '../../hooks/useResumen'
import { TarjetaCifra } from '../TarjetaCifra/TarjetaCifra'
import type { DeltaCifra } from '../TarjetaCifra/TarjetaCifra'
import { GraficoIngresos } from '../GraficoIngresos/GraficoIngresos'
import { PanelPresupuesto } from '../PanelPresupuesto/PanelPresupuesto'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { AtmosferaFondo } from '../../../../shared/components/AtmosferaFondo/AtmosferaFondo'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { formatearMesAnio } from '../../../../shared/lib/fecha'
import { ETIQUETA_TIPO_TERAPIA, type TipoTerapia } from '../../../../shared/types/comun'
import { resumenApi } from '../../api'
import type { DesglosePaciente, ResumenTipo } from '../../types'
import styles from './ResumenMensual.module.css'

function calcularDelta(actual: number, anterior: number): DeltaCifra | null {
  if (anterior === 0) return actual > 0 ? { texto: 'Nuevo', positivo: true } : null
  const porcentaje = ((actual - anterior) / anterior) * 100
  if (Math.round(porcentaje) === 0) return null
  return {
    texto: `${porcentaje > 0 ? '+' : ''}${Math.round(porcentaje)}%`,
    positivo: porcentaje > 0,
  }
}

export function ResumenMensual() {
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth() + 1)
  const { resumen, cargando } = useResumen(anio, mes)
  const { proyeccion, cargando: cargandoProyeccion } = useProyeccion(anio, mes)
  const { historico } = useResumenHistorico(anio, mes, 6)
  const { desglose } = useDesglosePorPaciente(anio, mes)
  const [exportando, setExportando] = useState(false)

  const mesAnterior = historico.length >= 2 ? (historico.at(-2) ?? null) : null

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
        <AtmosferaFondo intensidad="suave" particulas origen="superior-derecha" className={styles.hero}>
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

          {resumen && (
            <div className={styles.filaHero}>
              <div className={styles.etiquetaHero}>Total del mes</div>
              <div className={styles.filaValorHero}>
                <span className={styles.valorHero}>{formatearCOP(resumen.total)}</span>
                {resumen.copagosRecaudados > 0 && (
                  <span className={styles.badgeCopagos}>
                    <Icono nombre="moneda" tamano={13} grosor={1.9} />
                    +{formatearCOP(resumen.copagosRecaudados)} copagos
                  </span>
                )}
                {mesAnterior && (() => {
                  const delta = calcularDelta(resumen.total, mesAnterior.total)
                  return delta ? (
                    <span className={delta.positivo ? styles.deltaHeroPositivo : styles.deltaHeroNegativo}>
                      {delta.positivo ? '↑' : '↓'} {delta.texto} vs mes anterior
                    </span>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </AtmosferaFondo>

        {cargando || !resumen ? (
          <p className={styles.textoCargando}>Cargando…</p>
        ) : (
          <>
            <div className={styles.gridCifras}>
              <TarjetaCifra
                etiqueta="Pago neto"
                valor={formatearCOP(resumen.pagoNeto)}
                color={{ fg: 'var(--okFg)', bg: 'var(--okBg)', bd: 'var(--okBd)' }}
                delta={mesAnterior ? calcularDelta(resumen.pagoNeto, mesAnterior.pagoNeto) : null}
              />
              <TarjetaCifra
                etiqueta="Sesiones atendidas"
                valor={String(resumen.sesionesAtendidas)}
                color={{ fg: 'var(--t1)', bg: 'var(--s1)', bd: 'var(--bd)' }}
                delta={mesAnterior ? calcularDelta(resumen.sesionesAtendidas, mesAnterior.sesionesAtendidas) : null}
              />
            </div>

            {resumen.porTipo.length > 0 && <PanelPorTipo porTipo={resumen.porTipo} />}

            <PanelPresupuesto resumen={resumen} proyeccion={proyeccion} cargando={cargandoProyeccion} />

            {historico.length > 0 && (
              <div className={styles.panelGrafico}>
                <div className={styles.tituloPanelGrafico}>Ingresos por mes</div>
                <div className={styles.subtituloPanelGrafico}>Últimos 6 meses · pago neto y copagos</div>
                <GraficoIngresos historico={historico} />
              </div>
            )}

            {desglose.length > 0 && <PanelDesglose desglose={desglose} />}
          </>
        )}
      </div>
    </div>
  )
}

function PanelPorTipo({ porTipo }: { porTipo: ResumenTipo[] }) {
  const maximo = Math.max(...porTipo.map((t) => t.pagoNeto), 1)

  return (
    <div className={styles.panelDesglose}>
      <div className={styles.tituloPanelGrafico}>Por tipo de terapia</div>
      <div className={styles.subtituloPanelGrafico}>Sesiones e ingresos de este mes, física vs. respiratoria</div>
      <div className={styles.listaDesglose}>
        {porTipo.map((tipo) => (
          <div key={tipo.tipoTerapia} className={styles.filaDesglose}>
            <div className={styles.infoDesglose}>
              <div className={styles.filaNombreDesglose}>
                <span className={styles.nombreDesglose}>{ETIQUETA_TIPO_TERAPIA[tipo.tipoTerapia as TipoTerapia] ?? tipo.tipoTerapia}</span>
                <span className={styles.valorDesglose}>{formatearCOP(tipo.pagoNeto)}</span>
              </div>
              <div className={styles.pistaDesglose}>
                <div className={styles.rellenoDesglose} style={{ width: `${(tipo.pagoNeto / maximo) * 100}%` }} />
              </div>
              <div className={styles.notaDesglose}>
                {tipo.sesionesAtendidas} sesión{tipo.sesionesAtendidas === 1 ? '' : 'es'} atendida
                {tipo.sesionesAtendidas === 1 ? '' : 's'}
                {tipo.copagosRecaudados > 0 && ` · ${formatearCOP(tipo.copagosRecaudados)} copagos`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PanelDesglose({ desglose }: { desglose: DesglosePaciente[] }) {
  const maximo = Math.max(...desglose.map((d) => d.total), 1)

  return (
    <div className={styles.panelDesglose}>
      <div className={styles.tituloPanelGrafico}>Por paciente</div>
      <div className={styles.subtituloPanelGrafico}>Quién generó más ingresos este mes</div>
      <div className={styles.listaDesglose}>
        {desglose.map((paciente) => (
          <div key={paciente.pacienteId} className={styles.filaDesglose}>
            <div className={styles.avatarDesglose}>
              {paciente.nombre
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((parte) => parte[0]?.toUpperCase())
                .join('')}
            </div>
            <div className={styles.infoDesglose}>
              <div className={styles.filaNombreDesglose}>
                <span className={styles.nombreDesglose}>{paciente.nombre}</span>
                <span className={styles.valorDesglose}>{formatearCOP(paciente.total)}</span>
              </div>
              <div className={styles.pistaDesglose}>
                <div className={styles.rellenoDesglose} style={{ width: `${(paciente.total / maximo) * 100}%` }} />
              </div>
              <div className={styles.notaDesglose}>
                {paciente.sesiones} sesión{paciente.sesiones === 1 ? '' : 'es'} · {formatearCOP(paciente.pagoNeto)} pago neto
                {paciente.copagos > 0 && ` · ${formatearCOP(paciente.copagos)} copagos`}
              </div>
            </div>
          </div>
        ))}
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
