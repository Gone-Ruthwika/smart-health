const db = require('../config/db');
const mailService = require('./mailService');
const adminMailService = require('./adminMailService');
const notifService = require('./notificationService');
const { getAdminNotificationEmails } = require('../utils/adminAccess');
const { getPriorityRank, recalculateQueueState } = require('../utils/queueUtils');

async function runAlerts(io) {
  try {
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const result = await db.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email,
              c.name AS center_name, d.name AS doctor_name
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN centers c ON c.id = a.center_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date = ? AND a.status = 'confirmed'`,
      [todayDate]
    );

    for (const appt of result.rows) {
      const timeStr = String(appt.appointment_time).slice(0, 5);
      const [h, m] = timeStr.split(':').map(Number);
      const apptMinutes = h * 60 + m;
      const diffMin = apptMinutes - nowMinutes;
      const user = { name: appt.user_name, email: appt.user_email };

      if (diffMin >= 58 && diffMin <= 62) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Appointment in 1 Hour',
          message: `Your appointment at ${appt.center_name} is in 1 hour at ${timeStr}. Token #${appt.queue_number}`,
          type: 'reminder',
          appointment_id: appt.id,
        });
      }

      if (diffMin >= 28 && diffMin <= 32) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Time to Head Out',
          message: `Your appointment at ${appt.center_name} is in 30 minutes. Start heading out now.`,
          type: 'reminder',
          appointment_id: appt.id,
        });
        mailService.sendReminder(user, appt).catch(() => {});
      }

      if (diffMin >= 8 && diffMin <= 12) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Appointment in 10 Minutes',
          message: `Your appointment at ${appt.center_name} starts in 10 minutes. Token #${appt.queue_number}`,
          type: 'reminder',
          appointment_id: appt.id,
        });
      }

      if (diffMin >= 3 && diffMin <= 6) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: '5 Minutes to Appointment',
          message: `Your appointment at ${appt.center_name} starts in 5 minutes. Please be at the counter now. Token #${appt.queue_number}`,
          type: 'queue',
          appointment_id: appt.id,
        });
      }

      if (diffMin >= 0 && diffMin <= 1) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Appointment Starting Now',
          message: `Your appointment at ${appt.center_name} is starting now. Token #${appt.queue_number}.`,
          type: 'queue',
          appointment_id: appt.id,
        });
      }

      if (diffMin <= -15 && diffMin >= -20) {
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Appointment May Be Missed',
          message: `Your appointment at ${appt.center_name} was at ${timeStr}. Please contact the center if you are on your way.`,
          type: 'system',
          appointment_id: appt.id,
        });
      }

      const inProgressResult = await db.query(
        `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name,
                c.average_consultation_minutes AS center_avg
         FROM appointments a
         JOIN users u ON u.id = a.user_id
         JOIN centers c ON c.id = a.center_id
         WHERE a.appointment_date = ? AND a.status = 'in_progress'`,
        [todayDate]
      );

      for (const activeAppt of inProgressResult.rows) {
        const activeTimeStr = String(activeAppt.appointment_time).slice(0, 5);
        const [activeH, activeM] = activeTimeStr.split(':').map(Number);
        const activeMinutes = activeH * 60 + activeM;
        const avgDuration = activeAppt.average_consultation_minutes || activeAppt.center_avg || 15;
        const expectedEndMinutes = activeMinutes + avgDuration;

        if (nowMinutes >= expectedEndMinutes + 5) {
          await db.query(
            `UPDATE appointments SET status='completed' WHERE id=? AND status='in_progress'`,
            [activeAppt.id]
          );
          await recalculateQueueState(db, activeAppt.doctor_id, activeAppt.center_id, todayDate);
          await notifService.createNotification(io, {
            user_id: activeAppt.user_id,
            title: 'Consultation Completed',
            message: `Your consultation at ${activeAppt.center_name} has been marked as completed. We hope you feel better soon.`,
            type: 'appointment',
            appointment_id: activeAppt.id,
          });
        }
      }

      if (diffMin <= -30) {
        await db.query(
          `UPDATE appointments SET status='no_show' WHERE id=? AND status='confirmed'`,
          [appt.id]
        );
        await recalculateQueueState(db, appt.doctor_id, appt.center_id, todayDate);
        await notifService.createNotification(io, {
          user_id: appt.user_id,
          title: 'Marked as No-Show',
          message: `Your appointment at ${appt.center_name} on ${todayDate} at ${timeStr} has been marked as no-show.`,
          type: 'cancellation',
          appointment_id: appt.id,
        });
      }
    }

    const queueResult = await db.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email, c.name AS center_name
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN centers c ON c.id = a.center_id
       WHERE a.appointment_date = ? AND a.status = 'confirmed'
       ORDER BY
         CASE a.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         a.appointment_time ASC,
         a.created_at ASC`,
      [todayDate]
    );

    const groups = {};
    for (const appt of queueResult.rows) {
      const key = appt.doctor_id || appt.center_id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    }

    for (const appts of Object.values(groups)) {
      const inProgressResult = await db.query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
         AND appointment_date=? AND status='in_progress'`,
        [appts[0].doctor_id || null, appts[0].center_id, todayDate]
      );
      const inProgress = parseInt(inProgressResult.rows[0].cnt, 10) || 0;

      const completedResult = await db.query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
         AND appointment_date=? AND status='completed'`,
        [appts[0].doctor_id || null, appts[0].center_id, todayDate]
      );
      const completed = parseInt(completedResult.rows[0].cnt, 10) || 0;
      const processed = completed + inProgress;

      const sortedAppts = [...appts].sort((a, b) => {
        const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const timeDiff = String(a.appointment_time).localeCompare(String(b.appointment_time));
        if (timeDiff !== 0) return timeDiff;
        return String(a.created_at).localeCompare(String(b.created_at));
      });

      for (const [index, appt] of sortedAppts.entries()) {
        const liveQueueNumber = index + 1;
        const patientsAhead = Math.max(0, liveQueueNumber - processed - 1);
        const alertAppt = { ...appt, queue_number: liveQueueNumber };

        if (patientsAhead === 0) {
          await notifService.createNotification(io, {
            user_id: appt.user_id,
            title: "You're Next",
            message: `Token #${liveQueueNumber}. Please proceed to the counter at ${appt.center_name} now.`,
            type: 'queue',
            appointment_id: appt.id,
          });
          mailService.sendQueueAlert({ name: appt.user_name, email: appt.user_email }, alertAppt, 0).catch(() => {});
        } else if (patientsAhead === 2) {
          await notifService.createNotification(io, {
            user_id: appt.user_id,
            title: 'Almost Your Turn',
            message: `Only 2 patients ahead of you at ${appt.center_name}. Get ready. Token #${liveQueueNumber}`,
            type: 'queue',
            appointment_id: appt.id,
          });
        } else if (patientsAhead === 5) {
          await notifService.createNotification(io, {
            user_id: appt.user_id,
            title: 'Queue Update',
            message: `5 patients ahead of you at ${appt.center_name}. Estimated wait: ~${patientsAhead * 15} min`,
            type: 'queue',
            appointment_id: appt.id,
          });
        }
      }
    }

    if (now.getHours() === 20 && now.getMinutes() < 2) {
      const summaryResult = await db.query(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
          SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) AS noShow
         FROM appointments WHERE appointment_date=?`,
        [todayDate]
      );
      const stats = summaryResult.rows[0];
      const mainAdminEmails = await getAdminNotificationEmails(null);
      for (const email of mainAdminEmails) {
        adminMailService.sendDailySummary(email, {
          total: parseInt(stats.total, 10) || 0,
          completed: parseInt(stats.completed, 10) || 0,
          cancelled: parseInt(stats.cancelled, 10) || 0,
          noShow: parseInt(stats.noShow, 10) || 0,
        }).catch(console.error);
      }

      const centerStatsResult = await db.query(
        `SELECT center_id,
                COUNT(*) AS total,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) AS noShow
         FROM appointments
         WHERE appointment_date=?
         GROUP BY center_id`,
        [todayDate]
      );

      const hospitalAdmins = await db.query(
        `SELECT DISTINCT u.email, aca.center_id
         FROM users u
         JOIN admin_center_access aca ON aca.user_id = u.id
         WHERE u.role='admin' AND COALESCE(u.admin_scope, 'main')='hospital'`
      );

      for (const admin of hospitalAdmins.rows) {
        const scopedStats = centerStatsResult.rows.find((row) => row.center_id === admin.center_id);
        if (!scopedStats) continue;

        adminMailService.sendDailySummary(admin.email, {
          total: parseInt(scopedStats.total, 10) || 0,
          completed: parseInt(scopedStats.completed, 10) || 0,
          cancelled: parseInt(scopedStats.cancelled, 10) || 0,
          noShow: parseInt(scopedStats.noShow, 10) || 0,
        }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('[AlertScheduler] Error:', err.message);
  }
}

function startAlertScheduler(io) {
  console.log('[AlertScheduler] Started - running every 60 seconds');
  runAlerts(io);
  setInterval(() => runAlerts(io), 60 * 1000);
}

module.exports = { startAlertScheduler };
