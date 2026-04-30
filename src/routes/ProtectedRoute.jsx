import { Navigate, useLocation } from 'react-router-dom'
import { getHomePathByRole, isAllowedRole } from '../lib/authRoles'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (!user && profileLoading)) {
    return (
      <div className="auth-loading-screen">
        <p>Verificando sessão...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && !isAllowedRole(role, allowedRoles)) {
    const fallbackPath = role ? getHomePathByRole(role) : '/login'
    return <Navigate to={fallbackPath} replace />
  }

  return children
}
