import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { SECTORS } from '../utils/helpers';
import { useLocation } from '../context/LocationContext';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const SECTOR_ICONS = {
  hospital: '🏥', clinic: '🩺', diagnostics: '🔬',
  dental: '🦷', eye_care: '👁️', mental_health: '🧠', ent: '👂',
};

const SECTOR_HOURS = {
  hospital: '24/7', clinic: 'Mon–Sat 8AM–8PM', diagnostics: 'Mon–Sun 6AM–10PM',
  dental: 'Mon–Sat 9AM–6PM', eye_care: 'Mon–Sat 9AM–5PM', mental_health: 'Mon–Fri 10AM–6PM',
  ent: 'Mon–Sat 9AM–6PM',
};

function isOpenNow(sector) {
  const now = new Date();
  const h = now.getHours(), day = now.getDay();
  if (sector === 'hospital') return true;
  if (sector === 'diagnostics') return h >= 6 && h < 22;
  if (sector === 'mental_health') return day >= 1 && day <= 5 && h >= 10 && h < 18;
  if (sector === 'clinic') return day >= 1 && day <= 6 && h >= 8 && h < 20;
  if (sector === 'dental' || sector === 'eye_care' || sector === 'ent') return day >= 1 && day <= 6 && h >= 9 && h < 18;
  return true;
}

// Haversine distance calculation on client side
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function Centers() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [isNearby, setIsNearby] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { location, locationName, detectLocation } = useLocation();
  const allCentersRef = useRef([]); // cache all centers

  const sector = searchParams.get('sector') || '';
  const search = searchParams.get('search') || '';

  // Fast load — fetch all centers immediately
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/centers', { params: { sector, search } });
      allCentersRef.current = res.data.centers;
      setCenters(res.data.centers);
      setIsNearby(false);
    } catch {
      toast.error('Failed to load centers');
    } finally {
      setLoading(false);
    }
  }, [sector, search]);

  // Load centers immediately on mount
  useEffect(() => { fetchCenters(); }, [sector, search]);

  // After centers load, silently sort by distance if location available
  useEffect(() => {
    if (!location || isNearby || centers.length === 0) return;
    const withDist = allCentersRef.current
      .filter(c => c.latitude && c.longitude)
      .map(c => ({ ...c, distance_km: calcDistance(location.lat, location.lng, parseFloat(c.latitude), parseFloat(c.longitude)) }))
      .sort((a, b) => a.distance_km - b.distance_km);
    const withoutCoords = allCentersRef.current.filter(c => !c.latitude || !c.longitude);
    setCenters([...withDist, ...withoutCoords]);
    setIsNearby(true);
  }, [location?.lat, centers.length]);

  const handleNearby = async () => {
    if (!location) {
      detectLocation();
      toast('Detecting your location...');
      return;
    }
    setLocating(true);
    // Sort existing centers by distance instantly — no API call needed
    const withDist = allCentersRef.current
      .filter(c => c.latitude && c.longitude)
      .map(c => ({ ...c, distance_km: calcDistance(location.lat, location.lng, parseFloat(c.latitude), parseFloat(c.longitude)) }))
      .sort((a, b) => a.distance_km - b.distance_km);
    setCenters(withDist);
    setIsNearby(true);
    setLocating(false);
    toast.success(`Sorted by distance from your location`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Find Healthcare Centers</h1>
        {locationName && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-green-500">📍</span>
            Your area: <span className="font-medium text-gray-700 dark:text-gray-300">{locationName}</span>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text" placeholder="Search by name or city..." className="input flex-1 max-w-xs"
          defaultValue={search}
          onChange={(e) => { setSearchParams({ sector, search: e.target.value }); setIsNearby(false); }}
        />
        <select
          className="input max-w-xs"
          value={sector}
          onChange={(e) => { setSearchParams({ sector: e.target.value, search }); setIsNearby(false); }}
        >
          <option value="">All Sectors</option>
          {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button
          onClick={handleNearby}
          disabled={locating}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          {locating ? <Spinner size="sm" /> : <span>📍</span>}
          {locating ? 'Sorting...' : 'Near Me'}
        </button>
        {isNearby && (
          <button onClick={() => { setCenters(allCentersRef.current); setIsNearby(false); }} className="btn-secondary text-sm">
            Show All
          </button>
        )}
      </div>

      {/* Location banner */}
      {isNearby && location && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-green-600 text-xl">📍</span>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Sorted by distance from your location</p>
            <p className="text-xs text-green-600">
              {locationName || `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">Loading centers...</p>
        </div>
      ) : centers.length === 0 ? (
        <EmptyState icon="🏥" title="No centers found" message="Try adjusting your filters." />
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">{centers.length} centers found {isNearby ? '· sorted by distance' : ''}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {centers.map((c) => {
              const open = isOpenNow(c.sector);
              return (
                <div
                  key={c.id}
                  className="card hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all cursor-pointer group"
                  onClick={() => navigate(`/centers/${c.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{SECTOR_ICONS[c.sector] || '🏥'}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="badge bg-blue-50 text-blue-700 capitalize">{c.sector.replace('_', ' ')}</span>
                      <span className={`badge ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {open ? '● Open Now' : '● Closed'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">{c.name}</h3>
                  <p className="text-sm text-gray-500 mb-1">📌 {c.address}, {c.city}, {c.state}</p>
                  {c.contact_details && <p className="text-xs text-gray-400 mb-1">📞 {c.contact_details}</p>}
                  <p className="text-xs text-gray-400">🕐 {SECTOR_HOURS[c.sector]}</p>

                  {c.distance_km != null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.distance_km < 5 ? 'bg-green-100 text-green-700' :
                        c.distance_km < 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        📍 {c.distance_km.toFixed(1)} km away
                      </span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Navigate ↗
                      </a>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                    <span className="text-xs text-gray-400">~{c.average_consultation_minutes} min/visit</span>
                    <button
                      className="btn-primary text-xs py-1.5 px-4"
                      onClick={(e) => { e.stopPropagation(); navigate(`/centers/${c.id}/book`); }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
