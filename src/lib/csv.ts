import type { LeadBucket } from './types'

function escape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function bucketsToCsv(
  buckets: LeadBucket[],
  channels: string[],
): string {
  const header = [
    'period',
    'label',
    ...channels.map((c) => `${c}_total`),
    'completed',
    'processing',
    'failed',
    'total',
  ]
  const lines = [header.join(',')]
  for (const b of buckets) {
    const row = [
      b.period,
      b.label,
      ...channels.map((c) => b.channels[c]?.total ?? 0),
      b.status.completed,
      b.status.processing,
      b.status.failed,
      b.status.total,
    ]
    lines.push(row.map(escape).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
