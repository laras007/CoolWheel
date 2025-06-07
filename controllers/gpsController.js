const pool = require('../db');

exports.saveGpsData = async (req, res) => {
  const user_id = req.user.user_id;
  const { latitude, longitude } = req.body;

  try {
    // Ambil ride_id yang aktif
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Belum mulai ride' });
    }

    const ride_id = rideResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO gps_points (ride_id, latitude, longitude, recorded_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [ride_id, latitude, longitude]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};exports.saveGpsData = async (req, res) => {
  const user_id = req.user.user_id;
  const { latitude, longitude } = req.body;

  try {
    // Cek apakah ada ride yang aktif
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    let ride_id = null;
    if (rideResult.rows.length > 0) {
      ride_id = rideResult.rows[0].id;
    }

    // Simpan titik GPS, meskipun ride_id null
    const result = await pool.query(
      `INSERT INTO gps_points (user_id, ride_id, latitude, longitude, recorded_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [user_id, ride_id, latitude, longitude]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getGpsDataByRideId = async (req, res) => {
  const ride_id = req.query.ride_id;

  try {
    const result = await pool.query(
      'SELECT latitude, longitude FROM gps_points WHERE ride_id = $1 ORDER BY recorded_at ASC',
      [ride_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



