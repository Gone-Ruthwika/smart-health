const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

function dedupeCenters(rows = []) {
  const seen = new Set();

  return rows.filter((center) => {
    const key = [
      String(center.name || '').trim().toLowerCase(),
      String(center.address || '').trim().toLowerCase(),
      String(center.city || '').trim().toLowerCase(),
      String(center.state || '').trim().toLowerCase(),
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

exports.getCenters = asyncHandler(async (req, res) => {
  const { sector, city, search } = req.query;
  let query = 'SELECT * FROM centers WHERE 1=1';
  const params = [];

  if (sector) { query += ' AND sector=?'; params.push(sector); }
  if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`); }
  if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY name';
  const result = await db.query(query, params);
  res.json({ success: true, centers: dedupeCenters(result.rows) });
});

exports.getCenterById = asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM centers WHERE id=?', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Center not found' });
  }
  res.json({ success: true, center: result.rows[0] });
});

exports.getNearbyCenters = asyncHandler(async (req, res) => {
  const { sector, city, search, lat, lng, radius } = req.query;
  const hasCoordinates = lat !== undefined && lng !== undefined && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const radiusKm = Number(radius) > 0 ? Number(radius) : 25;
  let query = hasCoordinates
    ? `SELECT *,
        (
          6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(latitude))
          )
        ) AS distance_km
       FROM centers
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
    : 'SELECT * FROM centers WHERE 1=1';
  const params = [];

  if (hasCoordinates) {
    params.push(Number(lat), Number(lng), Number(lat));
  }
  if (sector) { query += ' AND sector=?'; params.push(sector); }
  if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`); }
  if (search) { query += ' AND (name LIKE ? OR address LIKE ? OR city LIKE ? OR state LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }

  if (hasCoordinates) {
    query += ' HAVING distance_km <= ? ORDER BY distance_km ASC, name';
    params.push(radiusKm);
  } else {
    query += ' ORDER BY name';
  }

  const result = await db.query(query, params);
  res.json({ success: true, centers: dedupeCenters(result.rows) });
});
