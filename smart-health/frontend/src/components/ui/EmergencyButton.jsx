import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { buildMapsLink } from '../../utils/helpers';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
];

const COPY = {
  en: {
    title: 'Emergency Help',
    emergency: 'Emergency',
    ambulance: 'Ambulance',
    callServices: 'Call emergency services',
    nearbyHospitals: 'Nearby hospitals',
    nearbyAmbulance: 'Nearby ambulance support',
    useLocation: 'Use location',
    detecting: 'Detecting...',
    findingHospitals: 'Finding nearby hospitals...',
    noHospitals: 'No hospitals found nearby.',
    enableLocation: 'Enable location to find nearby hospitals for emergency cases.',
    bookNow: 'Emergency Book',
    booking: 'Booking...',
    maps: 'Maps',
    call: 'Call',
    nearest: 'Nearest:',
    route: 'Open nearest route in Google Maps',
    shareLocation: 'Share my location',
    guestLabel: 'Quick emergency details',
    guestName: 'Patient name',
    guestPhone: 'Phone number',
    guestHint: 'Used for callbacks from the ambulance or hospital team.',
    lifeThreatening: 'In life-threatening situations, call 108 first.',
    language: 'Language',
    track: 'Track',
    previewTrack: 'Preview Track',
    liveTrack: 'Live Track',
    bookAmbulance: 'Book Ambulance',
    ambulanceBooked: 'Ambulance request created. Live tracking started.',
    tracking: 'Tracking live ambulance ETA',
    nowTracking: 'Now Tracking',
    eta: 'ETA',
    stage: 'Stage',
    status: 'Status',
    lastUpdatedShort: 'Updated',
    requestCompleted: 'Ambulance has arrived.',
    requestCancelled: 'Ambulance request was cancelled.',
    guestBooked: 'Emergency booking created. Go to the hospital now.',
    loggedBooked: 'Emergency appointment booked. Proceed to the hospital now.',
    explainTitle: 'How location and nearby work',
    explainLocation: 'We get your live location from your browser using the Geolocation API after permission is granted.',
    explainNearby: 'Nearby hospitals are fetched from the backend, which compares your latitude and longitude with saved center coordinates and sorts by shortest distance.',
    explainAccuracy: 'Approx accuracy',
    explainUpdated: 'Last updated',
    refreshLocation: 'Refresh location',
    pickupTitle: 'Pickup details',
    ambulanceRequestTitle: 'Ambulance request created',
    nearbyReason: 'Chosen because it is nearby',
    requestId: 'Request ID',
    requestRequiresLocation: 'Turn on location first so we can send the ambulance to your pickup point.',
    requestRequiresName: 'Please enter the patient or requester name first.',
    requestingAmbulance: 'Sending request...',
    noAmbulanceServices: 'No nearby ambulance-linked hospitals found yet. You can still call 108 directly.',
    previewTrackingStarted: 'Tracking panel opened for this ambulance service.',
    liveTrackingHint: 'Live tracking works after booking this ambulance.',
  },
};

const EMERGENCY_NUMBERS = [
  { label: 'Ambulance', number: '108', color: 'bg-red-600', desc: 'Medical emergency' },
  { label: 'Emergency', number: '112', color: 'bg-orange-600', desc: 'All emergencies' },
  { label: 'Police', number: '100', color: 'bg-blue-700', desc: 'Law and order' },
  { label: 'Fire', number: '101', color: 'bg-yellow-600', desc: 'Fire brigade' },
];

const TRACKING_STAGES = [
  'Request received',
  'Driver assigned',
  'Preparing ambulance',
  'Leaving dispatch point',
  'On the way',
  'Near your location',
  'Arriving now',
];

const AMBULANCE_REQUEST_STORAGE_KEY = 'smarthealth:ambulance-request';
const AMBULANCE_TRACKING_STORAGE_KEY = 'smarthealth:ambulance-tracking';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function sanitizePhone(value = '') {
  return String(value).replace(/[^0-9+]/g, '');
}

function formatRelativeTime(value) {
  if (!value) return 'Just now';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

function hydrateTrackingState(savedTracking) {
  if (!savedTracking) return null;

  const initialEta = Math.max(0, Number(savedTracking.initialEta ?? savedTracking.etaMinutes ?? 0));
  const startedAt = savedTracking.startedAt || new Date().toISOString();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const etaMinutes = Math.max(0, initialEta - elapsedMinutes);
  const activeStage = etaMinutes === 0
    ? TRACKING_STAGES.length - 1
    : Math.min(
      TRACKING_STAGES.length - 1,
      Math.floor(((initialEta - etaMinutes) / Math.max(initialEta, 1)) * (TRACKING_STAGES.length - 1))
    );

  return {
    ...savedTracking,
    initialEta,
    startedAt,
    etaMinutes,
    activeStage,
  };
}

function getTrackingStageFromStatus(status, etaMinutes) {
  if (status === 'cancelled') return 0;
  if (status === 'completed') return TRACKING_STAGES.length - 1;
  if (status === 'arriving') return etaMinutes <= 2 ? TRACKING_STAGES.length - 1 : TRACKING_STAGES.length - 2;
  if (status === 'assigned') return 3;
  return 0;
}

function normalizeTrackingFromRequest(request, fallbackTracking = null) {
  if (!request) return null;

  const etaMinutes = Math.max(0, Number(request.eta_minutes ?? fallbackTracking?.etaMinutes ?? 0));
  const startedAt = fallbackTracking?.startedAt || request.created_at || new Date().toISOString();
  const initialEta = Math.max(etaMinutes, Number(fallbackTracking?.initialEta ?? etaMinutes));

  return {
    requestId: request.id,
    name: request.service_name || fallbackTracking?.name || 'Ambulance',
    number: request.service_phone || fallbackTracking?.number || '',
    status: request.status || 'requested',
    etaMinutes,
    initialEta,
    startedAt,
    activeStage: getTrackingStageFromStatus(request.status, etaMinutes),
    updatedAt: request.updated_at || new Date().toISOString(),
  };
}

function EmergencyNumberButton({ number, label, color, desc, callLabel }) {
  const [showDial, setShowDial] = useState(false);

  const handleCall = () => {
    if (isMobile()) {
      window.location.href = `tel:${number}`;
      return;
    }

    setShowDial(true);
    setTimeout(() => setShowDial(false), 4000);
  };

  return (
    <button
      onClick={handleCall}
      className={`${color} text-white rounded-xl p-3 flex items-center justify-between gap-3 hover:opacity-90 transition-all w-full text-left`}
    >
      <div>
        <p className="font-bold text-lg leading-none">{showDial ? `Call ${number}` : number}</p>
        <p className="text-xs opacity-80">{label} - {desc}</p>
      </div>
      <span className="text-sm font-semibold">{callLabel}</span>
    </button>
  );
}

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('emergency');
  const [language, setLanguage] = useState('en');
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [nearbyAmbulanceServices, setNearbyAmbulanceServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingCenterId, setBookingCenterId] = useState('');
  const [ambulanceBookingId, setAmbulanceBookingId] = useState('');
  const [guestDetails, setGuestDetails] = useState({ name: '', phone: '' });
  const [guestBooking, setGuestBooking] = useState(null);
  const [ambulanceRequest, setAmbulanceRequest] = useState(null);
  const [tracking, setTracking] = useState(null);
  const trackingPanelRef = useRef(null);
  const { user } = useAuth();
  const { location, locationName, locationMeta, detectLocation, locating } = useLocation();

  const t = COPY[language] || COPY.en;

  useEffect(() => {
    const handleOpenEmergency = (event) => {
      const requestedTab = event?.detail?.tab;
      setOpen(true);
      if (requestedTab === 'ambulance' || requestedTab === 'emergency') {
        setTab(requestedTab);
      }
    };

    window.addEventListener('smarthealth:open-emergency', handleOpenEmergency);
    return () => window.removeEventListener('smarthealth:open-emergency', handleOpenEmergency);
  }, []);

  useEffect(() => {
    try {
      const savedRequest = window.localStorage.getItem(AMBULANCE_REQUEST_STORAGE_KEY);
      const savedTracking = window.localStorage.getItem(AMBULANCE_TRACKING_STORAGE_KEY);

      if (savedRequest) {
        setAmbulanceRequest(JSON.parse(savedRequest));
      }

      if (savedTracking) {
        const hydrated = hydrateTrackingState(JSON.parse(savedTracking));
        if (hydrated) {
          setTracking(hydrated);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.name || user?.phone) {
      setGuestDetails((current) => ({
        name: current.name || user.name || '',
        phone: current.phone || user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!open || !location) return;

    setLoading(true);
    Promise.all([
      api.get('/centers/nearby', {
        params: { lat: location.lat, lng: location.lng, radius: 50, sector: 'hospital' },
      }),
      api.get('/emergency/ambulance-services/nearby', {
        params: { lat: location.lat, lng: location.lng, radius: 50 },
      }),
    ])
      .then(([centerRes, ambulanceRes]) => {
        setNearbyHospitals(centerRes.data.centers || []);
        setNearbyAmbulanceServices(ambulanceRes.data.services || []);
      })
      .catch(() => {
        setNearbyHospitals([]);
        setNearbyAmbulanceServices([]);
      })
      .finally(() => setLoading(false));
  }, [open, location]);

  useEffect(() => {
    if (!tracking) return undefined;

    const interval = setInterval(() => {
      setTracking((current) => {
        if (!current) return current;
        if (current.requestId && ['completed', 'cancelled'].includes(current.status || '')) {
          return current;
        }
        const nextEta = Math.max(0, current.etaMinutes - 1);
        const progress = Math.min(
          TRACKING_STAGES.length - 1,
          Math.floor(((current.initialEta - nextEta) / Math.max(current.initialEta, 1)) * (TRACKING_STAGES.length - 1))
        );

        if (nextEta === 0) {
          return { ...current, etaMinutes: 0, activeStage: TRACKING_STAGES.length - 1 };
        }

        return { ...current, etaMinutes: nextEta, activeStage: progress };
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tracking]);

  useEffect(() => {
    const requestId = ambulanceRequest?.id || tracking?.requestId;
    if (!requestId) return undefined;

    let active = true;

    const syncRequest = async () => {
      try {
        const res = await api.get(`/emergency/ambulance-book/${requestId}`);
        if (!active) return;

        const nextRequest = res.data.request;
        setAmbulanceRequest(nextRequest);
        setTracking((current) => normalizeTrackingFromRequest(nextRequest, current));
      } catch {}
    };

    syncRequest();
    const interval = setInterval(syncRequest, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ambulanceRequest?.id, tracking?.requestId]);

  useEffect(() => {
    if (!tracking?.requestId) return;
    if (!['completed', 'cancelled'].includes(tracking.status || '')) return;

    const timer = setTimeout(() => {
      setTracking(null);
      setAmbulanceRequest(null);
      try {
        window.localStorage.removeItem(AMBULANCE_REQUEST_STORAGE_KEY);
        window.localStorage.removeItem(AMBULANCE_TRACKING_STORAGE_KEY);
      } catch {}
    }, 30000);

    return () => clearTimeout(timer);
  }, [tracking?.requestId, tracking?.status]);

  useEffect(() => {
    try {
      if (ambulanceRequest) {
        window.localStorage.setItem(AMBULANCE_REQUEST_STORAGE_KEY, JSON.stringify(ambulanceRequest));
      } else {
        window.localStorage.removeItem(AMBULANCE_REQUEST_STORAGE_KEY);
      }
    } catch {}
  }, [ambulanceRequest]);

  useEffect(() => {
    try {
      if (tracking) {
        window.localStorage.setItem(AMBULANCE_TRACKING_STORAGE_KEY, JSON.stringify(tracking));
      } else {
        window.localStorage.removeItem(AMBULANCE_TRACKING_STORAGE_KEY);
      }
    } catch {}
  }, [tracking]);

  useEffect(() => {
    if (!tracking || !open || tab !== 'ambulance') return;

    trackingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [tracking, open, tab]);

  const nearestHospital = nearbyHospitals[0] || null;

  const fallbackNearbyAmbulances = useMemo(() => (
    nearbyHospitals.slice(0, 3).map((hospital, index) => {
      const distanceKm = parseFloat(hospital.distance_km) || index + 2;
      return {
        id: hospital.id,
        centerId: hospital.id,
        name: `${hospital.name} Ambulance`,
        number: sanitizePhone(hospital.contact_details) || '108',
        area: hospital.city,
        hospital,
        free: false,
        distanceKm,
        etaMinutes: Math.max(6, Math.round(distanceKm * 4)),
        nearbyReason: `${distanceKm.toFixed(1)} km from your detected location`,
      };
    })
  ), [nearbyHospitals]);

  const ambulanceServices = useMemo(() => {
    const managedServices = nearbyAmbulanceServices.map((service) => ({
      ...service,
      centerId: service.centerId || service.center_id,
      number: service.number || '108',
      hospital: service.hospital || null,
    }));

    const fallback = [
      {
        id: '108',
        name: 'GVK EMRI (108)',
        number: '108',
        area: 'All Telangana',
        free: true,
        etaMinutes: 8,
        nearbyReason: 'Statewide emergency dispatch',
        centerId: nearestHospital?.id || null,
        hospital: nearestHospital || null,
      },
      {
        id: '104',
        name: 'Telangana Ambulance',
        number: '104',
        area: 'Health helpline',
        free: true,
        etaMinutes: 12,
        nearbyReason: 'Regional helpline support',
        centerId: nearestHospital?.id || null,
        hospital: nearestHospital || null,
      },
    ];

    const services = managedServices.length > 0 ? managedServices : fallbackNearbyAmbulances;
    return [...services, ...fallback];
  }, [nearbyAmbulanceServices, fallbackNearbyAmbulances, nearestHospital]);

  const getTrackableService = (service) => {
    if (!ambulanceRequest) {
      return service;
    }

    const sameBookedService = ambulanceRequest.center_id === service.centerId
      || ambulanceRequest.service_name === service.name
      || ambulanceRequest.service_phone === service.number;

    if (!sameBookedService) {
      return service;
    }

    return {
      ...service,
      requestId: ambulanceRequest.id,
      status: ambulanceRequest.status,
      etaMinutes: ambulanceRequest.eta_minutes ?? service.etaMinutes,
      name: ambulanceRequest.service_name || service.name,
      number: ambulanceRequest.service_phone || service.number,
    };
  };

  const isServiceBooked = (service) => {
    if (!ambulanceRequest) return false;

    return ambulanceRequest.center_id === service.centerId
      || ambulanceRequest.service_name === service.name
      || ambulanceRequest.service_phone === service.number;
  };

  const startTracking = (service) => {
    if (!service.requestId) {
      setAmbulanceRequest(null);
      try {
        window.localStorage.removeItem(AMBULANCE_REQUEST_STORAGE_KEY);
      } catch {}
    }

    setTracking({
      requestId: service.requestId || null,
      name: service.name,
      number: service.number,
      status: service.status || 'requested',
      etaMinutes: service.etaMinutes,
      initialEta: service.etaMinutes,
      activeStage: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setTab('ambulance');

    if (!service.requestId) {
      toast.success(t.previewTrackingStarted);
    }
  };

  const handleAmbulanceBooking = async (service) => {
    if (!location) {
      detectLocation();
      toast.error(t.requestRequiresLocation);
      return;
    }

    const requesterName = (guestDetails.name || user?.name || '').trim();
    const requesterPhone = (guestDetails.phone || user?.phone || '').trim();

    if (!requesterName) {
      toast.error(t.requestRequiresName);
      return;
    }

    const centerId = service.centerId || service.hospital?.id || nearestHospital?.id;
    if (!centerId) {
      toast.error('No linked hospital found for this ambulance service yet.');
      return;
    }

    setAmbulanceBookingId(service.id || service.number);

    try {
      const res = await api.post('/emergency/ambulance-book', {
        center_id: centerId,
        requester_name: requesterName,
        requester_phone: requesterPhone,
        service_name: service.name,
        service_phone: service.number,
        pickup_label: locationName,
        pickup_lat: location.lat,
        pickup_lng: location.lng,
        language,
        eta_minutes: service.etaMinutes,
      });

      setAmbulanceRequest(res.data.request);
      startTracking({
        ...service,
        requestId: res.data.request.id,
        status: res.data.request.status,
        etaMinutes: res.data.request.eta_minutes || service.etaMinutes,
      });
      toast.success(t.ambulanceBooked);

      if (isMobile() && service.number) {
        setTimeout(() => {
          window.location.href = `tel:${service.number}`;
        }, 250);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send ambulance request');
    } finally {
      setAmbulanceBookingId('');
    }
  };

  const createEmergencyAmbulanceRequest = async (hospital) => {
    const requesterName = (guestDetails.name || user?.name || 'Emergency requester').trim();
    const requesterPhone = (guestDetails.phone || user?.phone || '').trim();
    const pickupLat = location?.lat ?? hospital?.latitude;
    const pickupLng = location?.lng ?? hospital?.longitude;

    if (pickupLat == null || pickupLng == null) {
      return null;
    }

    const etaMinutes = Math.max(6, Math.round((parseFloat(hospital?.distance_km) || 2) * 4));
    const response = await api.post('/emergency/ambulance-book', {
      center_id: hospital.id,
      requester_name: requesterName,
      requester_phone: requesterPhone,
      service_name: `${hospital.name} Ambulance`,
      service_phone: sanitizePhone(hospital.contact_details) || '108',
      pickup_label: locationName || hospital.address || hospital.name,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      language,
      eta_minutes: etaMinutes,
    });

    return response.data.request;
  };

  const handleEmergencyBook = async (hospital) => {
    if (!hospital) {
      toast.error('No nearby hospital found');
      return;
    }

    setBookingCenterId(hospital.id);
    try {
      const now = new Date();
      const appointment_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const appointment_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (user) {
        const res = await api.post('/appointments', {
          center_id: hospital.id,
          issue: 'Reason: Emergency support requested\nSymptoms: Accident / emergency',
          appointment_date,
          appointment_time,
          priority: 'emergency',
        });

        let createdRequest = null;
        try {
          createdRequest = await createEmergencyAmbulanceRequest(hospital);
        } catch {}

        if (createdRequest) {
          setAmbulanceRequest(createdRequest);
          startTracking({
            id: createdRequest.center_id,
            centerId: createdRequest.center_id,
            name: createdRequest.service_name,
            number: createdRequest.service_phone || '108',
            requestId: createdRequest.id,
            status: createdRequest.status,
            etaMinutes: createdRequest.eta_minutes || Math.max(6, Math.round((parseFloat(hospital.distance_km) || 2) * 4)),
          });
        }

        toast.success(t.loggedBooked);
        setOpen(false);
        window.location.href = `/appointments/${res.data.appointment.id}`;
        return;
      }

      const res = await api.post('/emergency/guest-book', {
        center_id: hospital.id,
        guest_name: guestDetails.name,
        guest_phone: guestDetails.phone,
        issue: 'Emergency support requested',
        appointment_date,
        appointment_time,
        language,
        location_label: locationName,
      });

      setGuestBooking(res.data.appointment);

      let createdRequest = null;
      try {
        createdRequest = await createEmergencyAmbulanceRequest(hospital);
      } catch {}

      if (createdRequest) {
        setAmbulanceRequest(createdRequest);
        startTracking({
          id: createdRequest.center_id,
          centerId: createdRequest.center_id,
          name: createdRequest.service_name,
          number: createdRequest.service_phone || '108',
          requestId: createdRequest.id,
          status: createdRequest.status,
          etaMinutes: createdRequest.eta_minutes || Math.max(6, Math.round((parseFloat(hospital.distance_km) || 2) * 4)),
        });
      } else {
        startTracking({
          id: res.data.appointment.center_id,
          centerId: res.data.appointment.center_id,
          name: `${res.data.appointment.center_name} Ambulance`,
          number: sanitizePhone(res.data.appointment.center_contact_details) || '108',
          etaMinutes: Math.max(6, Math.round((parseFloat(hospital.distance_km) || 2) * 4)),
        });
      }
      toast.success(t.guestBooked);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to book emergency appointment');
    } finally {
      setBookingCenterId('');
    }
  };

  const shareLocation = async () => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const message = `Emergency. I need help. My location: ${locationName || 'Unknown area'}\n${mapsUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Emergency location', text: message });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Location copied. You can send it to family or emergency contacts.');
    } catch {
      toast.error('Unable to copy location automatically. Please share it manually.');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 animate-pulse"
        title="Emergency SOS"
      >
        <span className="text-2xl leading-none">SOS</span>
        <span className="text-xs font-bold mt-0.5">HELP</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-red-600 px-5 py-4 flex items-start justify-between gap-3 sticky top-0 z-10">
              <div>
                <h2 className="text-white font-bold text-lg">{t.title}</h2>
                <p className="text-red-100 text-xs">
                  {locationName ? locationName : location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting location...'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-lg bg-white/15 text-white text-xs px-2 py-1 outline-none"
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code} className="text-black">
                      {item.label}
                    </option>
                  ))}
                </select>
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-2xl leading-none">x</button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <button
                  onClick={() => setTab('emergency')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'emergency' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                >
                  {t.emergency}
                </button>
                <button
                  onClick={() => setTab('ambulance')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'ambulance' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                >
                  {t.ambulance}
                </button>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-sky-800">{t.explainTitle}</p>
                  <button type="button" onClick={detectLocation} className="text-xs font-semibold text-sky-700">
                    {locating ? t.detecting : t.refreshLocation}
                  </button>
                </div>
                <p className="text-xs text-sky-700">{t.explainLocation}</p>
                <p className="text-xs text-sky-700">{t.explainNearby}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-sky-900">
                  <div className="rounded-lg bg-white/80 px-3 py-2 border border-sky-100">
                    <span className="font-semibold">Source:</span> browser geolocation
                  </div>
                  <div className="rounded-lg bg-white/80 px-3 py-2 border border-sky-100">
                    <span className="font-semibold">{t.explainAccuracy}:</span> {locationMeta?.accuracy ? `${Math.round(locationMeta.accuracy)} m` : 'Unavailable'}
                  </div>
                  <div className="rounded-lg bg-white/80 px-3 py-2 border border-sky-100 col-span-2">
                    <span className="font-semibold">{t.explainUpdated}:</span> {formatRelativeTime(locationMeta?.lastUpdated)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-orange-700">{t.pickupTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder={t.guestName}
                    value={guestDetails.name}
                    onChange={(e) => setGuestDetails((current) => ({ ...current, name: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder={t.guestPhone}
                    value={guestDetails.phone}
                    onChange={(e) => setGuestDetails((current) => ({ ...current, phone: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-gray-500">{t.guestHint}</p>
              </div>

              {guestBooking && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                  <p className="font-semibold text-emerald-700">{guestBooking.center_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{guestBooking.center_address}, {guestBooking.center_city}</p>
                  <p className="text-sm text-emerald-700 mt-2">Token #{guestBooking.queue_number} - {guestBooking.appointment_time}</p>
                </div>
              )}

              {ambulanceRequest && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
                  <p className="font-semibold text-emerald-700">{t.ambulanceRequestTitle}</p>
                  <p className="text-sm text-gray-700">{ambulanceRequest.service_name}</p>
                  <p className="text-xs text-gray-500">{ambulanceRequest.pickup_label || `${ambulanceRequest.pickup_latitude}, ${ambulanceRequest.pickup_longitude}`}</p>
                  <p className="text-xs text-emerald-700">{t.requestId}: {ambulanceRequest.id}</p>
                </div>
              )}

              {tab === 'ambulance' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{t.nearbyAmbulance}</p>

                  {tracking && (
                    <div ref={trackingPanelRef} className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">{t.nowTracking}</p>
                          <p className="font-semibold text-blue-800">{tracking.name}</p>
                          <p className="text-xs text-blue-600">{t.tracking}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{t.eta}</p>
                          <p className="text-xl font-bold text-blue-700">{tracking.etaMinutes} min</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-900">
                        <div className="rounded-lg bg-white/80 px-3 py-2 border border-blue-100">
                          <span className="font-semibold">{t.status}:</span> {tracking.status || 'requested'}
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2 border border-blue-100">
                          <span className="font-semibold">{t.lastUpdatedShort}:</span> {formatRelativeTime(tracking.updatedAt)}
                        </div>
                      </div>
                      {tracking.status === 'completed' && (
                        <p className="text-sm font-medium text-emerald-700">{t.requestCompleted}</p>
                      )}
                      {tracking.status === 'cancelled' && (
                        <p className="text-sm font-medium text-red-700">{t.requestCancelled}</p>
                      )}
                      <div className="space-y-2">
                        {TRACKING_STAGES.map((stage, index) => (
                          <div key={stage} className="flex items-center gap-3 text-sm">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index <= tracking.activeStage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {index + 1}
                            </span>
                            <span className={index <= tracking.activeStage ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500'}>
                              {stage}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-500">{t.findingHospitals}</div>
                  ) : ambulanceServices.length > 0 ? (
                    ambulanceServices.map((service) => (
                      <div
                        key={service.id || service.number}
                        className={`rounded-xl p-3 space-y-3 border ${
                          tracking?.name === service.name
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                            : 'border-transparent bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {isServiceBooked(service) && (
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">Booked for live tracking</p>
                            )}
                            <p className="font-semibold text-sm">{service.name}</p>
                            <p className="text-xs text-gray-500">{service.area}{service.free ? ' - Free' : ''}</p>
                            <p className="text-xs text-red-600 mt-1">{t.nearbyReason}: {service.nearbyReason}</p>
                            {tracking?.name === service.name && (
                              <p className="text-xs font-semibold text-blue-600 mt-1">{t.nowTracking}</p>
                            )}
                          </div>
                          <a href={`tel:${service.number}`} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shrink-0">
                            {service.number}
                          </a>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleAmbulanceBooking(service)}
                            disabled={ambulanceBookingId === (service.id || service.number)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                          >
                            {ambulanceBookingId === (service.id || service.number) ? t.requestingAmbulance : t.bookAmbulance}
                          </button>
                          <button
                            onClick={() => startTracking(getTrackableService(service))}
                            className="border border-blue-200 text-blue-700 text-xs font-bold px-3 py-2 rounded-lg"
                            title={isServiceBooked(service) ? t.liveTrack : t.liveTrackingHint}
                          >
                            {tracking?.name === service.name
                              ? t.nowTracking
                              : isServiceBooked(service)
                              ? t.liveTrack
                              : t.previewTrack}
                          </button>
                          <a
                            href={service.hospital ? buildMapsLink(service.hospital) : `tel:${service.number}`}
                            target={service.hospital ? '_blank' : undefined}
                            rel={service.hospital ? 'noopener noreferrer' : undefined}
                            className="border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg text-center"
                          >
                            {service.hospital ? t.maps : t.call}
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">{t.noAmbulanceServices}</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.callServices}</p>
                      {!isMobile() && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Desktop: click to reveal number</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {EMERGENCY_NUMBERS.map((item) => (
                        <EmergencyNumberButton key={item.number} {...item} callLabel={t.call} />
                      ))}
                    </div>
                  </div>

                  <div className="border border-red-100 dark:border-red-900 rounded-xl p-4 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.nearbyHospitals}</p>
                      {!location && (
                        <button type="button" onClick={detectLocation} className="text-xs text-blue-700 font-semibold">
                          {locating ? t.detecting : t.useLocation}
                        </button>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-sm text-gray-500">{t.findingHospitals}</div>
                    ) : nearbyHospitals.length > 0 ? (
                      <div className="space-y-3">
                        {nearbyHospitals.slice(0, 3).map((hospital, index) => (
                          <div key={hospital.id} className="rounded-xl border border-red-100 bg-white dark:bg-gray-900 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-gray-800 dark:text-gray-100">
                                  {index === 0 ? `${t.nearest} ` : ''}{hospital.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{hospital.address}, {hospital.city}</p>
                                {hospital.distance_km != null && (
                                  <p className="text-xs text-red-600 font-semibold mt-1">
                                    {parseFloat(hospital.distance_km).toFixed(1)} km away
                                  </p>
                                )}
                              </div>
                              {hospital.contact_details && (
                                isMobile() ? (
                                  <a href={`tel:${sanitizePhone(hospital.contact_details)}`} className="text-xs text-green-700 font-semibold">
                                    {t.call}
                                  </a>
                                ) : (
                                  <button
                                    onClick={() => toast(`Call: ${hospital.contact_details}`, { duration: 5000, icon: 'H' })}
                                    className="text-xs text-green-700 font-semibold"
                                  >
                                    {hospital.contact_details}
                                  </button>
                                )
                              )}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <a
                                href={buildMapsLink(hospital)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg text-center hover:bg-blue-700 transition-colors"
                              >
                                {t.maps}
                              </a>
                              <button
                                onClick={() => handleEmergencyBook(hospital)}
                                disabled={bookingCenterId === hospital.id}
                                className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                              >
                                {bookingCenterId === hospital.id ? t.booking : t.bookNow}
                              </button>
                            </div>
                          </div>
                        ))}
                        {nearestHospital && (
                          <a
                            href={buildMapsLink(nearestHospital)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full border border-blue-200 text-blue-700 text-sm font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors text-center"
                          >
                            {t.route}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {location ? t.noHospitals : t.enableLocation}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={shareLocation}
                    className="w-full border-2 border-orange-400 text-orange-600 dark:text-orange-400 font-semibold py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-sm"
                  >
                    {t.shareLocation}
                  </button>

                  <p className="text-xs text-center text-gray-400">
                    {t.lifeThreatening}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
