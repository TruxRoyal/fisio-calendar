import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { autorizacionesResumenApi, capacidadApi, citasApi, pacientesBusquedaApi } from '../../api'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { formatearMiles } from '../../../../shared/lib/moneda'
import {
  formatearDuracionHoras,
  formatearFechaLarga,
  formatearHora,
  formatearMinutosRestantes,
  hoyISO,
  minutosRestantes,
} from '../../../../shared/lib/fecha'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, CapacidadMensual, Cita, PacienteBusqueda } from '../../types'
import type { TipoTerapia } from '../../../../shared/types/comun'
import styles from './PanelPacientes.module.css'

interface PropiedadesPanelPacientes {
  onSeleccionarPaciente: (paciente: PacienteBusqueda) => void
  onIniciarArrastrePaciente: (paciente: PacienteBusqueda, evento: ReactMouseEvent) => void
}

type Filtro = 'todos' | TipoTerapia

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function PanelPacientes({ onSeleccionarPaciente, onIniciarArrastrePaciente }: PropiedadesPanelPacientes) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [pacientes, setPacientes] = useState<PacienteBusqueda[]>([])
  const [citasHoy, setCitasHoy] = useState<Cita[]>([])
  const [autorizacionProxima, setAutorizacionProxima] = useState<AutorizacionResumen | null>(null)
  const [capacidad, setCapacidad] = useState<CapacidadMensual | null>(null)

  useEffect(() => {
    pacientesBusquedaApi.listar(busqueda).then(setPacientes)
  }, [busqueda])

  useEffect(() => {
    citasApi.listarPorRango(hoyISO(), hoyISO()).then(setCitasHoy)
  }, [])

  useEffect(() => {
    capacidadApi.obtener().then(setCapacidad)
  }, [])

  const hechas = citasHoy.filter((c) => c.estado === 'atendida').length
  const pendientes = citasHoy.filter((c) => c.estado === 'agendada').length
  const recaudo = citasHoy
    .filter((c) => c.estado === 'atendida')
    .reduce((total, c) => total + (c.valorSesion ?? 0) + c.copagoCobrado, 0)

  const proximaVisita = useMemo(() => {
    const ahoraISO = new Date().toISOString().slice(0, 19)
    return citasHoy
      .filter((c) => c.estado === 'agendada' && c.inicio >= ahoraISO)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
  }, [citasHoy])

  useEffect(() => {
    if (!proximaVisita) {
      setAutorizacionProxima(null)
      return
    }
    autorizacionesResumenApi.obtenerActiva(proximaVisita.pacienteId).then(setAutorizacionProxima)
  }, [proximaVisita])

  const pacientesFiltrados = pacientes.filter((p) => filtro === 'todos' || p.tipoTerapia === filtro)

  return (
    <aside className={styles.panel}>
      <div className={styles.encabezado}>
        <div className={styles.etiquetaHoy}>Hoy</div>
        <div className={styles.fechaHoy}>{formatearFechaLarga(hoyISO())}</div>
      </div>

      <div className={styles.gridEstadisticas}>
        <TarjetaEstadistica etiqueta="Hechas" valor={`${hechas}/${citasHoy.length}`} />
        <TarjetaEstadistica etiqueta="Pendientes" valor={String(pendientes)} />
        <TarjetaEstadistica etiqueta="Recaudo" valor={formatearMiles(recaudo)} acentuada />
      </div>

      {capacidad && <WidgetCargaMensual capacidad={capacidad} />}

      <div className={styles.seccionProxima}>
        {proximaVisita ? (
          <div className={styles.tarjeta}>
            <div className={styles.filaProximaCabecera}>
              <span className={styles.etiquetaProxima}>Próxima visita</span>
              <span className={styles.badgeMinutos}>{formatearMinutosRestantes(minutosRestantes(proximaVisita.inicio))}</span>
            </div>
            <div className={styles.filaProximaPaciente}>
              <div className={styles.avatarProxima}>{iniciales(proximaVisita.paciente.nombre)}</div>
              <div className={styles.infoProxima}>
                <div className={styles.nombreProxima}>{proximaVisita.paciente.nombre}</div>
                <div className={styles.horaProxima}>{formatearHora(proximaVisita.inicio)}</div>
              </div>
            </div>
            {autorizacionProxima && (
              <div className={styles.filaBadges}>
                {autorizacionProxima.alertaVencimiento && (
                  <span className={styles.badgeAlerta}>
                    <Icono nombre="alerta" tamano={12} grosor={2.1} />
                    Autorización por vencer
                  </span>
                )}
                <span className={styles.badgeSesiones}>{autorizacionProxima.sesionesRestantes} sesión(es) restante(s)</span>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.vacioProxima}>
            {citasHoy.filter((c) => c.estado === 'agendada').length === 0
              ? 'No quedan visitas pendientes hoy'
              : 'Ya pasó la hora de las visitas pendientes de hoy'}
          </div>
        )}
      </div>

      <div className={styles.filaBusqueda}>
        <div className={styles.contenedorBusqueda}>
          <Icono nombre="buscar" tamano={16} className={styles.iconoBusqueda} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente…"
            className={styles.inputBusqueda}
          />
        </div>
      </div>

      <div className={styles.filaFiltros}>
        {(
          [
            { id: 'todos', label: 'Todos' },
            { id: 'respiratoria', label: 'Respiratoria' },
            { id: 'fisica', label: 'Física' },
          ] as { id: Filtro; label: string }[]
        ).map((f) => {
          const activo = filtro === f.id
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(styles.chipFiltro, activo && styles.activo)}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className={styles.listaPacientes}>
        {pacientesFiltrados.map((paciente) => {
          const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
          const avatarBg = paciente.color ? `${paciente.color}22` : (color?.bg ?? 'var(--s3)')
          const avatarFg = paciente.color ?? color?.fg ?? 'var(--t3)'
          return (
            <button
              type="button"
              key={paciente.id}
              onClick={() => onSeleccionarPaciente(paciente)}
              onMouseDown={(evento) => onIniciarArrastrePaciente(paciente, evento)}
              title="Clic para agendar hoy, o arrastra hasta un horario en la semana"
              className={styles.itemPaciente}
            >
              <div
                className={styles.avatarPaciente}
                style={{ '--avatar-bg': avatarBg, '--avatar-fg': avatarFg } as CSSProperties}
              >
                {iniciales(paciente.nombre)}
              </div>
              <div className={styles.infoPaciente}>
                <div className={styles.filaNombrePaciente}>
                  <span className={styles.nombrePaciente}>{paciente.nombre}</span>
                  {paciente.tipoTerapia && (
                    <Icono
                      nombre={paciente.tipoTerapia === 'respiratoria' ? 'pulmon' : 'pulso'}
                      tamano={13}
                      grosor={1.9}
                      className={styles.iconoTipoPaciente}
                    />
                  )}
                  {paciente.origen === 'extra' && <span className={styles.badgeExtra}>Extra</span>}
                </div>
                <div className={styles.subtituloPaciente}>{paciente.eps ?? 'Particular'}</div>
              </div>
            </button>
          )
        })}
        {pacientesFiltrados.length === 0 && <p className={styles.vacioLista}>No hay pacientes que coincidan</p>}
      </div>
    </aside>
  )
}

function WidgetCargaMensual({ capacidad }: { capacidad: CapacidadMensual }) {
  const maxReferencia = Math.max(capacidad.minutosEstimados, capacidad.minutosReales, 1)
  const pctEstimado = Math.min(100, (capacidad.minutosEstimados / maxReferencia) * 100)
  const pctReal = Math.min(100, (capacidad.minutosReales / maxReferencia) * 100)

  return (
    <div className={styles.seccionCarga}>
      <div className={styles.tarjeta}>
        <div className={styles.filaTituloCarga}>
          <Icono nombre="reloj" tamano={13} grosor={2} className={styles.iconoTipoPaciente} />
          <span className={styles.etiquetaCarga}>Carga del mes</span>
        </div>

        <BarraCarga etiqueta="Estimado" valor={formatearDuracionHoras(capacidad.minutosEstimados)} pct={pctEstimado} color="var(--s4)" colorTexto="var(--t2)" />
        <BarraCarga etiqueta="Real" valor={formatearDuracionHoras(capacidad.minutosReales)} pct={pctReal} color="var(--acD)" colorTexto="var(--acT)" />

        <div className={styles.notaCarga}>Estimado: sesiones pendientes × 30 min · Real: duración de las sesiones ya atendidas este mes</div>
      </div>
    </div>
  )
}

function BarraCarga({ etiqueta, valor, pct, color, colorTexto }: { etiqueta: string; valor: string; pct: number; color: string; colorTexto: string }) {
  return (
    <div className={styles.barra}>
      <div className={styles.barraCabecera}>
        <span className={styles.barraEtiqueta}>{etiqueta}</span>
        <span className={styles.barraValor} style={{ '--color-texto': colorTexto } as CSSProperties}>{valor}</span>
      </div>
      <div className={styles.pistaBarra}>
        <div className={styles.rellenoBarra} style={{ '--ancho': `${pct}%`, '--color-barra': color } as CSSProperties} />
      </div>
    </div>
  )
}

function TarjetaEstadistica({ etiqueta, valor, acentuada }: { etiqueta: string; valor: string; acentuada?: boolean }) {
  return (
    <div className={cn(styles.tarjetaEstadistica, acentuada && styles.acentuada)}>
      <div className={styles.valorEstadistica}>{valor}</div>
      <div className={styles.etiquetaEstadistica}>{etiqueta}</div>
    </div>
  )
}
