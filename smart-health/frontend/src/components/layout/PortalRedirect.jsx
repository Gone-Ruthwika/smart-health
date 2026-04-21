import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';
import { getDefaultRouteForUser, isHospitalAdmin, isMainAdmin } from '../../utils/helpers';

export default function PortalRedirect({ target = 'default' }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;

  if (target === 'hospital-login') {
    if (isHospitalAdmin(user)) return <Navigate to="/hospital-admin/dashboard" replace />;
    if (isMainAdmin(user)) return <Navigate to="/main-admin/dashboard" replace />;
    return <Navigate to="/hospital-admin/login" replace />;
  }

  if (target === 'main-login') {
    if (isMainAdmin(user)) return <Navigate to="/main-admin/dashboard" replace />;
    if (isHospitalAdmin(user)) return <Navigate to="/hospital-admin/dashboard" replace />;
    return <Navigate to="/main-admin/login" replace />;
  }

  return <Navigate to={getDefaultRouteForUser(user)} replace />;
}
