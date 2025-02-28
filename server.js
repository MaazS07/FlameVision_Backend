require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const societyRoutes = require('./routes/societyRoutes');
const fireStationRoutes = require('./routes/fireStationRoutes');
const FireStation =require("./models/FireStation")

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
  // In your database connection file or startup script
  mongoose.connection.once('open', async () => {
    try {
      await mongoose.connection.db.collection('firestations').createIndex({ 
        'coordinates.coordinates': '2dsphere' 
      });
      console.log('Geospatial indexes created successfully');
    } catch (error) {
      console.error('Error creating geospatial indexes:', error);
    }
  });

app.use('/api/society', societyRoutes);
app.use('/api/fire-station', fireStationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));