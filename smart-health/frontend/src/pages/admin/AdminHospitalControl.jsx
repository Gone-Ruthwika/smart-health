import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatTime, getAuthorizedCenters, getLocalDateString, isHospitalAdmin, safeDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

function ControlMetric({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-sky-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className={`mb-3 h-2 w-16 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

export default function AdminHospitalControl() {
  const { user } = useAuth();
  const authorizedCenters = useMemo(() => getAuthorizedCenters(user), [user]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [ambulanceRequests, setAmbulanceRequests] = useState([]);
  const [updatingRequestId, setUpdatingRequestId] = useState('');

  const today = getLocalDateString();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [appointmentsRes, queueRes, ambulanceRes] = await Promise.all([
          api.get('/admin/appointments'),
          api.get('/admin/queue-status', { params: { date: today } }),
          api.get('/emergency/ambulance-requests'),
        ]);

        if (!mounted) return;
        setAppointments(appointmentsRes.data.appointments);
        setQueue(queueRes.data.queue);
        setAmbulanceRequests(ambulanceRes.data.requests || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 20000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [today]);

  const handleAmbulanceStatus = async (requestId, status, etaMinutes) => {
    setUpdatingRequestId(requestId);
    try {
      await api.patch(`/emergency/ambulance-book/${requestId}/status`, {
        status,
        ...(etaMinutes !== undefined ? { eta_minutes: etaMinutes } : {}),
      });
      setAmbulanceRequests((current) => current.map((request) => (
        request.id === requestId
          ? {
              ...request,
              status,
              eta_minutes: etaMinutes ?? request.eta_minutes,
              updated_at: new Date().toISOString(),
            }
          : request
      )));
      toast.success('Ambulance status updated');
    } catch {
      toast.error('Failed to update ambulance status');
    } finally {
      setUpdatingRequestId('');
    }
  };

  if (!isHospitalAdmin(user)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">Hospital Control</p>
          <h1 className="mt-3 text-3xl font-bold">This page is for hospital admins</h1>
          <p className="mt-3 text-sm text-gray-500">
            Main admins already have broader access. Use the system control area for full platform management.
          </p>
          <Link to="/admin/system-control" className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
            Open System Control
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const upcomingAppointments = appointments.filter((item) => safeDate(item.appointment_date) >= today);
  const todayAppointments = upcomingAppointments.filter((item) => safeDate(item.appointment_date) === today);
  const confirmed = upcomingAppointments.filter((item) => item.status === 'confirmed').length;
  const active = todayAppointments.filter((item) => item.status === 'in_progress').length;
  const completed = todayAppointments.filter((item) => item.status === 'completed').length;
  const activeAmbulanceRequests = ambulanceRequests.filter((item) => !['completed', 'cancelled'].includes(item.status));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-8 shadow-sm dark:border-sky-900/40 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">Hospital Control</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Booked patient control for your hospitals</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Monitor upcoming bookings, today&apos;s queue flow, and patient status only for the hospitals assigned to this admin account.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm shadow-sm backdrop-blur dark:bg-gray-900/70">
            <p className="font-semibold text-gray-800 dark:text-gray-100">Authorized hospitals</p>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {authorizedCenters.map((center) => center.name).join(', ') || 'No hospitals assigned'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ControlMetric label="Today&apos;s Bookings" value={todayAppointments.length} tone="blue" />
        <ControlMetric label="Upcoming Confirmed" value={confirmed} tone="amber" />
        <ControlMetric label="In Progress" value={active} tone="rose" />
        <ControlMetric label="Completed" value={completed} tone="emerald" />
      </div>

      <div className="mt-8 rounded-3xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-500">Ambulance Dispatch</p>
            <h2 className="mt-2 text-xl font-bold">Live ambulance requests</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Update ambulance progress here to move the patient-facing tracking steps automatically.
            </p>
          </div>
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
            Active requests: {activeAmbulanceRequests.length}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {ambulanceRequests.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60">
              No ambulance requests found for your hospitals yet.
            </p>
          ) : (
            ambulanceRequests.slice(0, 10).map((request) => (
              <div key={request.id} className="rounded-3xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{request.service_name}</p>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {request.center_name} · ETA {request.eta_minutes} min
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Pickup: {request.pickup_label || `${request.pickup_latitude}, ${request.pickup_longitude}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requester: {request.requester_name}{request.requester_phone ? ` · ${request.requester_phone}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      onClick={() => handleAmbulanceStatus(request.id, 'assigned', Math.max(5, Math.min(request.eta_minutes, 12)))}
                      disabled={updatingRequestId === request.id || ['completed', 'cancelled'].includes(request.status)}
                      className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 disabled:opacity-50"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => handleAmbulanceStatus(request.id, 'arriving', Math.min(request.eta_minutes, 3))}
                      disabled={updatingRequestId === request.id || ['completed', 'cancelled'].includes(request.status)}
                      className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
                    >
                      Arriving
                    </button>
                    <button
                      onClick={() => handleAmbulanceStatus(request.id, 'completed', 0)}
                      disabled={updatingRequestId === request.id || request.status === 'completed'}
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleAmbulanceStatus(request.id, 'cancelled', request.eta_minutes)}
                      disabled={updatingRequestId === request.id || request.status === 'cancelled'}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Patient Bookings</p>
              <h2 className="mt-2 text-xl font-bold">Upcoming appointments</h2>
            </div>
            <Link to="/admin/appointments" className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 dark:border-sky-800 dark:text-sky-300">
              Open full bookings
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60">
                No upcoming appointments found.
              </p>
            ) : (
              upcomingAppointments.slice(0, 10).map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800 md:flex-row md:items-center">
                  <div className="w-14 text-xl font-bold text-sky-600">#{item.live_queue_number || item.queue_number}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.user_name}</p>
                    <p className="text-xs text-gray-500">{item.user_email}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {item.center_name} · {formatDate(item.appointment_date)} · {formatTime(item.appointment_time)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Queue Focus</p>
            <h2 className="mt-2 text-xl font-bold">Live queue snapshot</h2>
            <div className="mt-5 space-y-3">
              {queue.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60">
                  No active queue right now.
                </p>
              ) : (
                queue.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-950/30">
                    <div className="w-12 text-center text-lg font-bold text-sky-700 dark:text-sky-300">#{item.live_queue_number || item.queue_number}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.user_name}</p>
                      <p className="text-xs text-gray-500">{item.center_name} · {formatTime(item.appointment_time)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </div>
            <Link to="/admin/queue" className="mt-5 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
              Manage queue
            </Link>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Recommended Flow</p>
            <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>1. Review new bookings and confirmed patients.</p>
              <p>2. Move active patients through queue monitoring.</p>
              <p>3. Mark completed, cancelled, or no-show records from the appointments panel.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
