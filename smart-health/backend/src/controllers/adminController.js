const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const mailService = require('../services/mailService');
const notifService = require('../services/notificationService');
const { broadcastQueueState } = require('../socket');
const {
  assertAppointmentAccess,
  assertCenterAccess,
  assertDoctorAccess,
  getScopedCenterIds,
  isHospitalAdmin,
} = require('../utils/adminAccess');
const { getPriorityRank, recalculateQueueState } = require('../utils/queueUtils');

let ambulanceServicesTableReady = false;

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
      CONSTRAINT fk_ambulance_services_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
    )
  `);

  ambulanceServicesTableReady = true;
}

function formatAmbulanceService(row) {
  if (!row) return null;

  return {
    id: row.id,
    center_id: row.center_id,
    center_name: row.center_name,
    center_city: row.center_city,
    name: row.name,
    phone: row.phone,
    driver_name: row.driver_name,
    vehicle_number: row.vehicle_number,
    base_latitude: row.base_latitude == null ? null : Number(row.base_latitude),
    base_longitude: row.base_longitude == null ? null : Number(row.base_longitude),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getAmbulanceServiceById(id) {
  await ensureAmbulanceServicesTable();

  const result = await db.query(
    `SELECT a.*, c.name AS center_name, c.city AS center_city
     FROM ambulance_services a
     JOIN centers c ON c.id = a.center_id
     WHERE a.id=? LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

// Centers
exports.createCenter = asyncHandler(async (req, res) => {
  const { name, sector, address, city, state, contact_details, average_consultation_minutes } = req.body;
  const id = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO centers (id, name, sector, address, city, state, contact_details, average_consultation_minutes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, name, sector, address, city, state, contact_details, average_consultation_minutes || 15]
    );

    if (isHospitalAdmin(req.user)) {
      await conn.execute(
        'INSERT INTO admin_center_access (id, user_id, center_id) VALUES (?,?,?)',
        [uuidv4(), req.user.id, id]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const result = await db.query('SELECT * FROM centers WHERE id=?', [id]);
  res.status(201).json({ success: true, center: result.rows[0] });
});

exports.updateCenter = asyncHandler(async (req, res) => {
  await assertCenterAccess(req.user, req.params.id);
  const fields = ['name','sector','address','city','state','contact_details','average_consultation_minutes'];
  const updates = []; const params = [];
  fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); } });
  params.push(req.params.id);
  await db.query(`UPDATE centers SET ${updates.join(',')} WHERE id=?`, params);
  const result = await db.query('SELECT * FROM centers WHERE id=?', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Center not found' });
  res.json({ success: true, center: result.rows[0] });
});

exports.deleteCenter = asyncHandler(async (req, res) => {
  await assertCenterAccess(req.user, req.params.id);
  await db.query('DELETE FROM centers WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Center deleted' });
});

// Doctors
exports.createDoctor = asyncHandler(async (req, res) => {
  const { center_id, name, specialization, qualification, average_consultation_minutes } = req.body;
  await assertCenterAccess(req.user, center_id);
  const id = uuidv4();
  await db.query(
    `INSERT INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
     VALUES (?,?,?,?,?,?)`,
    [id, center_id, name, specialization, qualification, average_consultation_minutes || 15]
  );
  const result = await db.query('SELECT * FROM doctors WHERE id=?', [id]);
  res.status(201).json({ success: true, doctor: result.rows[0] });
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  await assertDoctorAccess(req.user, req.params.id);
  if (req.body.center_id) {
    await assertCenterAccess(req.user, req.body.center_id);
  }
  const fields = ['center_id','name','specialization','qualification','average_consultation_minutes'];
  const updates = []; const params = [];
  fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); } });
  params.push(req.params.id);
  await db.query(`UPDATE doctors SET ${updates.join(',')} WHERE id=?`, params);
  const result = await db.query('SELECT * FROM doctors WHERE id=?', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, doctor: result.rows[0] });
});

exports.deleteDoctor = asyncHandler(async (req, res) => {
  await assertDoctorAccess(req.user, req.params.id);
  await db.query('DELETE FROM doctors WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Doctor deleted' });
});

exports.updateDoctorSlots = asyncHandler(async (req, res) => {
  await assertDoctorAccess(req.user, req.params.id);
  const { slots } = req.body;
  await db.query('DELETE FROM doctor_availability WHERE doctor_id=?', [req.params.id]);
  for (const slot of slots) {
    await db.query(
      `INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), req.params.id, slot.day_of_week, slot.start_time, slot.end_time, slot.slot_duration_minutes || 15, slot.is_active !== false ? 1 : 0]
    );
  }
  res.json({ success: true, message: 'Slots updated' });
});

// Appointments
exports.getAllAppointments = asyncHandler(async (req, res) => {
  const { status, center_id, date } = req.query;
  const scopedCenterIds = await getScopedCenterIds(req.user);
  if (center_id) {
    await assertCenterAccess(req.user, center_id);
  }
  let query = `
    SELECT a.*, c.name AS center_name, d.name AS doctor_name, u.name AS user_name, u.email AS user_email
    FROM appointments a
    JOIN centers c ON c.id = a.center_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    JOIN users u ON u.id = a.user_id
    WHERE 1=1
  `;
  const params = [];
  if (Array.isArray(scopedCenterIds)) {
    if (!scopedCenterIds.length) {
      return res.json({ success: true, appointments: [] });
    }
    query += ` AND a.center_id IN (${scopedCenterIds.map(() => '?').join(',')})`;
    params.push(...scopedCenterIds);
  }
  if (status) { query += ' AND a.status=?'; params.push(status); }
  if (center_id) { query += ' AND a.center_id=?'; params.push(center_id); }
  if (date) { query += ' AND a.appointment_date=?'; params.push(date); }
  query += ` ORDER BY a.created_at DESC,
    a.appointment_date DESC,
    a.appointment_time DESC`;

  const result = await db.query(query, params);
  res.json({ success: true, appointments: result.rows });
});

exports.updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['confirmed','in_progress','completed','cancelled','no_show'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  await assertAppointmentAccess(req.user, req.params.id);
  const existingResult = await db.query(
    `SELECT *
     FROM appointments
     WHERE id=?`,
    [req.params.id]
  );
  if (!existingResult.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

  const existingAppt = existingResult.rows[0];

  if (status === 'in_progress') {
    const queueResult = await db.query(
      `SELECT id, status, priority, appointment_time, created_at
       FROM appointments
       WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
       AND appointment_date=?
       AND status IN ('confirmed','in_progress')`,
      [existingAppt.doctor_id || null, existingAppt.center_id, String(existingAppt.appointment_date).split('T')[0]]
    );

    const activeQueue = queueResult.rows.sort((a, b) => {
      const statusRankA = a.status === 'in_progress' ? 0 : 1;
      const statusRankB = b.status === 'in_progress' ? 0 : 1;
      if (statusRankA !== statusRankB) return statusRankA - statusRankB;

      const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
      if (priorityDiff !== 0) return priorityDiff;

      const timeDiff = String(a.appointment_time).localeCompare(String(b.appointment_time));
      if (timeDiff !== 0) return timeDiff;

      return String(a.created_at).localeCompare(String(b.created_at));
    });

    const currentInProgress = activeQueue.find((item) => item.status === 'in_progress');
    if (currentInProgress && currentInProgress.id !== req.params.id) {
      return res.status(409).json({
        success: false,
        message: 'Complete the patient already in progress before starting another one.',
      });
    }

    const nextAllowed = activeQueue.find((item) => item.status === 'confirmed');
    if (nextAllowed && nextAllowed.id !== req.params.id) {
      return res.status(409).json({
        success: false,
        message: 'Start the highest-priority patient first. Emergency and urgent cases move ahead in the queue.',
      });
    }
  }

  await db.query(`UPDATE appointments SET status=? WHERE id=?`, [status, req.params.id]);
  const result = await db.query(
    `SELECT a.*, c.name AS center_name, d.name AS doctor_name, u.name AS user_name, u.email AS user_email
     FROM appointments a
     JOIN centers c ON c.id = a.center_id
     LEFT JOIN doctors d ON d.id = a.doctor_id
     JOIN users u ON u.id = a.user_id
     WHERE a.id=?`,
    [req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

  const appt = result.rows[0];
  await recalculateQueueState(db, appt.doctor_id, appt.center_id, String(appt.appointment_date).split('T')[0]);
  const io = req.app.get('io');

  // Fire notification + email based on new status
  const NOTIF_MAP = {
    in_progress: {
      title: '⏳ Consultation Started',
      message: `Your appointment at ${appt.center_name} has started. Token #${appt.queue_number}`,
      type: 'queue',
      email: () => mailService.sendInProgressAlert({ name: appt.user_name, email: appt.user_email }, appt),
    },
    completed: {
      title: '✅ Appointment Completed',
      message: `Your appointment at ${appt.center_name} is complete. We hope you received great care!`,
      type: 'appointment',
      email: () => mailService.sendCompletedAlert({ name: appt.user_name, email: appt.user_email }, appt),
    },
    cancelled: {
      title: '❌ Appointment Cancelled',
      message: `Your appointment at ${appt.center_name} on ${String(appt.appointment_date).split('T')[0]} has been cancelled by the center.`,
      type: 'cancellation',
      email: () => mailService.sendCancellation({ name: appt.user_name, email: appt.user_email }, appt),
    },
    no_show: {
      title: '👻 Marked as No-Show',
      message: `Your appointment at ${appt.center_name} was marked as no-show. Please book again if needed.`,
      type: 'system',
      email: () => mailService.sendNoShowAlert({ name: appt.user_name, email: appt.user_email }, appt),
    },
  };

  if (NOTIF_MAP[status]) {
    const n = NOTIF_MAP[status];
    notifService.createNotification(io, {
      user_id: appt.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      appointment_id: appt.id,
    }).catch(console.error);
    n.email().catch(console.error);
  }

  // Broadcast live queue update
  if (io) broadcastQueueState(io, appt.center_id, appt.doctor_id, String(appt.appointment_date).split('T')[0]);

  res.json({ success: true, appointment: appt });
});

exports.getQueueStatus = asyncHandler(async (req, res) => {
  const { center_id, doctor_id, date } = req.query;
  const scopedCenterIds = await getScopedCenterIds(req.user);
  if (center_id) {
    await assertCenterAccess(req.user, center_id);
  }
  if (doctor_id) {
    await assertDoctorAccess(req.user, doctor_id);
  }
  let query = `
    SELECT a.*, u.name AS user_name, c.name AS center_name FROM appointments a
    JOIN users u ON u.id = a.user_id
    JOIN centers c ON c.id = a.center_id
    WHERE a.status IN ('confirmed','in_progress')
    AND a.appointment_date=?
  `;
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const params = [date || localToday];
  if (Array.isArray(scopedCenterIds)) {
    if (!scopedCenterIds.length) {
      return res.json({ success: true, queue: [] });
    }
    query += ` AND a.center_id IN (${scopedCenterIds.map(() => '?').join(',')})`;
    params.push(...scopedCenterIds);
  }
  if (center_id) { query += ' AND a.center_id=?'; params.push(center_id); }
  if (doctor_id) { query += ' AND a.doctor_id=?'; params.push(doctor_id); }
  query += ` ORDER BY
    CASE WHEN a.status='in_progress' THEN 0 ELSE 1 END,
    CASE a.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
    a.appointment_time,
    a.created_at`;

  const result = await db.query(query, params);
  const nextConfirmedId = result.rows.find((item) => item.status === 'confirmed')?.id || null;
  const queue = result.rows.map((item, index) => ({
    ...item,
    live_queue_number: index + 1,
    priority_rank: getPriorityRank(item.priority),
    can_start: item.status !== 'confirmed' ? true : item.id === nextConfirmedId,
  }));
  res.json({ success: true, queue });
});

exports.getAmbulances = asyncHandler(async (req, res) => {
  await ensureAmbulanceServicesTable();

  const { center_id, active } = req.query;
  const scopedCenterIds = await getScopedCenterIds(req.user);
  if (center_id) {
    await assertCenterAccess(req.user, center_id);
  }

  let query = `
    SELECT a.*, c.name AS center_name, c.city AS center_city
    FROM ambulance_services a
    JOIN centers c ON c.id = a.center_id
    WHERE 1=1
  `;
  const params = [];

  if (Array.isArray(scopedCenterIds)) {
    if (!scopedCenterIds.length) {
      return res.json({ success: true, ambulances: [] });
    }
    query += ` AND a.center_id IN (${scopedCenterIds.map(() => '?').join(',')})`;
    params.push(...scopedCenterIds);
  }

  if (center_id) {
    query += ' AND a.center_id=?';
    params.push(center_id);
  }

  if (active === 'true') query += ' AND a.is_active=1';
  if (active === 'false') query += ' AND a.is_active=0';

  query += ' ORDER BY c.name, a.name';
  const result = await db.query(query, params);
  res.json({ success: true, ambulances: result.rows.map(formatAmbulanceService) });
});

exports.createAmbulance = asyncHandler(async (req, res) => {
  await ensureAmbulanceServicesTable();

  const { center_id, name, phone, driver_name, vehicle_number, base_latitude, base_longitude, is_active } = req.body;
  await assertCenterAccess(req.user, center_id);

  const id = uuidv4();
  await db.query(
    `INSERT INTO ambulance_services
     (id, center_id, name, phone, driver_name, vehicle_number, base_latitude, base_longitude, is_active)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id,
      center_id,
      name,
      phone || null,
      driver_name || null,
      vehicle_number || null,
      base_latitude === '' || base_latitude == null ? null : Number(base_latitude),
      base_longitude === '' || base_longitude == null ? null : Number(base_longitude),
      is_active === false ? 0 : 1,
    ]
  );

  const service = await getAmbulanceServiceById(id);
  res.status(201).json({ success: true, ambulance: formatAmbulanceService(service) });
});

exports.updateAmbulance = asyncHandler(async (req, res) => {
  await ensureAmbulanceServicesTable();

  const existing = await getAmbulanceServiceById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Ambulance not found' });
  }

  await assertCenterAccess(req.user, existing.center_id);
  if (req.body.center_id && req.body.center_id !== existing.center_id) {
    await assertCenterAccess(req.user, req.body.center_id);
  }

  const fields = ['center_id', 'name', 'phone', 'driver_name', 'vehicle_number', 'base_latitude', 'base_longitude', 'is_active'];
  const updates = [];
  const params = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field}=?`);
      if (field === 'base_latitude' || field === 'base_longitude') {
        params.push(req.body[field] === '' || req.body[field] == null ? null : Number(req.body[field]));
      } else if (field === 'is_active') {
        params.push(req.body[field] === false ? 0 : 1);
      } else {
        params.push(req.body[field] || null);
      }
    }
  });

  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No ambulance updates provided' });
  }

  params.push(req.params.id);
  await db.query(`UPDATE ambulance_services SET ${updates.join(', ')} WHERE id=?`, params);
  const updated = await getAmbulanceServiceById(req.params.id);
  res.json({ success: true, ambulance: formatAmbulanceService(updated) });
});

exports.deleteAmbulance = asyncHandler(async (req, res) => {
  await ensureAmbulanceServicesTable();

  const existing = await getAmbulanceServiceById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Ambulance not found' });
  }

  await assertCenterAccess(req.user, existing.center_id);
  await db.query('DELETE FROM ambulance_services WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'Ambulance deleted' });
});
