import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { LeadBucket, MetricKey, GroupBy } from '@/lib/types'
import { metricOf, emptyStats } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'

type Mode = 'line' | 'bar' | 'stacked'

const CHANNEL_COLORS: Record<string, string> = {
  IKIS: '#34d399',
  WTS: '#fb923c',
  DX: '#60a5fa',
}
const FALLBACK_COLORS = ['#a78bfa', '#f472b6', '#facc15', '#22d3ee']

function colorFor(channel: string, idx: number): string {
  return CHANNEL_COLORS[channel] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

const MODE_LABELS: Record<Mode, TKey> = {
  line: 'chart.mode.line',
  bar: 'chart.mode.bar',
  stacked: 'chart.mode.stacked',
}

const GROUP_LABELS: Record<GroupBy, TKey> = {
  DAY: 'filter.group.day',
  MONTH: 'filter.group.month',
  YEAR: 'filter.group.year',
}

interface ChartRow {
  label: string
  period: string
  [channel: string]: string | number
}

export default function VolumeCard({
  buckets,
  channels,
  metric,
  groupBy,
}: {
  buckets: LeadBucket[]
  channels: string[]
  metric: MetricKey
  groupBy: GroupBy
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('line')

  const data = useMemo<ChartRow[]>(
    () =>
      buckets.map((b) => {
        const row: ChartRow = { label: b.label, period: b.period }
        for (const c of channels) {
          row[c] = metricOf(b.channels[c] ?? emptyStats(), metric)
        }
        return row
      }),
    [buckets, channels, metric],
  )

  const hasData =
    data.length > 0 &&
    channels.length > 0 &&
    data.some((d) => channels.some((c) => Number(d[c]) > 0))

  // Compact summary numbers shown above the chart (xx.html-style metric blocks)
  const totals = useMemo(() => {
    const sums: Record<string, number> = {}
    for (const c of channels) sums[c] = 0
    for (const b of buckets) {
      for (const c of channels) {
        sums[c] += metricOf(b.channels[c] ?? emptyStats(), metric)
      }
    }
    return sums
  }, [buckets, channels, metric])

  return (
    <section className="card">
      <div className="card-pad pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="card-title">{t('volume.title')}</h3>
          <p className="card-subtitle">
            {t('volume.subtitle', {
              group: t(GROUP_LABELS[groupBy]).toLowerCase(),
            })}
          </p>
        </div>
        <div className="inline-flex bg-surface-2 rounded-md p-0.5">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  'h-7 px-3 text-xs font-medium rounded transition-colors ' +
                  (active
                    ? 'bg-surface-3 text-fg'
                    : 'text-fg-muted hover:text-fg')
                }
                aria-pressed={active}
              >
                {t(MODE_LABELS[m])}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 pb-2 flex items-center gap-8 flex-wrap">
        {channels.map((c, i) => (
          <MetricBlock
            key={c}
            color={colorFor(c, i)}
            label={c}
            value={formatNumber(totals[c] ?? 0)}
          />
        ))}
      </div>

      <div className="px-3 pb-5">
        <div className="h-[260px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(mode, data, channels)}
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </section>
  )
}

function MetricBlock({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div>
      <p className="num text-xl font-bold text-fg leading-tight">{value}</p>
      <p className="text-xs text-fg-muted mt-1 flex items-center gap-1.5">
        <span
          className="block h-2 w-2 rounded-full"
          style={{ background: color }}
        />
        {label}
      </p>
    </div>
  )
}

function renderChart(mode: Mode, data: ChartRow[], channels: string[]) {
  const common = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 8 },
  }

  if (mode === 'bar') {
    return (
      <BarChart {...common}>
        <ChartScaffold />
        {channels.map((c, i) => (
          <Bar
            key={c}
            dataKey={c}
            fill={colorFor(c, i)}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    )
  }

  if (mode === 'stacked') {
    return (
      <AreaChart {...common}>
        <defs>
          {channels.map((c, i) => (
            <linearGradient
              key={c}
              id={`vol-${c}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={colorFor(c, i)} stopOpacity={0.55} />
              <stop offset="100%" stopColor={colorFor(c, i)} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <ChartScaffold />
        {channels.map((c, i) => (
          <Area
            key={c}
            type="monotone"
            dataKey={c}
            stackId="1"
            stroke={colorFor(c, i)}
            strokeWidth={1.6}
            fill={`url(#vol-${c})`}
          />
        ))}
      </AreaChart>
    )
  }

  return (
    <LineChart {...common}>
      <ChartScaffold />
      {channels.map((c, i) => (
        <Line
          key={c}
          type="monotone"
          dataKey={c}
          stroke={colorFor(c, i)}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: colorFor(c, i) }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      ))}
    </LineChart>
  )
}

function ChartScaffold() {
  return (
    <>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        stroke="rgba(255,255,255,0.4)"
        tick={{ fontSize: 11, fill: '#9a93b0' }}
        tickMargin={8}
        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
        tickLine={false}
      />
      <YAxis
        stroke="rgba(255,255,255,0.4)"
        tick={{ fontSize: 11, fill: '#9a93b0' }}
        tickFormatter={(v) => formatNumber(Number(v), { compact: true })}
        axisLine={false}
        tickLine={false}
        width={42}
      />
      <Tooltip
        content={(props) => <ChartTooltip {...props} />}
        cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
      />
    </>
  )
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0)
  return (
    <div className="rounded-md border border-line-strong bg-surface-2/95 backdrop-blur px-3 py-2.5 shadow-card min-w-[180px]">
      <p className="text-[11px] text-fg-dim mb-2 uppercase tracking-wider">
        {String(label)}
      </p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div
            key={String(p.dataKey ?? p.name)}
            className="flex items-center gap-3 justify-between"
          >
            <span className="flex items-center gap-2">
              <span
                className="block h-2 w-2 rounded-full"
                style={{ background: String(p.color ?? '#fff') }}
              />
              <span className="text-xs text-fg-muted">
                {String(p.dataKey ?? p.name)}
              </span>
            </span>
            <span className="num text-xs text-fg font-medium">
              {formatNumber(Number(p.value ?? 0))}
            </span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-line">
            <span className="text-[10px] uppercase tracking-wider text-fg-dim">
              Σ
            </span>
            <span className="num text-xs text-fg font-semibold">
              {formatNumber(total)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const t = useT()
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm font-medium text-fg mb-1">
        {t('chart.empty.title')}
      </p>
      <p className="text-xs text-fg-muted max-w-sm">
        {t('chart.empty.hint')}
      </p>
    </div>
  )
}
