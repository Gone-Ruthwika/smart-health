import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import { isMainAdmin } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

function SystemCard({ eyebrow, title, detail, to, actionLabel }) {
  return (
    <div className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{detail}</p>
      <Link to={to} className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
        {actionLabel}
      </Link>
    </div>
  );
}

export default function AdminSystemControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, admins: 0, centers: 0, doctors: 0, appointments: 0 });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, centersRes, doctorsRes, appointmentsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/centers'),
          api.get('/doctors'),
          api.get('/admin/appointments'),
        ]);

        if (!mounted) return;
        const allUsers = usersRes.data.users;
        setStats({
          users: allUsers.filter((entry) => entry.role === 'user').length,
          admins: allUsers.filter((entry) => entry.role === 'admin').length,
          centers: centersRes.data.centers.length,
          doctors: doctorsRes.data.doctors.length,
          appointments: appointmentsRes.data.appointments.length,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (isMainAdmin(user)) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  if (!isMainAdmin(user)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">System Control</p>
          <h1 className="mt-3 text-3xl font-bold">Main admin access required</h1>
          <p className="mt-3 text-sm text-gray-500">
            Hospital admins can control patient bookings for their assigned hospitals, but full data control stays with main admins.
          </p>
          <Link to="/admin/hospital-control" className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
            Go to Hospital Control
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-8 shadow-sm dark:border-emerald-900/40 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">System Control</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">Whole-platform data control</h1>
        <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
          This page is the full administrative workspace for platform-wide data, including centers, doctors, users, scoped admins, and all appointments.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Users', stats.users],
          ['Admins', stats.admins],
          ['Centers', stats.centers],
          ['Doctors', stats.doctors],
          ['Appointments', stats.appointments],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SystemCard
          eyebrow="Hospitals"
          title="Centers and service network"
          detail="Create, edit, and remove healthcare centers, then keep the network structure clean as your platform grows."
          to="/admin/centers"
          actionLabel="Manage centers"
        />
        <SystemCard
          eyebrow="Clinical Staff"
          title="Doctors and availability"
          detail="Control doctor profiles, their assigned centers, and their availability slots from one place."
          to="/admin/doctors"
          actionLabel="Manage doctors"
        />
        <SystemCard
          eyebrow="Access"
          title="Users and admin permissions"
          detail="Create main admins or hospital-specific admins and decide exactly who can control what."
          to="/admin/users"
          actionLabel="Manage users"
        />
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Operational Oversight</p>
            <h2 className="mt-2 text-xl font-bold">Cross-platform appointment view</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Review all appointment records across hospitals and hand operational work to hospital admins when needed.
            </p>
          </div>
          <Link to="/admin/appointments" className="inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
            Open appointment control
          </Link>
        </div>
      </div>
    </div>
  );
}
