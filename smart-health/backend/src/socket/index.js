const db = require('../config/db');

async function broadcastQueueState(io, center_id, doctor_id, appointment_date) {
  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) AS active,
        SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) AS confirmed
       FROM appointments
       WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
       AND appointment_date=?
       AND status IN ('confirmed','in_progress')`,
      [doctor_id || null, center_id, appointment_date]
    );
    const stats = result.rows[0];
    const room = `queue:${doctor_id || center_id}:${appointment_date}`;
    io.to(room).emit('queue:updated', {
      active: parseInt(stats.active) || 0,
      in_progress: parseInt(stats.in_progress) || 0,
      confirmed: parseInt(stats.confirmed) || 0,
    });
  } catch (err) {
    console.error('Socket broadcast error:', err.message);
  }
}

function initSocket(io) {
  io.on('connection', (socket) => {
    // Join personal room for notifications
    socket.on('user:join', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('queue:join', ({ center_id, doctor_id, date }) => {
      const room = `queue:${doctor_id || center_id}:${date}`;
      socket.join(room);
      broadcastQueueState(io, center_id, doctor_id, date);
    });

    socket.on('queue:leave', ({ center_id, doctor_id, date }) => {
      const room = `queue:${doctor_id || center_id}:${date}`;
      socket.leave(room);
    });
  });
}

module.exports = initSocket;
module.exports.broadcastQueueState = broadcastQueueState;
