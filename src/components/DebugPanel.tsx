import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { formatNumber } from '@/lib/format'

interface Diagnostics {
  buckets: number
  channels: string[]
  total: number
}

export default function DebugPanel({
  raw,
  diagnostics,
}: {
  raw: unknown
  diagnostics?: Diagnostics
}) {
  const t = useT()
  // Auto-expand when parser yielded an empty result but the response itself
  // is non-null — that's the most useful moment to inspect the data.
  const shouldAutoExpand =
    raw != null && (!diagnostics || diagnostics.total === 0)
  const [open, setOpen] = useState(shouldAutoExpand)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (shouldAutoExpand) setOpen(true)
  }, [shouldAutoExpand])

  const jsonText = safeStringify(raw)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* no-op */
    }
  }

  const isEmpty = diagnostics && diagnostics.total === 0 && raw != null

  return (
    <section className="card">
      <div className="card-header">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-fg">{t('debug.title')}</h3>
          <p className="text-xs text-fg-muted mt-1">{t('debug.hint')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="btn-ghost" disabled={raw == null}>
            {copied ? t('debug.copied') : t('debug.copy')}
          </button>
          <button onClick={() => setOpen((v) => !v)} className="btn-ghost">
            {open ? t('debug.collapse') : t('debug.expand')}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-4">
          {diagnostics && (
            <div className="grid grid-cols-3 gap-3">
              <DiagCard
                label={t('debug.diag.buckets')}
                value={formatNumber(diagnostics.buckets)}
              />
              <DiagCard
                label={t('debug.diag.channels')}
                value={
                  diagnostics.channels.length > 0
                    ? diagnostics.channels.join(', ')
                    : '—'
                }
                mono={diagnostics.channels.length > 0}
              />
              <DiagCard
                label={t('debug.diag.total')}
                value={formatNumber(diagnostics.total)}
              />
            </div>
          )}

          {isEmpty && (
            <div className="border border-signal-amber/40 bg-signal-amber/10 rounded-md px-4 py-3">
              <p className="text-xs text-signal-amber font-medium mb-1">
                {t('debug.diag.title')}
              </p>
              <p className="text-xs text-fg-muted">
                {t('debug.diag.emptyHint')}
              </p>
            </div>
          )}

          {raw == null ? (
            <p className="text-xs text-fg-muted py-6 text-center">
              {t('debug.noData')}
            </p>
          ) : (
            <pre className="overflow-x-auto rounded-md bg-surface-2/60 border border-line p-4 num text-[12px] text-fg-muted leading-relaxed max-h-[420px]">
              {jsonText}
            </pre>
          )}
        </div>
      )}
    </section>
  )
}

function DiagCard({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-md bg-surface-2/50 border border-line px-4 py-3">
      <p className="eyebrow text-fg-dim mb-1.5">{label}</p>
      <p
        className={
          'text-sm text-fg ' +
          (mono ? 'font-mono' : 'font-semibold num')
        }
      >
        {value}
      </p>
    </div>
  )
}

function safeStringify(value: unknown): string {
  if (value == null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
