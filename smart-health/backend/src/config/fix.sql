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

CREATE TABLE IF NOT EXISTS password_resets (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(150) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  center_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36),
  appointment_id VARCHAR(36),
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);
