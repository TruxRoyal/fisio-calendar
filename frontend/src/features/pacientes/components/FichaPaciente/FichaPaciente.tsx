import { Fragment, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { Badge } from '../../../../shared/components/ui/badge'
import { DialogoConfirmacion } from '../../../../shared/components/DialogoConfirmacion/DialogoConfirmacion'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { AtmosferaFondo } from '../../../../shared/components/AtmosferaFondo/AtmosferaFondo'
import type { NombreIcono } from '../../../../shared/components/Icono/Icono'
import { usePacientesStore } from '../../store'
import { autorizacionesApi, pacientesApi } from '../../api'
import { FormularioPaciente } from '../FormularioPaciente/FormularioPaciente'
import { SeccionAutorizacion } from '../SeccionAutorizacion/SeccionAutorizacion'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { calcularEdad, diasHasta, formatearFechaCorta, formatearMesAnio } from '../../../../shared/lib/fecha'
import { cn } from '../../../../shared/lib/clases'
import type { TipoTerapia } from '../../../../shared/types/comun'
import type { Autorizacion, EventoCronologia, PacienteDetalle, ResumenFinancieroPaciente } from '../../types'
import styles from './FichaPaciente.module.css'

interface PropiedadesFichaPaciente {
  paciente: PacienteDetalle
}

const ETIQUETA_CORTA_TIPO_TERAPIA: Record<TipoTerapia, string> = {
  respiratoria: 'Respiratoria',
  fisica: 'Física',
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

const ICONO_EVENTO: Record<EventoCronologia['tipo'], NombreIcono> = {
  sesion_atendida: 'check',
  sesion_cancelada: 'cerrar',
  copago: 'ingresos',
  autorizacion: 'calendario',
}

export function FichaPaciente({ paciente }: PropiedadesFichaPaciente) {
  const navegar = useNavigate()
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [confirmandoEliminacion, setConfirmandoEliminacion] = useState(false)
  const actualizarPaciente = usePacientesStore((estado) => estado.actualizarPaciente)
  const eliminarPaciente = usePacientesStore((estado) => estado.eliminarPaciente)
  const seleccionarPaciente = usePacientesStore((estado) => estado.seleccionarPaciente)

  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([])
  const [eventos, setEventos] = useState<EventoCronologia[]>([])
  const [financiero, setFinanciero] = useState<ResumenFinancieroPaciente | null>(null)

  useEffect(() => {
    autorizacionesApi.listarPorPaciente(paciente.id).then((lista) => {
      setAutorizaciones(lista.filter((a) => a.activa))
    })
    pacientesApi.obtenerCronologia(paciente.id).then(setEventos)
    const ahora = new Date()
    pacientesApi.obtenerResumenFinanciero(paciente.id, ahora.getFullYear(), ahora.getMonth() + 1).then(setFinanciero)
  }, [paciente.id])

  async function confirmarEliminacion() {
    await eliminarPaciente(paciente.id)
  }

  const ultimaSesion = eventos.find((e) => e.tipo === 'sesion_atendida')

  const autorizacionesConVencimiento = autorizaciones.map((autorizacion) => ({
    autorizacion,
    diasParaVencer: autorizacion.fechaVencimiento ? diasHasta(autorizacion.fechaVencimiento) : null,
  }))
  const alertasVencimiento = autorizacionesConVencimiento.filter(
    (item): item is { autorizacion: Autorizacion; diasParaVencer: number } =>
      item.diasParaVencer !== null && item.diasParaVencer <= 7,
  )

  return (
    <div className={styles.ficha}>
      <AtmosferaFondo intensidad="suave" origen="superior-derecha" className={styles.heroCabecera}>
        <div className={styles.cabecera}>
          <div
            className={styles.avatar}
            style={
              paciente.color
                ? ({ '--avatar-bg': `${paciente.color}22`, '--avatar-fg': paciente.color } as CSSProperties)
                : undefined
            }
          >
            {iniciales(paciente.nombre)}
          </div>
          <div className={styles.infoCabecera}>
            <div className={styles.filaNombre}>
              <h1 className={styles.nombre}>{paciente.nombre}</h1>
              {paciente.origen === 'extra' && <Badge variant="accent">Extra</Badge>}
            </div>
            <div className={styles.filaInfoLineas}>
              {paciente.fechaNacimiento && (
                <InfoLinea icono="paciente" texto={`${calcularEdad(paciente.fechaNacimiento)} años`} />
              )}
              {paciente.direccion && <InfoLinea icono="ubicacion" texto={paciente.direccion} />}
              {paciente.telefono && <InfoLinea icono="telefono" texto={paciente.telefono} />}
            </div>
          </div>
          <Boton variante="secundario" onClick={() => setFormularioAbierto(true)}>
            Editar
          </Boton>
        </div>
      </AtmosferaFondo>

      <div className={styles.filaAccionesRapidas}>
        <a
          href={paciente.telefono ? `tel:${paciente.telefono}` : undefined}
          aria-disabled={!paciente.telefono}
          className={cn(styles.botonAccionRapida, !paciente.telefono && styles.deshabilitado)}
        >
          <Icono nombre="telefono" tamano={16} grosor={1.9} />
          Llamar
        </a>
        <a
          href={
            paciente.direccion
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(paciente.direccion)}`
              : undefined
          }
          target="_blank"
          rel="noreferrer"
          aria-disabled={!paciente.direccion}
          className={cn(styles.botonAccionRapida, !paciente.direccion && styles.deshabilitado)}
        >
          <Icono nombre="ubicacion" tamano={16} grosor={1.9} />
          Ir
        </a>
        <button type="button" onClick={() => navegar('/calendario')} className={cn(styles.botonAccionRapida, styles.destacado)}>
          Agendar
        </button>
      </div>

      {alertasVencimiento.map(({ autorizacion, diasParaVencer }) => (
        <div key={autorizacion.id} className={styles.alertaVencimiento}>
          <Icono nombre="alerta" tamano={18} grosor={2} className={styles.iconoAlerta} />
          <div className={styles.contenidoAlerta}>
            <div className={styles.tituloAlerta}>
              {ETIQUETA_CORTA_TIPO_TERAPIA[autorizacion.tipoTerapia]}: {describirVencimiento(diasParaVencer)}
              {autorizacion.sesionesRestantes <= 2 && ` y quedan ${autorizacion.sesionesRestantes} sesión(es)`}
            </div>
            <div className={styles.subAlerta}>Conviene tramitar la renovación con {paciente.eps ?? 'la EPS'} pronto.</div>
          </div>
        </div>
      ))}

      <div className={styles.gridStats}>
        {autorizaciones.length > 0 ? (
          autorizaciones.map((autorizacion) => {
            const diasParaVencer = autorizacion.fechaVencimiento ? diasHasta(autorizacion.fechaVencimiento) : null
            const etiquetaTipo = ETIQUETA_CORTA_TIPO_TERAPIA[autorizacion.tipoTerapia]
            return (
              <Fragment key={autorizacion.id}>
                <TarjetaStat
                  icono="calendario"
                  etiqueta={`Sesiones · ${etiquetaTipo}`}
                  valorGrande={`${autorizacion.sesionesRestantes}`}
                  valorChico={` de ${autorizacion.sesionesTotales}`}
                  barraPct={(autorizacion.sesionesUsadas / Math.max(1, autorizacion.sesionesTotales)) * 100}
                  nota={
                    ultimaSesion
                      ? `${autorizacion.sesionesUsadas} usadas · última el ${formatearFechaCorta(ultimaSesion.fecha)}`
                      : `${autorizacion.sesionesUsadas} usadas`
                  }
                />
                <TarjetaStat
                  icono="reloj"
                  etiqueta={`Vencimiento · ${etiquetaTipo}`}
                  alerta={diasParaVencer !== null && diasParaVencer <= 7}
                  valorGrande={diasParaVencer !== null ? String(diasParaVencer) : '—'}
                  valorChico={diasParaVencer !== null ? ' días' : undefined}
                  nota={autorizacion.fechaVencimiento ? formatearFechaCorta(autorizacion.fechaVencimiento) : 'Sin vencimiento'}
                />
                {paciente.origen !== 'extra' && (
                  <TarjetaStat
                    icono="ingresos"
                    etiqueta={`Copago · ${etiquetaTipo}`}
                    valorGrande={formatearCOP(autorizacion.copago)}
                    nota="Por sesión, en efectivo"
                  />
                )}
              </Fragment>
            )
          })
        ) : (
          <>
            <TarjetaStat icono="calendario" etiqueta="Sesiones" valorGrande="—" nota="Sin autorización activa" />
            <TarjetaStat icono="reloj" etiqueta="Vencimiento" valorGrande="—" nota="Sin autorización activa" />
            {paciente.origen !== 'extra' && (
              <TarjetaStat icono="ingresos" etiqueta="Copago" valorGrande="—" nota="Sin autorización activa" />
            )}
          </>
        )}
        {paciente.origen === 'extra' && (
          <TarjetaStat
            icono="ingresos"
            etiqueta="Tarifa"
            valorGrande={paciente.tarifaSesion !== null ? formatearCOP(paciente.tarifaSesion) : '—'}
            nota="Fija por sesión · paciente extra"
          />
        )}
        <TarjetaStat
          icono="pulso"
          etiqueta="Terapia"
          valorGrande={paciente.tiposTerapia.map((tipo) => ETIQUETA_CORTA_TIPO_TERAPIA[tipo]).join(' + ') || '—'}
          textoLargo
          nota={paciente.eps ?? 'Particular'}
        />
      </div>

      <SeccionAutorizacion
        pacienteId={paciente.id}
        autorizacionesActivas={autorizaciones}
        onActualizado={() => seleccionarPaciente(paciente.id)}
      />

      <div className={styles.gridDetalle}>
        <div className={styles.panel}>
          <div className={styles.tituloPanel}>Cronología</div>
          {eventos.length === 0 && <p className={styles.textoVacioEventos}>Aún no hay eventos registrados.</p>}
          {eventos.map((evento, indice) => (
            <div key={`${evento.tipo}-${evento.fecha}-${indice}`} className={styles.filaEvento}>
              <div className={styles.columnaIconoEvento}>
                <div
                  className={styles.iconoEventoCirculo}
                  style={{ background: colorFondoEvento(evento.tipo), color: colorTextoEvento(evento.tipo) }}
                >
                  <Icono nombre={ICONO_EVENTO[evento.tipo]} tamano={12} grosor={2.4} />
                </div>
                {indice < eventos.length - 1 && <div className={styles.lineaConectora} />}
              </div>
              <div className={styles.contenidoEvento}>
                <div className={styles.filaTituloEvento}>
                  <span className={styles.tituloEvento}>{evento.titulo}</span>
                  <span className={styles.fechaEvento}>{formatearFechaCorta(evento.fecha)}</span>
                </div>
                {evento.detalle && <div className={styles.detalleEvento}>{evento.detalle}</div>}
              </div>
              {evento.monto !== null && <div className={styles.montoEvento}>{formatearCOP(evento.monto)}</div>}
            </div>
          ))}
        </div>

        <div className={styles.columnaLateral}>
          <div className={styles.panel}>
            <div className={cn(styles.tituloPanel, styles.compacto)}>Observaciones</div>
            <div className={styles.textoObservaciones}>{paciente.observaciones || 'Sin observaciones registradas.'}</div>
          </div>

          {financiero && (
            <div className={styles.panel}>
              <div className={cn(styles.tituloPanel, styles.apretado)}>Historial financiero</div>
              <div className={styles.subtituloFinanciero}>{formatearMesAnio(financiero.anio, financiero.mes)}</div>
              <FilaFinanciero etiqueta="Facturado" valor={formatearCOP(financiero.facturado)} destacado />
              <FilaFinanciero etiqueta="Copagos recibidos" valor={formatearCOP(financiero.copagosRecibidos)} ultima />
            </div>
          )}
        </div>
      </div>

      <Boton variante="peligro" tamano="sm" onClick={() => setConfirmandoEliminacion(true)} style={{ alignSelf: 'flex-start' }}>
        Eliminar paciente
      </Boton>

      <FormularioPaciente
        abierto={formularioAbierto}
        pacienteInicial={paciente}
        onCerrar={() => setFormularioAbierto(false)}
        onGuardar={async (solicitud) => {
          await actualizarPaciente(paciente.id, solicitud)
        }}
      />

      <DialogoConfirmacion
        abierto={confirmandoEliminacion}
        onCerrar={() => setConfirmandoEliminacion(false)}
        onConfirmar={confirmarEliminacion}
        titulo={`¿Eliminar a ${paciente.nombre}?`}
        descripcion="Esta acción no se puede deshacer. Se eliminarán sus datos, autorizaciones y cronología asociada."
        textoConfirmar="Eliminar paciente"
        peligro
      />
    </div>
  )
}

function describirVencimiento(dias: number): string {
  if (dias < 0) return 'La autorización ya venció'
  if (dias === 0) return 'La autorización vence hoy'
  return `La autorización vence en ${dias} día(s)`
}

function InfoLinea({ icono, texto }: { icono: NombreIcono; texto: string }) {
  return (
    <span className={styles.lineaInfo}>
      <Icono nombre={icono} tamano={13} grosor={1.9} />
      {texto}
    </span>
  )
}

function colorFondoEvento(tipo: EventoCronologia['tipo']): string {
  if (tipo === 'sesion_atendida') return 'var(--okBg)'
  if (tipo === 'sesion_cancelada') return 'var(--s3)'
  if (tipo === 'copago') return 'var(--acS)'
  return 'var(--acS2)'
}

function colorTextoEvento(tipo: EventoCronologia['tipo']): string {
  if (tipo === 'sesion_atendida') return 'var(--okFg)'
  if (tipo === 'sesion_cancelada') return 'var(--t3)'
  if (tipo === 'copago') return 'var(--acT)'
  return 'var(--acT)'
}

function TarjetaStat({
  icono,
  etiqueta,
  valorGrande,
  valorChico,
  barraPct,
  nota,
  alerta,
  textoLargo,
}: {
  icono: NombreIcono
  etiqueta: string
  valorGrande: string
  valorChico?: string
  barraPct?: number
  nota: string
  alerta?: boolean
  textoLargo?: boolean
}) {
  return (
    <div className={cn(styles.tarjetaStat, alerta && styles.alerta)}>
      <div className={cn(styles.filaEtiquetaStat, alerta && styles.alerta)}>
        <Icono nombre={icono} tamano={12} grosor={2} />
        {etiqueta}
      </div>
      <div className={cn(styles.valorGrandeStat, alerta && styles.alerta, textoLargo && styles.textoLargo)}>
        {valorGrande}
        {valorChico && <span className={cn(styles.valorChicoStat, alerta && styles.alerta)}>{valorChico}</span>}
      </div>
      {barraPct !== undefined && (
        <div className={styles.pistaStat}>
          <div className={styles.rellenoStat} style={{ '--ancho': `${Math.min(100, barraPct)}%` } as CSSProperties} />
        </div>
      )}
      <div className={cn(styles.notaStat, alerta && styles.alerta)}>{nota}</div>
    </div>
  )
}

function FilaFinanciero({ etiqueta, valor, destacado, ultima }: { etiqueta: string; valor: string; destacado?: boolean; ultima?: boolean }) {
  return (
    <div className={cn(styles.filaFinanciero, ultima && styles.ultima)}>
      <span className={styles.etiquetaFinanciero}>{etiqueta}</span>
      <span className={cn(styles.valorFinanciero, destacado && styles.destacado)}>{valor}</span>
    </div>
  )
}
