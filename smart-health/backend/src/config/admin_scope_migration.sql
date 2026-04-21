SET @add_admin_scope = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'admin_scope'
    ),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN admin_scope ENUM('main','hospital') DEFAULT NULL AFTER role"
  )
);

PREPARE stmt FROM @add_admin_scope;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
SET admin_scope = 'main'
WHERE role = 'admin' AND admin_scope IS NULL;

CREATE TABLE IF NOT EXISTS admin_center_access (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  center_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_admin_center_access (user_id, center_id),
  CONSTRAINT fk_admin_center_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_center_access_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
);
