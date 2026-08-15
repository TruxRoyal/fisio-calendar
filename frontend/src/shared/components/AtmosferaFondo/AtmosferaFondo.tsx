import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { cn } from '../../lib/clases'
import styles from './AtmosferaFondo.module.css'

export type IntensidadAtmosfera = 'suave' | 'media' | 'intensa'
export type BaseAtmosfera = 'lavado' | 'tinta'

interface PropiedadesAtmosferaFondo {
  /** Cuánto se nota la mancha de gradiente + grano. 'suave' es el valor pensado para paneles de contenido. */
  intensidad?: IntensidadAtmosfera
  /**
   * 'lavado' (por defecto): base clara, para paneles y estados vacíos donde
   * el texto encima usa los colores de texto normales (--t1/--t2/--t3).
   * 'tinta': base oscura/saturada (ac→acT), para chips o íconos pequeños de
   * marca donde el contenido encima usa --acFg (el mismo texto que un botón
   * primario).
   */
  base?: BaseAtmosfera
  /** Puntos flotantes lentos, apagados si el usuario prefiere menos movimiento. */
  particulas?: boolean
  /** Cuántas partículas dibujar cuando `particulas` está activo. */
  cantidadParticulas?: number
  /** Esquina desde la que nace la mancha principal. */
  origen?: 'superior-derecha' | 'superior-izquierda' | 'inferior-derecha'
  className?: string
  children?: ReactNode
}

interface Particula {
  izquierda: number
  tamano: number
  duracion: number
  demora: number
  variante: 0 | 1
}

function generarParticulas(cantidad: number): Particula[] {
  return Array.from({ length: cantidad }, (_, i) => {
    // Distribución pseudoaleatoria pero estable por índice (sin Math.random
    // en cada render): evita que las partículas "salten" al re-renderizar.
    const semilla = (i * 137.51) % 100
    return {
      izquierda: semilla,
      tamano: 3 + (i % 4),
      duracion: 14 + (i % 5) * 3,
      demora: -((i * 2.7) % 18),
      variante: (i % 2) as 0 | 1,
    }
  })
}

/**
 * Fondo decorativo en capas (gradiente + manchas radiales + grano + partículas
 * opcionales) que se recolorea solo a partir de las variables del tema activo
 * (--ac/--acD/--acS/--acS2/--acL), así que funciona igual con los 5 temas y
 * en modo claro/oscuro sin configuración adicional. Pensado para un único
 * punto focal por pantalla (cabecera de resumen, estado vacío), no para
 * cubrir superficies de trabajo densas como la agenda o las tablas.
 */
export function AtmosferaFondo({
  intensidad = 'suave',
  base = 'lavado',
  particulas = false,
  cantidadParticulas = 12,
  origen = 'superior-derecha',
  className,
  children,
}: PropiedadesAtmosferaFondo) {
  const puntos = useMemo(() => generarParticulas(cantidadParticulas), [cantidadParticulas])

  return (
    <div className={cn(styles.atmosfera, styles[intensidad], styles[base], styles[origen], className)}>
      <div className={styles.capaBase} />
      <div className={styles.capaManchas} />
      <div className={styles.capaGrano} />
      {particulas && (
        <div className={styles.capaParticulas} aria-hidden="true">
          {puntos.map((p, i) => (
            <span
              key={i}
              className={cn(styles.particula, p.variante === 1 && styles.particulaAlterna)}
              style={{
                left: `${p.izquierda}%`,
                width: p.tamano,
                height: p.tamano,
                animationDuration: `${p.duracion}s`,
                animationDelay: `${p.demora}s`,
              }}
            />
          ))}
        </div>
      )}
      {children && <div className={styles.contenido}>{children}</div>}
    </div>
  )
}
