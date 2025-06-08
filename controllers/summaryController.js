const pool = require("../db");

exports.getRideSummary = async (req, res) => {
  const user_id = req.user.user_id;
  const { ride_id } = req.params;

  try {
    // 1. Validasi ride_id dan pastikan milik user yang benar
    const rideCheck = await pool.query(
      `SELECT id, user_id, started_at, ended_at FROM rides WHERE id = $1 AND user_id = $2`,
      [ride_id, user_id]
    );

    if (rideCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Ride tidak ditemukan atau bukan milik Anda" });
    }

    const ride = rideCheck.rows[0];

    // Pastikan ride sudah selesai
    if (!ride.ended_at) {
      return res
        .status(400)
        .json({
          error: "Ride masih berlangsung, belum bisa menampilkan summary",
        });
    }

    // 2. Ambil data summary dari ride_history
    const historyResult = await pool.query(
      `SELECT 
        duration, distance, pace, calories, max_heartrate,
        started_at, ended_at
      FROM ride_history 
      WHERE ride_id = $1 AND user_id = $2`,
      [ride_id, user_id]
    );

    if (historyResult.rows.length === 0) {
      return res.status(404).json({ error: "Data summary tidak ditemukan" });
    }

    const history = historyResult.rows[0];

    // 3. Ambil statistik GPS (total titik, rute)
    const gpsStats = await pool.query(
      `SELECT 
        COUNT(*) as total_gps_points,
        MIN(recorded_at) as first_gps_time,
        MAX(recorded_at) as last_gps_time
      FROM gps_points 
      WHERE ride_id = $1`,
      [ride_id]
    );

    // 4. Ambil statistik heart rate
    const hrStats = await pool.query(
      `SELECT 
        COUNT(*) as total_hr_readings,
        AVG(bpm) as avg_heartrate,
        MIN(bpm) as min_heartrate,
        MAX(bpm) as max_heartrate
      FROM heartrates 
      WHERE ride_id = $1`,
      [ride_id]
    );

    // 5. Ambil data user untuk informasi tambahan
    const userResult = await pool.query(
      `SELECT username, weight, age FROM users WHERE id = $1`,
      [user_id]
    );
    const user = userResult.rows[0];

    // 6. Format durasi jadi HH:MM:SS
    const formatDuration = (seconds) => {
      const h = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      return `${h}:${m}:${s}`;
    };

    // 7. Hitung beberapa statistik tambahan
    const durationHours = history.duration / 3600;
    const avgSpeed =
      history.distance > 0 ? history.distance / durationHours : 0;

    // Estimasi kalori yang terbakar per km
    const caloriesPerKm =
      history.distance > 0 ? history.calories / history.distance : 0;

    // 8. Tentukan level intensitas berdasarkan heart rate
    let intensityLevel = "Rendah";
    const maxHR = history.max_heartrate;
    const estimatedMaxHR = 220 - (user.age || 25);

    if (maxHR > estimatedMaxHR * 0.85) {
      intensityLevel = "Sangat Tinggi";
    } else if (maxHR > estimatedMaxHR * 0.7) {
      intensityLevel = "Tinggi";
    } else if (maxHR > estimatedMaxHR * 0.5) {
      intensityLevel = "Sedang";
    }

    // 9. Buat summary response
    const summary = {
      ride_info: {
        ride_id: parseInt(ride_id),
        rider_name: user.username || "Unknown",
        started_at: history.started_at,
        ended_at: history.ended_at,
        date: new Date(history.started_at).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
      performance: {
        total_distance: parseFloat(history.distance).toFixed(2),
        total_duration: history.duration,
        duration_formatted: formatDuration(history.duration),
        average_speed: parseFloat(avgSpeed.toFixed(2)),
        pace: parseFloat(history.pace).toFixed(2),
        total_calories: parseFloat(history.calories).toFixed(2),
        calories_per_km: parseFloat(caloriesPerKm.toFixed(2)),
      },
      heartrate_stats: {
        max_heartrate: parseInt(history.max_heartrate || 0),
        avg_heartrate: hrStats.rows[0]
          ? parseInt(hrStats.rows[0].avg_heartrate || 0)
          : 0,
        min_heartrate: hrStats.rows[0]
          ? parseInt(hrStats.rows[0].min_heartrate || 0)
          : 0,
        total_readings: parseInt(gpsStats.rows[0]?.total_hr_readings || 0),
        intensity_level: intensityLevel,
        max_hr_percentage:
          maxHR > 0
            ? parseFloat(((maxHR / estimatedMaxHR) * 100).toFixed(1))
            : 0,
      },
      tracking_stats: {
        total_gps_points: parseInt(gpsStats.rows[0]?.total_gps_points || 0),
        tracking_quality:
          gpsStats.rows[0]?.total_gps_points > 50 ? "Baik" : "Sedang",
      },
      achievements: [],
    };

    // 10. Tambahkan achievements berdasarkan performa
    if (history.distance >= 10) {
      summary.achievements.push({
        title: "🏆 Long Distance Rider",
        description: "Menyelesaikan perjalanan lebih dari 10km",
      });
    }

    if (history.duration >= 3600) {
      // 1 jam
      summary.achievements.push({
        title: "⏰ Endurance Champion",
        description: "Bersepeda selama lebih dari 1 jam",
      });
    }

    if (history.calories >= 500) {
      summary.achievements.push({
        title: "🔥 Calorie Burner",
        description: "Membakar lebih dari 500 kalori",
      });
    }

    if (avgSpeed >= 20) {
      summary.achievements.push({
        title: "⚡ Speed Demon",
        description: "Kecepatan rata-rata di atas 20 km/jam",
      });
    }

    res.status(200).json({
      message: "Summary ride berhasil diambil",
      summary,
    });
  } catch (err) {
    console.error("Error getting ride summary:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getLastRideSummary = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // Ambil ride terakhir yang sudah selesai
    const lastRideResult = await pool.query(
      `SELECT id FROM rides 
       WHERE user_id = $1 AND ended_at IS NOT NULL 
       ORDER BY ended_at DESC LIMIT 1`,
      [user_id]
    );

    if (lastRideResult.rows.length === 0) {
      return res.status(404).json({ error: "Belum ada ride yang selesai" });
    }

    const ride_id = lastRideResult.rows[0].id;

    // Set params untuk menggunakan function getRideSummary yang sudah ada
    req.params.ride_id = ride_id;

    // Panggil function getRideSummary
    return this.getRideSummary(req, res);
  } catch (err) {
    console.error("Error getting last ride summary:", err);
    res.status(500).json({ error: err.message });
  }
};
