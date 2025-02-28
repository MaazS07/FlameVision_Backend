const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true },
  secretaryName: { type: String, required: true },
  secretaryEmail: { type: String, required: true, unique: true },
  secretaryPhone: { type: String, required: true },
  password: { type: String, required: true },
  fireStatus: {
    isActive: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    respondingStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FireStation'
    }
  },
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
  residents: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    flatNumber: { type: String, required: true }
  }],
  emergencyContacts: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Society', societySchema);