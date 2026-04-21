USE smart_health;

-- Add a default doctor for every center that has no doctors
INSERT IGNORE INTO doctors (id, center_id, name, specialization, qualification, average_consultation_minutes)
SELECT UUID(), c.id,
  CONCAT('Dr. ', SUBSTRING_INDEX(c.name, ' ', 1), ' Specialist'),
  CASE c.sector
    WHEN 'hospital' THEN 'General Medicine'
    WHEN 'clinic' THEN 'Family Medicine'
    WHEN 'diagnostics' THEN 'Pathology'
    WHEN 'dental' THEN 'Dentistry'
    WHEN 'eye_care' THEN 'Ophthalmology'
    WHEN 'mental_health' THEN 'Psychiatry'
    WHEN 'ent' THEN 'ENT Specialist'
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
  CASE c.sector
    WHEN 'hospital' THEN 20
    WHEN 'mental_health' THEN 45
    WHEN 'diagnostics' THEN 10
    ELSE 15
  END
FROM centers c
WHERE NOT EXISTS (SELECT 1 FROM doctors d WHERE d.center_id = c.id);

-- Now add slots for those new doctors too
INSERT IGNORE INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT UUID(), d.id, g.day,
  CASE c.sector
    WHEN 'hospital' THEN '00:00:00'
    WHEN 'diagnostics' THEN '06:00:00'
    WHEN 'mental_health' THEN '10:00:00'
    ELSE '09:00:00'
  END,
  CASE c.sector
    WHEN 'hospital' THEN '23:45:00'
    WHEN 'diagnostics' THEN '22:00:00'
    WHEN 'mental_health' THEN '18:00:00'
    ELSE '18:00:00'
  END,
  CASE c.sector
    WHEN 'hospital' THEN 20
    WHEN 'mental_health' THEN 45
    WHEN 'diagnostics' THEN 10
    ELSE 15
  END
FROM doctors d
JOIN centers c ON c.id = d.center_id
CROSS JOIN (
  SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
  UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) g
WHERE NOT EXISTS (
  SELECT 1 FROM doctor_availability da
  WHERE da.doctor_id = d.id AND da.day_of_week = g.day
);
