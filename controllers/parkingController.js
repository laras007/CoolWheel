const pool = require('../db');

exports.toggleParking = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "user_id diperlukan" });
  }

  try {
    // Cek apakah user sudah sedang parkir
    const existing = await pool.query(
      `SELECT * FROM bike_parking_positions WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [user_id]
    );

    if (existing.rows.length > 0) {
      // 🛑 Jika sudah parkir → hentikan parkir (End)
      await pool.query(
        `UPDATE bike_parking_positions SET is_active = false WHERE id = $1`,
        [existing.rows[0].id]
      );

      return res.status(200).json({ message: "Parkir telah diakhiri" });
    } else {
      // ✅ Jika belum parkir → mulai parkir
      // Ambil titik GPS terakhir dari tabel gps_points
      const gps = await pool.query(
        `SELECT latitude, longitude FROM gps_points 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [user_id]
      );

      if (gps.rows.length === 0) {
        return res.status(404).json({ message: "Titik GPS belum tersedia untuk user ini" });
      }

      const { latitude, longitude } = gps.rows[0];

      const result = await pool.query(
        `INSERT INTO bike_parking_positions (user_id, latitude, longitude, parked_at, is_active)
         VALUES ($1, $2, $3, NOW(), true) RETURNING *`,
        [user_id, latitude, longitude]
      );

      return res.status(201).json({ message: "Parkir dimulai", data: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal toggle status parkir", error: err.message });
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * (Math.PI / 180);
  const R = 6371000; // Radius bumi dalam meter
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

exports.trackLocation = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) return res.status(400).json({ message: "user_id diperlukan" });

  try {
    // 1. Ambil titik parkir aktif user
    const parkResult = await pool.query(
      `SELECT * FROM bike_parking_positions 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY parked_at DESC LIMIT 1`,
      [user_id]
    );

    if (parkResult.rows.length === 0) {
      return res.status(200).json({ message: "Tidak sedang parkir" });
    }

    const park = parkResult.rows[0];

    // 2. Ambil posisi GPS terkini dari tabel gps_points
    const gpsResult = await pool.query(
      `SELECT latitude, longitude FROM gps_points 
       WHERE user_id = $1 
       ORDER BY timestamp DESC LIMIT 1`,
      [user_id]
    );

    if (gpsResult.rows.length === 0) {
      return res.status(404).json({ message: "Lokasi GPS belum tersedia" });
    }

    const current = gpsResult.rows[0];

    // 3. Hitung jarak
    const distance = calculateDistance(
      park.latitude, park.longitude,
      current.latitude, current.longitude
    );

    // Hilangkan pengecekan distance di backend, biarkan client yang handle notifikasi
    res.status(200).json({ distance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengecek lokasi sepeda" });
  }
};

