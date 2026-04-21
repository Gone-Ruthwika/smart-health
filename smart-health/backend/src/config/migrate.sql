USE smart_health;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('appointment','queue','reminder','system','cancellation') DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  appointment_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN avatar_color VARCHAR(20) DEFAULT '#2563eb';
ALTER TABLE users ADD COLUMN date_of_birth DATE;
ALTER TABLE users ADD COLUMN blood_group VARCHAR(5);
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(100);
