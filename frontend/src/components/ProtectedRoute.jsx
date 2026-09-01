import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Onboarding from '../pages/Onboarding.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-r-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isSrm = Boolean(user?.university?.toLowerCase().includes('srm'));
  const lacksAcademicDetails = !user?.degree || !user?.branch;
  const needsOnboarding = isSrm && lacksAcademicDetails;

  if (needsOnboarding && location.pathname !== '/settings') {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  return children;
}
