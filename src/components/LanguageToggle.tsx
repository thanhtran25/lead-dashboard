import { useLocale, type Locale } from '@/lib/i18n'

const LOCALES: Locale[] = ['vi', 'en']

export default function LanguageToggle() {
  const locale = useLocale((s) => s.locale)
  const setLocale = useLocale((s) => s.setLocale)

  return (
    <div className="inline-flex items-center bg-surface-1 border border-line rounded-md p-0.5">
      {LOCALES.map((l) => {
        const active = l === locale
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={
              'h-7 px-2 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors ' +
              (active
                ? 'bg-surface-3 text-fg'
                : 'text-fg-dim hover:text-fg')
            }
            aria-pressed={active}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}
