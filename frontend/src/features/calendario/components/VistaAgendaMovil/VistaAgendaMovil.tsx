import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCitas } from '../../hooks/useCitas'
import { useGestionCita } from '../../hooks/useGestionCita'
import { useArrastreMovil } from '../../hooks/useArrastreMovil'
import type { PosicionArrastre } from '../../hooks/useArrastreMovil'
import { rangoHorarioDelDia } from '../../lib'
import { citasApi, autorizacionesResumenApi, capacidadApi } from '../../api'
import { DrawerCita } from '../DrawerCita/DrawerCita'
import { ALTURA_HORA } from '../GrillaHoraria/GrillaHoraria'
import { PIXELES_POR_HORA as ANCHO_HORA_SEMANA } from '../GrillaSemanal/GrillaSemanal'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { AlertaMensaje } from '../../../../shared/components/AlertaMensaje/AlertaMensaje'
import { PaletaComandos } from '../../../../shared/components/PaletaComandos/PaletaComandos'
import { ToggleGroup, ToggleGroupItem } from '../../../../shared/components/ui/toggle-group'
import { Badge } from '../../../../shared/components/ui/badge'
import { ErrorPeticion } from '../../../../shared/api/cliente'
import { VistaMesMovil } from '../VistaMesMovil/VistaMesMovil'
import { VistaDiaMovil } from '../VistaDiaMovil/VistaDiaMovil'
import { VistaSemanaMovil } from '../VistaSemanaMovil/VistaSemanaMovil'
import {
  combinarFechaHora,
  formatearDiaSemana,
  formatearFechaCorta,
  formatearFechaISO,
  formatearMesAnio,
  hoy,
  inicioMes,
  inicioSemana,
  sumarDias,
} from '../../../../shared/lib/fecha'
import { formatearCOP } from '../../../../shared/lib/moneda'
import { cn } from '../../../../shared/lib/clases'
import type { AutorizacionResumen, CapacidadMensual, Cita, VistaCalendario } from '../../types'
import styles from './VistaAgendaMovil.module.css'

export function VistaAgendaMovil() {
  const { citas, inicioSemanaActual, irSemana, irASemanaDe, irHoy } = useCitas()
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
    advertencias,
    verificar,
    actualizarCita,
  } = useGestionCita()
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date())
  const [modoVista, setModoVista] = useState<VistaCalendario>('dia')
  const [mesReferencia, setMesReferencia] = useState(() => hoy())
  const [citasMes, setCitasMes] = useState<Cita[]>([])
  const [cargandoMes, setCargandoMes] = useState(false)
  const [errorMes, setErrorMes] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [autorizaciones, setAutorizaciones] = useState<Record<number, AutorizacionResumen | null>>({})
  const [capacidad, setCapacidad] = useState<CapacidadMensual | null>(null)
  const [citaArrastrada, setCitaArrastrada] = useState<PosicionArrastre | null>(null)
  const observadorListaRef = useRef<ResizeObserver | null>(null)
  const [alturaListaDisponible, setAlturaListaDisponible] = useState(0)

  const dias = Array.from({ length: 6 }, (_, i) => sumarDias(inicioSemanaActual, i))
  const diaSeleccionadoISO = formatearFechaISO(diaSeleccionado)

  const listaRef = useCallback((nodo: HTMLDivElement | null) => {
    observadorListaRef.current?.disconnect()
    observadorListaRef.current = null
    if (!nodo) return
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setAlturaListaDisponible(entrada.contentRect.height)
    })
    observador.observe(nodo)
    observadorListaRef.current = observador
  }, [])

  useEffect(() => () => observadorListaRef.current?.disconnect(), [])

  useEffect(() => {
    capacidadApi.obtener().then(setCapacidad)
  }, [citas])

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
  }, [modoVista, diasGrillaMes, citas])

  const citasDelDia = useMemo(
    () => citas.filter((cita) => cita.inicio.startsWith(diaSeleccionadoISO)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [citas, diaSeleccionadoISO],
  )

  const citasDelDiaMes = useMemo(
    () => citasMes.filter((cita) => cita.inicio.startsWith(diaSeleccionadoISO)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [citasMes, diaSeleccionadoISO],
  )

  const rangoDia = useMemo(() => rangoHorarioDelDia(citasDelDia), [citasDelDia])
  const alturaHoraDia = useMemo(() => {
    const horasRango = rangoDia.horaFin - rangoDia.horaInicio
    if (horasRango <= 0) return ALTURA_HORA
    return Math.max(ALTURA_HORA, alturaListaDisponible / horasRango)
  }, [rangoDia, alturaListaDisponible])

  async function confirmarArrastre(posicion: PosicionArrastre) {
    const cita = citas.find((c) => c.id === posicion.citaId)
    if (!cita) {
      setCitaArrastrada(null)
      return
    }
    if (posicion.nuevoInicio === cita.inicio && posicion.nuevoFin === cita.fin) {
      setCitaArrastrada(null)
      return
    }
    try {
      const conflicto = await verificar(posicion.nuevoInicio, posicion.nuevoFin, posicion.citaId)
      if (conflicto) {
        setCitaArrastrada(null)
        setMensajeError('Esta cita choca con otra existente.')
        return
      }
      await actualizarCita(posicion.citaId, {
        inicio: posicion.nuevoInicio,
        fin: posicion.nuevoFin,
        autorizacionId: cita.autorizacionId,
        tipoTerapia: cita.tipoTerapia,
        notas: cita.notas,
      })
      setCitaArrastrada(null)
    } catch (error) {
      setCitaArrastrada(null)
      setMensajeError(error instanceof ErrorPeticion ? error.message : 'No se pudo mover la cita.')
    }
  }

  const { iniciarArrastre: iniciarArrastreDia } = useArrastreMovil({
    alturaHora: alturaHoraDia,
    rango: rangoDia,
    onArrastreInicio: setCitaArrastrada,
    onArrastrar: setCitaArrastrada,
    onSoltar: (posicion) => {
      setCitaArrastrada(posicion)
      void confirmarArrastre(posicion)
    },
    onCancelar: () => setCitaArrastrada(null),
  })

  const diasSemana = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => sumarDias(inicioSemanaActual, i)).map((dia) => {
        const fechaISO = formatearFechaISO(dia)
        return {
          fechaISO,
          citas: citas.filter((cita) => cita.inicio.startsWith(fechaISO)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
        }
      }),
    [citas, inicioSemanaActual],
  )
  const citasSemanaVisible = useMemo(() => diasSemana.flatMap((dia) => dia.citas), [diasSemana])
  const rangoSemana = useMemo(() => rangoHorarioDelDia(citasSemanaVisible), [citasSemanaVisible])

  function obtenerDiaEnPuntoSemana(clientX: number, clientY: number): string | null {
    const elemento = document.elementFromPoint(clientX, clientY)
    return elemento?.closest<HTMLElement>('[data-fecha-iso]')?.dataset.fechaIso ?? null
  }

  const { iniciarArrastre: iniciarArrastreSemana } = useArrastreMovil({
    eje: 'horizontal',
    anchoHora: ANCHO_HORA_SEMANA,
    rango: rangoSemana,
    obtenerDiaEnPunto: obtenerDiaEnPuntoSemana,
    onArrastreInicio: setCitaArrastrada,
    onArrastrar: setCitaArrastrada,
    onSoltar: (posicion) => {
      setCitaArrastrada(posicion)
      void confirmarArrastre(posicion)
    },
    onCancelar: () => setCitaArrastrada(null),
  })

  let citasVisibles: Cita[]
  if (modoVista === 'dia') citasVisibles = citasDelDia
  else if (modoVista === 'semana') citasVisibles = citasSemanaVisible
  else citasVisibles = citasDelDiaMes

  const citasDelDiaSinCancelar = citasDelDia.filter((c) => c.estado !== 'cancelada')
  const hechas = citasDelDiaSinCancelar.filter((c) => c.estado === 'atendida')
  const recaudo = hechas.reduce((total, c) => total + c.copagoCobrado, 0)

  const idsPacientesClave = useMemo(
    () => Array.from(new Set(citasVisibles.map((c) => c.pacienteId))).sort((a, b) => a - b).join(','),
    [citasVisibles],
  )

  useEffect(() => {
    if (!idsPacientesClave) return
    let vigente = true
    const ids = idsPacientesClave.split(',').map(Number)
    Promise.allSettled(
      ids.map((id) =>
        autorizacionesResumenApi
          .listarActivas(id)
          .then((activas): readonly [number, AutorizacionResumen | null] => [id, activas[0] ?? null]),
      ),
    ).then((resultados) => {
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

  function alSeleccionarDiaMes(dia: Date) {
    setDiaSeleccionado(dia)
    if (dia.getMonth() !== mesReferencia.getMonth() || dia.getFullYear() !== mesReferencia.getFullYear()) {
      setMesReferencia(new Date(dia.getFullYear(), dia.getMonth(), 1))
    }
  }

  function irADia(fechaISO: string) {
    const [anio, mes, dia] = fechaISO.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    if (inicioSemana(fecha).getTime() !== inicioSemanaActual.getTime()) void irASemanaDe(fecha)
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
    tituloCabecera = `${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[0]), '00:00'))} – ${formatearFechaCorta(combinarFechaHora(formatearFechaISO(dias[5]), '00:00'))}`
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

        {capacidad && (
          <div className={styles.filaCapacidad}>
            <Badge variant="secondary">
              {capacidad.sesionesHechasMes}/{capacidad.sesionesTotalesMes} sesiones este mes
            </Badge>
          </div>
        )}

        {modoVista === 'dia' && (
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

      <div ref={listaRef} className={cn(styles.lista, modoVista === 'semana' && styles.listaSemana)} key={modoVista}>
        {modoVista === 'dia' && (
          <VistaDiaMovil
            fechaISO={diaSeleccionadoISO}
            citasDelDia={citasDelDia}
            rango={rangoDia}
            alturaHora={alturaHoraDia}
            autorizaciones={autorizaciones}
            onAbrirCita={abrirCitaExistente}
            citaArrastrada={citaArrastrada}
            onIniciarArrastre={iniciarArrastreDia}
          />
        )}

        {modoVista === 'semana' && (
          <VistaSemanaMovil
            dias={diasSemana}
            rango={rangoSemana}
            autorizaciones={autorizaciones}
            onIrADia={irADia}
            onAbrirCita={abrirCitaExistente}
            citaArrastrada={citaArrastrada}
            onIniciarArrastre={iniciarArrastreSemana}
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
          advertencias={advertencias}
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
