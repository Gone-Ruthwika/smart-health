import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatDoctorName, getAuthorizedCenters, getErrorMessage, isHospitalAdmin } from '../../utils/helpers';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY_FORM = { center_id: '', name: '', specialization: '', qualification: '', average_consultation_minutes: 15 };
const EMPTY_SLOT = { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 15, is_active: true };

export default function AdminDoctors() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [slotModal, setSlotModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slots, setSlots] = useState([{ ...EMPTY_SLOT }]);
  const [saving, setSaving] = useState(false);

  const scopedHospitalAdmin = isHospitalAdmin(user);
  const authorizedCenters = useMemo(() => getAuthorizedCenters(user), [user]);
  const authorizedCenterIds = authorizedCenters.map((center) => center.id);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([api.get('/doctors'), api.get('/centers')])
      .then(([doctorRes, centerRes]) => {
        const visibleDoctors = scopedHospitalAdmin
          ? doctorRes.data.doctors.filter((doctor) => authorizedCenterIds.includes(doctor.center_id))
          : doctorRes.data.doctors;
        const visibleCenters = scopedHospitalAdmin
          ? centerRes.data.centers.filter((center) => authorizedCenterIds.includes(center.id))
          : centerRes.data.centers;

        setDoctors(visibleDoctors);
        setCenters(visibleCenters);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [scopedHospitalAdmin, authorizedCenterIds.join(',')]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      center_id: scopedHospitalAdmin && centers.length === 1 ? centers[0].id : '',
    });
    setModal(true);
  };

  const openEdit = (doctor) => {
    setEditing(doctor.id);
    setForm({
      center_id: doctor.center_id,
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      average_consultation_minutes: doctor.average_consultation_minutes,
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/doctors/${editing}`, form);
        toast.success('Doctor updated');
      } else {
        await api.post('/admin/doctors', form);
        toast.success('Doctor added');
      }
      setModal(false);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this doctor?')) return;
    try {
      await api.delete(`/admin/doctors/${id}`);
      toast.success('Doctor deleted');
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveSlots = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/doctors/${slotModal}/slots`, { slots });
      toast.success('Slots updated');
      setSlotModal(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-sm text-gray-500 mt-1">
            {scopedHospitalAdmin
              ? 'Hospital admins can add doctors, update specialization details, and manage slots only for assigned hospitals.'
              : 'Manage doctors, specializations, and consultation slots across all hospitals.'}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary" disabled={scopedHospitalAdmin && centers.length === 0}>
          + Add Doctor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : doctors.length === 0 ? (
        <EmptyState icon="Doctors" title="No doctors yet" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="card">
              <h3 className="font-semibold">{formatDoctorName(doctor.name)}</h3>
              <p className="text-sm text-gray-500">{doctor.specialization} · {doctor.qualification}</p>
              <p className="text-xs text-gray-400 mt-1">{doctor.center_name} · ~{doctor.average_consultation_minutes} min</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setSlotModal(doctor.id); setSlots([{ ...EMPTY_SLOT }]); }} className="btn-secondary text-sm py-1.5 flex-1">Slots</button>
                <button onClick={() => openEdit(doctor)} className="btn-secondary text-sm py-1.5 flex-1">Edit</button>
                <button onClick={() => handleDelete(doctor.id)} className="btn-danger text-sm py-1.5 flex-1">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && scopedHospitalAdmin && centers.length === 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          This hospital admin account does not have any assigned hospitals yet.
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Doctor' : 'Add Doctor'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Center *</label>
                <select
                  className="input"
                  required
                  value={form.center_id}
                  disabled={scopedHospitalAdmin && centers.length === 1}
                  onChange={(e) => setForm({ ...form, center_id: e.target.value })}
                >
                  <option value="">Select center</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
                {scopedHospitalAdmin && (
                  <p className="mt-1 text-xs text-gray-500">
                    Only your assigned hospitals are available here.
                  </p>
                )}
              </div>

              {[
                ['name', 'Name *', 'text', true],
                ['specialization', 'Specialization', 'text', false],
                ['qualification', 'Qualification', 'text', false],
              ].map(([key, label, type, required]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    type={type}
                    className="input"
                    required={required}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1">Avg. Consultation (min)</label>
                <input
                  type="number"
                  className="input"
                  value={form.average_consultation_minutes}
                  onChange={(e) => setForm({ ...form, average_consultation_minutes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex justify-center items-center gap-2">
                  {saving ? <Spinner size="sm" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">Manage Availability Slots</h2>
            <div className="space-y-3 mb-4">
              {slots.map((slot, index) => (
                <div key={index} className="border dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Day</label>
                      <select
                        className="input text-sm"
                        value={slot.day_of_week}
                        onChange={(e) => {
                          const next = [...slots];
                          next[index] = { ...next[index], day_of_week: Number(e.target.value) };
                          setSlots(next);
                        }}
                      >
                        {DAYS.map((day, dayIndex) => (
                          <option key={dayIndex} value={dayIndex}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Slot Duration (min)</label>
                      <input
                        type="number"
                        className="input text-sm"
                        value={slot.slot_duration_minutes}
                        onChange={(e) => {
                          const next = [...slots];
                          next[index] = { ...next[index], slot_duration_minutes: Number(e.target.value) };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Start Time</label>
                      <input
                        type="time"
                        className="input text-sm"
                        value={slot.start_time}
                        onChange={(e) => {
                          const next = [...slots];
                          next[index] = { ...next[index], start_time: e.target.value };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End Time</label>
                      <input
                        type="time"
                        className="input text-sm"
                        value={slot.end_time}
                        onChange={(e) => {
                          const next = [...slots];
                          next[index] = { ...next[index], end_time: e.target.value };
                          setSlots(next);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={slot.is_active}
                        onChange={(e) => {
                          const next = [...slots];
                          next[index] = { ...next[index], is_active: e.target.checked };
                          setSlots(next);
                        }}
                      />
                      Active
                    </label>
                    <button onClick={() => setSlots(slots.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 text-xs hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setSlots([...slots, { ...EMPTY_SLOT }])} className="btn-secondary w-full mb-4 text-sm">+ Add Day</button>
            <div className="flex gap-3">
              <button onClick={() => setSlotModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSaveSlots} disabled={saving} className="btn-primary flex-1 flex justify-center items-center gap-2">
                {saving ? <Spinner size="sm" /> : 'Save Slots'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
