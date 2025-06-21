const pool = require('../db'); // asumsi pakai pg dan pool export di db.js

// Simpan lokasi parkir
exports.toggleParking = async (req, res) => {
  const { user_id, latitude, longitude } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "user_id diperlukan" });
  }

  try {
    // Cek apakah ada parkiran aktif
    const existing = await pool.query(
      `SELECT * FROM bike_parking_positions WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [user_id]
    );

    if (existing.rows.length > 0) {
      // 🚫 Sudah parkir → ubah jadi tidak aktif (End)
      await pool.query(
        `UPDATE bike_parking_positions SET is_active = false WHERE id = $1`,
        [existing.rows[0].id]
      );

      return res.status(200).json({ message: "Parkir telah diakhiri" });
    } else {
      // ✅ Belum parkir → simpan lokasi baru (Start)
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Lokasi GPS diperlukan untuk mulai parkir" });
      }

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
