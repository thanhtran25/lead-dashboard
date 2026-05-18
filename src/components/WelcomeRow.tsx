import { useEffect, useRef, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { useT, type TKey } from '@/lib/i18n'
import type { StatsFilters } from '@/lib/types'

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

export default function WelcomeRow({
  filters,
  onChange,
}: {
  filters: StatsFilters
  onChange: (next: StatsFilters) => void
}) {
  return (
    <div className="flex items-center">
      <DateRangePopover filters={filters} onChange={onChange} />
    </div>
  )
}

function DateRangePopover({
  filters,
  onChange,
}: {
  filters: StatsFilters
  onChange: (next: StatsFilters) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const fromDate = safeParse(filters.from)
  const toDate = safeParse(filters.to)

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="card flex items-center gap-3 px-4 py-2.5 hover:border-line-strong transition-colors"
      >
        <DateBlock date={fromDate} fallback={filters.from} />
        <span className="text-fg-dim text-base">→</span>
        <DateBlock date={toDate} fallback={filters.to} />
        <ChevronIcon className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 card p-4 min-w-[340px] animate-fade-in">
          <p className="eyebrow mb-3">{t('filter.dateRange')}</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(e) =>
                onChange({ ...filters, from: e.target.value })
              }
              className="input-sm num flex-1"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-fg-dim text-sm">→</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="input-sm num flex-1"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const r = p.build()
                  onChange({ ...filters, ...r })
                  setOpen(false)
                }}
                className="btn-chip"
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DateBlock({
  date,
  fallback,
}: {
  date: Date | null
  fallback: string
}) {
  if (!date) {
    return (
      <span className="num text-sm text-fg">{fallback}</span>
    )
  }
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold num text-fg leading-none">
        {format(date, 'dd')}
      </span>
      <span className="text-[10px] leading-tight uppercase text-fg-muted">
        <span className="block">{format(date, 'MMM yyyy')}</span>
        <span className="block">{format(date, 'EEEE')}</span>
      </span>
    </span>
  )
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={'h-4 w-4 text-fg-dim transition-transform ' + className}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function safeParse(s: string): Date | null {
  try {
    const d = parseISO(s)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}
