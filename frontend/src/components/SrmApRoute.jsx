import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSrmApStudent } from '../utils/srmAp.js';

/**
 * Route guard that only allows access for SRM University–AP students.
 * Non-SRM users are redirected to the home page.
 */
export default function SrmApRoute({ children }) {
  const { user, isLoading } = useAuth();

  // Wait for auth to resolve before deciding
  if (isLoading) return null;

  if (!user || !isSrmApStudent(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
