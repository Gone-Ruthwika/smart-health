import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { extractGoogleMapsData, getAuthorizedCenters, getErrorMessage, isHospitalAdmin } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
  center_id: '',
  name: '',
  phone: '',
  driver_name: '',
  vehicle_number: '',
  maps_input: '',
  is_active: true,
};

export default function AdminAmbulances() {
  const { user } = useAuth();
  const [ambulances, setAmbulances] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const scopedHospitalAdmin = isHospitalAdmin(user);
  const authorizedCenters = useMemo(() => getAuthorizedCenters(user), [user]);
  const authorizedCenterIds = authorizedCenters.map((center) => center.id);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([api.get('/admin/ambulances'), api.get('/centers')])
      .then(([ambulanceRes, centerRes]) => {
        const visibleCenters = scopedHospitalAdmin
          ? centerRes.data.centers.filter((center) => authorizedCenterIds.includes(center.id))
          : centerRes.data.centers.filter((center) => center.sector === 'hospital');

        setAmbulances(ambulanceRes.data.ambulances || []);
        setCenters(visibleCenters.filter((center) => center.sector === 'hospital'));
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

  const openEdit = (ambulance) => {
    setEditing(ambulance.id);
    setForm({
      center_id: ambulance.center_id || '',
      name: ambulance.name || '',
      phone: ambulance.phone || '',
      driver_name: ambulance.driver_name || '',
      vehicle_number: ambulance.vehicle_number || '',
      maps_input: '',
      is_active: ambulance.is_active !== false,
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedMaps = extractGoogleMapsData(form.maps_input);
      const payload = {
        ...form,
        base_latitude: parsedMaps.lat,
        base_longitude: parsedMaps.lng,
      };
      delete payload.maps_input;

      if (editing) {
        await api.put(`/admin/ambulances/${editing}`, payload);
        toast.success('Ambulance updated');
      } else {
        await api.post('/admin/ambulances', payload);
        toast.success('Ambulance added');
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
    if (!confirm('Delete this ambulance service?')) return;
    try {
      await api.delete(`/admin/ambulances/${id}`);
      toast.success('Ambulance deleted');
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ambulances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add named ambulance services for hospitals so SOS tracking can use real hospital-owned ambulances.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary" disabled={scopedHospitalAdmin && centers.length === 0}>
          + Add Ambulance
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : ambulances.length === 0 ? (
        <EmptyState icon="Ambulance" title="No ambulances yet" message="Add a hospital ambulance to make it available in SOS." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {ambulances.map((ambulance) => (
            <div key={ambulance.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{ambulance.name}</h3>
                  <p className="text-sm text-gray-500">{ambulance.center_name} · {ambulance.center_city}</p>
                </div>
                <span className={`badge ${ambulance.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ambulance.is_active ? 'active' : 'inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{ambulance.phone || 'No phone saved'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {ambulance.driver_name || 'No driver assigned'}{ambulance.vehicle_number ? ` · ${ambulance.vehicle_number}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Uses the selected hospital&apos;s saved map location for nearby matching.
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(ambulance)} className="btn-secondary text-sm py-1.5 flex-1">Edit</button>
                <button onClick={() => handleDelete(ambulance.id)} className="btn-danger text-sm py-1.5 flex-1">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && scopedHospitalAdmin && centers.length === 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          This hospital admin account does not have any assigned hospital centers yet.
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Ambulance' : 'Add Ambulance'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Hospital *</label>
                <select
                  className="input"
                  required
                  value={form.center_id}
                  disabled={scopedHospitalAdmin && centers.length === 1}
                  onChange={(e) => setForm({ ...form, center_id: e.target.value })}
                >
                  <option value="">Select hospital</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Nearby SOS search will use this hospital&apos;s saved Google Maps location automatically.
                </p>
              </div>

              {[ 
                ['name', 'Ambulance Name *'],
                ['phone', 'Phone Number'],
                ['driver_name', 'Driver Name'],
                ['vehicle_number', 'Vehicle Number'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    className="input"
                    required={key === 'name'}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-sm font-medium">Google Maps Location</label>
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open Google Maps
                  </a>
                </div>
                <input
                  className="input"
                  placeholder="Paste ambulance base location or Google Maps share link"
                  value={form.maps_input ?? ''}
                  onChange={(e) => setForm({ ...form, maps_input: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional. If provided, SOS will use this ambulance location. Otherwise it falls back to the selected hospital location.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active and available in SOS
              </label>

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
    </div>
  );
}
