import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { Boton } from '../../../../shared/components/Boton/Boton'
import { AtmosferaFondo } from '../../../../shared/components/AtmosferaFondo/AtmosferaFondo'
import { Badge } from '../../../../shared/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../../shared/components/ui/breadcrumb'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { cn } from '../../../../shared/lib/clases'
import { compararPacientes, OPCIONES_ORDEN_PACIENTES, type ModoOrdenPacientes } from '../../../../shared/lib/ordenPacientes'
import { usePacientes } from '../../hooks/usePacientes'
import { usePacientesStore } from '../../store'
import { FichaPaciente } from '../FichaPaciente/FichaPaciente'
import { FormularioPaciente } from '../FormularioPaciente/FormularioPaciente'
import styles from './PaginaPacientes.module.css'

const FILTROS_TIPO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'respiratoria', etiqueta: 'Respiratoria' },
  { valor: 'fisica', etiqueta: 'Física' },
] as const

type FiltroTipo = (typeof FILTROS_TIPO)[number]['valor']

export function PaginaPacientes() {
  const { pacientes, busqueda, buscar } = usePacientes()
  const seleccionado = usePacientesStore((estado) => estado.seleccionado)
  const seleccionarPaciente = usePacientesStore((estado) => estado.seleccionarPaciente)
  const limpiarSeleccion = usePacientesStore((estado) => estado.limpiarSeleccion)
  const crearPaciente = usePacientesStore((estado) => estado.crearPaciente)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [ordenPacientes, setOrdenPacientes] = useState<ModoOrdenPacientes>('alfabetico')
  const [parametros, setParametros] = useSearchParams()

  useEffect(() => {
    const idParametro = parametros.get('paciente')
    const id = idParametro ? Number(idParametro) : Number.NaN
    if (Number.isFinite(id)) {
      seleccionarPaciente(id)
    } else {
      limpiarSeleccion()
    }
    if (parametros.get('nuevo')) setFormularioAbierto(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros])

  function alSeleccionarPaciente(id: number) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales)
      siguientes.set('paciente', String(id))
      return siguientes
    })
  }

  const pacientesFiltrados = pacientes.filter(
    (paciente) => filtroTipo === 'todos' || paciente.tiposTerapia.includes(filtroTipo),
  )

  const totalFisica = pacientes.filter((p) => p.tiposTerapia.includes('fisica')).length
  const totalRespiratoria = pacientes.filter((p) => p.tiposTerapia.includes('respiratoria')).length

  const pacientesOrdenados = useMemo(
    () => [...pacientesFiltrados].sort(compararPacientes(ordenPacientes)),
    [pacientesFiltrados, ordenPacientes],
  )

  return (
    <div className={styles.pagina}>
      <div className={cn(styles.panelLista, seleccionado && styles.ocultoMovil)}>
        <div className={styles.cabecera}>
          <div className={styles.etiqueta}>Pacientes</div>
          <div className={styles.total}>{pacientes.length} en total</div>
          <div className={styles.totalPorTerapia}>
            {totalFisica} física · {totalRespiratoria} respiratoria · {totalFisica + totalRespiratoria} en total por terapia
          </div>
          <div className={styles.filaBusqueda}>
            <div className={styles.contenedorBusqueda}>
              <Icono nombre="buscar" tamano={16} className={styles.iconoBusqueda} />
              <input
                value={busqueda}
                onChange={(e) => buscar(e.target.value)}
                placeholder="Buscar paciente…"
                className={styles.inputBusqueda}
              />
            </div>
            <button type="button" onClick={() => setFormularioAbierto(true)} title="Nuevo paciente" className={styles.botonNuevo}>
              <Icono nombre="mas" tamano={18} grosor={2} />
            </button>
          </div>
          <div className={styles.filaFiltros}>
            {FILTROS_TIPO.map((filtro) => (
              <button
                key={filtro.valor}
                type="button"
                onClick={() => setFiltroTipo(filtro.valor)}
                className={cn(styles.chipFiltro, filtroTipo === filtro.valor && styles.activo)}
              >
                {filtro.etiqueta}
              </button>
            ))}
          </div>
          <div className={styles.filaOrden}>
            <span className={styles.etiquetaOrden}>Ordenar</span>
            {OPCIONES_ORDEN_PACIENTES.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => setOrdenPacientes(opcion.id)}
                className={cn(styles.chipOrden, ordenPacientes === opcion.id && styles.activo)}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.listaPacientes}>
          {pacientesOrdenados.map((paciente) => {
            const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
            const activo = seleccionado?.id === paciente.id
            const avatarBg = activo ? 'var(--acS2)' : (color?.bg ?? 'var(--s3)')
            const avatarFg = activo ? 'var(--acT)' : (color?.fg ?? 'var(--t3)')
            return (
              <button
                key={paciente.id}
                type="button"
                onClick={() => alSeleccionarPaciente(paciente.id)}
                className={cn(styles.itemPaciente, activo && styles.activo)}
              >
                <div className={styles.avatarPaciente} style={{ '--avatar-bg': avatarBg, '--avatar-fg': avatarFg } as CSSProperties}>
                  {paciente.nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                </div>
                <div className={styles.infoPaciente}>
                  <div className={styles.filaNombrePaciente}>
                    <span className={styles.nombrePaciente}>{paciente.nombre}</span>
                    {paciente.tipoTerapia && (
                      <Icono
                        nombre={paciente.tipoTerapia === 'respiratoria' ? 'pulmon' : 'pulso'}
                        tamano={12}
                        grosor={1.9}
                        className={styles.iconoTipoPaciente}
                      />
                    )}
                    {paciente.origen === 'extra' && <Badge variant="accent">Extra</Badge>}
                  </div>
                  <div className={styles.subtituloPaciente}>{paciente.eps ?? 'Particular'}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className={cn(styles.panelDetalle, !seleccionado && styles.ocultoMovil)}>
        {seleccionado ? (
          <>
            <Breadcrumb className={styles.migas}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={() => {
                        limpiarSeleccion()
                        setParametros((actuales) => {
                          const siguientes = new URLSearchParams(actuales)
                          siguientes.delete('paciente')
                          return siguientes
                        })
                      }}
                    >
                      Pacientes
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{seleccionado.nombre}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <FichaPaciente key={seleccionado.id} paciente={seleccionado} />
          </>
        ) : (
          <AtmosferaFondo intensidad="suave" origen="inferior-derecha" className={styles.vacioFondo}>
            <div className={styles.vacioContenido}>
              <div className={styles.vacioIcono}>
                <Icono nombre="paciente" tamano={22} grosor={1.6} />
              </div>
              <p className={styles.mensajeVacio}>Selecciona un paciente de la lista o crea uno nuevo.</p>
              <Boton variante="primario" onClick={() => setFormularioAbierto(true)}>
                <Icono nombre="mas" tamano={16} grosor={2} />
                Nuevo paciente
              </Boton>
            </div>
          </AtmosferaFondo>
        )}
      </div>

      <FormularioPaciente
        abierto={formularioAbierto}
        onCerrar={() => {
          setFormularioAbierto(false)
          setParametros((actuales) => {
            if (!actuales.get('nuevo')) return actuales
            const siguientes = new URLSearchParams(actuales)
            siguientes.delete('nuevo')
            return siguientes
          })
        }}
        onGuardar={async (solicitud) => {
          await crearPaciente(solicitud)
        }}
      />
    </div>
  )
}
