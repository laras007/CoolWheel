const pool = require('../db');

exports.saveGpsData = async (req, res) => {
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

exports.getlastGpsData = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT latitude, longitude FROM gps_points 
       WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No GPS data found' });
    }

    res.json(result.rows[0]);
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

exports.getLiveGpsTracking = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // Cek apakah ada ride yang aktif
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({ error: "No active ride found" });
    }

    const ride_id = rideResult.rows[0].id;

    // Ambil semua GPS points dari ride yang aktif, diurutkan dari terbaru ke lama
    const result = await pool.query(
      `SELECT latitude, longitude, recorded_at 
       FROM gps_points 
       WHERE ride_id = $1 
       ORDER BY recorded_at DESC`,
      [ride_id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No GPS tracking data found for active ride" });
    }

    res.json({
      ride_id: ride_id,
      total_points: result.rows.length,
      gps_points: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGpsHistoryByRideId = async (req, res) => {
  const { ride_id } = req.params;

  if (!ride_id) {
    return res.status(400).json({ error: "ride_id parameter is required" });
  }

  try {
    // Verifikasi bahwa ride ada
    const rideCheck = await pool.query(
      "SELECT id, user_id, started_at, ended_at FROM rides WHERE id = $1",
      [ride_id]
    );

    if (rideCheck.rows.length === 0) {
      return res.status(404).json({ error: "Ride not found" });
    }

    // Ambil semua GPS points untuk ride tersebut, diurutkan dari awal ke akhir
    const result = await pool.query(
      `SELECT latitude, longitude, recorded_at 
       FROM gps_points 
       WHERE ride_id = $1 
       ORDER BY recorded_at ASC`,
      [ride_id]
    );

    res.json({
      ride_info: rideCheck.rows[0],
      total_points: result.rows.length,
      gps_points: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



