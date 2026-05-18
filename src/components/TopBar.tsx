import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useT } from '@/lib/i18n'
import LanguageToggle from './LanguageToggle'

export default function TopBar() {
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4 text-fg-dim">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
