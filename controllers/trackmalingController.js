const pool = require('../db');

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

    // 2. Ambil posisi GPS terkini dari tabel gps_point
    const gpsResult = await pool.query(
      `SELECT latitude, longitude FROM gps_point 
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

    if (distance > 100) {
      console.log(`🚨 Sepeda user ${user_id} berpindah ${distance.toFixed(2)} meter dari lokasi parkir`);

      // TODO: kirim notifikasi (email, WA, FCM, dsb.)

      return res.status(200).json({
        alert: true,
        distance,
        message: "🚨 Sepeda Anda berpindah dari lokasi parkir!"
      });
    }

    res.status(200).json({ alert: false, distance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengecek lokasi sepeda" });
  }
};
