import { useEffect, useMemo, useRef, useState } from 'react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  isValid,
} from 'date-fns'
import { DayPicker, type DateRange } from 'react-day-picker'
import { vi as viLocale, enUS as enLocale } from 'date-fns/locale'

import { useLocale, useT, type TKey } from '@/lib/i18n'

interface Preset {
  id: string
  labelKey: TKey
  build: () => { from: Date; to: Date }
}

const today = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const PRESETS: Preset[] = [
  {
    id: 'today',
    labelKey: 'filter.preset.today',
    build: () => ({ from: today(), to: today() }),
  },
  {
    id: 'yesterday',
    labelKey: 'filter.preset.yesterday',
    build: () => {
      const y = subDays(today(), 1)
      return { from: y, to: y }
    },
  },
  {
    id: '7d',
    labelKey: 'filter.preset.7d',
    build: () => ({ from: subDays(today(), 6), to: today() }),
  },
  {
    id: '14d',
    labelKey: 'filter.preset.14d',
    build: () => ({ from: subDays(today(), 13), to: today() }),
  },
  {
    id: '30d',
    labelKey: 'filter.preset.30d',
    build: () => ({ from: subDays(today(), 29), to: today() }),
  },
  {
    id: '90d',
    labelKey: 'filter.preset.90d',
    build: () => ({ from: subDays(today(), 89), to: today() }),
  },
  {
    id: 'thisMonth',
    labelKey: 'filter.preset.thisMonth',
    build: () => ({ from: startOfMonth(today()), to: today() }),
  },
  {
    id: 'lastMonth',
    labelKey: 'filter.preset.lastMonth',
    build: () => {
      const start = startOfMonth(subMonths(today(), 1))
      return { from: start, to: endOfMonth(start) }
    },
  },
]

const ISO = 'yyyy-MM-dd'
const DISPLAY = 'dd/MM/yyyy'

function safeParse(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const d = parseISO(s)
  return isValid(d) ? d : undefined
}

function sameDay(a?: Date, b?: Date): boolean {
  if (!a || !b) return false
  return format(a, ISO) === format(b, ISO)
}

function isComplete(
  r: DateRange | undefined,
): r is { from: Date; to: Date } {
  return r?.from instanceof Date && r?.to instanceof Date
}

export default function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const t = useT()
  const locale = useLocale((s) => s.locale)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const propRange: DateRange = useMemo(
    () => ({ from: safeParse(from), to: safeParse(to) }),
    [from, to],
  )
  const [draft, setDraft] = useState<DateRange | undefined>(propRange)

  // When the picker re-opens, snapshot the parent's current range as the
  // working draft. We deliberately don't touch the draft while open so the
  // user can click freely without their state being overwritten.
  useEffect(() => {
    if (open) setDraft(propRange)
  }, [open, propRange])

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

  const activePresetId = useMemo(() => {
    if (!isComplete(propRange)) return null
    for (const p of PRESETS) {
      const built = p.build()
      if (sameDay(built.from, propRange.from) && sameDay(built.to, propRange.to))
        return p.id
    }
    return null
  }, [propRange])

  function commit(next: DateRange) {
    if (!isComplete(next)) return
    onChange(format(next.from, ISO), format(next.to, ISO))
    setOpen(false)
  }

  function applyPreset(p: Preset) {
    const built = p.build()
    commit({ from: built.from, to: built.to })
  }

  function applyDraft() {
    if (!isComplete(draft)) return
    commit(draft)
  }

  function clearDraft() {
    setDraft(undefined)
  }

  const triggerLabel = (() => {
    const f = safeParse(from)
    const tt = safeParse(to)
    if (!f || !tt) return ''
    return `${format(f, DISPLAY)} — ${format(tt, DISPLAY)}`
  })()

  const draftLabel = (() => {
    const df = draft?.from
    if (!df) return t('picker.placeholder')
    const dt = draft?.to
    if (!dt) return `${format(df, DISPLAY)} — ?`
    return `${format(df, DISPLAY)} — ${format(dt, DISPLAY)}`
  })()

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          'card flex items-center gap-3 px-4 h-11 hover:border-line-strong transition-colors ' +
          (open ? 'border-brand' : '')
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon />
        <span className="num text-sm text-fg">
          {triggerLabel || t('picker.placeholder')}
        </span>
        <ChevronIcon className={open ? 'rotate-180' : ''} />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full mt-2 z-40 card p-0 animate-fade-in flex flex-col"
        >
          <div className="flex">
            <div className="p-3">
              <DayPicker
                mode="range"
                numberOfMonths={1}
                showOutsideDays
                fixedWeeks
                weekStartsOn={1}
                locale={locale === 'vi' ? viLocale : enLocale}
                selected={draft}
                onSelect={setDraft}
                classNames={{
                  root: 'rdp-root text-sm select-none',
                  months: 'flex gap-4',
                  month: 'relative space-y-3',
                  month_caption:
                    'flex items-center justify-center text-fg font-medium text-sm h-9',
                  caption_label: 'capitalize pointer-events-none',
                  nav: 'absolute inset-x-0 top-0 h-9 flex items-center justify-between px-1 z-10 pointer-events-none',
                  button_previous:
                    'h-7 w-7 flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors pointer-events-auto cursor-pointer disabled:opacity-30',
                  button_next:
                    'h-7 w-7 flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors pointer-events-auto cursor-pointer disabled:opacity-30',
                  month_grid: 'border-collapse w-full',
                  weekdays: 'flex',
                  weekday:
                    'flex-1 text-[10px] uppercase tracking-wider text-fg-dim font-medium h-7 flex items-center justify-center',
                  week: 'flex',
                  day: 'flex-1 p-0',
                  day_button:
                    'w-9 h-9 num text-sm text-fg-muted rounded-md hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
                  today:
                    'after:content-[""] relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-brand',
                  selected: '',
                  range_start:
                    '[&_button]:bg-brand [&_button]:text-white [&_button]:hover:bg-brand-hover',
                  range_end:
                    '[&_button]:bg-brand [&_button]:text-white [&_button]:hover:bg-brand-hover',
                  range_middle:
                    '[&_button]:bg-brand/15 [&_button]:text-fg [&_button]:rounded-none [&_button]:hover:bg-brand/25',
                  outside: 'text-fg-faint',
                  disabled: 'opacity-30',
                  hidden: 'invisible',
                }}
              />
            </div>

            <div className="border-l border-line p-3 flex flex-col gap-1 min-w-[160px]">
              <p className="eyebrow px-2 pb-1">{t('filter.dateRange')}</p>
              {PRESETS.map((p) => {
                const isActive = p.id === activePresetId
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={[
                      'text-left text-sm px-2.5 py-1.5 rounded-md transition-colors',
                      isActive
                        ? 'bg-brand/15 text-brand'
                        : 'text-fg-muted hover:text-fg hover:bg-surface-2',
                    ].join(' ')}
                  >
                    {t(p.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-line px-3 py-2.5 flex items-center justify-between gap-3">
            <span className="num text-xs text-fg-muted">
              {draftLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearDraft}
                className="btn-ghost"
                disabled={!draft?.from}
              >
                {t('picker.clear')}
              </button>
              <button
                type="button"
                onClick={applyDraft}
                className="btn-primary h-9 px-4 text-xs"
                disabled={!isComplete(draft)}
              >
                {t('picker.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="h-4 w-4 text-fg-muted"
    >
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M2.5 7h11" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 2v3M10.5 2v3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
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
