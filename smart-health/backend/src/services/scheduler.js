/**
 * Background scheduler — runs every minute
 * Handles: reminders, delayed alerts, missed (no-show) auto-detection
 */
const db = require('../config/db');
const mailService = require('./mailService');
const notifService = require('./notificationService');
const { recalculateQueueState } = require('../utils/queueUtils');

let io = null;

function setIO(ioInstance) {
  io = ioInstance;
}

async function runScheduler() {
  try {
    await checkReminders();
    await checkDelayed();
    await checkNoShow();
    await checkQueueAlerts();
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
  }
}

// Send reminder 24h before appointment
async function checkReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  const result = await db.query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN centers c ON c.id = a.center_id
     WHERE a.appointment_date = ?
     AND a.status = 'confirmed'
     AND a.reminder_sent IS NULL`,
    [tomorrowDate]
  );

  for (const appt of result.rows) {
    try {
      await mailService.sendReminder(
        { name: appt.user_name, email: appt.user_email },
        appt
      );
      await notifService.createNotification(io, {
        user_id: appt.user_id,
        title: '⏰ Appointment Tomorrow',
        message: `Reminder: You have an appointment at ${appt.center_name} tomorrow at ${String(appt.appointment_time).slice(0, 5)}. Token #${appt.queue_number}`,
        type: 'reminder',
        appointment_id: appt.id,
      });
      await db.query(`UPDATE appointments SET reminder_sent = NOW() WHERE id = ?`, [appt.id]);
      console.log(`[Scheduler] Reminder sent for appointment ${appt.id}`);
    } catch (e) {
      console.error(`[Scheduler] Reminder failed for ${appt.id}:`, e.message);
    }
  }
}

// Detect delayed appointments (appointment time passed but still 'confirmed')
async function checkDelayed() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`;

  const result = await db.query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN centers c ON c.id = a.center_id
     WHERE a.appointment_date = ?
     AND a.appointment_time < ?
     AND a.status = 'confirmed'
     AND a.delay_notified IS NULL`,
    [today, currentTime]
  );

  for (const appt of result.rows) {
    const apptTime = new Date(`${today}T${String(appt.appointment_time).slice(0,5)}:00`);
    const delayMins = Math.floor((now - apptTime) / 60000);
    if (delayMins < 15) continue; // only notify after 15 min delay

    try {
      await mailService.sendDelayAlert(
        { name: appt.user_name, email: appt.user_email },
        appt,
        delayMins
      );
      await notifService.createNotification(io, {
        user_id: appt.user_id,
        title: `⚠️ Appointment Delayed by ${delayMins} min`,
        message: `Your appointment at ${appt.center_name} was scheduled at ${String(appt.appointment_time).slice(0,5)} but hasn't started yet. Please check with the center.`,
        type: 'queue',
        appointment_id: appt.id,
      });
      await db.query(`UPDATE appointments SET delay_notified = NOW() WHERE id = ?`, [appt.id]);
    } catch (e) {
      console.error(`[Scheduler] Delay alert failed for ${appt.id}:`, e.message);
    }
  }
}

// Auto mark no-show if appointment time passed by 60+ min and still confirmed
async function checkNoShow() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const cutoffTime = new Date(now.getTime() - 60 * 60000);
  const cutoff = `${String(cutoffTime.getHours()).padStart(2,'0')}:${String(cutoffTime.getMinutes()).padStart(2,'0')}:00`;

  const result = await db.query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN centers c ON c.id = a.center_id
     WHERE a.appointment_date = ?
     AND a.appointment_time < ?
     AND a.status = 'confirmed'`,
    [today, cutoff]
  );

  for (const appt of result.rows) {
    try {
      await db.query(`UPDATE appointments SET status = 'no_show' WHERE id = ?`, [appt.id]);
      await recalculateQueueState(db, appt.doctor_id, appt.center_id, appt.appointment_date);
      await mailService.sendNoShowAlert(
        { name: appt.user_name, email: appt.user_email },
        appt
      );
      await notifService.createNotification(io, {
        user_id: appt.user_id,
        title: '👻 Marked as No-Show',
        message: `Your appointment at ${appt.center_name} on ${String(appt.appointment_date).split('T')[0]} was marked as no-show. Book a new appointment if needed.`,
        type: 'system',
        appointment_id: appt.id,
      });
      console.log(`[Scheduler] No-show marked for ${appt.id}`);
    } catch (e) {
      console.error(`[Scheduler] No-show failed for ${appt.id}:`, e.message);
    }
  }
}

// Alert users when only 2 patients are ahead
async function checkQueueAlerts() {
  const today = new Date().toISOString().split('T')[0];

  const result = await db.query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN centers c ON c.id = a.center_id
     WHERE a.appointment_date = ?
     AND a.status = 'confirmed'
     AND a.queue_alert_sent IS NULL`,
    [today]
  );

  for (const appt of result.rows) {
    const ahead = parseInt(appt.patients_before, 10) || 0;
    if (ahead > 2) continue; // only alert when 2 or fewer ahead

    try {
      await mailService.sendQueueAlert(
        { name: appt.user_name, email: appt.user_email },
        appt,
        ahead
      );
      await notifService.createNotification(io, {
        user_id: appt.user_id,
        title: ahead === 0 ? '🎉 You\'re Next!' : `📢 Almost Your Turn — ${ahead} ahead`,
        message: ahead === 0
          ? `Token #${appt.queue_number} — Please proceed to ${appt.center_name} now!`
          : `Only ${ahead} patient${ahead > 1 ? 's' : ''} ahead of you at ${appt.center_name}. Head there now!`,
        type: 'queue',
        appointment_id: appt.id,
      });
      await db.query(`UPDATE appointments SET queue_alert_sent = NOW() WHERE id = ?`, [appt.id]);
    } catch (e) {
      console.error(`[Scheduler] Queue alert failed for ${appt.id}:`, e.message);
    }
  }
}

module.exports = { runScheduler, setIO };
