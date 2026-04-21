const db = require('../config/db');

function isAdmin(user) {
  return user?.role === 'admin';
}

function isMainAdmin(user) {
  return isAdmin(user) && (user.admin_scope || 'main') === 'main';
}

function isHospitalAdmin(user) {
  return isAdmin(user) && user.admin_scope === 'hospital';
}

async function getAuthorizedCenters(userId) {
  const result = await db.query(
    `SELECT aca.center_id, c.name
     FROM admin_center_access aca
     JOIN centers c ON c.id = aca.center_id
     WHERE aca.user_id=?
     ORDER BY c.name`,
    [userId]
  );

  return {
    authorized_center_ids: result.rows.map((row) => row.center_id),
    authorized_centers: result.rows.map((row) => ({
      id: row.center_id,
      name: row.name,
    })),
  };
}

async function enrichAdminUser(user) {
  if (!user || user.role !== 'admin') {
    return user;
  }

  const access = await getAuthorizedCenters(user.id);
  return {
    ...user,
    admin_scope: user.admin_scope || 'main',
    authorized_center_ids: access.authorized_center_ids,
    authorized_centers: access.authorized_centers,
  };
}

async function getScopedCenterIds(user) {
  if (!isAdmin(user)) {
    return [];
  }

  if (isMainAdmin(user)) {
    return null;
  }

  if (Array.isArray(user.authorized_center_ids)) {
    return user.authorized_center_ids;
  }

  const access = await getAuthorizedCenters(user.id);
  return access.authorized_center_ids;
}

async function assertCenterAccess(user, centerId) {
  if (isMainAdmin(user)) {
    return;
  }

  const centerIds = await getScopedCenterIds(user);
  if (!centerIds.includes(centerId)) {
    const error = new Error('You are not authorized for this hospital');
    error.status = 403;
    throw error;
  }
}

async function assertDoctorAccess(user, doctorId) {
  const result = await db.query('SELECT center_id FROM doctors WHERE id=? LIMIT 1', [doctorId]);
  if (!result.rows.length) {
    const error = new Error('Doctor not found');
    error.status = 404;
    throw error;
  }

  await assertCenterAccess(user, result.rows[0].center_id);
  return result.rows[0];
}

async function assertAppointmentAccess(user, appointmentId) {
  const result = await db.query('SELECT center_id FROM appointments WHERE id=? LIMIT 1', [appointmentId]);
  if (!result.rows.length) {
    const error = new Error('Appointment not found');
    error.status = 404;
    throw error;
  }

  await assertCenterAccess(user, result.rows[0].center_id);
  return result.rows[0];
}

async function getAdminNotificationEmails(centerId) {
  if (!centerId) {
    const result = await db.query(
      `SELECT email
       FROM users
       WHERE role='admin' AND COALESCE(admin_scope, 'main')='main'`
    );
    return result.rows.map((row) => row.email);
  }

  const result = await db.query(
    `SELECT DISTINCT u.email
     FROM users u
     LEFT JOIN admin_center_access aca ON aca.user_id = u.id
     WHERE u.role='admin'
       AND (
         COALESCE(u.admin_scope, 'main')='main'
         OR (
           COALESCE(u.admin_scope, 'main')='hospital'
           AND aca.center_id=?
         )
       )`,
    [centerId]
  );

  return result.rows.map((row) => row.email);
}

async function getAdminNotificationRecipients(centerId) {
  if (!centerId) {
    const result = await db.query(
      `SELECT id, email
       FROM users
       WHERE role='admin' AND COALESCE(admin_scope, 'main')='main'`
    );
    return result.rows;
  }

  const result = await db.query(
    `SELECT DISTINCT u.id, u.email
     FROM users u
     LEFT JOIN admin_center_access aca ON aca.user_id = u.id
     WHERE u.role='admin'
       AND (
         COALESCE(u.admin_scope, 'main')='main'
         OR (
           COALESCE(u.admin_scope, 'main')='hospital'
           AND aca.center_id=?
         )
       )`,
    [centerId]
  );

  return result.rows;
}

module.exports = {
  isAdmin,
  isMainAdmin,
  isHospitalAdmin,
  enrichAdminUser,
  getAuthorizedCenters,
  getScopedCenterIds,
  assertCenterAccess,
  assertDoctorAccess,
  assertAppointmentAccess,
  getAdminNotificationEmails,
  getAdminNotificationRecipients,
};
