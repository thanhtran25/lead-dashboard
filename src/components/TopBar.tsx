import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useT } from '@/lib/i18n'
import LanguageToggle from './LanguageToggle'

export default function TopBar({
  notifications = 4,
}: {
  notifications?: number
}) {
  const t = useT()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="h-16 bg-topbar border-b border-line flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur">
      <div className="flex items-center gap-3 max-w-md flex-1">
        <SearchIcon />
        <input
          type="text"
          placeholder={t('header.search')}
          className="bg-transparent flex-1 text-sm text-fg placeholder:text-fg-faint outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <IconButton aria-label="messages">
          <ChatIcon />
        </IconButton>
        <IconButton aria-label="notifications" badge={notifications}>
          <BellIcon />
        </IconButton>
        <div className="h-9 w-9 rounded-full bg-brand/80 flex items-center justify-center text-white font-semibold text-xs">
          {initials}
        </div>
        <button onClick={handleLogout} className="btn-ghost">
          {t('header.signOut')}
        </button>
      </div>
    </div>
  )
}

function IconButton({
  children,
  badge,
  ...rest
}: {
  children: React.ReactNode
  badge?: number
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="relative h-9 w-9 rounded-md flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
    >
      {children}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-signal-red text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4 text-fg-dim">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4">
      <path
        d="M2.5 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2h-3l-3 2v-2h-1a2 2 0 01-2-2V5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4">
      <path
        d="M8 2a4 4 0 00-4 4v3l-1 1h10l-1-1V6a4 4 0 00-4-4zM6.5 12a1.5 1.5 0 003 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
