const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getDoctors = asyncHandler(async (req, res) => {
  const { center_id, specialization } = req.query;
  let query = `SELECT d.*, c.name AS center_name FROM doctors d
               JOIN centers c ON c.id = d.center_id WHERE 1=1`;
  const params = [];
  if (center_id) { query += ' AND d.center_id=?'; params.push(center_id); }
  if (specialization) { query += ' AND d.specialization LIKE ?'; params.push(`%${specialization}%`); }
  query += ' ORDER BY d.name';
  const result = await db.query(query, params);
  res.json({ success: true, doctors: result.rows });
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT d.*, c.name AS center_name FROM doctors d
     JOIN centers c ON c.id = d.center_id WHERE d.id=?`,
    [req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, doctor: result.rows[0] });
});

exports.getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'date is required' });

  const dayOfWeek = new Date(date).getDay();

  // Check doctor availability for that day
  const avail = await db.query(
    `SELECT * FROM doctor_availability WHERE doctor_id=? AND day_of_week=? AND is_active=1`,
    [req.params.id, dayOfWeek]
  );

  // Get doctor's slot duration (default 15 min)
  const docResult = await db.query('SELECT average_consultation_minutes FROM doctors WHERE id=?', [req.params.id]);
  const slotDuration = docResult.rows[0]?.average_consultation_minutes || 15;

  let startHour = 0, endHour = 24; // default 24/7
  if (avail.rows.length) {
    const t = avail.rows[0];
    startHour = parseInt(String(t.start_time).split(':')[0]);
    endHour = parseInt(String(t.end_time).split(':')[0]);
    // If end_time is 00:00 treat as midnight (24)
    if (endHour === 0) endHour = 24;
  }

  const slots = generate24hSlots(startHour, endHour, slotDuration, date);

  // Get already booked slots
  const booked = await db.query(
    `SELECT appointment_time FROM appointments
     WHERE doctor_id=? AND appointment_date=? AND status != 'cancelled'`,
    [req.params.id, date]
  );
  const bookedTimes = booked.rows.map((r) => {
    const t = r.appointment_time;
    return typeof t === 'string' ? t.slice(0, 5) : String(t).padStart(8, '0').slice(0, 5);
  });

  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const result = slots.map((s) => {
    const [h, m] = s.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const isPast = isToday && slotMinutes <= currentMinutes;
    const isBooked = bookedTimes.includes(s);
    return { time: s, available: !isPast && !isBooked, isPast, isBooked };
  });

  res.json({ success: true, slots: result });
});

function generate24hSlots(startHour, endHour, duration, date) {
  const slots = [];
  let h = startHour, m = 0;
  const endMins = endHour * 60;
  while (h * 60 + m < endMins) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += duration;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}
