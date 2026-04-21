const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { recalculateQueueState } = require('../utils/queueUtils');
const { assertCenterAccess, getScopedCenterIds } = require('../utils/adminAccess');

let ambulanceTableReady = false;
let ambulanceServicesTableReady = false;

async function ensureAmbulanceRequestsTable() {
  if (ambulanceTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS ambulance_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      center_id VARCHAR(36) NOT NULL,
      requester_name VARCHAR(100) NOT NULL,
      requester_phone VARCHAR(20) NULL,
      service_name VARCHAR(150) NOT NULL,
      service_phone VARCHAR(20) NULL,
      pickup_label VARCHAR(255) NULL,
      pickup_latitude DECIMAL(10,7) NOT NULL,
      pickup_longitude DECIMAL(10,7) NOT NULL,
      language VARCHAR(20) NULL,
      eta_minutes INT DEFAULT 10,
      status ENUM('requested','assigned','arriving','completed','cancelled') DEFAULT 'requested',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ambulance_requests_center_created (center_id, created_at),
      INDEX idx_ambulance_requests_user_created (user_id, created_at)
    )
  `);

  ambulanceTableReady = true;
}

async function ensureAmbulanceServicesTable() {
  if (ambulanceServicesTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS ambulance_services (
      id VARCHAR(36) PRIMARY KEY,
      center_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NULL,
      driver_name VARCHAR(100) NULL,
      vehicle_number VARCHAR(50) NULL,
      base_latitude DECIMAL(10,7) NULL,
      base_longitude DECIMAL(10,7) NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ambulance_services_center (center_id),
      CONSTRAINT fk_ambulance_services_center_emergency FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
    )
  `);

  ambulanceServicesTableReady = true;
}

function formatAmbulanceRequest(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    center_id: row.center_id,
    center_name: row.center_name,
    center_address: row.center_address,
    center_city: row.center_city,
    center_state: row.center_state,
    requester_name: row.requester_name,
    requester_phone: row.requester_phone,
    service_name: row.service_name,
    service_phone: row.service_phone,
    pickup_label: row.pickup_label,
    pickup_latitude: Number(row.pickup_latitude),
    pickup_longitude: Number(row.pickup_longitude),
    eta_minutes: Number(row.eta_minutes),
    status: row.status,
    language: row.language || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getAmbulanceRequestById(requestId) {
  await ensureAmbulanceRequestsTable();

  const result = await db.query(
    `SELECT ar.*, c.name AS center_name, c.address AS center_address, c.city AS center_city, c.state AS center_state
     FROM ambulance_requests ar
     JOIN centers c ON c.id = ar.center_id
     WHERE ar.id=? LIMIT 1`,
    [requestId]
  );

  return result.rows[0] || null;
}

exports.createGuestEmergencyAppointment = asyncHandler(async (req, res) => {
  const {
    center_id,
    guest_name,
    guest_phone,
    issue,
    appointment_date,
    appointment_time,
    language,
    location_label,
  } = req.body;

  const centerResult = await db.query(
    'SELECT id, name, sector, address, city, state, contact_details FROM centers WHERE id=? LIMIT 1',
    [center_id]
  );
  const center = centerResult.rows[0];

  if (!center) {
    return res.status(404).json({ success: false, message: 'Center not found' });
  }

  if (center.sector !== 'hospital') {
    return res.status(400).json({ success: false, message: 'Emergency booking is allowed only for hospitals' });
  }

  const doctorResult = await db.query(
    'SELECT id, name, specialization FROM doctors WHERE center_id=? ORDER BY created_at ASC LIMIT 1',
    [center_id]
  );
  const doctor = doctorResult.rows[0] || null;

  const guestId = uuidv4();
  const guestEmail = `guest-emergency-${Date.now()}-${guestId.slice(0, 6)}@smarthealth.local`;
  const guestPasswordHash = await bcrypt.hash(`guest-${guestId}`, 8);
  const guestDisplayName = (guest_name || '').trim() || 'Emergency Guest';
  const guestPhone = (guest_phone || '').trim() || null;

  await db.query(
    'INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?,?,?,?,?,?)',
    [guestId, guestDisplayName, guestEmail, guestPasswordHash, guestPhone, 'user']
  );

  const appointmentId = uuidv4();
  const emergencyIssue = [
    `Reason: ${(issue || 'Emergency support requested').trim()}`,
    'Symptoms: Accident / emergency',
    language ? `Notes: Language preference: ${language}` : '',
    location_label ? `Notes: Current location: ${location_label}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await db.query(
    `INSERT INTO appointments
     (id, user_id, center_id, doctor_id, issue, appointment_date, appointment_time,
      queue_number, patients_before, estimated_wait_minutes, status, priority)
     VALUES (?,?,?,?,?,?,?,? ,?,?,'confirmed','emergency')`,
    [
      appointmentId,
      guestId,
      center_id,
      doctor?.id || null,
      emergencyIssue,
      appointment_date,
      appointment_time,
      1,
      0,
      0,
    ]
  );

  const { appointments } = await recalculateQueueState(
    db,
    doctor?.id || null,
    center_id,
    appointment_date
  );
  const appointment = appointments.find((item) => item.id === appointmentId) || {
    id: appointmentId,
    center_id,
    doctor_id: doctor?.id || null,
    appointment_date,
    appointment_time,
    queue_number: 1,
    patients_before: 0,
    estimated_wait_minutes: 0,
    priority: 'emergency',
    status: 'confirmed',
  };

  req.app.get('io')?.emit('queue:update', {
    center_id,
    doctor_id: doctor?.id || null,
    appointment_date,
  });

  return res.status(201).json({
    success: true,
    guest: true,
    appointment: {
      ...appointment,
      center_name: center.name,
      center_address: center.address,
      center_city: center.city,
      center_state: center.state,
      center_contact_details: center.contact_details,
      doctor_name: doctor?.name || null,
      doctor_specialization: doctor?.specialization || null,
      guest_name: guestDisplayName,
      guest_phone: guestPhone,
    },
  });
});

exports.createAmbulanceRequest = asyncHandler(async (req, res) => {
  await ensureAmbulanceRequestsTable();

  const {
    center_id,
    requester_name,
    requester_phone,
    service_name,
    service_phone,
    pickup_label,
    pickup_lat,
    pickup_lng,
    language,
    eta_minutes,
  } = req.body;

  const centerResult = await db.query(
    'SELECT id, name, sector, address, city, state, contact_details FROM centers WHERE id=? LIMIT 1',
    [center_id]
  );
  const center = centerResult.rows[0];

  if (!center) {
    return res.status(404).json({ success: false, message: 'Center not found' });
  }

  if (center.sector !== 'hospital') {
    return res.status(400).json({ success: false, message: 'Ambulance requests are allowed only for hospitals' });
  }

  const requestId = uuidv4();
  const cleanEta = Number(eta_minutes) > 0 ? Math.round(Number(eta_minutes)) : 10;
  const cleanName = String(requester_name || '').trim() || 'Emergency requester';
  const cleanPhone = String(requester_phone || '').trim() || null;
  const cleanServiceName = String(service_name || '').trim() || `${center.name} Ambulance`;
  const cleanServicePhone = String(service_phone || '').trim() || center.contact_details || null;
  const cleanPickupLabel = String(pickup_label || '').trim() || null;

  await db.query(
    `INSERT INTO ambulance_requests
     (id, user_id, center_id, requester_name, requester_phone, service_name, service_phone,
      pickup_label, pickup_latitude, pickup_longitude, language, eta_minutes, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'requested')`,
    [
      requestId,
      null,
      center_id,
      cleanName,
      cleanPhone,
      cleanServiceName,
      cleanServicePhone,
      cleanPickupLabel,
      Number(pickup_lat),
      Number(pickup_lng),
      language || null,
      cleanEta,
    ]
  );

  return res.status(201).json({
    success: true,
    request: formatAmbulanceRequest({
      id: requestId,
      user_id: null,
      center_id,
      center_name: center.name,
      center_address: center.address,
      center_city: center.city,
      center_state: center.state,
      requester_name: cleanName,
      requester_phone: cleanPhone,
      service_name: cleanServiceName,
      service_phone: cleanServicePhone,
      pickup_label: cleanPickupLabel,
      pickup_latitude: Number(pickup_lat),
      pickup_longitude: Number(pickup_lng),
      eta_minutes: cleanEta,
      status: 'requested',
      language: language || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
});

exports.getAmbulanceRequest = asyncHandler(async (req, res) => {
  const request = await getAmbulanceRequestById(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Ambulance request not found' });
  }

  return res.json({ success: true, request: formatAmbulanceRequest(request) });
});

exports.getAmbulanceRequests = asyncHandler(async (req, res) => {
  await ensureAmbulanceRequestsTable();

  const { center_id, status } = req.query;
  const scopedCenterIds = await getScopedCenterIds(req.user);

  if (center_id) {
    await assertCenterAccess(req.user, center_id);
  }

  let query = `
    SELECT ar.*, c.name AS center_name, c.address AS center_address, c.city AS center_city, c.state AS center_state
    FROM ambulance_requests ar
    JOIN centers c ON c.id = ar.center_id
    WHERE 1=1
  `;
  const params = [];

  if (Array.isArray(scopedCenterIds)) {
    if (!scopedCenterIds.length) {
      return res.json({ success: true, requests: [] });
    }

    query += ` AND ar.center_id IN (${scopedCenterIds.map(() => '?').join(',')})`;
    params.push(...scopedCenterIds);
  }

  if (center_id) {
    query += ' AND ar.center_id=?';
    params.push(center_id);
  }

  if (status) {
    query += ' AND ar.status=?';
    params.push(status);
  }

  query += ' ORDER BY ar.created_at DESC';

  const result = await db.query(query, params);
  return res.json({ success: true, requests: result.rows.map(formatAmbulanceRequest) });
});

exports.updateAmbulanceRequestStatus = asyncHandler(async (req, res) => {
  const request = await getAmbulanceRequestById(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Ambulance request not found' });
  }

  await assertCenterAccess(req.user, request.center_id);

  const nextStatus = req.body.status;
  const nextEta = req.body.eta_minutes !== undefined
    ? Math.max(0, Math.round(Number(req.body.eta_minutes)))
    : Number(request.eta_minutes);

  await db.query(
    'UPDATE ambulance_requests SET status=?, eta_minutes=? WHERE id=?',
    [nextStatus, nextEta, request.id]
  );

  const updated = await getAmbulanceRequestById(request.id);

  req.app.get('io')?.emit('ambulance:update', {
    request_id: updated.id,
    center_id: updated.center_id,
    status: updated.status,
    eta_minutes: Number(updated.eta_minutes),
  });

  return res.json({ success: true, request: formatAmbulanceRequest(updated) });
});

exports.getNearbyAmbulanceServices = asyncHandler(async (req, res) => {
  await ensureAmbulanceServicesTable();

  const { lat, lng, radius } = req.query;
  const hasCoordinates = lat !== undefined && lng !== undefined && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const radiusKm = Number(radius) > 0 ? Number(radius) : 50;

  let query = hasCoordinates
    ? `SELECT a.*, c.name AS center_name, c.address AS center_address, c.city AS center_city, c.state AS center_state,
        CASE
          WHEN COALESCE(a.base_latitude, c.latitude) IS NULL OR COALESCE(a.base_longitude, c.longitude) IS NULL THEN NULL
          ELSE (
            6371 * ACOS(
              COS(RADIANS(?)) * COS(RADIANS(COALESCE(a.base_latitude, c.latitude))) * COS(RADIANS(COALESCE(a.base_longitude, c.longitude)) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(COALESCE(a.base_latitude, c.latitude)))
            )
          )
        END AS distance_km
       FROM ambulance_services a
       JOIN centers c ON c.id = a.center_id
       WHERE a.is_active=1`
    : `SELECT a.*, c.name AS center_name, c.address AS center_address, c.city AS center_city, c.state AS center_state, NULL AS distance_km
       FROM ambulance_services a
       JOIN centers c ON c.id = a.center_id
       WHERE a.is_active=1`;
  const params = [];

  if (hasCoordinates) {
    params.push(Number(lat), Number(lng), Number(lat));
    query += ' HAVING distance_km IS NULL OR distance_km <= ? ORDER BY distance_km IS NULL ASC, distance_km ASC, a.name';
    params.push(radiusKm);
  } else {
    query += ' ORDER BY a.name';
  }

  const result = await db.query(query, params);
  const services = result.rows.map((row) => ({
    id: row.id,
    centerId: row.center_id,
    name: row.name,
    number: row.phone || row.contact_details || '',
    area: row.center_city,
    free: false,
    etaMinutes: row.distance_km == null ? 10 : Math.max(6, Math.round(Number(row.distance_km) * 4)),
    nearbyReason: row.distance_km == null
      ? 'Registered hospital ambulance'
      : `${Number(row.distance_km).toFixed(1)} km from your detected location`,
    distanceKm: row.distance_km == null ? null : Number(row.distance_km),
    driverName: row.driver_name || null,
    vehicleNumber: row.vehicle_number || null,
    hospital: {
      id: row.center_id,
      name: row.center_name,
      address: row.center_address,
      city: row.center_city,
      state: row.center_state,
      latitude: row.base_latitude ?? null,
      longitude: row.base_longitude ?? null,
      contact_details: row.phone || '',
    },
  }));

  res.json({ success: true, services });
});
