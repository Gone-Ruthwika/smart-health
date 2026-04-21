USE smart_health;

ALTER TABLE centers MODIFY COLUMN sector ENUM('hospital','clinic','diagnostics','dental','eye_care','mental_health','ent') NOT NULL;

INSERT IGNORE INTO centers (id, name, sector, address, city, state, latitude, longitude, contact_details, average_consultation_minutes) VALUES
(UUID(), 'Apollo ENT & Hearing Clinic', 'ent', '14 Residency Road', 'Bangalore', 'Karnataka', 12.9719, 77.5937, '+91-80-41234999', 15),
(UUID(), 'Hear Well ENT Center', 'ent', '22 Anna Salai', 'Chennai', 'Tamil Nadu', 13.0604, 80.2496, '+91-44-28551234', 15),
(UUID(), 'ENT Care Mumbai', 'ent', '5 Linking Road, Bandra', 'Mumbai', 'Maharashtra', 19.0544, 72.8322, '+91-22-26401234', 15),
(UUID(), 'Delhi ENT Hospital', 'ent', '8 Pusa Road, Karol Bagh', 'New Delhi', 'Delhi', 28.6448, 77.1734, '+91-11-25781234', 20);

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Sunil Kapoor', 'ENT Specialist', 'MBBS, MS (ENT), DORL', 15 FROM centers WHERE name='Apollo ENT & Hearing Clinic';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Preethi Nair', 'Audiologist & ENT', 'MBBS, DLO, MS (ENT)', 15 FROM centers WHERE name='Hear Well ENT Center';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Ramesh Iyer', 'ENT & Head-Neck Surgery', 'MBBS, MS, MCh (Head-Neck)', 20 FROM centers WHERE name='ENT Care Mumbai';

INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), id, 'Dr. Anjali Sharma', 'ENT Specialist', 'MBBS, MS (ENT)', 15 FROM centers WHERE name='Delhi ENT Hospital';

INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day, '09:00:00', '18:00:00', 15
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) g
WHERE c.sector = 'ent';
