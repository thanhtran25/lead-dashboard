import { useT } from '@/lib/i18n'
import type { GroupBy, StatsFilters } from '@/lib/types'

const ALL_CHANNELS = ['IKIS', 'WTS', 'DX'] as const
const GROUPS: GroupBy[] = ['DAY', 'MONTH', 'YEAR']

export default function FilterStrip({
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

  return (
    <div className="card flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <Cluster label={t('filter.channels')}>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CHANNELS.map((c) => {
            const active = filters.channelTypes.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={'btn-chip ' + (active ? 'btn-chip-active' : '')}
                aria-pressed={active}
              >
                {c}
              </button>
            )
          })}
        </div>
      </Cluster>

      <Divider />

      <Cluster label={t('filter.groupBy')}>
        <div className="inline-flex bg-surface-2 rounded-md p-0.5">
          {GROUPS.map((g) => {
            const active = filters.groupBy === g
            const label =
              g === 'DAY'
                ? t('filter.group.day')
                : g === 'MONTH'
                  ? t('filter.group.month')
                  : t('filter.group.year')
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
      </Cluster>

      <div className="ml-auto flex items-center gap-2">
        <select
          value={refreshIntervalMs}
          onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
          className="select"
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
              <Spinner /> {t('filter.fetching')}
            </>
          ) : (
            <>
              <RefreshIcon /> {t('filter.refresh')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Cluster({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow whitespace-nowrap">{label}</span>
      {children}
    </div>
  )
}

function Divider() {
  return <span className="h-6 w-px bg-line hidden md:block" />
}

function Spinner() {
  return (
    <span className="h-3 w-3 rounded-full border-2 border-fg-muted/30 border-t-fg-muted animate-spin" />
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5">
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
