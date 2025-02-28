const mongoose = require('mongoose');

const fireStationSchema = new mongoose.Schema({
  stationName: { type: String, required: true },
  address: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  activeResponses: [{
    societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society' },
    status: { type: String, enum: ['responding', 'completed'], default: 'responding' },
    timestamp: { type: Date, default: Date.now }
  }],
  personnel: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, required: true }
  }]
}, { timestamps: true });

// Create a geospatial index for location
fireStationSchema.index({ 'coordinates': '2dsphere' });


module.exports = mongoose.model('FireStation', fireStationSchema);