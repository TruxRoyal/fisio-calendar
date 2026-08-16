import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../ui/command'
import { Icono } from '../Icono/Icono'
import { clienteApi } from '../../api/cliente'
import styles from './PaletaComandos.module.css'

interface PacienteResultado {
  id: number
  nombre: string
  eps: string | null
}

interface PropiedadesPaletaComandos {
  abierta: boolean
  onCerrar: () => void
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

async function exportarExcelMesActual() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1
  const archivo = await clienteApi.descargar(`/resumen/mensual/exportar?anio=${anio}&mes=${mes}`)
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `resumen-${anio}-${String(mes).padStart(2, '0')}.xlsx`
  enlace.click()
  URL.revokeObjectURL(url)
}

export function PaletaComandos({ abierta, onCerrar }: PropiedadesPaletaComandos) {
  const navegar = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<PacienteResultado[]>([])

  useEffect(() => {
    if (!abierta) setBusqueda('')
  }, [abierta])

  useEffect(() => {
    if (!abierta) return
    let vigente = true
    const query = busqueda ? `?q=${encodeURIComponent(busqueda)}` : ''
    clienteApi.get<PacienteResultado[]>(`/pacientes${query}`).then((resultados) => {
      if (vigente) setPacientes(resultados)
    })
    return () => {
      vigente = false
    }
  }, [abierta, busqueda])

  function ejecutar(accion: () => void) {
    onCerrar()
    accion()
  }

  return (
    <CommandDialog
      open={abierta}
      onOpenChange={(valor) => !valor && onCerrar()}
      title="Buscar"
      description="Busca un paciente o ejecuta una acción rápida"
    >
      <Command>
        <CommandInput placeholder="Buscar paciente, agendar, cobrar…" value={busqueda} onValueChange={setBusqueda} />
        <CommandList>
          <CommandEmpty>Sin resultados</CommandEmpty>

          <CommandGroup>
            <CommandItem value="nuevo-paciente" onSelect={() => ejecutar(() => navegar('/pacientes?nuevo=1'))}>
              <Icono nombre="paciente" tamano={15} grosor={1.9} />
              Nuevo paciente
              <CommandShortcut>P</CommandShortcut>
            </CommandItem>
            <CommandItem value="registrar-copago" onSelect={() => ejecutar(() => navegar('/calendario'))}>
              <Icono nombre="ingresos" tamano={15} grosor={1.9} />
              Registrar copago
              <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem value="ver-ruta-del-dia" onSelect={() => ejecutar(() => navegar('/mapa'))}>
              <Icono nombre="mapa" tamano={15} grosor={1.9} />
              Ver ruta del día
              <CommandShortcut>R</CommandShortcut>
            </CommandItem>
            <CommandItem value="exportar-excel" onSelect={() => ejecutar(exportarExcelMesActual)}>
              <Icono nombre="excel" tamano={15} grosor={1.9} />
              Exportar a Excel
              <CommandShortcut>E</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {pacientes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pacientes">
                {pacientes.map((paciente) => (
                  <CommandItem
                    key={paciente.id}
                    value={`paciente-${paciente.id}-${paciente.nombre}`}
                    onSelect={() => ejecutar(() => navegar(`/pacientes?paciente=${paciente.id}`))}
                  >
                    <span className={styles.avatar}>{iniciales(paciente.nombre)}</span>
                    {paciente.nombre}
                    {paciente.eps && <span className={styles.eps}>{paciente.eps}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
