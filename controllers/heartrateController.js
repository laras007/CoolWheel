const axios = require('axios'); // pastikan axios sudah diinstall
require('dotenv').config();
const pool = require('../db'); // atau sesuaikan path ke file konfigurasi db kamu

const VONAGE_API_KEY = process.env.VONAGE_API_KEY;
const VONAGE_API_SECRET = process.env.VONAGE_API_SECRET;
const VONAGE_FROM = process.env.VONAGE_FROM || 'VonageApp';

exports.saveHeartrate = async (req, res) => {
  const user_id = req.user.user_id;
  const { bpm } = req.body;

  if (!bpm) {
    return res.status(400).json({ error: 'BPM tidak boleh kosong' });
  }

  try {
    const rideResult = await pool.query(
      `SELECT id FROM rides WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [user_id]
    );
    if (rideResult.rows.length === 0) {
      return res.status(400).json({ error: 'Belum mulai ride' });
    }
    const ride_id = rideResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO heartrates (ride_id, bpm, recorded_at)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [ride_id, bpm]
    );

    await pool.query(
      `UPDATE realtime_stats
       SET last_heartrate = $1, updated_at = NOW()
       WHERE ride_id = $2`,
      [bpm, ride_id]
    );

    const userResult = await pool.query(
      `SELECT username, sos_number, age FROM users WHERE id = $1`,
      [user_id]
    );
    const { username, sos_number, age } = userResult.rows[0];

    const maxBPM = 220 - age;

    // Kirim SMS jika bpm melebihi batas maksimal
    if (bpm > maxBPM && sos_number) {
      const message = `⚠️ Detak jantung ${username} tinggi (${bpm} bpm)!`;

      await axios.post('https://rest.nexmo.com/sms/json', null, {
        params: {
          api_key: VONAGE_API_KEY,
          api_secret: VONAGE_API_SECRET,
          to: sos_number, // pastikan formatnya 628xxx
          from: VONAGE_FROM,
          text: message,
        },
      });
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

