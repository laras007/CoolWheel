const pool = require('../db');
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.saveHeartrate = async (req, res) => {
  const user_id = req.user.user_id;
  const { bpm } = req.body;

  if (!bpm) {
    return res.status(400).json({ error: 'BPM tidak boleh kosong' });
  }

  try {
    // Ambil ride aktif
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );
    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Belum mulai ride' });
    }
    const ride_id = rideResult.rows[0].id;

    // Simpan ke heartrates
    const result = await pool.query(
      `INSERT INTO heartrates (ride_id, bpm, recorded_at)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [ride_id, bpm]
    );

    // Ambil data user: username, sos_number, dan age
    const userResult = await pool.query(
      `SELECT username, sos_number, age FROM users WHERE id = $1`,
      [user_id]
    );
    console.log('userResult.rows:', userResult.rows); // debug log
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    const {username, sos_number, age } = userResult.rows[0];
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const maxBPM = 220 - age;

    // Kirim WA jika bpm melebihi batas maksimal berdasarkan usia
    if (bpm > maxBPM ) {
      const message = `⚠️ Detak jantung pada ${username} tinggi (${bpm} bpm).;`;
      try {
        await client.messages.create({
          from: 'whatsapp:+14155238886', // dari Twilio Sandbox
          to: `whatsapp:+6285716463408`,
          body: message,
        });
      } catch (waErr) {
        console.error('Twilio error:', waErr);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLastHeartrate = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    // Cari ride yang sedang aktif
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada ride yang aktif' });
    }

    const ride_id = rideResult.rows[0].id;

    // Ambil detak jantung terakhir dari realtime_stats
    const result = await pool.query(
      `SELECT last_heartrate, updated_at FROM realtime_stats WHERE ride_id = $1`,
      [ride_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data heartrate belum tersedia' });
    }

    res.status(200).json({
      bpm: result.rows[0].last_heartrate,
      updated_at: result.rows[0].updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHeartrateByRideId = async (req, res) => {
  const ride_id = req.query.ride_id;

  try {
    const result = await pool.query(
      `SELECT bpm, recorded_at FROM heartrates WHERE ride_id = $1 ORDER BY recorded_at ASC`,
      [ride_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data heartrate untuk ride ini' });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

