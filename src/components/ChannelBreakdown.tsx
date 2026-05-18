import { useMemo } from 'react'
import type { LeadBucket, MetricKey } from '@/lib/types'
import { metricOf, emptyStats } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { useT, type TKey } from '@/lib/i18n'

const CHANNEL_COLORS: Record<string, string> = {
  IKIS: '#34d399',
  WTS: '#fb923c',
  DX: '#60a5fa',
}

const FALLBACK_COLORS = ['#a78bfa', '#f472b6', '#facc15', '#22d3ee']

const METRIC_LABEL_KEYS: Record<MetricKey, TKey> = {
  total: 'metric.total',
  completed: 'metric.completed',
  processing: 'metric.processing',
  failed: 'metric.failed',
}

export default function ChannelBreakdown({
  buckets,
  channels,
  metric,
}: {
  buckets: LeadBucket[]
  channels: string[]
  metric: MetricKey
}) {
  const t = useT()

  const rows = useMemo(() => {
    const totals = channels.map((c) => {
      const value = buckets.reduce(
        (s, b) => s + metricOf(b.channels[c] ?? emptyStats(), metric),
        0,
      )
      return { channel: c, value }
    })
    const grand = totals.reduce((s, r) => s + r.value, 0)
    return totals
      .map((r, i) => ({
        ...r,
        pct: grand > 0 ? (r.value / grand) * 100 : 0,
        color: CHANNEL_COLORS[r.channel] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [buckets, channels, metric])

  return (
    <section className="card">
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="card-title">{t('breakdown.title')}</h3>
            <p className="card-subtitle">{t('breakdown.subtitle')}</p>
          </div>
          <span className="badge-flat">
            {t(METRIC_LABEL_KEYS[metric])}
          </span>
        </div>
      </div>

      <div className="p-5 pt-2 space-y-4">
        {rows.length === 0 || rows.every((r) => r.value === 0) ? (
          <p className="text-sm text-fg-muted py-4 text-center">
            {t('breakdown.empty')}
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.channel}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="text-sm text-fg font-medium">
                    {r.channel}
                  </span>
                  <span className="text-[11px] text-fg-dim num">
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
                <span className="num text-sm font-semibold text-fg">
                  {formatNumber(r.value)}
                </span>
              </div>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${r.pct}%`,
                    background: r.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
