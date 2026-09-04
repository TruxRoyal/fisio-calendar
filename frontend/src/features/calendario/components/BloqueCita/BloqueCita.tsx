import type { CSSProperties, MouseEvent } from 'react'
import { diferenciaMinutos, formatearHora } from '../../../../shared/lib/fecha'
import { TIPO_TERAPIA_COLOR } from '../../../../shared/theme/paletas'
import { Icono } from '../../../../shared/components/Icono/Icono'
import { cn } from '../../../../shared/lib/clases'
import { colorDesdeTexto, inicialesNombre } from '../../../../shared/lib/avatar'
import { ETIQUETA_TIPO_TERAPIA, type TipoTerapia } from '../../../../shared/types/comun'
import type { Cita } from '../../types'
import styles from './BloqueCita.module.css'

interface PropiedadesBloqueCita {
  cita: Cita
  top: number
  altura: number
  onAbrir: () => void
  onIniciarArrastre: (evento: MouseEvent<HTMLDivElement>) => void
  onIniciarRedimension: (evento: MouseEvent<HTMLDivElement>) => void
}

export function BloqueCita({ cita, top, altura, onAbrir, onIniciarArrastre, onIniciarRedimension }: PropiedadesBloqueCita) {
  const colorTipo = TIPO_TERAPIA_COLOR[cita.tipoTerapia]
  const colorBorde = cita.paciente.color ?? colorTipo.fg ?? 'var(--ac)'
  const colorAvatar = cita.paciente.color ?? colorDesdeTexto(cita.paciente.nombre)
  const compacto = altura < 40
  const duracion = diferenciaMinutos(cita.inicio, cita.fin)

  return (
    <div
      onClick={onAbrir}
      onMouseDown={(evento) => {
        if (cita.estado !== 'cancelada') onIniciarArrastre(evento)
      }}
      title={cita.paciente.nombre}
      className={cn(styles.bloque, styles[cita.estado], compacto && styles.compacto)}
      style={{ top, height: Math.max(altura, 24), '--color-borde': colorBorde } as CSSProperties}
    >
      <div className={styles.filaContenido}>
        <span className={styles.avatar} style={{ background: colorAvatar }}>
          {inicialesNombre(cita.paciente.nombre)}
        </span>

        <div className={styles.info}>
          <div className={styles.filaSuperior}>
            <span className={styles.hora}>{formatearHora(cita.inicio)}</span>
            <Icono nombre={cita.tipoTerapia === 'respiratoria' ? 'pulmon' : 'pulso'} tamano={11} grosor={2.2} />
            <div className={styles.espaciador} />
            {cita.estado === 'atendida' && <Icono nombre="check" tamano={12} grosor={2.6} className={styles.iconoCheck} />}
          </div>
          <div className={cn(styles.nombre, compacto && styles.nombreCompacto)}>{cita.paciente.nombre}</div>
          {!compacto && (
            <div className={styles.detalle}>
              {ETIQUETA_TIPO_TERAPIA[cita.tipoTerapia as TipoTerapia] ?? cita.tipoTerapia} · {duracion} min
            </div>
          )}
        </div>
      </div>

      {altura > 46 && cita.estado !== 'cancelada' && (
        <div
          onMouseDown={(evento) => {
            evento.stopPropagation()
            onIniciarRedimension(evento)
          }}
          className={styles.asaRedimension}
        />
      )}
    </div>
  )
}
