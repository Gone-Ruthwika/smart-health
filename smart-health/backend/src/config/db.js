const mysql = require('mysql2/promise');

const parseDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) {
    return {};
  }

  try {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      database: parsed.pathname.replace(/^\//, ''),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL. ${error.message}`);
  }
};

const buildConnectionConfig = () => {
  const { DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  const parsedUrlConfig = parseDatabaseUrl(DATABASE_URL);

  const config = {
    host: DB_HOST || parsedUrlConfig.host || 'localhost',
    port: Number(DB_PORT || parsedUrlConfig.port || 3306),
    database: DB_NAME || parsedUrlConfig.database,
    user: DB_USER || parsedUrlConfig.user,
    password: DB_PASSWORD || parsedUrlConfig.password,
  };

  if (!config.database || !config.user) {
    throw new Error('Database configuration missing. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
  }

  return config;
};

const pool = mysql.createPool({
  ...buildConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // Return DATE/DATETIME as strings, not JS Date objects
});

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    if (process.env.NODE_ENV !== 'test') console.log('MySQL connected');
    conn.release();
  })
  .catch((err) => console.error('MySQL connection error:', err.message));

// Wrap pool.query to match pg-style { rows } response
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return { rows: Array.isArray(rows) ? rows : [rows] };
};

module.exports = { query, pool };
