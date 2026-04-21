import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';
import { getDefaultRouteForUser, isAdmin, isHospitalAdmin, isMainAdmin } from '../../utils/helpers';

export default function ProtectedRoute({ children, adminOnly = false, role = null }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin(user)) return <Navigate to="/dashboard" replace />;
  if (role === 'user' && isAdmin(user)) return <Navigate to={getDefaultRouteForUser(user)} replace />;
  if (role === 'hospital_admin' && !isHospitalAdmin(user)) return <Navigate to={getDefaultRouteForUser(user)} replace />;
  if (role === 'main_admin' && !isMainAdmin(user)) return <Navigate to={getDefaultRouteForUser(user)} replace />;

  return children;
}
