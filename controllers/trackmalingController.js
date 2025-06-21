// controllers/trackingController.js
const pool = require('../db');

// Fungsi hitung jarak (Haversine Formula)
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
  const { user_id, latitude, longitude } = req.body;

  try {
    // Cek titik parkir aktif
    const result = await pool.query(
      `SELECT * FROM bike_parking_positions WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: "Tidak sedang parkir" });
    }

    const park = result.rows[0];
    const distance = calculateDistance(
      park.latitude, park.longitude, latitude, longitude
    );

    if (distance > 100) {
      // ⚠️ Kirim notifikasi ke user
      console.log(`🚨 Sepeda user ${user_id} berpindah ${distance.toFixed(2)} meter dari titik parkir`);

      // TODO: ganti dengan Twilio / Firebase / Email
      // kirimNotifikasi(user_id, "🚨 Sepeda Anda berpindah dari lokasi parkir!");

      return res.status(200).json({
        alert: true,
        distance,
        message: "Sepeda telah berpindah dari lokasi parkir!"
      });
    }

    res.status(200).json({ alert: false, distance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal tracking posisi" });
  }
};
