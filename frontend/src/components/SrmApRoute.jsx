import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSrmApStudent } from '../utils/srmAp.js';

export default function SrmApRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user || !isSrmApStudent(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
