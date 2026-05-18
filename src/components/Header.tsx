import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { formatTimestamp } from '@/lib/format'
import { useT } from '@/lib/i18n'
import LanguageToggle from './LanguageToggle'

export default function Header({
  lastUpdated,
}: {
  lastUpdated?: Date | null
}) {
  const t = useT()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto max-w-[1480px] px-6 h-16 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-none">
            <p className="text-sm font-semibold text-fg">{t('app.name')}</p>
            <p className="text-[11px] text-fg-dim mt-1 hidden sm:block">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {lastUpdated && (
            <Meta
              label={t('header.lastFetch')}
              value={formatTimestamp(lastUpdated)}
            />
          )}
          <Meta
            label={t('header.systemTime')}
            value={formatTimestamp(now)}
            className="hidden md:flex"
          />
          <Meta
            label={t('header.operator')}
            value={user?.username ?? t('misc.unknown')}
            className="hidden sm:flex"
          />
          <LanguageToggle />
          <button onClick={handleLogout} className="btn-ghost">
            {t('header.signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <div className="h-8 w-8 rounded-md bg-brand flex items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 text-white"
        aria-hidden
      >
        <path
          d="M3 17l4-4 4 4 6-6 4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="7" r="1.5" fill="currentColor" />
      </svg>
    </div>
  )
}

function Meta({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={'flex flex-col items-end leading-none ' + className}>
      <span className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </span>
      <span className="num text-xs text-fg mt-1">{value}</span>
    </div>
  )
}
