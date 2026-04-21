const nodemailer = require('nodemailer');

const createTransporter = () => {
  const smtpPass = process.env.SMTP_PASS;
  const hasRealSmtpConfig =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    smtpPass &&
    !/^your_.*password/i.test(smtpPass);

  if (hasRealSmtpConfig) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: smtpPass },
    });
  }

  return {
    sendMail: async (opts) => {
      console.log(`\n[MOCK EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
      return { messageId: 'mock-' + Date.now() };
    },
  };
};

const transporter = createTransporter();

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 40px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; }
    .info-value { color: #1e293b; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 20px 0; }
    .queue-box { background: linear-gradient(135deg, #eff6ff, #eef2ff); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .queue-number { font-size: 48px; font-weight: 800; color: #2563eb; line-height: 1; }
    .queue-label { color: #64748b; font-size: 13px; margin-top: 4px; }
    .stats { display: flex; gap: 12px; margin: 20px 0; }
    .stat { flex: 1; background: #f8fafc; border-radius: 10px; padding: 16px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #2563eb; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .alert { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; color: #92400e; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 4px 0; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 SmartHealth</h1>
      <p>Your trusted healthcare appointment platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SmartHealth · All rights reserved</p>
      <p>Need help? <a href="mailto:support@smarthealth.com">support@smarthealth.com</a></p>
      <p style="margin-top:8px;font-size:11px;color:#cbd5e1;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;

exports.sendConfirmation = async (user, appt) => {
  const priorityBadge = appt.priority === 'emergency'
    ? '<span class="badge badge-red">🔴 Emergency</span>'
    : appt.priority === 'urgent'
    ? '<span class="badge badge-orange">🟡 Urgent</span>'
    : '<span class="badge badge-green">🟢 Normal</span>';

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 8px;">Appointment Confirmed! ✅</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your appointment has been successfully booked.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name || 'Healthcare Center'}</span></div>
      <div class="info-row"><span class="info-label">👨‍⚕️ Doctor</span><span class="info-value">${appt.doctor_name ? 'Dr. ' + appt.doctor_name : 'First Available'}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">📋 Reason</span><span class="info-value">${appt.issue}</span></div>
      <div class="info-row"><span class="info-label">🚨 Priority</span><span class="info-value">${priorityBadge}</span></div>
    </div>

    <div class="queue-box">
      <div class="queue-number">#${appt.queue_number}</div>
      <div class="queue-label">Your Queue Token</div>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-value">${appt.patients_before}</div><div class="stat-label">Patients Ahead</div></div>
      <div class="stat"><div class="stat-value">~${appt.estimated_wait_minutes}</div><div class="stat-label">Est. Wait (min)</div></div>
    </div>

    <div class="alert">
      ⏰ <strong>Tip:</strong> Arrive 10–15 minutes early. Bring a valid ID and any previous medical records.
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn">View Appointment Status →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `✅ Appointment Confirmed — ${String(appt.appointment_date).split('T')[0]} at ${String(appt.appointment_time).slice(0,5)}`,
    html,
  });
};

exports.sendCancellation = async (user, appt) => {
  const html = baseTemplate(`
    <h2 style="color:#dc2626;margin:0 0 8px;">Appointment Cancelled ❌</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your appointment has been cancelled.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name || 'Healthcare Center'}</span></div>
    </div>

    <p style="color:#64748b;font-size:14px;">If this was a mistake or you'd like to rebook, click below.</p>
    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/centers" class="btn" style="background:#dc2626;">Book a New Appointment →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `❌ Appointment Cancelled — SmartHealth`,
    html,
  });
};

exports.sendReminder = async (user, appt) => {
  const html = baseTemplate(`
    <h2 style="color:#f59e0b;margin:0 0 8px;">Appointment Reminder ⏰</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, this is a reminder for your upcoming appointment <strong>tomorrow</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name || 'Healthcare Center'}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">🎫 Token</span><span class="info-value">#${appt.queue_number}</span></div>
    </div>

    <div class="alert">
      📋 <strong>Checklist:</strong> Valid ID · Previous prescriptions · Insurance card · Arrive 10 min early
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn" style="background:#f59e0b;">Track Live Queue →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `⏰ Reminder: Appointment Tomorrow at ${String(appt.appointment_time).slice(0,5)}`,
    html,
  });
};

exports.sendQueueAlert = async (user, appt, patientsAhead) => {
  const html = baseTemplate(`
    <h2 style="color:#2563eb;margin:0 0 8px;">${patientsAhead === 0 ? "You're Next! 🎉" : `${patientsAhead} Patient${patientsAhead > 1 ? 's' : ''} Ahead 📢`}</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, ${patientsAhead === 0 ? 'please proceed to the counter now.' : `only ${patientsAhead} patient${patientsAhead > 1 ? 's are' : ' is'} ahead of you. Head to the center now!`}</p>

    <div class="queue-box">
      <div class="queue-number">#${appt.queue_number}</div>
      <div class="queue-label">Your Token · ${patientsAhead === 0 ? '🟢 Your Turn!' : `~${patientsAhead * 15} min remaining`}</div>
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn">View Live Queue →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: patientsAhead === 0 ? `🎉 You're Next! Token #${appt.queue_number}` : `📢 Queue Update: ${patientsAhead} ahead — Token #${appt.queue_number}`,
    html,
  });
};

exports.sendWelcome = async (user) => {
  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 8px;">Welcome to SmartHealth! 🎉</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your account has been created successfully.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">📧 Email</span><span class="info-value">${user.email}</span></div>
      <div class="info-row"><span class="info-label">👤 Role</span><span class="info-value"><span class="badge badge-blue">Patient</span></span></div>
    </div>

    <p style="color:#64748b;font-size:14px;line-height:1.6;">With SmartHealth you can:</p>
    <ul style="color:#64748b;font-size:14px;line-height:2;">
      <li>📍 Find healthcare centers near your location</li>
      <li>📅 Book appointments 24/7</li>
      <li>⏱️ Track live queue position in real-time</li>
      <li>🔔 Get alerts when it's your turn</li>
    </ul>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/centers" class="btn">Find a Center Near You →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `🎉 Welcome to SmartHealth, ${user.name}!`,
    html,
  });
};

exports.sendDelayAlert = async (user, appt, delayMins) => {
  const html = baseTemplate(`
    <h2 style="color:#f59e0b;margin:0 0 8px;">Your Appointment is Delayed ⚠️</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your appointment was scheduled ${delayMins} minutes ago but hasn't started yet.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name}</span></div>
      <div class="info-row"><span class="info-label">🕐 Scheduled</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">⏱️ Delayed By</span><span class="info-value" style="color:#f59e0b;">${delayMins} minutes</span></div>
      <div class="info-row"><span class="info-label">🎫 Token</span><span class="info-value">#${appt.queue_number}</span></div>
    </div>

    <div class="alert">
      💡 <strong>What to do:</strong> Please contact the center directly or check the live queue status in the app.
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn" style="background:#f59e0b;">Track Live Queue →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `⚠️ Appointment Delayed ${delayMins} min — Token #${appt.queue_number}`,
    html,
  });
};

exports.sendPriorityDelayAlert = async (user, appt, triggerAppt) => {
  const html = baseTemplate(`
    <h2 style="color:#f59e0b;margin:0 0 8px;">Queue Updated Due to Higher-Priority Case</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, a higher-priority patient needs to be seen before your appointment. Your updated queue details are below.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Center</span><span class="info-value">${triggerAppt.center_name || appt.center_name || 'Healthcare Center'}</span></div>
      <div class="info-row"><span class="info-label">Your Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">Priority Ahead</span><span class="info-value">${String(triggerAppt.priority || 'urgent').toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">New Token</span><span class="info-value">#${appt.queue_number}</span></div>
      <div class="info-row"><span class="info-label">Est. Wait</span><span class="info-value">~${appt.estimated_wait_minutes} minutes</span></div>
    </div>

    <div class="alert">
      Please keep checking the live queue. We will notify you again when your turn is close.
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn" style="background:#f59e0b;">View Updated Queue</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `Queue Updated — New Token #${appt.queue_number}`,
    html,
  });
};

exports.sendCompletedAlert = async (user, appt) => {
  const html = baseTemplate(`
    <h2 style="color:#16a34a;margin:0 0 8px;">Appointment Completed ✅</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your appointment has been successfully completed. We hope you received great care!</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">👨‍⚕️ Doctor</span><span class="info-value">${appt.doctor_name ? 'Dr. ' + appt.doctor_name : 'General'}</span></div>
    </div>

    <p style="color:#64748b;font-size:14px;">How was your experience? Your feedback helps others find the best care.</p>
    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/centers/${appt.center_id}" class="btn" style="background:#16a34a;">Leave a Review ⭐</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `✅ Appointment Completed — How was your visit?`,
    html,
  });
};

exports.sendNoShowAlert = async (user, appt) => {
  const html = baseTemplate(`
    <h2 style="color:#6b7280;margin:0 0 8px;">Appointment Missed 👻</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, it looks like you missed your appointment today.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
    </div>

    <div class="alert">
      📌 <strong>Note:</strong> Frequent no-shows may affect your booking priority. Please cancel in advance if you can't attend.
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/centers" class="btn" style="background:#6b7280;">Book a New Appointment →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `👻 Missed Appointment — ${String(appt.appointment_date).split('T')[0]}`,
    html,
  });
};

exports.sendInProgressAlert = async (user, appt) => {
  const html = baseTemplate(`
    <h2 style="color:#d97706;margin:0 0 8px;">Your Consultation Has Started ⏳</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, your appointment is now in progress.</p>

    <div class="queue-box">
      <div class="queue-number">#${appt.queue_number}</div>
      <div class="queue-label" style="color:#d97706;">🟡 In Progress</div>
    </div>

    <div class="info-card">
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name}</span></div>
      <div class="info-row"><span class="info-label">👨‍⚕️ Doctor</span><span class="info-value">${appt.doctor_name ? 'Dr. ' + appt.doctor_name : 'General'}</span></div>
    </div>

    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/appointments/${appt.id}" class="btn" style="background:#d97706;">View Status →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `⏳ Consultation Started — Token #${appt.queue_number}`,
    html,
  });
};

exports.sendOTP = async (user, otp) => {
  // Always log OTP to terminal for development
  console.log(`\n🔐 OTP for ${user.email}: ${otp} (valid 10 min)\n`);

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 8px;">Password Reset OTP 🔐</h2>
    <p style="color:#64748b;margin:0 0 20px;">Hi <strong>${user.name}</strong>, use the OTP below to reset your password.</p>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;font-size:40px;font-weight:800;letter-spacing:12px;padding:20px 32px;border-radius:16px;">
        ${otp}
      </div>
    </div>

    <div class="alert">
      ⏰ This OTP is valid for <strong>10 minutes only</strong>. Do not share it with anyone.
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">If you didn't request this, ignore this email. Your password won't change.</p>
  `);

  await transporter.sendMail({
    from: `"SmartHealth" <${process.env.EMAIL_FROM || 'noreply@smarthealth.com'}>`,
    to: user.email,
    subject: `🔐 Your OTP: ${otp} — SmartHealth Password Reset`,
    html,
  });
};

