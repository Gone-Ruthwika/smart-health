import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { StatusBadge, PriorityBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatTime, formatDoctorName, getAuthorizedCenters, isHospitalAdmin, parseAppointmentIssue } from '../../utils/helpers';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

export default function AdminAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: '', center_id: '' });
  const centers = useMemo(() => getAuthorizedCenters(user), [user]);

  const fetchAppointments = () => {
    setLoading(true);
    api.get('/admin/appointments', { params: filters })
      .then((r) => setAppointments(r.data.appointments))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  const handleStatus = async (id, status) => {
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status });
      toast.success('Status updated');
      fetchAppointments();
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">All Appointments</h1>
      {isHospitalAdmin(user) && (
        <p className="text-sm text-gray-500 mb-6">
          You can view and manage only these hospitals: {centers.map((c) => c.name).join(', ') || 'assigned hospitals'}.
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        {isHospitalAdmin(user) && (
          <select className="input max-w-xs" value={filters.center_id} onChange={(e) => setFilters({ ...filters, center_id: e.target.value })}>
            <option value="">All Authorized Hospitals</option>
            {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
          </select>
        )}
        <select className="input max-w-xs" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
        </select>
        <input type="date" className="input max-w-xs" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <button onClick={() => setFilters({ status: '', date: '', center_id: '' })} className="btn-secondary text-sm">Clear</button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div>
        : appointments.length === 0 ? <EmptyState icon="Appointments" title="No appointments found" />
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b dark:border-gray-700">
                  {['#', 'Patient', 'Center', 'Doctor', 'Date & Time', 'Status', 'Priority', 'Actions'].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {appointments.map((appointment) => {
                  const issue = parseAppointmentIssue(appointment.issue);
                  return (
                  <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 pr-4 font-bold text-blue-600">#{appointment.queue_number}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{appointment.user_name}</p>
                      <p className="text-xs text-gray-400">{appointment.user_email}</p>
                      {issue.symptoms.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">Symptoms: {issue.symptoms.join(', ')}</p>
                      )}
                      {(issue.summary || issue.notes) && (
                        <p className="text-xs text-gray-500 mt-1">{issue.summary || issue.notes}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">{appointment.center_name}</td>
                    <td className="py-3 pr-4">{formatDoctorName(appointment.doctor_name)}</td>
                    <td className="py-3 pr-4">
                      <p>{formatDate(appointment.appointment_date)}</p>
                      <p className="text-xs text-gray-400">{formatTime(appointment.appointment_time)}</p>
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={appointment.status} /></td>
                    <td className="py-3 pr-4"><PriorityBadge priority={appointment.priority} /></td>
                    <td className="py-3">
                      <select className="input text-xs py-1 w-32" value={appointment.status} onChange={(e) => handleStatus(appointment.id, e.target.value)}>
                        {STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
