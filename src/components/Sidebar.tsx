import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useT } from '@/lib/i18n'

export default function Sidebar() {
  const t = useT()
  const user = useAuth((s) => s.user)
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <aside className="w-[260px] shrink-0 bg-sidebar text-fg flex flex-col py-5 overflow-y-auto sticky top-0 h-screen">
      <div className="px-6 mb-7 flex items-center gap-2 select-none">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-white text-sidebar font-bold text-sm">
          LS
        </span>
        <span className="text-lg font-semibold tracking-tight">
          LeadScope
        </span>
      </div>

      <div className="px-6 mb-7 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-brand/70 flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-white">
            {user?.username ?? '—'}
          </p>
        </div>
      </div>

      <Section label={t('sidebar.mainMenu')}>
        <MenuItem to="/dashboard" icon={<DashboardIcon />} label={t('sidebar.dashboard')} />
        <MenuItem to="/fraud-unblock" icon={<ShieldIcon />} label="Fraud Unblock" />
      </Section>
    </aside>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-dim px-6 py-2">
        {label}
      </p>
      {children}
    </>
  )
}

function MenuItem({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-6 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-brand/15 text-white border-l-[3px] border-brand pl-[21px]'
            : 'text-fg-muted hover:bg-white/5 hover:text-white',
        ].join(' ')
      }
    >
      <span className="h-4 w-4 shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4">
      <path
        d="M8 1.5 2.5 3.5v4c0 3.2 2.4 6 5.5 7 3.1-1 5.5-3.8 5.5-7v-4L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="m5.8 8.1 1.6 1.6L10.4 6.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
