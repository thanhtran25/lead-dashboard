import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import LoadingScreen from '@/components/LoadingScreen'

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuth((s) => s.user)
  const isExpired = useAuth((s) => s.isExpired)
  const refreshing = useAuth((s) => s.refreshing)
  const refresh = useAuth((s) => s.refresh)
  const location = useLocation()

  const expired = isExpired()
  const canSilentlyRefresh = Boolean(user?.refreshToken)

  // If the in-memory token has expired but we still have a refresh token,
  // kick off a silent refresh instead of bouncing the user to /login. The
  // store guards against duplicate concurrent refreshes.
  useEffect(() => {
    if (user && expired && canSilentlyRefresh && !refreshing) {
      void refresh()
    }
  }, [user, expired, canSilentlyRefresh, refreshing, refresh])

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (expired && !canSilentlyRefresh) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Show the loading screen while we (re)acquire a fresh ID token. This
  // also covers the very first render after a page reload, where the saved
  // token is already past its lifetime but the refresh token is still valid.
  if (expired && refreshing) {
    return <LoadingScreen />
  }

  return <>{children}</>
}
