function getPriorityRank(priority = 'normal') {
  if (priority === 'emergency') return 0;
  if (priority === 'urgent') return 1;
  return 2;
}

function compareQueueOrder(a, b) {
  const statusRankA = a.status === 'in_progress' ? 0 : 1;
  const statusRankB = b.status === 'in_progress' ? 0 : 1;
  if (statusRankA !== statusRankB) return statusRankA - statusRankB;

  const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const timeDiff = String(a.appointment_time).localeCompare(String(b.appointment_time));
  if (timeDiff !== 0) return timeDiff;

  return String(a.created_at).localeCompare(String(b.created_at));
}

async function getAverageConsultationMinutes(db, doctor_id, center_id) {
  let avg = 15;

  if (doctor_id) {
    const doc = await db.query('SELECT average_consultation_minutes FROM doctors WHERE id=?', [doctor_id]);
    if (doc.rows.length) avg = doc.rows[0].average_consultation_minutes || 15;
  } else {
    const center = await db.query('SELECT average_consultation_minutes FROM centers WHERE id=?', [center_id]);
    if (center.rows.length) avg = center.rows[0].average_consultation_minutes || 15;
  }

  return avg;
}

async function calculateQueue(db, doctor_id, center_id, appointment_date, appointment_time, priority = 'normal') {
  const currentPriority = priority || 'normal';
  const currentRank = getPriorityRank(currentPriority);

  const beforeResult = await db.query(
    `SELECT priority, appointment_time FROM appointments
     WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
     AND appointment_date=?
     AND status NOT IN ('cancelled','completed','no_show')`,
    [doctor_id || null, center_id, appointment_date]
  );
  const patients_before = beforeResult.rows.filter((row) => {
    const rowRank = getPriorityRank(row.priority);
    if (rowRank < currentRank) return true;
    if (rowRank > currentRank) return false;
    return String(row.appointment_time).slice(0, 5) < String(appointment_time).slice(0, 5);
  }).length;

  const queueResult = await db.query(
    `SELECT priority FROM appointments
     WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
     AND appointment_date=?
     AND status NOT IN ('cancelled','completed','no_show')`,
    [doctor_id || null, center_id, appointment_date]
  );
  const queue_number = queueResult.rows.filter((row) => getPriorityRank(row.priority) <= currentRank).length + 1;

  const avg = await getAverageConsultationMinutes(db, doctor_id, center_id);

  return { queue_number, patients_before, estimated_wait_minutes: patients_before * avg };
}

async function recalculateQueueState(db, doctor_id, center_id, appointment_date) {
  const result = await db.query(
    `SELECT id, user_id, center_id, doctor_id, appointment_date, appointment_time,
            queue_number, patients_before, estimated_wait_minutes, status, priority, created_at
     FROM appointments
     WHERE (doctor_id=? OR (doctor_id IS NULL AND center_id=?))
     AND appointment_date=?
     AND status IN ('confirmed','in_progress')`,
    [doctor_id || null, center_id, appointment_date]
  );

  const appointments = result.rows;
  const previousById = new Map(
    appointments.map((appt) => [
      appt.id,
      {
        queue_number: appt.queue_number,
        patients_before: appt.patients_before,
        estimated_wait_minutes: appt.estimated_wait_minutes,
        status: appt.status,
        priority: appt.priority,
      },
    ])
  );

  if (!appointments.length) {
    return { appointments: [], previousById };
  }

  const avg = await getAverageConsultationMinutes(db, doctor_id, center_id);
  const sortedAppointments = [...appointments].sort(compareQueueOrder);
  const updatedAppointments = [];

  for (const [index, appt] of sortedAppointments.entries()) {
    const queue_number = index + 1;
    const patients_before = appt.status === 'in_progress' ? 0 : index;
    const estimated_wait_minutes = patients_before * avg;
    const previous = previousById.get(appt.id) || {};
    const queueChanged =
      previous.queue_number !== queue_number ||
      previous.patients_before !== patients_before ||
      previous.estimated_wait_minutes !== estimated_wait_minutes;

    if (queueChanged) {
      await db.query(
        `UPDATE appointments
         SET queue_number=?, patients_before=?, estimated_wait_minutes=?, queue_alert_sent=NULL
         WHERE id=?`,
        [queue_number, patients_before, estimated_wait_minutes, appt.id]
      );
    }

    updatedAppointments.push({
      ...appt,
      queue_number,
      patients_before,
      estimated_wait_minutes,
    });
  }

  return { appointments: updatedAppointments, previousById };
}

module.exports = { calculateQueue, getPriorityRank, recalculateQueueState };
