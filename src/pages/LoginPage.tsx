import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { env } from '@/lib/env'
import { useT } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

export default function LoginPage() {
  const t = useT()
  const user = useAuth((s) => s.user)
  const isExpired = useAuth((s) => s.isExpired)
  const refreshing = useAuth((s) => s.refreshing)
  const status = useAuth((s) => s.status)
  const errorMsg = useAuth((s) => s.error)
  const login = useAuth((s) => s.login)

  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Warm up the dashboard chunk while the user is still typing so navigation
  // after sign-in feels instant. Vite resolves the dynamic import once and
  // caches it; subsequent imports are free.
  useEffect(() => {
    const id = window.setTimeout(() => {
      import('@/pages/DashboardPage').catch(() => {
        /* ignore — will retry on actual navigation */
      })
    }, 300)
    return () => window.clearTimeout(id)
  }, [])

  // Only redirect away from /login when we have a working session — i.e.
  // either the token is still valid OR a refresh is in flight (which the
  // ProtectedRoute will hold open until it resolves).
  if (user && (!isExpired() || refreshing)) {
    return <Navigate to={from ?? '/dashboard'} replace />
  }

  const submitting = status === 'authenticating'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLocalError(null)
    if (!email.trim() || !password) {
      setLocalError(t('login.missingFields'))
      return
    }
    try {
      await login(email.trim(), password)
      navigate(from ?? '/dashboard', { replace: true })
    } catch {
      /* error already in store */
    }
  }

  const showError = localError ?? errorMsg

  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="flex items-center gap-3 mb-10">
            <Logo />
            <div>
              <p className="text-base font-semibold text-fg leading-none">
                {t('app.name')}
              </p>
              <p className="text-xs text-fg-muted mt-1">{t('app.tagline')}</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-fg mb-1.5">
            {t('login.title')}
          </h1>
          <p className="text-sm text-fg-muted mb-8">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('login.email')} htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input"
              />
            </Field>

            <Field
              label={t('login.password')}
              htmlFor="password"
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[11px] font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              }
            >
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </Field>

            {showError && (
              <div
                role="alert"
                className="border border-signal-red/40 bg-signal-red/10 rounded-md px-3 py-2.5"
              >
                <p className="text-xs font-medium text-signal-red">
                  {showError}
                </p>
              </div>
            )}

            {!env.firebaseKey && (
              <div className="border border-signal-amber/40 bg-signal-amber/10 rounded-md px-3 py-2.5">
                <p className="text-xs text-signal-amber font-medium mb-0.5">
                  {t('login.notice')}
                </p>
                <p className="text-xs text-fg-muted">
                  {t('login.noFirebaseKey')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-6"
            >
              {submitting ? (
                <>
                  <Spinner />
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-line p-4 text-center">
        <p className="text-[11px] text-fg-dim">
          © {new Date().getFullYear()} LeadScope
        </p>
      </footer>
    </div>
  )
}

function Logo() {
  return (
    <div className="relative h-10 w-10 rounded-lg bg-brand flex items-center justify-center shadow-glow">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5 text-white"
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

function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string
  htmlFor: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-fg-muted"
        >
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
  )
}
