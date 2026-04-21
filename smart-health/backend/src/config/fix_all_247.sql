USE smart_health;

-- Step 1: Add a doctor for every center that has none
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), c.id,
  CASE c.sector
    WHEN 'hospital' THEN 'Dr. On-Call Physician'
    WHEN 'clinic' THEN 'Dr. General Practitioner'
    WHEN 'diagnostics' THEN 'Dr. Lab Specialist'
    WHEN 'dental' THEN 'Dr. Dental Surgeon'
    WHEN 'eye_care' THEN 'Dr. Eye Specialist'
    WHEN 'mental_health' THEN 'Dr. Counsellor'
    WHEN 'ent' THEN 'Dr. ENT Specialist'
    ELSE 'Dr. General Physician'
  END,
  CASE c.sector
    WHEN 'hospital' THEN 'General Medicine'
    WHEN 'clinic' THEN 'Family Medicine'
    WHEN 'diagnostics' THEN 'Pathology'
    WHEN 'dental' THEN 'Dentistry'
    WHEN 'eye_care' THEN 'Ophthalmology'
    WHEN 'mental_health' THEN 'Psychiatry'
    WHEN 'ent' THEN 'ENT'
    ELSE 'General Medicine'
  END,
  CASE c.sector
    WHEN 'hospital' THEN 'MBBS, MD'
    WHEN 'clinic' THEN 'MBBS, MRCGP'
    WHEN 'diagnostics' THEN 'MBBS, MD Pathology'
    WHEN 'dental' THEN 'BDS, MDS'
    WHEN 'eye_care' THEN 'MBBS, MS Ophthalmology'
    WHEN 'mental_health' THEN 'MBBS, MD Psychiatry'
    WHEN 'ent' THEN 'MBBS, MS ENT'
    ELSE 'MBBS'
  END,
  15
FROM centers c
WHERE NOT EXISTS (SELECT 1 FROM doctors d WHERE d.center_id = c.id);

-- Step 2: Delete all existing availability and replace with 24/7 for ALL doctors
DELETE FROM doctor_availability;

-- Step 3: Add 24/7 slots (00:00 to 23:45, 15 min) for ALL doctors, ALL 7 days
INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
SELECT UUID(), d.id, g.day, '00:00:00', '23:45:00', 15, 1
FROM doctors d
CROSS JOIN (
  SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
  UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) g;
