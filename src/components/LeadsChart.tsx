import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { LeadBucket, MetricKey } from '@/lib/types'
import { metricOf } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'

type Mode = 'line' | 'bar' | 'stacked'

const CHANNEL_COLORS: Record<string, string> = {
  IKIS: '#34d399',
  WTS: '#fb923c',
  DX: '#60a5fa',
}

const FALLBACK_COLORS = ['#a78bfa', '#f472b6', '#facc15', '#22d3ee', '#fb7185']

function colorFor(channel: string, idx: number): string {
  return CHANNEL_COLORS[channel] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

interface ChartRow {
  label: string
  period: string
  total: number
  [channel: string]: string | number
}

const METRIC_LABEL_KEYS: Record<MetricKey, TKey> = {
  total: 'metric.total',
  completed: 'metric.completed',
  processing: 'metric.processing',
  failed: 'metric.failed',
}

export default function LeadsChart({
  buckets,
  channels,
  metric,
}: {
  buckets: LeadBucket[]
  channels: string[]
  metric: MetricKey
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('line')

  const data = useMemo<ChartRow[]>(
    () =>
      buckets.map((b) => {
        const row: ChartRow = {
          label: b.label,
          period: b.period,
          total: metricOf(b.status, metric),
        }
        for (const c of channels) {
          row[c] = metricOf(b.channels[c] ?? { completed: 0, failed: 0, processing: 0, total: 0 }, metric)
        }
        return row
      }),
    [buckets, channels, metric],
  )

  const hasData =
    data.length > 0 &&
    channels.length > 0 &&
    data.some((d) => channels.some((c) => Number(d[c]) > 0))

  const modes: Array<{ id: Mode; key: TKey }> = [
    { id: 'line', key: 'chart.mode.line' },
    { id: 'bar', key: 'chart.mode.bar' },
    { id: 'stacked', key: 'chart.mode.stacked' },
  ]

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3 className="text-base font-semibold text-fg flex items-center gap-2">
            {t('chart.title')}
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-brand/15 text-brand">
              {t(METRIC_LABEL_KEYS[metric])}
            </span>
          </h3>
          <p className="text-xs text-fg-muted mt-1">
            {t('chart.summary', {
              channels: channels.length,
              buckets: buckets.length,
            })}
          </p>
        </div>
        <div className="inline-flex bg-surface-2 rounded-md p-0.5">
          {modes.map((m) => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={
                  'h-7 px-3 text-xs font-medium rounded transition-colors ' +
                  (active
                    ? 'bg-surface-3 text-fg'
                    : 'text-fg-muted hover:text-fg')
                }
                aria-pressed={active}
              >
                {t(m.key)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4">
        <div className="h-[380px] w-full">
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

function renderChart(mode: Mode, data: ChartRow[], channels: string[]) {
  const common = {
    data,
    margin: { top: 16, right: 24, left: 0, bottom: 8 },
  }

  if (mode === 'bar') {
    return (
      <BarChart {...common}>
        <ChartScaffold />
        {channels.map((c, i) => (
          <Bar key={c} dataKey={c} fill={colorFor(c, i)} radius={[3, 3, 0, 0]} />
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
              id={`grad-${c}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={colorFor(c, i)} stopOpacity={0.6} />
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
            fill={`url(#grad-${c})`}
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
        tick={{ fontSize: 11, fill: '#9a9aa1' }}
        tickMargin={8}
        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
        tickLine={false}
      />
      <YAxis
        stroke="rgba(255,255,255,0.4)"
        tick={{ fontSize: 11, fill: '#9a9aa1' }}
        tickFormatter={(v) => formatNumber(Number(v), { compact: true })}
        axisLine={false}
        tickLine={false}
        width={48}
      />
      <Tooltip
        content={(props) => <ChartTooltip {...props} />}
        cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
      />
      <Legend
        verticalAlign="top"
        align="right"
        wrapperStyle={{ paddingBottom: 12 }}
        iconType="circle"
        iconSize={8}
        formatter={(value) => (
          <span className="text-xs text-fg-muted ml-1">{String(value)}</span>
        )}
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
      <div className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-fg-dim">
          <path
            d="M3 17l4-4 4 4 6-6 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-fg mb-1.5">
        {t('chart.empty.title')}
      </p>
      <p className="text-xs text-fg-muted max-w-sm">{t('chart.empty.hint')}</p>
    </div>
  )
}
