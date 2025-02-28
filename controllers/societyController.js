// controllers/societyController.js
const Society = require('../models/Society');
const FireStation = require('../models/FireStation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmergencyEmail } = require('../utils/emailService');

const societyController = {
  register: async (req, res) => {
    try {
      const {
        name,
        address,
        area,
        city,
        secretaryName,
        secretaryEmail,
        secretaryPhone,
        password,
        coordinates
      } = req.body;

      // Check if society already exists
      const existingSociety = await Society.findOne({ secretaryEmail });
      if (existingSociety) {
        return res.status(400).json({ message: 'Society already registered with this email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new society
      const society = new Society({
        name,
        address,
        area,
        city,
        secretaryName,
        secretaryEmail,
        secretaryPhone,
        password: hashedPassword,
        coordinates
      });

      await society.save();

      // Send welcome email
      await sendEmergencyEmail(
        secretaryEmail,
        'Welcome to Fire Control System',
        `Your society ${name} has been successfully registered. You can now login and manage your society's fire safety.`
      );

      res.status(201).json({ message: 'Society registered successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find society
      const society = await Society.findOne({ secretaryEmail: email });
      if (!society) {
        return res.status(404).json({ message: 'Society not found' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, society.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { id: society._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getSocietyDetails: async (req, res) => {
    try {
      const society = await Society.findById(req.society.id)
        .select('-password')
        .populate('fireStatus.respondingStation', 'stationName phone');
      res.json(society);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addResident: async (req, res) => {
    try {
      const { name, email, phone, flatNumber } = req.body;
      const society = await Society.findById(req.society.id);

      // Validate email format
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Check for duplicate flat number
      const duplicateFlat = society.residents.find(r => r.flatNumber === flatNumber);
      if (duplicateFlat) {
        return res.status(400).json({ message: 'Flat number already registered' });
      }

      society.residents.push({ name, email, phone, flatNumber });
      await society.save();

      // Send welcome email to resident
      await sendEmergencyEmail(
        email,
        'Welcome to Fire Control System',
        `You have been added as a resident of ${society.name}. You will receive emergency notifications at this email address.`
      );

      res.status(201).json({ message: 'Resident added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeResident: async (req, res) => {
    try {
      const society = await Society.findById(req.society.id);
      society.residents = society.residents.filter(
        resident => resident._id.toString() !== req.params.id
      );
      await society.save();
      res.json({ message: 'Resident removed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateCoordinates: async (req, res) => {
    try {
      const { coordinates } = req.body;
      const society = await Society.findById(req.society.id);
      society.coordinates = coordinates;
      await society.save();
      res.json({ message: 'Coordinates updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  findNearestStation: async (coordinates) => {
    try {
      return await FireStation.findOne({
        'coordinates.type': 'Point',
        'coordinates.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: 50000000 // 50 km radius
          }
        }
      });
    } catch (error) {
      console.error('Error finding nearest station:', error);
      throw error;
    }
  },
  

  triggerFire: async (req, res) => {
    try {
      // Validate society ID from authentication middleware
      const societyId = req.society?.id;
      if (!societyId) {
        return res.status(401).json({ message: 'Unauthorized: Invalid society authentication' });
      }
  
      // Use findOneAndUpdate with atomic operations to prevent race conditions
      // This will only update if isActive is false, and will return the updated document
      const updatedSociety = await Society.findOneAndUpdate(
        { 
          _id: societyId, 
          'fireStatus.isActive': { $ne: true } // Only proceed if not already active
        },
        { 
          'fireStatus.isActive': true,
          'fireStatus.timestamp': new Date()
        },
        { 
          new: true, // Return the updated document
          runValidators: true // Run validators
        }
      );
  
      // If no document was updated, it means fire is already active
      if (!updatedSociety) {
        return res.status(400).json({ message: 'Fire alert is already active' });
      }
  
      // Fetch complete society details with populated coordinates
      const society = await Society.findById(societyId);
  
      // Validate coordinates
      if (!society.coordinates?.coordinates || society.coordinates.coordinates.length !== 2) {
        // Revert the fire status since we can't proceed
        await Society.findByIdAndUpdate(societyId, { 'fireStatus.isActive': false });
        return res.status(400).json({ message: 'Society location coordinates are not set' });
      }
  
      // Find nearest fire station
      const nearestStation = await FireStation.findOne({
        'coordinates.type': 'Point',
        'coordinates.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: society.coordinates.coordinates
            },
            $maxDistance: 50000 // 50 km radius
          }
        }
      });
  
      if (!nearestStation) {
        // Revert the fire status since we can't find a station
        await Society.findByIdAndUpdate(societyId, { 'fireStatus.isActive': false });
        return res.status(404).json({ message: 'No fire stations available nearby' });
      }
  
      // Update society with responding station
      society.fireStatus.respondingStation = nearestStation._id;
      await society.save();
  
      // Update fire station's active responses
      await FireStation.findByIdAndUpdate(
        nearestStation._id,
        { 
          $push: { 
            activeResponses: {
              societyId: society._id,
              status: 'responding'
            }
          }
        }
      );
  
      // Send emergency emails to residents
      const emailPromises = society.residents.map(resident => 
        sendEmergencyEmail(
          resident.email, 
          '🚨 FIRE EMERGENCY ALERT', 
          `EMERGENCY: Fire detected at ${society.name}, ${society.address}. 
           Please evacuate immediately. 
           Emergency services have been notified.`
        )
      );
  
      // Send emails in parallel
      await Promise.all(emailPromises);
  
      res.status(200).json({
        message: 'Fire alert triggered successfully',
        respondingStation: nearestStation.stationName
      });
  
    } catch (error) {
      console.error('Fire Trigger Error:', error);
      
      // Try to revert fire status in case of error
      try {
        if (req.society?.id) {
          await Society.findByIdAndUpdate(req.society.id, { 'fireStatus.isActive': false });
        }
      } catch (revertError) {
        console.error('Error reverting fire status:', revertError);
      }
      
      res.status(500).json({ 
        message: 'Internal server error while triggering fire alert',
        error: error.message 
      });
    }
  },
  getFireStatus: async (req, res) => {
    try {
      const society = await Society.findById(req.society.id)
        .select('fireStatus')
        .populate('fireStatus.respondingStation', 'stationName phone');
      res.json(society.fireStatus);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
module.exports =societyController