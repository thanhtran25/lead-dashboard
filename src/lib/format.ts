import { format, parseISO, isValid } from 'date-fns'

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const decimal = new Intl.NumberFormat('en-US')

export function formatNumber(n: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(n)) return '—'
  if (opts?.compact) return compact.format(n)
  return decimal.format(Math.round(n))
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatDateLabel(period: string, groupBy: string): string {
  if (groupBy === 'WEEK' && /^\d{4}-W\d{1,2}$/.test(period)) return period
  if (groupBy === 'MONTH' && /^\d{4}-\d{2}$/.test(period)) {
    const d = parseISO(`${period}-01`)
    return isValid(d) ? format(d, 'LLL yyyy') : period
  }
  const d = parseISO(period)
  if (isValid(d)) {
    if (groupBy === 'MONTH') return format(d, 'LLL yyyy')
    if (groupBy === 'WEEK') return format(d, "'W'II")
    return format(d, 'dd LLL')
  }
  return period
}

export function formatTimestamp(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d
  return format(date, 'HH:mm:ss')
}
