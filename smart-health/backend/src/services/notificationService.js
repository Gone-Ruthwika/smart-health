const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

/**
 * Create an in-app notification and optionally emit via socket
 */
async function createNotification(io, { user_id, title, message, type = 'system', appointment_id = null }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO notifications (id, user_id, title, message, type, appointment_id)
     VALUES (?,?,?,?,?,?)`,
    [id, user_id, title, message, type, appointment_id]
  );

  // Emit real-time notification to user's personal room
  if (io) {
    io.to(`user:${user_id}`).emit('notification:new', {
      id, title, message, type, appointment_id,
      created_at: new Date().toISOString(),
      is_read: false,
    });
  }

  return id;
}

async function getUnreadCount(user_id) {
  const result = await db.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0',
    [user_id]
  );
  return parseInt(result.rows[0].count) || 0;
}

async function getUserNotifications(user_id, limit = 20) {
  const result = await db.query(
    `SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ${parseInt(limit)}`,
    [user_id]
  );
  return result.rows;
}

async function markAllRead(user_id) {
  await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [user_id]);
}

async function markRead(id, user_id) {
  await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [id, user_id]);
}

module.exports = { createNotification, getUnreadCount, getUserNotifications, markAllRead, markRead };
