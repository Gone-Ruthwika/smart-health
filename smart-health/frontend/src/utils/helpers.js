export const SECTORS = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'diagnostics', label: 'Diagnostics' },
  { value: 'dental', label: 'Dental' },
  { value: 'eye_care', label: 'Eye Care' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'ent', label: 'ENT' },
];

export const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
};

export const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

export const COMMON_SYMPTOMS = [
  'Fever',
  'Cough',
  'Cold',
  'Headache',
  'Body Pain',
  'Chest Pain',
  'Breathing Trouble',
  'Dizziness',
  'Vomiting',
  'Stomach Pain',
  'Injury',
  'Bleeding',
];

function extractDatePortion(value) {
  if (!value) return '';

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function formatDate(dateStr) {
  const d = extractDatePortion(dateStr);
  if (!d) return '';

  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const t = String(timeStr).slice(0, 5);
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function normalizeDoctorName(name = '') {
  return String(name || '')
    .replace(/^(?:dr\.?\s*)+/i, '')
    .trim();
}

export function formatDoctorName(name, fallback = '-') {
  const cleaned = normalizeDoctorName(name);
  return cleaned ? `Dr. ${cleaned}` : fallback;
}

export function safeDate(dateVal) {
  return extractDatePortion(dateVal);
}

export function safeTime(timeVal) {
  if (!timeVal) return '';
  return String(timeVal).slice(0, 5);
}

export function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Something went wrong';
}

export function serializeAppointmentIssue({ reason, symptoms = [], notes = '' }) {
  const cleanReason = (reason || '').trim();
  const cleanSymptoms = symptoms.map((item) => item.trim()).filter(Boolean);
  const cleanNotes = (notes || '').trim();

  const sections = [`Reason: ${cleanReason}`];
  if (cleanSymptoms.length) sections.push(`Symptoms: ${cleanSymptoms.join(', ')}`);
  if (cleanNotes) sections.push(`Notes: ${cleanNotes}`);

  return sections.join('\n');
}

export function parseAppointmentIssue(issue) {
  const raw = String(issue || '').trim();
  if (!raw) {
    return { summary: '', symptoms: [], notes: '', raw: '' };
  }

  const summaryMatch = raw.match(/(?:^|\n)Reason:\s*(.+)/i);
  const symptomsMatch = raw.match(/(?:^|\n)Symptoms:\s*(.+)/i);
  const notesMatch = raw.match(/(?:^|\n)Notes:\s*(.+)/i);

  if (!summaryMatch && !symptomsMatch && !notesMatch) {
    const inferredSymptoms = raw
      .split(/[\n,;/|]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      summary: raw,
      symptoms: inferredSymptoms.length > 1 ? inferredSymptoms : [],
      notes: '',
      raw,
    };
  }

  const summary = (summaryMatch?.[1] || '').trim();
  const symptoms = (symptomsMatch?.[1] || '')
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const notes = (notesMatch?.[1] || '').trim();

  return {
    summary,
    symptoms,
    notes,
    raw,
  };
}

function formatGoogleMapsLabel(segment = '') {
  return decodeURIComponent(segment)
    .replace(/\+/g, ' ')
    .trim();
}

function deriveAddressParts(address = '') {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return { city: '', state: '' };
  }

  return {
    city: parts.length >= 2 ? parts[parts.length - 2] : '',
    state: parts.length >= 1 ? parts[parts.length - 1] : '',
  };
}

export function extractGoogleMapsData(value) {
  const text = String(value || '').trim();
  if (!text) return { raw: '', address: '', city: '', state: '', lat: null, lng: null };

  const result = { raw: text, address: '', city: '', state: '', lat: null, lng: null };

  try {
    const url = new URL(text);
    const query = url.searchParams.get('q') || url.searchParams.get('query');
    if (query) {
      result.address = formatGoogleMapsLabel(query);
      const match = query.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (match) {
        result.lat = Number(match[1]);
        result.lng = Number(match[2]);
      }
    }

    if ((result.lat == null || result.lng == null) && url.pathname.includes('@')) {
      const atSegment = url.pathname.split('@')[1];
      const match = atSegment?.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (match) {
        result.lat = Number(match[1]);
        result.lng = Number(match[2]);
      }
    }

    if (!result.address && url.pathname.includes('/place/')) {
      const placeSegment = url.pathname.split('/place/')[1]?.split('/')[0];
      if (placeSegment) {
        result.address = formatGoogleMapsLabel(placeSegment);
      }
    }

    if (!result.address && url.pathname.includes('/search/')) {
      const searchSegment = url.pathname.split('/search/')[1]?.split('/')[0];
      if (searchSegment) {
        result.address = formatGoogleMapsLabel(searchSegment);
      }
    }
  } catch {
    result.address = text;
  }

  if (result.address) {
    const parts = deriveAddressParts(result.address);
    result.city = parts.city;
    result.state = parts.state;
  }

  return result;
}

export function buildMapsLink({ address, name, city, state }) {
  const query = [name, address, city, state].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'hospital near me')}`;
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function isMainAdmin(user) {
  return isAdmin(user) && (user.admin_scope || 'main') === 'main';
}

export function isHospitalAdmin(user) {
  return user?.role === 'admin' && user.admin_scope === 'hospital';
}

export function getAuthorizedCenters(user) {
  return user?.authorized_centers || [];
}

export function getAdminBasePath(user) {
  if (isHospitalAdmin(user)) return '/hospital-admin';
  if (isMainAdmin(user)) return '/main-admin';
  return '/admin';
}

export function getDefaultRouteForUser(user) {
  if (!user) return '/login';
  if (isHospitalAdmin(user)) return '/hospital-admin/dashboard';
  if (isMainAdmin(user)) return '/main-admin/dashboard';
  return '/dashboard';
}
