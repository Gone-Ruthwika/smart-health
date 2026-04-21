import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { SECTORS, extractGoogleMapsData, getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const EMPTY_FORM = { name: '', sector: 'hospital', address: '', city: '', state: '', contact_details: '', average_consultation_minutes: 15, maps_input: '' };

export default function AdminCenters() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mapLocation, setMapLocation] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/centers').then(r => setCenters(r.data.centers)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMapLocation(null);
    setModal(true);
  };

  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      ...EMPTY_FORM,
      name: c.name || '',
      sector: c.sector || 'hospital',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      contact_details: c.contact_details || '',
      average_consultation_minutes: c.average_consultation_minutes || 15,
      maps_input: '',
    });
    setMapLocation({
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
    });
    setModal(true);
  };

  const applyMapsInput = () => {
    const parsed = extractGoogleMapsData(form.maps_input);
    if (!parsed.address) {
      toast.error('Paste a valid Google Maps link or location');
      return;
    }
    setMapLocation(parsed);
    setForm((current) => ({
      ...current,
      address: parsed.address || current.address,
      city: parsed.city || current.city,
      state: parsed.state || current.state,
    }));
    toast.success('Google Maps details applied');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedMaps = extractGoogleMapsData(form.maps_input);
      const payload = {
        ...form,
        address: form.address || parsedMaps.address || mapLocation?.address || '',
        city: form.city || parsedMaps.city || mapLocation?.city || '',
        state: form.state || parsedMaps.state || mapLocation?.state || '',
      };
      delete payload.maps_input;

      if (!payload.address) {
        toast.error('Choose a Google Maps location or enter an address');
        return;
      }

      if (editing) {
        await api.put(`/admin/centers/${editing}`, payload);
        toast.success('Center updated');
      } else {
        await api.post('/admin/centers', payload);
        toast.success('Center created');
      }
      setModal(false);
      fetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this center? This will also remove all associated doctors.')) return;
    try {
      await api.delete(`/admin/centers/${id}`);
      toast.success('Center deleted');
      fetch();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const field = (key, label, type = 'text', opts = {}) => (
    <div key={key}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} className="input" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} {...opts} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Healthcare Centers</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Center</button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div>
        : centers.length === 0 ? <EmptyState icon="🏥" title="No centers yet" />
        : (
          <div className="grid md:grid-cols-2 gap-4">
            {centers.map(c => (
              <div key={c.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  <span className="badge bg-blue-50 text-blue-700 capitalize">{c.sector.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-500">{c.address}, {c.city}, {c.state}</p>
                <p className="text-xs text-gray-400 mt-1">~{c.average_consultation_minutes} min/consultation</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openEdit(c)} className="btn-secondary text-sm py-1.5 flex-1">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="btn-danger text-sm py-1.5 flex-1">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Center' : 'Add Center'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {field('name', 'Name *', 'text', { required: true })}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Paste the selected Google Maps share link or location"
                    value={form.maps_input ?? ''}
                    onChange={(e) => setForm({ ...form, maps_input: e.target.value })}
                  />
                  <button type="button" onClick={applyMapsInput} className="btn-secondary text-sm px-3 whitespace-nowrap">
                    Choose
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the hospital location in Google Maps, copy the share link or address, and paste it here.
                </p>
                {mapLocation?.address && (
                  <p className="text-xs text-green-600 mt-1">
                    Map address selected successfully.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sector *</label>
                <select className="input" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                  {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {field('address', 'Address')}
              {field('city', 'City')}
              {field('state', 'State')}
              {field('contact_details', 'Contact Details')}
              {field('average_consultation_minutes', 'Avg. Consultation (min)', 'number')}
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

