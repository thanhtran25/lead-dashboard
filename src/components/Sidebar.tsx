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
        <MenuItem icon={<DashboardIcon />} label={t('sidebar.dashboard')} active />
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
      <p className="text-[11px] uppercase tracking-wider text-brand-soft/70 px-6 py-2">
        {label}
      </p>
      {children}
    </>
  )
}

function MenuItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <a
      href="#"
      className={[
        'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
        active
          ? 'bg-white/10 text-white border-l-[3px] border-white pl-[21px]'
          : 'text-brand-soft hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <span className="h-4 w-4 shrink-0">{icon}</span>
      {label}
    </a>
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
