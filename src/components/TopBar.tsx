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
    <div className="h-16 bg-topbar border-b border-line flex items-center justify-end px-6 sticky top-0 z-30 backdrop-blur">
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
