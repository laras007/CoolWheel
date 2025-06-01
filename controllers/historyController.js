const pool = require('../db');

// Fungsi bantu durasi
function calculateDuration(startedAt, endedAt) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return Math.round((end - start) / 60000); // dalam menit
}

// Ambil semua history ride
exports.getAllHistory = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT 
        r.id AS ride_id,
        r.started_at,
        r.ended_at,
        rs.heartrate AS highest_heartrate,
        rs.calories AS total_calories,
        rs.distance AS total_distance
      FROM rides r
      LEFT JOIN LATERAL (
        SELECT 
          MAX(last_heartrate) AS heartrate, 
          SUM(calories) AS calories, 
          SUM(distance) AS distance
        FROM realtime_stats
        WHERE ride_id = r.id
      ) rs ON true
      WHERE r.user_id = $1 AND r.ended_at IS NOT NULL
      ORDER BY r.started_at DESC
    `,
      [user_id]
    );

    const rides = result.rows.map((ride) => ({
      ride_id: ride.ride_id,
      started_at: ride.started_at,
      ended_at: ride.ended_at,
      highest_heartrate: parseInt(ride.highest_heartrate || 0),
      total_calories: parseFloat(ride.total_calories || 0).toFixed(2),
      total_distance: parseFloat(ride.total_distance || 0).toFixed(2),
      duration_minutes: calculateDuration(ride.started_at, ride.ended_at),
    }));

    res.json({ history: rides });
  } catch (err) {
    console.error("Gagal ambil history:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Ambil history berdasarkan tanggal
exports.getHistoryByDate = async (req, res) => {
  const user_id = req.user.user_id;
  const { date } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        r.id AS ride_id,
        r.started_at,
        r.ended_at,
        rs.heartrate AS highest_heartrate,
        rs.calories AS total_calories,
        rs.distance AS total_distance
      FROM rides r
      LEFT JOIN LATERAL (
        SELECT 
          MAX(last_heartrate) AS heartrate, 
          SUM(calories) AS calories, 
          SUM(distance) AS distance
        FROM realtime_stats
        WHERE ride_id = r.id
      ) rs ON true
      WHERE r.user_id = $1 
        AND r.ended_at IS NOT NULL
        AND TO_CHAR((r.started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') = $2
      ORDER BY r.started_at DESC
    `,
      [user_id, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tidak ada data pada tanggal ini" });
    }

    const rides = result.rows.map((ride) => ({
      ride_id: ride.ride_id,
      started_at: ride.started_at,
      ended_at: ride.ended_at,
      highest_heartrate: parseInt(ride.highest_heartrate || 0),
      total_calories: parseFloat(ride.total_calories || 0).toFixed(2),
      total_distance: parseFloat(ride.total_distance || 0).toFixed(2),
      duration_minutes: calculateDuration(ride.started_at, ride.ended_at),
    }));

    res.json({ history_by_date: rides });
  } catch (err) {
    console.error("Gagal ambil history by date:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Ambil semua tanggal unik history ride
exports.getAvailableDateHistory = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT DISTINCT TO_CHAR((started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS ride_date
      FROM rides
      WHERE user_id = $1 AND ended_at IS NOT NULL
      ORDER BY ride_date DESC
    `,
      [user_id]
    );

    const available_dates = [
      ...new Set(result.rows.map((row) => row.ride_date)),
    ];
    res.json({ available_dates });
  } catch (err) {
    console.error("Gagal ambil available dates:", err.message);
    res.status(500).json({ error: err.message });
  }
};
