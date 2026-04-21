const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPassword(email, newPassword) {
  const hash = await bcrypt.hash(newPassword, 12);
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
  await pool.execute('UPDATE users SET password_hash=? WHERE email=?', [hash, email]);
  console.log(`✅ Password reset for ${email} → ${newPassword}`);
  await pool.end();
}

resetPassword('bharath@gmail.com', 'user1234');
resetPassword('bhavani@gmail.com', 'user1234');
resetPassword('test@smarthealth.com', 'user1234');
