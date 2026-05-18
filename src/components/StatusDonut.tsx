import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts'
import { formatNumber } from '@/lib/format'
import type { StatsSummary } from '@/lib/stats'
import { useT } from '@/lib/i18n'

const COLORS = {
  completed: '#34d399',
  processing: '#fbbf24',
  failed: '#f87171',
}

export default function StatusDonut({
  summary,
}: {
  summary: StatsSummary
}) {
  const t = useT()
  const { status, conversionPct } = summary
  const sum = status.completed + status.processing + status.failed

  const data = [
    {
      key: 'completed',
      label: t('kpi.completed'),
      value: status.completed,
      color: COLORS.completed,
    },
    {
      key: 'processing',
      label: t('kpi.processing'),
      value: status.processing,
      color: COLORS.processing,
    },
    {
      key: 'failed',
      label: t('kpi.failed'),
      value: status.failed,
      color: COLORS.failed,
    },
  ]

  const hasData = sum > 0

  return (
    <section className="card">
      <div className="p-5 pb-3">
        <h3 className="card-title">{t('donut.title')}</h3>
        <p className="card-subtitle">{t('donut.subtitle')}</p>
      </div>

      <div className="px-5 pb-5">
        <div className="relative mx-auto h-[180px] w-[180px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => <DonutTooltip {...props} />}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 rounded-full border-[16px] border-surface-2" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-2xl font-bold text-fg leading-none">
              {hasData ? conversionPct.toFixed(0) : 0}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-fg-dim mt-1">
              {t('donut.center')}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {data.map((d) => {
            const pct = sum > 0 ? (d.value / sum) * 100 : 0
            return (
              <div
                key={d.key}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-fg-muted">{d.label}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="num text-fg font-medium">
                    {formatNumber(d.value)}
                  </span>
                  <span className="num text-[11px] text-fg-dim w-[44px] text-right">
                    {pct.toFixed(1)}%
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DonutTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-md border border-line-strong bg-surface-2/95 backdrop-blur px-2.5 py-1.5 text-xs">
      <div className="text-fg-dim mb-0.5">{String(p.name ?? p.dataKey)}</div>
      <div className="num text-fg font-medium">
        {formatNumber(Number(p.value ?? 0))}
      </div>
    </div>
  )
}
