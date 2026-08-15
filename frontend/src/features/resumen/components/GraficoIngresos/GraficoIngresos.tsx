import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../../shared/components/ui/chart'
import { formatearCOP } from '../../../../shared/lib/moneda'
import type { ResumenMensual } from '../../types'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const CONFIG = {
  pagoNeto: { label: 'Pago neto', color: 'var(--chart1)' },
  copagosRecaudados: { label: 'Copagos', color: 'var(--chart2)' },
} satisfies ChartConfig

function formatearCompacto(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (valor >= 1_000) return `$${Math.round(valor / 1_000)}k`
  return `$${valor}`
}

interface PropiedadesGraficoIngresos {
  historico: ResumenMensual[]
}

export function GraficoIngresos({ historico }: PropiedadesGraficoIngresos) {
  const datos = historico.map((mes) => ({
    mes: MESES_CORTOS[mes.mes - 1],
    pagoNeto: mes.pagoNeto,
    copagosRecaudados: mes.copagosRecaudados,
  }))

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-56 w-full">
      <BarChart data={datos} barCategoryGap={16}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={formatearCompacto} />
        <ChartTooltip
          cursor={{ fill: 'var(--s3)' }}
          content={
            <ChartTooltipContent
              formatter={(valor, nombre, item) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: item.color }} />
                    {CONFIG[nombre as keyof typeof CONFIG]?.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-foreground">{formatearCOP(Number(valor))}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="pagoNeto"
          stackId="ingresos"
          fill="var(--color-pagoNeto)"
          stroke="var(--background)"
          strokeWidth={2}
          maxBarSize={24}
        />
        <Bar
          dataKey="copagosRecaudados"
          stackId="ingresos"
          fill="var(--color-copagosRecaudados)"
          stroke="var(--background)"
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  )
}
