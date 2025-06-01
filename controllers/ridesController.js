const pool = require('../db');

exports.startRide = async (req, res) => {
  const user_id = req.user.user_id;

  if (!user_id) {
    return res.status(401).json({ error: 'Unauthorized, user_id not found' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO rides (user_id, started_at, is_active) VALUES ($1, CURRENT_TIMESTAMP, true) RETURNING *',
      [user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.endRide = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // 1. Ambil ride aktif
    const rideResult = await pool.query(
      `SELECT id, started_at FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada ride yang aktif' });
    }

    const ride = rideResult.rows[0];
    const ride_id = ride.id;
    const startTime = new Date(ride.started_at);

    // 2. Ambil data GPS
    const gpsResult = await pool.query(
      `SELECT latitude, longitude, recorded_at FROM gps_points WHERE ride_id = $1 ORDER BY recorded_at ASC`,
      [ride_id]
    );
    const gpsPoints = gpsResult.rows;

    // 3. Hitung jarak & waktu
    const haversine = (a, b) => {
      const toRad = deg => deg * Math.PI / 180;
      const R = 6371e3;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const φ1 = toRad(a.lat);
      const φ2 = toRad(b.lat);
      const a_ = Math.sin(dLat / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a_), Math.sqrt(1 - a_));
      return R * c;
    };

    let totalDistance = 0;
    let endTime = null;
    if (gpsPoints.length >= 2) {
      endTime = new Date(gpsPoints[gpsPoints.length - 1].recorded_at);
      for (let i = 1; i < gpsPoints.length; i++) {
        const prev = {
          lat: parseFloat(gpsPoints[i - 1].latitude),
          lng: parseFloat(gpsPoints[i - 1].longitude)
        };
        const curr = {
          lat: parseFloat(gpsPoints[i].latitude),
          lng: parseFloat(gpsPoints[i].longitude)
        };
        const d = haversine(prev, curr);
        if (d > 1) totalDistance += d;
      }
    }

    const durationHr = (endTime - startTime) / (1000 * 60 * 60);
    const distanceKm = totalDistance / 1000;
    const pace = durationHr > 0 ? distanceKm / durationHr : 0;

    // 4. Ambil berat user
    const userResult = await pool.query(`SELECT weight FROM users WHERE id = $1`, [user_id]);
    const weight = userResult.rows[0]?.weight || 60;

    // 5. Ambil heart rate tertinggi
    const hrResult = await pool.query(
    `SELECT MAX(bpm) AS max_bpm FROM heartrates WHERE ride_id = $1`,
    [ride_id] 
    );
    const maxHR = Math.round(hrResult.rows[0]?.max_bpm || 0);


    // 6. Hitung kalori
    let MET = 4.0;
    if (pace >= 20) MET = 8.0;
    else if (pace >= 16) MET = 6.8;
    if (maxHR >= 160) MET += 0.5;

    const calories = MET * weight * durationHr;

    // 7. Simpan ke history_rides
    await pool.query(
      `INSERT INTO ride_history (user_id, ride_id, duration, distance, pace, calories, max_heartrate, started_at, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [user_id, ride_id, distanceKm, durationHr, pace, calories, maxHR, startTime, endTime]
    );

    // 8. Update ride jadi selesai
    await pool.query(`UPDATE rides SET ended_at = $1 WHERE id = $2`, [endTime, ride_id]);


    res.status(200).json({ message: 'Ride berhasil diakhiri dan disimpan ke history.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getLiveDuration = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT id, EXTRACT(EPOCH FROM (NOW() - started_at)) AS duration_seconds
       FROM rides
       WHERE user_id = $1 AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada ride aktif' });
    }

    const ride_id = result.rows[0].id;
    const durationSeconds = Math.floor(result.rows[0].duration_seconds);
    const durationMinutes = Math.floor(durationSeconds / 60); // ubah ke menit

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    // Update kolom duration dalam MENIT
    await pool.query(
      `UPDATE rides SET duration = $1 WHERE id = $2`,
      [durationMinutes, ride_id]
    );

    res.json({
      ride_id,
      duration_minutes: durationMinutes,
      formatted: `${hours}h ${minutes}m ${seconds}s`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
