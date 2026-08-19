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
import { VistaMesMovil } from '../VistaMesMovil/VistaMesMovil'
import { VistaDiaMovil } from '../VistaDiaMovil/VistaDiaMovil'
import { VistaSemanaMovil } from '../VistaSemanaMovil/VistaSemanaMovil'
import {
  combinarFechaHora,
  esMismoDia,
  formatearDiaSemana,
  formatearFechaCorta,
  formatearFechaISO,
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
    setCitasMes([])
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
        setCitasMes([])
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

  const gruposSemana = useMemo(() => agruparPorDia(citas), [citas])

  let citasVisibles: Cita[]
  if (modoVista === 'dia') citasVisibles = citasDelDia
  else if (modoVista === 'semana') citasVisibles = gruposSemana.flatMap((g) => g.citas)
  else citasVisibles = citasDelDiaMes

  const citasDelDiaSinCancelar = citasDelDia.filter((c) => c.estado !== 'cancelada')
  const hechas = citasDelDiaSinCancelar.filter((c) => c.estado === 'atendida')
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
    Promise.allSettled(ids.map((id) => autorizacionesResumenApi.obtenerActiva(id).then((a) => [id, a] as const))).then((resultados) => {
      if (!vigente) return
      const entradas = resultados
        .filter((r): r is PromiseFulfilledResult<readonly [number, AutorizacionResumen | null]> => r.status === 'fulfilled')
        .map((r) => r.value)
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
    const fecha = new Date(anio, mes - 1, dia)
    const inicioSemanaFecha = inicioSemana(fecha)
    const diferenciaSemanas = Math.round((inicioSemanaFecha.getTime() - inicioSemanaActual.getTime()) / (7 * 24 * 60 * 60 * 1000))
    for (let i = 0; i < Math.abs(diferenciaSemanas); i++) irSemana(diferenciaSemanas > 0 ? 1 : -1)
    setDiaSeleccionado(fecha)
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
                  {hechas.length}/{citasDelDiaSinCancelar.length}
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
        )}
      </div>

      <div className={styles.lista} key={modoVista}>
        {modoVista === 'dia' && (
          <VistaDiaMovil
            citasDelDia={citasDelDia}
            autorizaciones={autorizaciones}
            indiceAhora={indiceAhora}
            onAbrirCita={abrirCitaExistente}
          />
        )}

        {modoVista === 'semana' && (
          <VistaSemanaMovil
            gruposSemana={gruposSemana}
            autorizaciones={autorizaciones}
            onIrADia={irADia}
            onAbrirCita={abrirCitaExistente}
          />
        )}

        {modoVista === 'mes' && (
          <VistaMesMovil
            diasGrilla={diasGrillaMes}
            mesReferencia={mesReferencia}
            diaSeleccionadoISO={diaSeleccionadoISO}
            citasMes={citasMes}
            citasDelDiaSeleccionado={citasDelDiaMes}
            autorizaciones={autorizaciones}
            cargando={cargandoMes}
            error={errorMes}
            onSeleccionarDia={alSeleccionarDiaMes}
            onReintentar={() => setMesReferencia((f) => new Date(f))}
            onIrADia={irADia}
            onAbrirCita={abrirCitaExistente}
          />
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
