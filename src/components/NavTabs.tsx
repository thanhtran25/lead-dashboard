import { useT, type TKey } from '@/lib/i18n'
import { METRIC_KEYS, type MetricKey } from '@/lib/types'

const TAB_LABELS: Record<MetricKey, TKey> = {
  total: 'tabs.overview',
  completed: 'kpi.completed',
  processing: 'kpi.processing',
  failed: 'kpi.failed',
}

export default function NavTabs({
  active,
  onChange,
}: {
  active: MetricKey
  onChange: (next: MetricKey) => void
}) {
  const t = useT()
  return (
    <nav className="flex border-b border-line gap-7">
      {METRIC_KEYS.map((m) => {
        const isActive = m === active
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={[
              'pb-3 -mb-px text-sm font-medium transition-colors border-b-[3px]',
              isActive
                ? 'text-brand border-brand'
                : 'text-fg-muted border-transparent hover:text-fg',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {t(TAB_LABELS[m])}
          </button>
        )
      })}
    </nav>
  )
}
