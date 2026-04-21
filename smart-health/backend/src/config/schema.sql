-- Smart Health Appointment System - MySQL Schema

CREATE DATABASE IF NOT EXISTS smart_health;
USE smart_health;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  admin_scope ENUM('main','hospital') DEFAULT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS centers (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  sector ENUM('hospital','clinic','diagnostics','dental','eye_care','mental_health') NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  contact_details TEXT,
  average_consultation_minutes INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  center_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100),
  qualification VARCHAR(150),
  average_consultation_minutes INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_center_access (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  center_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_admin_center_access (user_id, center_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_availability (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT DEFAULT 15,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ambulance_services (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  center_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  driver_name VARCHAR(100),
  vehicle_number VARCHAR(50),
  base_latitude DECIMAL(10,7),
  base_longitude DECIMAL(10,7),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  center_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36),
  issue TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  queue_number INT,
  patients_before INT DEFAULT 0,
  estimated_wait_minutes INT DEFAULT 0,
  status ENUM('confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'confirmed',
  priority ENUM('normal','urgent','emergency') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  center_id VARCHAR(36) NOT NULL,
  rating TINYINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_center_date ON appointments(center_id, appointment_date);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_doctors_center ON doctors(center_id);
