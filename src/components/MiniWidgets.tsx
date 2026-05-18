import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts'
import { formatNumber, formatPercent } from '@/lib/format'
import type { LeadBucket, MetricKey } from '@/lib/types'
import { metricOf } from '@/lib/types'
import { useT, type TKey } from '@/lib/i18n'

interface WidgetDef {
  key: MetricKey
  labelKey: TKey
  color: string
  tone: 'fg' | 'green' | 'amber' | 'red'
}

const WIDGETS: WidgetDef[] = [
  { key: 'total', labelKey: 'kpi.total', color: '#7c5cff', tone: 'fg' },
  { key: 'completed', labelKey: 'kpi.completed', color: '#34d399', tone: 'green' },
  { key: 'processing', labelKey: 'kpi.processing', color: '#fbbf24', tone: 'amber' },
  { key: 'failed', labelKey: 'kpi.failed', color: '#f87171', tone: 'red' },
]

const TONE_CLASS: Record<WidgetDef['tone'], string> = {
  fg: 'text-fg',
  green: 'text-signal-green',
  amber: 'text-signal-amber',
  red: 'text-signal-red',
}

export default function MiniWidgets({
  buckets,
  channels,
  activeMetric,
  onSelectMetric,
}: {
  buckets: LeadBucket[]
  channels: string[]
  activeMetric: MetricKey
  onSelectMetric: (m: MetricKey) => void
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {WIDGETS.map((w) => (
        <MiniCard
          key={w.key}
          def={w}
          buckets={buckets}
          channels={channels}
          active={activeMetric === w.key}
          onClick={() => onSelectMetric(w.key)}
        />
      ))}
    </section>
  )
}

function MiniCard({
  def,
  buckets,
  channels,
  active,
  onClick,
}: {
  def: WidgetDef
  buckets: LeadBucket[]
  channels: string[]
  active: boolean
  onClick: () => void
}) {
  const t = useT()

  const series = useMemo(
    () =>
      buckets.map((b) => ({
        label: b.label,
        value: channels.reduce(
          (s, c) =>
            s +
            metricOf(
              b.channels[c] ?? {
                completed: 0,
                failed: 0,
                processing: 0,
                total: 0,
              },
              def.key,
            ),
          0,
        ),
      })),
    [buckets, channels, def.key],
  )

  const total = series.reduce((s, p) => s + p.value, 0)
  // Compare last 2 points for the change badge. Falls back to half-vs-half
  // when only a few buckets exist.
  const change = computeChange(series.map((p) => p.value))

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'card text-left transition-all animate-fade-in relative overflow-hidden',
        active
          ? 'ring-1 ring-brand shadow-glow border-brand/50'
          : 'hover:border-line-strong',
      ].join(' ')}
    >
      <div className="p-4 pb-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-fg-muted">{t(def.labelKey)}</span>
          <ChangeBadge change={change} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`num text-3xl font-bold leading-none ${TONE_CLASS[def.tone]}`}
          >
            {formatNumber(total)}
          </span>
        </div>
      </div>
      <div className="h-12 w-full">
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`spark-${def.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={def.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={def.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={(props) => <SparkTooltip {...props} />}
                cursor={{ stroke: def.color, strokeOpacity: 0.4 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={def.color}
                strokeWidth={1.6}
                fill={`url(#spark-${def.key})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full border-b-2 border-dashed border-line" />
        )}
      </div>
    </button>
  )
}

function SparkTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-line-strong bg-surface-2/95 backdrop-blur px-2.5 py-1.5 text-[11px]">
      <div className="text-fg-dim mb-0.5">{String(label)}</div>
      <div className="num text-fg font-medium">
        {formatNumber(Number(payload[0].value ?? 0))}
      </div>
    </div>
  )
}

function ChangeBadge({ change }: { change: number }) {
  if (!Number.isFinite(change) || change === 0) {
    return <span className="badge-flat">0%</span>
  }
  const cls = change > 0 ? 'badge-up' : 'badge-down'
  const arrow = change > 0 ? '↑' : '↓'
  return (
    <span className={cls}>
      {arrow} {formatPercent(Math.abs(change), 1).replace('+', '')}
    </span>
  )
}

function computeChange(values: number[]): number {
  if (values.length < 2) return 0
  if (values.length === 2) {
    const [a, b] = values
    if (a === 0) return b === 0 ? 0 : 100
    return ((b - a) / a) * 100
  }
  // Compare 2nd half vs 1st half for stability.
  const mid = Math.floor(values.length / 2)
  const first = values.slice(0, mid).reduce((s, n) => s + n, 0)
  const second = values.slice(mid).reduce((s, n) => s + n, 0)
  if (first === 0) return second === 0 ? 0 : 100
  return ((second - first) / first) * 100
}
