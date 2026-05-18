import { format, subDays } from 'date-fns'
import type { GroupBy, MetricKey, StatsFilters } from '@/lib/types'
import { METRIC_KEYS } from '@/lib/types'
import { useT, type TKey } from '@/lib/i18n'

const ALL_CHANNELS = ['IKIS', 'WTS', 'DX'] as const
const GROUPS: GroupBy[] = ['DAY', 'WEEK', 'MONTH']

const METRIC_LABEL_KEYS: Record<MetricKey, TKey> = {
  total: 'metric.total',
  completed: 'metric.completed',
  processing: 'metric.processing',
  failed: 'metric.failed',
}

const PRESETS: Array<{
  id: string
  labelKey: TKey
  build: () => { from: string; to: string }
}> = [
  {
    id: '7d',
    labelKey: 'filter.preset.7d',
    build: () => ({
      from: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: '14d',
    labelKey: 'filter.preset.14d',
    build: () => ({
      from: format(subDays(new Date(), 13), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: '30d',
    labelKey: 'filter.preset.30d',
    build: () => ({
      from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: '90d',
    labelKey: 'filter.preset.90d',
    build: () => ({
      from: format(subDays(new Date(), 89), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
]

export default function FilterBar({
  filters,
  onChange,
  onRefresh,
  isFetching,
  refreshIntervalMs,
  onRefreshIntervalChange,
}: {
  filters: StatsFilters
  onChange: (next: StatsFilters) => void
  onRefresh: () => void
  isFetching: boolean
  refreshIntervalMs: number
  onRefreshIntervalChange: (ms: number) => void
}) {
  const t = useT()

  function toggleChannel(channel: string) {
    const has = filters.channelTypes.includes(channel)
    const next = has
      ? filters.channelTypes.filter((c) => c !== channel)
      : [...filters.channelTypes, channel]
    if (next.length === 0) return
    onChange({ ...filters, channelTypes: next })
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const { from, to } = preset.build()
    onChange({ ...filters, from, to })
  }

  return (
    <section className="card divide-y divide-line">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-5">
        <Group label={t('filter.channels')}>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CHANNELS.map((c) => {
              const active = filters.channelTypes.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  className={
                    'btn-chip ' + (active ? 'btn-chip-active' : '')
                  }
                  aria-pressed={active}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </Group>

        <Group label={t('metric.label')}>
          <div className="inline-flex bg-surface-2 rounded-md p-0.5 flex-wrap">
            {METRIC_KEYS.map((m) => {
              const active = filters.metric === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ ...filters, metric: m })}
                  className={
                    'h-7 px-2.5 text-xs font-medium rounded transition-colors ' +
                    (active
                      ? 'bg-surface-3 text-fg'
                      : 'text-fg-muted hover:text-fg')
                  }
                  aria-pressed={active}
                >
                  {t(METRIC_LABEL_KEYS[m])}
                </button>
              )
            })}
          </div>
        </Group>

        <Group label={t('filter.groupBy')}>
          <div className="inline-flex bg-surface-2 rounded-md p-0.5">
            {GROUPS.map((g) => {
              const active = filters.groupBy === g
              const label =
                g === 'DAY'
                  ? t('filter.group.day')
                  : g === 'WEEK'
                    ? t('filter.group.week')
                    : t('filter.group.month')
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange({ ...filters, groupBy: g })}
                  className={
                    'h-7 px-3 text-xs font-medium rounded transition-colors ' +
                    (active
                      ? 'bg-surface-3 text-fg'
                      : 'text-fg-muted hover:text-fg')
                  }
                  aria-pressed={active}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Group>

        <Group label={t('filter.actions')}>
          <div className="flex items-center gap-2">
            <select
              value={refreshIntervalMs}
              onChange={(e) =>
                onRefreshIntervalChange(Number(e.target.value))
              }
              className="select flex-1"
            >
              <option value={0}>{t('filter.auto.off')}</option>
              <option value={30000}>{t('filter.auto.30s')}</option>
              <option value={60000}>{t('filter.auto.1m')}</option>
              <option value={300000}>{t('filter.auto.5m')}</option>
            </select>
            <button
              type="button"
              onClick={onRefresh}
              className="btn-ghost"
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <Spinner />
                  {t('filter.fetching')}
                </>
              ) : (
                <>
                  <RefreshIcon />
                  {t('filter.refresh')}
                </>
              )}
            </button>
          </div>
        </Group>
      </div>

      <div className="p-5">
        <Group label={t('filter.dateRange')}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="input-sm num"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-fg-dim text-sm">→</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="input-sm num"
              style={{ colorScheme: 'dark' }}
            />
            <div className="flex flex-wrap gap-1 ml-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="btn-chip h-8"
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </Group>
      </div>
    </section>
  )
}

function Group({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <p className="eyebrow mb-2.5">{label}</p>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-3 w-3 rounded-full border-2 border-fg-muted/30 border-t-fg-muted animate-spin" />
  )
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 3v3h-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
