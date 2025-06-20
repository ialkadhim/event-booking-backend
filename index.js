// index.js — Express Backend Server for Event Booking System
require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

app.use(cors({ origin: 'https://racquetek.com' }));
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
  const admin = result.rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Admin authenticated' });
});

// User login
app.post('/api/login', async (req, res) => {
  const { lastName, membershipNumber } = req.body;
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(last_name) = LOWER($1) AND membership_number = $2',
    [lastName, membershipNumber]
  );
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(result.rows[0]);
});

// Get events for user based on competency
app.get('/api/events/:userId', async (req, res) => {
  const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.userId]);
  const user = userRes.rows[0];
  const result = await pool.query(
    `SELECT * FROM events WHERE level_required = 'All Levels' OR level_required = $1`,
    [user.tennis_competency_level]
  );
  res.json(result.rows);
});

// Register or update registration status
app.post('/api/register', async (req, res) => {
  const { userId, eventId, status } = req.body;
  await pool.query(
    `INSERT INTO registrations (user_id, event_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, event_id)
     DO UPDATE SET status = EXCLUDED.status`,
    [userId, eventId, status]
  );
  res.json({ success: true });
});

// Seed test user (dev only)
app.post('/api/seed', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO users (last_name, membership_number, full_name, gender, tennis_competency_level, status, email, phone, membership_type, join_date, expiry_date)
      VALUES ('Park', '12345', 'Subin Park', 'Male', 'Intermediate', 'Active', 'subin@example.com', '+1 (555) 123-4567', 'Premium', '2022-01-15', '2024-01-15')
      ON CONFLICT (membership_number) DO NOTHING;
    `);
    res.json({ message: 'Seeded user' });
  } catch (err) {
    res.status(500).json({ error: 'Seed failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
