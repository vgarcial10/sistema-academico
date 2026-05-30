import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protege rutas: exige sesion y, opcionalmente, un rol permitido.
// El control por rol aqui es solo UX; la seguridad real la impone el backend (requireRole).
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
