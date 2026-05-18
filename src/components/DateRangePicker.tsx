import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { vi as viLocale, enUS as enLocale } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'

import { useLocale, useT, type TKey } from '@/lib/i18n'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ISO = 'yyyy-MM-dd'
const DISPLAY = 'dd/MM/yyyy'

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function safeParse(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const d = parseISO(s)
  return isValid(d) ? d : undefined
}

function sameDay(a: Date | undefined, b: Date | undefined): boolean {
  if (!a || !b) return false
  return isSameDay(a, b)
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

type Phase = 'pick-start' | 'pick-end'

export default function DateRangePicker({
  from: fromProp,
  to: toProp,
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

  // Parsed parent props.
  const propFrom = useMemo(() => safeParse(fromProp), [fromProp])
  const propTo = useMemo(() => safeParse(toProp), [toProp])

  // -- Local draft state. The parent props are NOT touched until "Apply". --
  //
  // We deliberately roll our own 2-phase state machine instead of using
  // react-day-picker's `mode="range"`: the library's built-in logic does
  // things like "complete a 1-day range on first click" or "extend an
  // existing range when clicking past it" which led to the picker feeling
  // unpredictable. Here every click does exactly one of two things:
  //
  //   pick-start phase → set start, clear end, advance to pick-end
  //   pick-end phase   → set end (with auto-swap), advance back to pick-start
  //
  // So the user can always start over by clicking once more.
  const [phase, setPhase] = useState<Phase>('pick-start')
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(propFrom)
  const [draftTo, setDraftTo] = useState<Date | undefined>(propTo)
  const [hovered, setHovered] = useState<Date | undefined>(undefined)
  const [month, setMonth] = useState<Date>(() => propFrom ?? new Date())

  /* Reset draft every time the popover opens. */
  useEffect(() => {
    if (!open) return
    setDraftFrom(propFrom)
    setDraftTo(propTo)
    setPhase('pick-start')
    setHovered(undefined)
    setMonth(propTo ?? propFrom ?? new Date())
  }, [open, propFrom, propTo])

  /* Click outside → close (without committing). */
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  /* ESC → close. */
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* ------------------------------ click flow ----------------------------- */

  function handleDayClick(
    date: Date,
    modifiers: { disabled?: boolean },
  ) {
    if (modifiers?.disabled) return

    if (phase === 'pick-start') {
      setDraftFrom(date)
      setDraftTo(undefined)
      setPhase('pick-end')
      setHovered(date)
      return
    }

    // pick-end phase
    if (!draftFrom) {
      // shouldn't happen, but recover gracefully
      setDraftFrom(date)
      setPhase('pick-end')
      return
    }
    if (isBefore(date, draftFrom)) {
      // clicked earlier than start → auto-swap
      setDraftTo(draftFrom)
      setDraftFrom(date)
    } else {
      setDraftTo(date)
    }
    setPhase('pick-start')
    setHovered(undefined)
  }

  function commit(f: Date, t2: Date) {
    onChange(format(f, ISO), format(t2, ISO))
    setOpen(false)
  }

  function applyDraft() {
    if (!draftFrom || !draftTo) return
    commit(draftFrom, draftTo)
  }

  function clearDraft() {
    setDraftFrom(undefined)
    setDraftTo(undefined)
    setPhase('pick-start')
    setHovered(undefined)
  }

  function applyPreset(p: Preset) {
    const built = p.build()
    commit(built.from, built.to)
  }

  /* ------------------------------ rendering ------------------------------ */

  // Visual range: if we're mid-selection (pick-end with no `to` yet), the
  // preview is anchored at the hovered cell so the user sees the range form
  // as they move the mouse.
  const previewEnd =
    phase === 'pick-end' && draftFrom && !draftTo ? hovered : undefined
  let visualStart = draftFrom
  let visualEnd = draftTo ?? previewEnd
  if (visualStart && visualEnd && isBefore(visualEnd, visualStart)) {
    ;[visualStart, visualEnd] = [visualEnd, visualStart]
  }

  const middle = useMemo(() => {
    if (!visualStart || !visualEnd) return undefined
    if (sameDay(visualStart, visualEnd)) return undefined
    return { from: addDays(visualStart, 1), to: subDays(visualEnd, 1) }
  }, [visualStart, visualEnd])

  const activePresetId = useMemo(() => {
    if (!propFrom || !propTo) return null
    for (const p of PRESETS) {
      const built = p.build()
      if (sameDay(built.from, propFrom) && sameDay(built.to, propTo)) return p.id
    }
    return null
  }, [propFrom, propTo])

  const triggerLabel = (() => {
    if (!propFrom || !propTo) return ''
    return `${format(propFrom, DISPLAY)} — ${format(propTo, DISPLAY)}`
  })()

  const hintLabel = (() => {
    if (phase === 'pick-start' || !draftFrom) return t('picker.pickStart')
    return t('picker.pickEnd')
  })()

  const draftLabel = (() => {
    if (!draftFrom) return null
    if (!draftTo) return `${format(draftFrom, DISPLAY)} — ?`
    return `${format(draftFrom, DISPLAY)} — ${format(draftTo, DISPLAY)}`
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
          aria-label={t('filter.dateRange')}
          className="absolute left-0 top-full mt-2 z-40 card p-0 animate-fade-in flex flex-col"
        >
          <div className="flex">
            <div className="p-3">
              <p className="eyebrow px-1 mb-2 flex items-center gap-2">
                <span
                  className={
                    'h-1.5 w-1.5 rounded-full ' +
                    (phase === 'pick-start' ? 'bg-brand' : 'bg-signal-amber')
                  }
                />
                {hintLabel}
              </p>
              <DayPicker
                numberOfMonths={1}
                showOutsideDays
                fixedWeeks
                weekStartsOn={1}
                locale={locale === 'vi' ? viLocale : enLocale}
                month={month}
                onMonthChange={setMonth}
                disabled={{ after: today() }}
                onDayClick={handleDayClick}
                onDayMouseEnter={(day) => setHovered(day)}
                onDayMouseLeave={() => setHovered(undefined)}
                modifiers={{
                  rs: visualStart ? [visualStart] : [],
                  re: visualEnd ? [visualEnd] : [],
                  rm: middle ?? [],
                }}
                modifiersClassNames={{
                  rs: '[&_button]:bg-brand [&_button]:text-white [&_button]:hover:bg-brand-hover',
                  re: '[&_button]:bg-brand [&_button]:text-white [&_button]:hover:bg-brand-hover',
                  rm: '[&_button]:bg-brand/15 [&_button]:text-fg [&_button]:rounded-none [&_button]:hover:bg-brand/25',
                }}
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
                    'w-9 h-9 num text-sm text-fg-muted rounded-md hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                  today:
                    'after:content-[""] relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-brand',
                  outside: 'text-fg-faint',
                  disabled: 'opacity-30 cursor-not-allowed',
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
              {draftLabel ?? hintLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearDraft}
                className="btn-ghost"
                disabled={!draftFrom}
              >
                {t('picker.clear')}
              </button>
              <button
                type="button"
                onClick={applyDraft}
                className="btn-primary h-9 px-4 text-xs"
                disabled={!draftFrom || !draftTo}
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

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

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
