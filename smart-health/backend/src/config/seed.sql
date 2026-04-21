-- Seed Data for Smart Health (MySQL) - Realistic Data

USE smart_health;

-- Admin user (password: admin123)
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone) VALUES
(UUID(), 'Admin User', 'admin@smarthealth.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'admin', '9000000000');

-- Regular user (password: user1234)
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone) VALUES
(UUID(), 'John Doe', 'john@example.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9876543210');

-- Centers (realistic Indian cities with real coordinates)
INSERT IGNORE INTO centers (id, name, sector, address, city, state, contact_details, average_consultation_minutes) VALUES
(UUID(), 'Apollo Hospitals', 'hospital', '21 Greams Lane, Off Greams Road', 'Chennai', 'Tamil Nadu', 13.0569, 80.2425, '+91-44-28290200', 20),
(UUID(), 'Fortis Hospital', 'hospital', 'Mulund Goregaon Link Road', 'Mumbai', 'Maharashtra', 19.1724, 72.9560, '+91-22-67971000', 20),
(UUID(), 'AIIMS Delhi', 'hospital', 'Sri Aurobindo Marg, Ansari Nagar', 'New Delhi', 'Delhi', 28.5672, 77.2100, '+91-11-26588500', 25),
(UUID(), 'Narayana Health City', 'hospital', '258/A Bommasandra Industrial Area', 'Bangalore', 'Karnataka', 12.8399, 77.6770, '+91-80-71222222', 20),
(UUID(), 'Medanta The Medicity', 'hospital', 'CH Baktawar Singh Road, Sector 38', 'Gurugram', 'Haryana', 28.4595, 77.0266, '+91-124-4141414', 25),
(UUID(), 'Smile Zone Dental', 'dental', '14 MG Road, Opposite Metro Station', 'Bangalore', 'Karnataka', 12.9752, 77.6069, '+91-80-41234567', 15),
(UUID(), 'Dental Care Plus', 'dental', '7 Linking Road, Bandra West', 'Mumbai', 'Maharashtra', 19.0596, 72.8295, '+91-22-26400100', 15),
(UUID(), 'Sharp Vision Eye Clinic', 'eye_care', '45 Connaught Place', 'New Delhi', 'Delhi', 28.6315, 77.2167, '+91-11-23412345', 15),
(UUID(), 'LV Prasad Eye Institute', 'eye_care', 'L V Prasad Marg, Banjara Hills', 'Hyderabad', 'Telangana', 17.4156, 78.4347, '+91-40-30612626', 20),
(UUID(), 'Nimhans Mental Health', 'mental_health', 'Hosur Road, Lakkasandra', 'Bangalore', 'Karnataka', 12.9402, 77.5957, '+91-80-46110007', 45),
(UUID(), 'Vandrevala Foundation', 'mental_health', '5 Pedder Road', 'Mumbai', 'Maharashtra', 18.9712, 72.8090, '+91-1860-2662345', 45),
(UUID(), 'SRL Diagnostics', 'diagnostics', '12 Nehru Place', 'New Delhi', 'Delhi', 28.5491, 77.2519, '+91-11-39885050', 10),
(UUID(), 'Thyrocare Lab', 'diagnostics', '36 Turbhe MIDC', 'Mumbai', 'Maharashtra', 19.0748, 73.0110, '+91-22-27782020', 10),
(UUID(), 'Practo Health Clinic', 'clinic', '80 Feet Road, Indiranagar', 'Bangalore', 'Karnataka', 12.9784, 77.6408, '+91-80-67650000', 15),
(UUID(), 'Max Healthcare Clinic', 'clinic', 'W-3 Rajouri Garden', 'New Delhi', 'Delhi', 28.6467, 77.1205, '+91-11-26140000', 15);

-- Doctors for Apollo Chennai
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Priya Sharma', 'General Medicine', 'MBBS, MD (Internal Medicine)', 20 FROM centers WHERE name='Apollo Hospitals';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Karthik Rajan', 'Cardiology', 'MBBS, DM (Cardiology), FACC', 25 FROM centers WHERE name='Apollo Hospitals';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Meena Iyer', 'Neurology', 'MBBS, MD, DM (Neurology)', 30 FROM centers WHERE name='Apollo Hospitals';

-- Doctors for Fortis Mumbai
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Rahul Mehta', 'Orthopedics', 'MBBS, MS (Ortho), DNB', 20 FROM centers WHERE name='Fortis Hospital';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Sunita Patel', 'Gynecology', 'MBBS, MD (OBG), FRCOG', 20 FROM centers WHERE name='Fortis Hospital';

-- Doctors for AIIMS Delhi
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Arvind Kumar', 'General Surgery', 'MBBS, MS (Surgery), MCh', 25 FROM centers WHERE name='AIIMS Delhi';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Deepa Nair', 'Pediatrics', 'MBBS, MD (Pediatrics), DCH', 20 FROM centers WHERE name='AIIMS Delhi';

-- Doctors for Dental
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Anita Rao', 'Orthodontics', 'BDS, MDS (Orthodontics)', 15 FROM centers WHERE name='Smile Zone Dental';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Vikram Shah', 'Oral Surgery', 'BDS, MDS (Oral Surgery)', 20 FROM centers WHERE name='Dental Care Plus';

-- Doctors for Eye Care
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Suresh Nair', 'Ophthalmology', 'MBBS, MS (Ophthalmology)', 15 FROM centers WHERE name='Sharp Vision Eye Clinic';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Lakshmi Prasad', 'Retina Specialist', 'MBBS, MS, FRCS (Ophth)', 20 FROM centers WHERE name='LV Prasad Eye Institute';

-- Doctors for Mental Health
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Kavya Iyer', 'Psychiatry', 'MBBS, MD (Psychiatry)', 45 FROM centers WHERE name='Nimhans Mental Health';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Rohan Desai', 'Clinical Psychology', 'PhD (Psychology), MPhil', 45 FROM centers WHERE name='Vandrevala Foundation';

-- Doctors for Diagnostics
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Neha Gupta', 'Pathology', 'MBBS, MD (Pathology)', 10 FROM centers WHERE name='SRL Diagnostics';

-- Doctors for Clinics
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Arun Verma', 'Family Medicine', 'MBBS, MRCGP', 15 FROM centers WHERE name='Practo Health Clinic';
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Pooja Singh', 'Internal Medicine', 'MBBS, MD', 15 FROM centers WHERE name='Max Healthcare Clinic';

-- Doctor Availability: Hospitals 24/7 (00:00 - 24:00), all 7 days
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '00:00:00', '23:45:00', 20
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'hospital';

-- Clinics: Mon-Sat 08:00-20:00
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '08:00:00', '20:00:00', 15
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'clinic';

-- Dental: Mon-Sat 09:00-18:00
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '09:00:00', '18:00:00', 15
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'dental';

-- Eye Care: Mon-Sat 09:00-17:00
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '09:00:00', '17:00:00', 15
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'eye_care';

-- Mental Health: Mon-Fri 10:00-18:00
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '10:00:00', '18:00:00', 45
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) g
WHERE c.sector = 'mental_health';

-- Diagnostics: Mon-Sun 06:00-22:00
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '06:00:00', '22:00:00', 10
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'diagnostics';
