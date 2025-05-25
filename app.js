const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
const usersRoutes = require('./routes/users');
const gpsRoutes = require('./routes/gps');
const ridesRoutes = require('./routes/rides');
const heartrateRoutes = require ('./routes/heartrate');
const caloriesRoutes = require('./routes/calories');
const coolerRoutes = require('./routes/coolertemp');
const realtimeRoutes = require('./routes/realtime');

app.use('/api/realtime', realtimeRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/rides', ridesRoutes);
app.use ('/api/heartrate', heartrateRoutes);
app.use('/api/calories', caloriesRoutes);
app.use ('/api/cooler', coolerRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
