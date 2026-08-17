import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useCitas } from '../../hooks/useCitas'
import { useGestionCita } from '../../hooks/useGestionCita'
import { contarVisitasPorDia } from '../../lib'
import { citasApi, autorizacionesResumenApi } from '../../api'
import { DrawerCita } from '../DrawerCita/DrawerCita'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { AlertaMensaje } from '../../../../shared/components/AlertaMensaje/AlertaMensaje'
import { PaletaComandos } from '../../../../shared/components/PaletaComandos/PaletaComandos'
import { ToggleGroup, ToggleGroupItem } from '../../../../shared/components/ui/toggle-group'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import {
  combinarFechaHora,
  esMismoDia,
  formatearDiaSemana,
  formatearFechaCorta,
  formatearFechaISO,
  formatearHora,
  formatearMesAnio,
  hoy,
  hoyISO,
  inicioMes,
  inicioSemana,
  sumarDias,
} from '../../../../shared/lib/fecha'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, Cita, VistaCalendario } from '../../types'
import styles from './VistaAgendaMovil.module.css'

function agruparPorDia(citas: Cita[]): { fechaISO: string; citas: Cita[] }[] {
  const mapa = new Map<string, Cita[]>()
  for (const cita of citas) {
    const fechaISO = cita.inicio.slice(0, 10)
    const lista = mapa.get(fechaISO) ?? []
    lista.push(cita)
    mapa.set(fechaISO, lista)
  }
  const entradas = Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b))
  return entradas.map(([fechaISO, lista]) => ({ fechaISO, citas: lista.toSorted((a, b) => a.inicio.localeCompare(b.inicio)) }))
}

export function VistaAgendaMovil() {
  const { citas, inicioSemanaActual, irSemana, irHoy } = useCitas()
  const {
    citaSeleccionada,
    abrirCitaExistente,
    abrirCitaNueva,
    cerrarDrawer,
    onCrear,
    onGuardarCampos,
    onCambiarEstado,
    onActualizarCopago,
    mensajeError,
    setMensajeError,
  } = useGestionCita()
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date())
  const [modoVista, setModoVista] = useState<VistaCalendario>('dia')
  const [mesReferencia, setMesReferencia] = useState(() => hoy())
  const [citasMes, setCitasMes] = useState<Cita[]>([])
  const [cargandoMes, setCargandoMes] = useState(false)
  const [errorMes, setErrorMes] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [autorizaciones, setAutorizaciones] = useState<Record<number, AutorizacionResumen | null>>({})

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemanaActual, i))
  const diaSeleccionadoISO = formatearFechaISO(diaSeleccionado)
  const esHoySeleccionado = esMismoDia(diaSeleccionadoISO, hoyISO())
  const ahora = new Date()
  const horaAhora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

  const diasGrillaMes = useMemo(() => {
    const inicioGrilla = inicioSemana(inicioMes(mesReferencia))
    return Array.from({ length: 42 }, (_, i) => sumarDias(inicioGrilla, i))
  }, [mesReferencia])

  useEffect(() => {
    if (modoVista !== 'mes') return
    let vigente = true
    setCargandoMes(true)
    setErrorMes(false)
    const desde = formatearFechaISO(diasGrillaMes[0])
    const hasta = formatearFechaISO(diasGrillaMes[41])
    citasApi
      .listarPorRango(desde, hasta)
      .then((datos) => {
        if (!vigente) return
        setCitasMes(datos)
        setCargandoMes(false)
      })
      .catch(() => {
        if (!vigente) return
        setErrorMes(true)
        setCargandoMes(false)
      })
    return () => {
      vigente = false
    }
  }, [modoVista, diasGrillaMes])

  const citasDelDia = useMemo(
    () => citas.filter((cita) => cita.inicio.startsWith(diaSeleccionadoISO)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [citas, diaSeleccionadoISO],
  )

  const citasDelDiaMes = useMemo(
    () => citasMes.filter((cita) => cita.inicio.startsWith(diaSeleccionadoISO)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [citasMes, diaSeleccionadoISO],
  )

  const gruposSemana = useMemo(() => agruparPorDia(citas.filter((c) => c.estado !== 'cancelada')), [citas])

  let citasVisibles: Cita[]
  if (modoVista === 'dia') citasVisibles = citasDelDia
  else if (modoVista === 'semana') citasVisibles = gruposSemana.flatMap((g) => g.citas)
  else citasVisibles = citasDelDiaMes

  const hechas = citasDelDia.filter((c) => c.estado === 'atendida')
  const recaudo = hechas.reduce((total, c) => total + c.copagoCobrado, 0)

  const indiceAhora = esHoySeleccionado ? citasDelDia.findIndex((c) => c.inicio.slice(11, 16) > horaAhora) : -1

  const idsPacientesClave = useMemo(
    () => Array.from(new Set(citasVisibles.map((c) => c.pacienteId))).sort((a, b) => a - b).join(','),
    [citasVisibles],
  )

  useEffect(() => {
    if (!idsPacientesClave) return
    let vigente = true
    const ids = idsPacientesClave.split(',').map(Number)
    Promise.all(ids.map((id) => autorizacionesResumenApi.obtenerActiva(id).then((a) => [id, a] as const))).then((entradas) => {
      if (!vigente) return
      setAutorizaciones((actual) => ({ ...actual, ...Object.fromEntries(entradas) }))
    })
    return () => {
      vigente = false
    }
  }, [idsPacientesClave])

  function alSeleccionarDia(dia: Date) {
    setDiaSeleccionado(dia)
    if (dia < inicioSemanaActual) irSemana(-1)
    if (dia > sumarDias(inicioSemanaActual, 6)) irSemana(1)
  }

  function alSeleccionarDiaMes(dia: Date) {
    setDiaSeleccionado(dia)
    if (dia.getMonth() !== mesReferencia.getMonth() || dia.getFullYear() !== mesReferencia.getFullYear()) {
      setMesReferencia(new Date(dia.getFullYear(), dia.getMonth(), 1))
    }
  }

  function irADia(fechaISO: string) {
    const [anio, mes, dia] = fechaISO.split('-').map(Number)
    setDiaSeleccionado(new Date(anio, mes - 1, dia))
    setModoVista('dia')
  }

  function irHoyCompleto() {
    setDiaSeleccionado(new Date())
    setMesReferencia(hoy())
    irHoy()
  }

  let etiquetaCabecera: string
  let tituloCabecera: string
  if (modoVista === 'dia') {
    etiquetaCabecera = formatearDiaSemana(diaSeleccionadoISO, false)
    tituloCabecera = formatearFechaTitulo(diaSeleccionado)
  } else if (modoVista === 'semana') {
    etiquetaCabecera = 'Semana'
    tituloCabecera = `${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[0]), '00:00'))} – ${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[6]), '00:00'))}`
  } else {
    etiquetaCabecera = 'Mes'
    tituloCabecera = formatearMesAnio(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1)
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <div className={styles.filaTitulo}>
          <div className={styles.infoTitulo} key={modoVista}>
            <div className={styles.etiqueta}>{etiquetaCabecera}</div>
            <div className={styles.titulo}>{tituloCabecera}</div>
          </div>
          <button
            type="button"
            onClick={() => setBuscadorAbierto(true)}
            aria-label="Abrir búsqueda"
            className={styles.botonIconoCabecera}
          >
            <Icono nombre="buscar" tamano={18} grosor={1.9} />
          </button>
          <button type="button" onClick={irHoyCompleto} className={styles.botonHoy}>
            Hoy
          </button>
        </div>

        <ToggleGroup
          type="single"
          value={modoVista}
          onValueChange={(valor) => valor && setModoVista(valor as VistaCalendario)}
          className={styles.selectorModo}
        >
          <ToggleGroupItem value="dia" className={styles.opcionModo}>
            Día
          </ToggleGroupItem>
          <ToggleGroupItem value="semana" className={styles.opcionModo}>
            Semana
          </ToggleGroupItem>
          <ToggleGroupItem value="mes" className={styles.opcionModo}>
            Mes
          </ToggleGroupItem>
        </ToggleGroup>

        {modoVista === 'dia' && (
          <>
            <div className={styles.tiraDias}>
              {dias.map((dia) => {
                const iso = formatearFechaISO(dia)
                const seleccionado = iso === diaSeleccionadoISO
                const esHoy = esMismoDia(iso, hoyISO())
                const tieneVisitas = contarVisitasPorDia(citas, dia) > 0
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => alSeleccionarDia(dia)}
                    className={cn(styles.chipDia, seleccionado && styles.seleccionado, !seleccionado && esHoy && styles.hoy)}
                  >
                    <span className={styles.nombreChip}>{formatearDiaSemana(iso)}</span>
                    <span className={styles.numeroChip}>{dia.getDate()}</span>
                    <span className={cn(styles.puntoChip, tieneVisitas && styles.visible)} />
                  </button>
                )
              })}
            </div>

            <div className={styles.filaStats}>
              <div className={styles.stat}>
                <span className={styles.valorStat}>
                  {hechas.length}/{citasDelDia.length}
                </span>
                <span className={styles.etiquetaStat}>hechas</span>
              </div>
              <div className={styles.stat}>
                <span className={cn(styles.valorStat, styles.acento)}>{formatearCOP(recaudo)}</span>
                <span className={styles.etiquetaStat}>recaudo</span>
              </div>
            </div>
          </>
        )}

        {modoVista === 'semana' && (
          <div className={styles.filaNavRango}>
            <button type="button" onClick={() => irSemana(-1)} aria-label="Semana anterior" className={styles.botonNavRango}>
              <Icono nombre="chevronIzquierda" tamano={16} grosor={2} />
            </button>
            <button type="button" onClick={() => irSemana(1)} aria-label="Semana siguiente" className={styles.botonNavRango}>
              <Icono nombre="chevronDerecha" tamano={16} grosor={2} />
            </button>
          </div>
        )}

        {modoVista === 'mes' && (
          <>
            <div className={styles.filaNavRango}>
              <button
                type="button"
                onClick={() => setMesReferencia((f) => new Date(f.getFullYear(), f.getMonth() - 1, 1))}
                aria-label="Mes anterior"
                className={styles.botonNavRango}
              >
                <Icono nombre="chevronIzquierda" tamano={16} grosor={2} />
              </button>
              <button
                type="button"
                onClick={() => setMesReferencia((f) => new Date(f.getFullYear(), f.getMonth() + 1, 1))}
                aria-label="Mes siguiente"
                className={styles.botonNavRango}
              >
                <Icono nombre="chevronDerecha" tamano={16} grosor={2} />
              </button>
            </div>

            <div className={styles.filaNombresGrilla}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((n, i) => (
                <div key={`${n}-${i}`} className={styles.nombreDiaGrilla}>
                  {n}
                </div>
              ))}
            </div>

            <div className={styles.grillaMes}>
              {diasGrillaMes.map((dia) => {
                const iso = formatearFechaISO(dia)
                const enMes = dia.getMonth() === mesReferencia.getMonth()
                const esHoy = esMismoDia(iso, hoyISO())
                const seleccionado = iso === diaSeleccionadoISO
                const tieneVisitas = contarVisitasPorDia(citasMes, dia) > 0
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => alSeleccionarDiaMes(dia)}
                    className={cn(
                      styles.celdaMes,
                      !enMes && styles.fueraDeMes,
                      esHoy && styles.hoyCelda,
                      seleccionado && styles.seleccionadaCelda,
                    )}
                  >
                    <span className={styles.numeroCelda}>{dia.getDate()}</span>
                    <span className={cn(styles.puntoCelda, tieneVisitas && styles.visible)} />
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className={styles.lista} key={modoVista}>
        {modoVista === 'dia' &&
          citasDelDia.map((cita, indice) => (
            <div key={cita.id}>
              {indice === indiceAhora && (
                <div className={styles.divisorAhora}>
                  <span className={styles.puntoAhora} />
                  <span className={styles.textoAhora}>AHORA</span>
                  <span className={styles.lineaAhora} />
                </div>
              )}
              <TarjetaCitaMovil cita={cita} autorizacion={autorizaciones[cita.pacienteId]} onAbrir={() => abrirCitaExistente(cita)} />
            </div>
          ))}

        {modoVista === 'dia' && citasDelDia.length === 0 && (
          <div className={styles.vacio}>
            <Icono nombre="calendario" tamano={22} grosor={1.6} />
            <p>No hay citas agendadas para este día.</p>
          </div>
        )}

        {modoVista === 'semana' &&
          gruposSemana.map((grupo) => (
            <div key={grupo.fechaISO}>
              <button type="button" onClick={() => irADia(grupo.fechaISO)} className={styles.cabeceraGrupo}>
                <span className={cn(esMismoDia(grupo.fechaISO, hoyISO()) && styles.hoyGrupo)}>
                  {formatearDiaSemana(grupo.fechaISO, false)} {formatearFechaCorta(combinarFechaHora(grupo.fechaISO, '00:00'))}
                </span>
                <Icono nombre="chevronDerecha" tamano={14} grosor={2} />
              </button>
              {grupo.citas.map((cita) => (
                <TarjetaCitaMovil key={cita.id} cita={cita} autorizacion={autorizaciones[cita.pacienteId]} onAbrir={() => abrirCitaExistente(cita)} />
              ))}
            </div>
          ))}

        {modoVista === 'semana' && gruposSemana.length === 0 && (
          <div className={styles.vacio}>
            <Icono nombre="calendario" tamano={22} grosor={1.6} />
            <p>No hay citas agendadas en este rango.</p>
          </div>
        )}

        {modoVista === 'mes' && cargandoMes && (
          <div className={styles.vacio}>
            <p>Cargando…</p>
          </div>
        )}

        {modoVista === 'mes' && !cargandoMes && errorMes && (
          <div className={styles.vacio}>
            <Icono nombre="alerta" tamano={22} grosor={1.6} />
            <p>No se pudo cargar el mes.</p>
            <button type="button" onClick={() => setMesReferencia((f) => new Date(f))} className={styles.botonReintentar}>
              Reintentar
            </button>
          </div>
        )}

        {modoVista === 'mes' && !cargandoMes && !errorMes && (
          <>
            <button type="button" onClick={() => irADia(diaSeleccionadoISO)} className={styles.cabeceraGrupo}>
              <span className={cn(esHoySeleccionado && styles.hoyGrupo)}>
                {formatearDiaSemana(diaSeleccionadoISO, false)} {formatearFechaCorta(combinarFechaHora(diaSeleccionadoISO, '00:00'))}
              </span>
              <Icono nombre="chevronDerecha" tamano={14} grosor={2} />
            </button>
            {citasDelDiaMes.map((cita) => (
              <TarjetaCitaMovil key={cita.id} cita={cita} autorizacion={autorizaciones[cita.pacienteId]} onAbrir={() => abrirCitaExistente(cita)} />
            ))}
            {citasDelDiaMes.length === 0 && (
              <div className={styles.vacio}>
                <Icono nombre="calendario" tamano={22} grosor={1.6} />
                <p>No hay citas agendadas este día.</p>
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => abrirCitaNueva(combinarFechaHora(diaSeleccionadoISO, '08:00'))}
        aria-label="Crear cita"
        className={styles.botonAgregar}
      >
        <Icono nombre="mas" tamano={24} grosor={2.3} />
      </button>

      {citaSeleccionada && (
        <DrawerCita
          cita={citaSeleccionada}
          onCerrar={cerrarDrawer}
          onCrear={onCrear}
          onGuardarCampos={onGuardarCampos}
          onCambiarEstado={onCambiarEstado}
          onActualizarCopago={onActualizarCopago}
        />
      )}

      <AlertaMensaje mensaje={mensajeError} onCerrar={() => setMensajeError(null)} />
      <PaletaComandos abierta={buscadorAbierto} onCerrar={() => setBuscadorAbierto(false)} />
    </div>
  )
}

function formatearFechaTitulo(fecha: Date): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]}`
}

function TarjetaCitaMovil({ cita, autorizacion, onAbrir }: { cita: Cita; autorizacion?: AutorizacionResumen | null; onAbrir: () => void }) {
  const estado = cita.estado
  const colorTipo = cita.paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[cita.paciente.tipoTerapia] : null
  const colorBorde = cita.paciente.color ?? colorTipo?.fg ?? 'var(--ac)'
  const sesionesBajas = !!autorizacion && (autorizacion.sesionesRestantes <= 1 || autorizacion.alertaVencimiento)

  return (
    <button type="button" onClick={onAbrir} className={styles.filaCita}>
      <div className={styles.columnaHora}>
        <span className={cn(styles.hora, styles[estado])}>{formatearHora(cita.inicio)}</span>
      </div>
      <div className={cn(styles.tarjeta, styles[estado])} style={{ '--color-borde': colorBorde } as CSSProperties}>
        <div className={styles.filaNombre}>
          <span className={styles.nombre}>{cita.paciente.nombre}</span>
          {cita.paciente.tipoTerapia && (
            <Icono
              nombre={cita.paciente.tipoTerapia === 'respiratoria' ? 'pulmon' : 'pulso'}
              tamano={13}
              grosor={1.9}
              className={styles.iconoTipo}
            />
          )}
          {estado === 'atendida' && <Icono nombre="check" tamano={14} grosor={2.6} className={styles.iconoCheck} />}
        </div>
        {cita.paciente.direccion && (
          <div className={styles.filaDireccion}>
            <Icono nombre="ubicacion" tamano={12} grosor={1.9} />
            <span>{cita.paciente.direccion}</span>
          </div>
        )}
        {(autorizacion || cita.copagoCobrado > 0) && (
          <div className={styles.filaBadges}>
            {autorizacion && (
              <span className={cn(styles.badgeSesiones, sesionesBajas && styles.urgente)}>
                {autorizacion.sesionesRestantes <= 1
                  ? `${autorizacion.sesionesRestantes} sesión restante`
                  : `${autorizacion.sesionesRestantes} sesiones`}
              </span>
            )}
            {cita.copagoCobrado > 0 && <span className={styles.badgeCopago}>Copago {formatearCOP(cita.copagoCobrado)}</span>}
          </div>
        )}
      </div>
    </button>
  )
}
