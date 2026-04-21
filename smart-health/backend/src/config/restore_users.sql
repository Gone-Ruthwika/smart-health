USE smart_health;

-- Test users (password: user1234)
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone) VALUES
(UUID(), 'Bharath', 'bharath@gmail.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9876543210'),
(UUID(), 'Bhavani', 'bhavani@gmail.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9876543211'),
(UUID(), 'Test Patient', 'test@smarthealth.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9000000001');
