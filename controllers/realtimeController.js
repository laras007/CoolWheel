const pool = require('../db');

exports.getRealtimeStats = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // Cari ride aktif user
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada ride yang aktif' });
    }

    const ride_id = rideResult.rows[0].id;

    // Ambil realtime_stats berdasarkan ride_id
    const statsResult = await pool.query(
      `SELECT distance, pace, calories, last_heartrate FROM realtime_stats WHERE ride_id = $1`,
      [ride_id]
    );

    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Data realtime stats tidak ditemukan' });
    }

    res.status(200).json(statsResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
