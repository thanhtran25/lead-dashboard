import { formatNumber, formatPercent } from '@/lib/format'
import type { StatsSummary } from '@/lib/stats'
import { useT } from '@/lib/i18n'

export default function KpiCards({
  summary,
  rangeLabel,
}: {
  summary: StatsSummary
  rangeLabel: string
}) {
  const t = useT()
  const { status, conversionPct } = summary
  // The backend's `total` may not equal completed+processing+failed for
  // every row (some sub-channels are operation-counted while total tracks
  // unique leads). Use the larger of the two as the percentage denominator
  // so we never show >100%.
  const denominator = Math.max(
    status.total,
    status.completed + status.processing + status.failed,
  )
  const pct = (n: number) =>
    denominator > 0 ? (n / denominator) * 100 : 0

  return (
    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Card
        label={t('kpi.total')}
        value={formatNumber(status.total)}
        sub={
          <span className="text-fg-muted truncate">
            {rangeLabel}
          </span>
        }
        accent
      />
      <Card
        label={t('kpi.completed')}
        value={
          <span className="text-signal-green">
            {formatNumber(status.completed)}
          </span>
        }
        sub={
          <Trio
            primary={t('kpi.percentOfTotal', {
              pct: pct(status.completed).toFixed(1),
            })}
            secondary={`${t('kpi.conversion')} ${formatPercent(conversionPct, 1).replace('+', '')}`}
          />
        }
      />
      <Card
        label={t('kpi.processing')}
        value={
          <span className="text-signal-amber">
            {formatNumber(status.processing)}
          </span>
        }
        sub={
          <span className="text-fg-muted">
            {t('kpi.percentOfTotal', {
              pct: pct(status.processing).toFixed(1),
            })}
          </span>
        }
      />
      <Card
        label={t('kpi.failed')}
        value={
          <span
            className={
              status.failed > 0 ? 'text-signal-red' : 'text-fg'
            }
          >
            {formatNumber(status.failed)}
          </span>
        }
        sub={
          <span className="text-fg-muted">
            {t('kpi.percentOfTotal', {
              pct: pct(status.failed).toFixed(1),
            })}
          </span>
        }
      />
    </section>
  )
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: React.ReactNode
  sub: React.ReactNode
  accent?: boolean
}) {
  return (
    <article
      className={
        'card p-5 animate-fade-in ' +
        (accent
          ? 'ring-1 ring-brand/30 bg-gradient-to-br from-brand/[0.06] to-transparent'
          : '')
      }
    >
      <p className="eyebrow mb-4">{label}</p>
      <p className="num text-[40px] leading-none font-semibold text-fg tracking-tight">
        {value}
      </p>
      <div className="text-xs mt-3 truncate">{sub}</div>
    </article>
  )
}

function Trio({
  primary,
  secondary,
}: {
  primary: string
  secondary: string
}) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-fg-muted">{primary}</span>
      <span className="text-fg-faint">·</span>
      <span className="text-fg-muted truncate">{secondary}</span>
    </div>
  )
}
