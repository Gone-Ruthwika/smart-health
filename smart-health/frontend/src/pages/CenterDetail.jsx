import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import CallButton from '../components/ui/CallButton';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { buildMapsLink, formatDoctorName } from '../utils/helpers';

const SECTOR_ICONS = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  diagnostics: 'Diagnostics',
  dental: 'Dental',
  eye_care: 'Eye Care',
  mental_health: 'Mental Health',
  ent: 'ENT',
};

export default function CenterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [center, setCenter] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/centers/${id}`), api.get('/doctors', { params: { center_id: id } })])
      .then(([centerRes, doctorsRes]) => {
        setCenter(centerRes.data.center);
        setDoctors(doctorsRes.data.doctors);
      })
      .catch(() => toast.error('Failed to load center'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!center) return <div className="text-center py-16 text-gray-500">Center not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/centers')} className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1">
        {'<-'} Back to Centers
      </button>

      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{SECTOR_ICONS[center.sector] || 'Center'}</span>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold">{center.name}</h1>
              <span className="badge bg-blue-50 text-blue-700 capitalize">{center.sector.replace('_', ' ')}</span>
            </div>
            <p className="text-gray-500 mt-1">{center.address}, {center.city}, {center.state}</p>
            {center.contact_details && <p className="text-sm text-gray-500 mt-1">{center.contact_details}</p>}
            <p className="text-sm text-gray-400 mt-1">Average consultation: ~{center.average_consultation_minutes} min</p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <a
                href={buildMapsLink(center)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Open in Google Maps
              </a>
              {center.contact_details && (
                <CallButton contactDetails={center.contact_details} centerName={center.name} />
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => user ? navigate(`/centers/${id}/book`) : navigate('/login')}
          className="btn-primary mt-6 w-full sm:w-auto px-8"
        >
          Book Appointment
        </button>
      </div>

      {doctors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Doctors</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="card">
                <p className="font-semibold">{formatDoctorName(doctor.name)}</p>
                <p className="text-sm text-gray-500">{doctor.specialization}</p>
                <p className="text-xs text-gray-400">{doctor.qualification} · ~{doctor.average_consultation_minutes} min</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
