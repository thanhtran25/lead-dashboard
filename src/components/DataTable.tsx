import { useMemo, useState } from 'react'
import type { LeadBucket } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import { bucketsToCsv, downloadCsv } from '@/lib/csv'
import { useT } from '@/lib/i18n'

type SortKey =
  | 'period'
  | 'total'
  | 'completed'
  | 'processing'
  | 'failed'
  | string
type SortDir = 'asc' | 'desc'

export default function DataTable({
  buckets,
  channels,
  filename,
}: {
  buckets: LeadBucket[]
  channels: string[]
  filename: string
}) {
  const t = useT()
  const [sortKey, setSortKey] = useState<SortKey>('period')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    const sorted = [...buckets].sort((a, b) => {
      const va = valueFor(a, sortKey)
      const vb = valueFor(b, sortKey)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [buckets, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'period' ? 'asc' : 'desc')
    }
  }

  function handleExport() {
    const csv = bucketsToCsv(rows, channels)
    downloadCsv(filename, csv)
  }

  const totals = useMemo(() => {
    const out = {
      completed: 0,
      processing: 0,
      failed: 0,
      total: 0,
      perChannel: {} as Record<string, number>,
    }
    for (const c of channels) out.perChannel[c] = 0
    for (const r of rows) {
      out.completed += r.status.completed
      out.processing += r.status.processing
      out.failed += r.status.failed
      out.total += r.status.total
      for (const c of channels) {
        out.perChannel[c] += r.channels[c]?.total ?? 0
      }
    }
    return out
  }, [rows, channels])

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3 className="text-base font-semibold text-fg">
            {t('table.title')}
          </h3>
          <p className="text-xs text-fg-muted mt-1">{t('table.hint')}</p>
        </div>
        <button onClick={handleExport} className="btn-ghost">
          <DownloadIcon />
          {t('table.export')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <Th
                label={t('table.col.period')}
                active={sortKey === 'period'}
                dir={sortDir}
                onClick={() => toggleSort('period')}
              />
              {channels.map((c) => (
                <Th
                  key={c}
                  label={c}
                  align="right"
                  active={sortKey === c}
                  dir={sortDir}
                  onClick={() => toggleSort(c)}
                />
              ))}
              <Th
                label={t('table.col.completed')}
                align="right"
                active={sortKey === 'completed'}
                dir={sortDir}
                onClick={() => toggleSort('completed')}
                color="text-signal-green/80"
              />
              <Th
                label={t('table.col.processing')}
                align="right"
                active={sortKey === 'processing'}
                dir={sortDir}
                onClick={() => toggleSort('processing')}
                color="text-signal-amber/80"
              />
              <Th
                label={t('table.col.failed')}
                align="right"
                active={sortKey === 'failed'}
                dir={sortDir}
                onClick={() => toggleSort('failed')}
                color="text-signal-red/80"
              />
              <Th
                label={t('table.col.total')}
                align="right"
                active={sortKey === 'total'}
                dir={sortDir}
                onClick={() => toggleSort('total')}
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={channels.length + 5}
                  className="px-6 py-10 text-center text-sm text-fg-muted"
                >
                  {t('table.empty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.period}
                  className="border-b border-line/60 hover:bg-surface-2/40 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-fg">{r.label}</span>
                      <span className="num text-[11px] text-fg-dim">
                        {r.period}
                      </span>
                    </div>
                  </td>
                  {channels.map((c) => (
                    <td
                      key={c}
                      className="px-5 py-3 text-right num text-sm text-fg"
                    >
                      {formatNumber(r.channels[c]?.total ?? 0)}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right num text-sm text-signal-green">
                    {formatNumber(r.status.completed)}
                  </td>
                  <td className="px-5 py-3 text-right num text-sm text-signal-amber">
                    {formatNumber(r.status.processing)}
                  </td>
                  <td className="px-5 py-3 text-right num text-sm">
                    <span
                      className={
                        r.status.failed > 0
                          ? 'text-signal-red'
                          : 'text-fg-dim'
                      }
                    >
                      {formatNumber(r.status.failed)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right num text-sm font-semibold text-brand">
                    {formatNumber(r.status.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-surface-2/40">
                <td className="px-5 py-3">
                  <span className="eyebrow text-fg-muted">
                    {t('table.sum')}
                  </span>
                </td>
                {channels.map((c) => (
                  <td
                    key={c}
                    className="px-5 py-3 text-right num text-sm text-fg-muted"
                  >
                    {formatNumber(totals.perChannel[c])}
                  </td>
                ))}
                <td className="px-5 py-3 text-right num text-sm text-signal-green">
                  {formatNumber(totals.completed)}
                </td>
                <td className="px-5 py-3 text-right num text-sm text-signal-amber">
                  {formatNumber(totals.processing)}
                </td>
                <td className="px-5 py-3 text-right num text-sm text-signal-red">
                  {formatNumber(totals.failed)}
                </td>
                <td className="px-5 py-3 text-right num text-sm font-semibold text-brand">
                  {formatNumber(totals.total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

function Th({
  label,
  align = 'left',
  active,
  dir,
  onClick,
  color,
}: {
  label: string
  align?: 'left' | 'right'
  active: boolean
  dir: SortDir
  onClick: () => void
  color?: string
}) {
  return (
    <th
      scope="col"
      className={
        'px-5 py-3 ' +
        (align === 'right' ? 'text-right' : 'text-left') +
        ' select-none'
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={
          'inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ' +
          (active ? 'text-fg' : (color ?? 'text-fg-dim') + ' hover:text-fg-muted')
        }
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={
            'text-[9px] ' + (active ? 'text-brand' : 'text-fg-faint')
          }
        >
          {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function valueFor(bucket: LeadBucket, key: SortKey): number | string {
  if (key === 'period') return bucket.period
  if (
    key === 'total' ||
    key === 'completed' ||
    key === 'processing' ||
    key === 'failed'
  ) {
    return bucket.status[key]
  }
  return bucket.channels[key]?.total ?? 0
}
