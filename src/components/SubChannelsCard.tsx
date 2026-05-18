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

export default function SubChannelsCard({
  buckets,
  subChannels,
  metric,
}: {
  buckets: LeadBucket[]
  subChannels: string[]
  metric: MetricKey
}) {
  const t = useT()

  const rows = useMemo(() => {
    const aggregated = subChannels.map((key) => {
      const value = buckets.reduce(
        (s, b) => s + metricOf(b.subChannels[key] ?? emptyStats(), metric),
        0,
      )
      const parent = (key.split(':')[0] ?? '').trim()
      const name = key.includes(':')
        ? key.slice(key.indexOf(':') + 1)
        : key
      return { key, parent, name, value }
    })
    const grand = aggregated.reduce((s, r) => s + r.value, 0)
    return aggregated
      .map((r, i) => ({
        ...r,
        pct: grand > 0 ? (r.value / grand) * 100 : 0,
        color:
          CHANNEL_COLORS[r.parent] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [buckets, subChannels, metric])

  return (
    <section className="card">
      <div className="card-pad pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="card-title">{t('subchannel.title')}</h3>
            <p className="card-subtitle">{t('subchannel.subtitle')}</p>
          </div>
          <span className="badge-flat">{t(METRIC_LABEL_KEYS[metric])}</span>
        </div>
      </div>

      <div className="px-5 pb-5">
        {rows.length === 0 || rows.every((r) => r.value === 0) ? (
          <p className="text-sm text-fg-muted py-6 text-center">
            {t('subchannel.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="block h-2 w-2 rounded-full shrink-0"
                      style={{ background: r.color }}
                    />
                    <span className="num text-[13px] text-fg truncate">
                      {r.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-fg-dim px-1.5 py-0.5 rounded bg-surface-2">
                      {r.parent}
                    </span>
                  </div>
                  <span className="num text-sm font-semibold text-fg shrink-0">
                    {formatNumber(r.value)}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.pct}%`,
                      background: r.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
