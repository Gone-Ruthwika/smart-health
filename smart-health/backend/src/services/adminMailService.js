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
      console.log(`\n[MOCK ADMIN EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
    },
  };
};

const transporter = createTransporter();

const baseTemplate = (content) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:-apple-system,sans-serif;background:#f3f4f6;margin:0;padding:20px;}
  .container{max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 36px;text-align:center;}
  .header h1{color:white;margin:0;font-size:22px;font-weight:700;}
  .header p{color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;}
  .body{padding:28px 36px;}
  .info-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0;}
  .info-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;}
  .info-row:last-child{border-bottom:none;}
  .info-label{color:#64748b;}
  .info-value{color:#1e293b;font-weight:600;}
  .btn{display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;}
  .badge-red{background:#fee2e2;color:#dc2626;}
  .badge-orange{background:#ffedd5;color:#c2410c;}
  .badge-green{background:#dcfce7;color:#15803d;}
  .footer{background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;}
  .footer p{color:#94a3b8;font-size:12px;margin:3px 0;}
</style></head><body>
<div class="container">
  <div class="header"><h1>👑 SmartHealth Admin</h1><p>Admin Notification System</p></div>
  <div class="body">${content}</div>
  <div class="footer"><p>© ${new Date().getFullYear()} SmartHealth Admin Portal</p><p>Login at <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/login">Admin Portal</a></p></div>
</div></body></html>`;

// Notify admin when new appointment is booked
exports.notifyNewAppointment = async (adminEmail, appt, user) => {
  const priorityBadge = appt.priority === 'emergency'
    ? '<span class="badge badge-red">🔴 EMERGENCY</span>'
    : appt.priority === 'urgent'
    ? '<span class="badge badge-orange">🟡 Urgent</span>'
    : '<span class="badge badge-green">🟢 Normal</span>';

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 6px;">New Appointment Booked 📅</h2>
    <p style="color:#64748b;margin:0 0 16px;">A new appointment has been booked at your center.</p>
    <div class="info-card">
      <div class="info-row"><span class="info-label">👤 Patient</span><span class="info-value">${user.name}</span></div>
      <div class="info-row"><span class="info-label">📧 Email</span><span class="info-value">${user.email}</span></div>
      <div class="info-row"><span class="info-label">🏥 Center</span><span class="info-value">${appt.center_name || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">🎫 Token</span><span class="info-value">#${appt.queue_number}</span></div>
      <div class="info-row"><span class="info-label">📋 Reason</span><span class="info-value">${appt.issue}</span></div>
      <div class="info-row"><span class="info-label">🚨 Priority</span><span class="info-value">${priorityBadge}</span></div>
    </div>
    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/appointments" class="btn">View in Admin Panel →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth Admin" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `${appt.priority === 'emergency' ? '🚨 EMERGENCY' : '📅 New'} Appointment — ${user.name} · Token #${appt.queue_number}`,
    html,
  });
};

// Notify admin when appointment is cancelled
exports.notifyCancellation = async (adminEmail, appt, user) => {
  const html = baseTemplate(`
    <h2 style="color:#dc2626;margin:0 0 6px;">Appointment Cancelled ❌</h2>
    <p style="color:#64748b;margin:0 0 16px;">A patient has cancelled their appointment.</p>
    <div class="info-card">
      <div class="info-row"><span class="info-label">👤 Patient</span><span class="info-value">${user.name}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${String(appt.appointment_date).split('T')[0]}</span></div>
      <div class="info-row"><span class="info-label">🕐 Time</span><span class="info-value">${String(appt.appointment_time).slice(0,5)}</span></div>
      <div class="info-row"><span class="info-label">🎫 Token</span><span class="info-value">#${appt.queue_number}</span></div>
    </div>
    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/queue" class="btn">View Queue →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth Admin" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `❌ Cancellation — ${user.name} · Token #${appt.queue_number}`,
    html,
  });
};

// Daily summary email to admin
exports.sendDailySummary = async (adminEmail, stats) => {
  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 6px;">📊 Daily Summary — ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</h2>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📅 Total Appointments</span><span class="info-value">${stats.total}</span></div>
      <div class="info-row"><span class="info-label">✅ Completed</span><span class="info-value">${stats.completed}</span></div>
      <div class="info-row"><span class="info-label">❌ Cancelled</span><span class="info-value">${stats.cancelled}</span></div>
      <div class="info-row"><span class="info-label">👻 No Show</span><span class="info-value">${stats.noShow}</span></div>
      <div class="info-row"><span class="info-label">📈 Completion Rate</span><span class="info-value">${stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0}%</span></div>
    </div>
    <center><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin" class="btn">View Dashboard →</a></center>
  `);

  await transporter.sendMail({
    from: `"SmartHealth Admin" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `📊 Daily Summary — ${stats.total} appointments today`,
    html,
  });
};

