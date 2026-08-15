import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
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
import { usePacientes } from '../../hooks/usePacientes'
import { usePacientesStore } from '../../store'
import { FichaPaciente } from '../FichaPaciente/FichaPaciente'
import { FormularioPaciente } from '../FormularioPaciente/FormularioPaciente'
import styles from './PaginaPacientes.module.css'

export function PaginaPacientes() {
  const { pacientes, busqueda, buscar } = usePacientes()
  const seleccionado = usePacientesStore((estado) => estado.seleccionado)
  const seleccionarPaciente = usePacientesStore((estado) => estado.seleccionarPaciente)
  const limpiarSeleccion = usePacientesStore((estado) => estado.limpiarSeleccion)
  const crearPaciente = usePacientesStore((estado) => estado.crearPaciente)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [parametros] = useSearchParams()

  useEffect(() => {
    const idParametro = parametros.get('paciente')
    if (idParametro) seleccionarPaciente(Number(idParametro))
    if (parametros.get('nuevo')) setFormularioAbierto(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros])

  return (
    <div className={styles.pagina}>
      <div className={styles.panelLista}>
        <div className={styles.cabecera}>
          <div className={styles.etiqueta}>Pacientes</div>
          <div className={styles.total}>{pacientes.length} en total</div>
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
        </div>
        <div className={styles.listaPacientes}>
          {pacientes.map((paciente) => {
            const color = paciente.tipoTerapia ? TIPO_TERAPIA_COLOR[paciente.tipoTerapia] : null
            const activo = seleccionado?.id === paciente.id
            const avatarBg = activo ? 'var(--acS2)' : (color?.bg ?? 'var(--s3)')
            const avatarFg = activo ? 'var(--acT)' : (color?.fg ?? 'var(--t3)')
            return (
              <button
                key={paciente.id}
                type="button"
                onClick={() => seleccionarPaciente(paciente.id)}
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

      <div className={styles.panelDetalle}>
        {seleccionado ? (
          <>
            <Breadcrumb className={styles.migas}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={limpiarSeleccion}>
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
            <FichaPaciente paciente={seleccionado} />
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
        onCerrar={() => setFormularioAbierto(false)}
        onGuardar={async (solicitud) => {
          await crearPaciente(solicitud)
        }}
      />
    </div>
  )
}
