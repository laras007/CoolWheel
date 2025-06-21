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
      // Ambil titik GPS terakhir dari tabel gps_point
      const gps = await pool.query(
        `SELECT latitude, longitude FROM gps_point 
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
        `INSERT INTO bike_parking_positions (user_id, latitude, longitude)
         VALUES ($1, $2, $3) RETURNING *`,
        [user_id, latitude, longitude]
      );

      return res.status(201).json({ message: "Parkir dimulai", data: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal toggle status parkir" });
  }
};
