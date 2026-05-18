import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuth((s) => s.user)
  const isExpired = useAuth((s) => s.isExpired)
  const location = useLocation()

  if (!user || isExpired()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
