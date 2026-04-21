USE smart_health;

-- Hyderabad, Secunderabad & Medchal area centers

INSERT IGNORE INTO centers (id, name, sector, address, city, state, latitude, longitude, contact_details, average_consultation_minutes) VALUES

-- Hospitals
(UUID(), 'Yashoda Hospital Secunderabad', 'hospital', 'Raj Bhavan Road, Somajiguda', 'Secunderabad', 'Telangana', 17.4399, 78.4983, '+91-40-45674567', 20),
(UUID(), 'KIMS Hospital Secunderabad', 'hospital', 'Minister Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4418, 78.5011, '+91-40-44885000', 20),
(UUID(), 'Medchal Government Hospital', 'hospital', 'NH 44, Medchal', 'Medchal', 'Telangana', 17.6290, 78.4800, '+91-40-27261234', 25),
(UUID(), 'Apollo Hospital Jubilee Hills', 'hospital', 'Film Nagar, Jubilee Hills', 'Hyderabad', 'Telangana', 17.4156, 78.4347, '+91-40-23607777', 20),
(UUID(), 'Care Hospital Banjara Hills', 'hospital', 'Road No 1, Banjara Hills', 'Hyderabad', 'Telangana', 17.4126, 78.4480, '+91-40-30418000', 20),
(UUID(), 'Sunshine Hospital Secunderabad', 'hospital', 'PG Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4350, 78.5000, '+91-40-44555000', 20),
(UUID(), 'Kompally Emergency Hospital', 'hospital', 'Kompally Main Road, Near Cine Planet', 'Hyderabad', 'Telangana', 17.5458, 78.4872, '+91-40-41001001', 20),
(UUID(), 'North Hyderabad Multi Speciality Hospital', 'hospital', 'Suchitra X Roads, Kompally', 'Hyderabad', 'Telangana', 17.5188, 78.4859, '+91-40-41001002', 20),
(UUID(), 'Secunderabad Trauma & Emergency Centre', 'hospital', 'Paradise Circle, Secunderabad', 'Secunderabad', 'Telangana', 17.4412, 78.4968, '+91-40-41001003', 20),
(UUID(), 'Hyderabad Emergency Care Institute', 'hospital', 'Kukatpally Housing Board Road', 'Hyderabad', 'Telangana', 17.4948, 78.3996, '+91-40-41001004', 20),
(UUID(), 'Medchal Primary Health Centre', 'hospital', 'Medchal Main Road', 'Medchal', 'Telangana', 17.6310, 78.4820, '+91-40-27261111', 15),

-- Clinics
(UUID(), 'Medchal Family Clinic', 'clinic', 'Medchal Cross Roads', 'Medchal', 'Telangana', 17.6285, 78.4795, '+91-98765-43210', 15),
(UUID(), 'Secunderabad Health Clinic', 'clinic', 'MG Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4380, 78.4990, '+91-40-27891234', 15),
(UUID(), 'Kompally Community Clinic', 'clinic', 'Kompally Main Road', 'Hyderabad', 'Telangana', 17.5620, 78.4860, '+91-98765-11111', 15),
(UUID(), 'Alwal Health Centre', 'clinic', 'Alwal Main Road, Near Bus Stand', 'Secunderabad', 'Telangana', 17.4900, 78.5100, '+91-40-27451234', 15),

-- Diagnostics
(UUID(), 'Vijaya Diagnostics Secunderabad', 'diagnostics', 'SD Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4420, 78.5020, '+91-40-27803333', 10),
(UUID(), 'Medchal Diagnostic Centre', 'diagnostics', 'NH 44, Near Toll Plaza, Medchal', 'Medchal', 'Telangana', 17.6300, 78.4810, '+91-98765-22222', 10),
(UUID(), 'Thyrocare Kompally', 'diagnostics', 'Kompally X Roads', 'Hyderabad', 'Telangana', 17.5630, 78.4870, '+91-40-44556677', 10),

-- Dental
(UUID(), 'Smile Dental Secunderabad', 'dental', 'Paradise Circle, Secunderabad', 'Secunderabad', 'Telangana', 17.4410, 78.4970, '+91-40-27654321', 15),
(UUID(), 'Medchal Dental Care', 'dental', 'Medchal Town, Main Road', 'Medchal', 'Telangana', 17.6275, 78.4790, '+91-98765-33333', 15),
(UUID(), 'Tooth Fairy Dental Clinic', 'dental', 'Alwal, Near Railway Station', 'Secunderabad', 'Telangana', 17.4880, 78.5090, '+91-40-27891111', 15),

-- Eye Care
(UUID(), 'LV Prasad Eye Medchal', 'eye_care', 'Medchal Road, Quthbullapur', 'Hyderabad', 'Telangana', 17.5200, 78.4750, '+91-40-30612626', 15),
(UUID(), 'Vasan Eye Care Secunderabad', 'eye_care', 'MG Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4395, 78.4985, '+91-40-44334433', 15),
(UUID(), 'Medchal Eye Hospital', 'eye_care', 'NH 44, Medchal', 'Medchal', 'Telangana', 17.6295, 78.4805, '+91-98765-44444', 15),

-- Mental Health
(UUID(), 'Hyderabad Mind Care Centre', 'mental_health', 'Trimulgherry, Secunderabad', 'Secunderabad', 'Telangana', 17.4600, 78.5200, '+91-40-27123456', 45),
(UUID(), 'Medchal Wellness Clinic', 'mental_health', 'Medchal Town', 'Medchal', 'Telangana', 17.6280, 78.4800, '+91-98765-55555', 45),

-- ENT
(UUID(), 'Secunderabad ENT Centre', 'ent', 'SD Road, Secunderabad', 'Secunderabad', 'Telangana', 17.4415, 78.5015, '+91-40-27334455', 15),
(UUID(), 'Medchal ENT Clinic', 'ent', 'Medchal Main Road', 'Medchal', 'Telangana', 17.6288, 78.4798, '+91-98765-66666', 15);

-- Add doctors for new centers
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Ravi Kumar', 'General Medicine', 'MBBS, MD', 20 FROM centers WHERE name='Yashoda Hospital Secunderabad';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Sridevi Reddy', 'Cardiology', 'MBBS, DM Cardiology', 25 FROM centers WHERE name='KIMS Hospital Secunderabad';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Naresh Babu', 'General Medicine', 'MBBS, MD', 20 FROM centers WHERE name='Medchal Government Hospital';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Harish Reddy', 'Emergency Medicine', 'MBBS, MD Emergency Medicine', 20 FROM centers WHERE name='Kompally Emergency Hospital';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Swathi Rao', 'Critical Care', 'MBBS, MD Anaesthesia, IDCCM', 20 FROM centers WHERE name='North Hyderabad Multi Speciality Hospital';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Manoj Varma', 'Trauma Care', 'MBBS, MS General Surgery', 20 FROM centers WHERE name='Secunderabad Trauma & Emergency Centre';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Reshma Kulkarni', 'Emergency Medicine', 'MBBS, MEM', 20 FROM centers WHERE name='Hyderabad Emergency Care Institute';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Padma Rao', 'Family Medicine', 'MBBS, MRCGP', 15 FROM centers WHERE name='Medchal Family Clinic';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Venkat Rao', 'Internal Medicine', 'MBBS, MD', 15 FROM centers WHERE name='Secunderabad Health Clinic';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Lakshmi Devi', 'Pathology', 'MBBS, MD Pathology', 10 FROM centers WHERE name='Vijaya Diagnostics Secunderabad';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Suresh Goud', 'Dentistry', 'BDS, MDS', 15 FROM centers WHERE name='Smile Dental Secunderabad';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Anand Sharma', 'Ophthalmology', 'MBBS, MS Ophthalmology', 15 FROM centers WHERE name='Vasan Eye Care Secunderabad';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Priya Menon', 'Psychiatry', 'MBBS, MD Psychiatry', 45 FROM centers WHERE name='Hyderabad Mind Care Centre';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Kiran Kumar', 'ENT Specialist', 'MBBS, MS ENT', 15 FROM centers WHERE name='Secunderabad ENT Centre';

-- Availability for all new doctors (Mon-Sat 09:00-18:00, 15 min slots)
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '09:00:00', '18:00:00', 15
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.city IN ('Medchal', 'Secunderabad') AND c.sector != 'hospital';

-- Hospitals 24/7
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '00:00:00', '23:45:00', 20
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.city IN ('Medchal', 'Secunderabad') AND c.sector = 'hospital';

-- Additional 24/7 hospital availability for Hyderabad emergency hospitals
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '00:00:00', '23:45:00', 20
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.city = 'Hyderabad' AND c.sector = 'hospital';
