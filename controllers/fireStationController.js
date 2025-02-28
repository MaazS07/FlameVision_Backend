const FireStation = require('../models/FireStation');
const Society = require('../models/Society');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmergencyEmail } = require('../utils/emailService');

const fireStationController = {
  register: async (req, res) => {
    try {
      const {
        stationName,
        address,
        area,
        city,
        email,
        password,
        phone,
        coordinates
      } = req.body;

      // Validate required fields
      if (!stationName || !email || !password || !phone) {
        return res.status(400).json({
          message: 'Please provide all required fields'
        });
      }

      // Check if station already exists
      const existingStation = await FireStation.findOne({ email });
      if (existingStation) {
        return res.status(400).json({
          message: 'Fire station already registered with this email'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new fire station
      const fireStation = new FireStation({
        stationName,
        address,
        area,
        city,
        email,
        password: hashedPassword,
        phone,
        coordinates: coordinates || { lat: 0, lng: 0 }
      });

      await fireStation.save();
      res.status(201).json({
        message: 'Fire station registered successfully',
        stationId: fireStation._id
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Error registering fire station',
        error: error.message
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: 'Please provide email and password'
        });
      }
      
      // Find fire station
      const fireStation = await FireStation.findOne({ email });
      if (!fireStation) {
        return res.status(404).json({
          message: 'Fire station not found'
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, fireStation.password);
      if (!isMatch) {
        return res.status(400).json({
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: fireStation._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        station: {
          id: fireStation._id,
          stationName: fireStation.stationName,
          email: fireStation.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Error during login',
        error: error.message
      });
    }
  },

  getStationDetails: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const fireStation = await FireStation.findById(req.user._id)
        .select('-password')
        .populate('activeResponses.societyId', 'name address coordinates');

      if (!fireStation) {
        return res.status(404).json({ message: 'Fire station not found' });
      }

      res.json(fireStation);
    } catch (error) {
      console.error('Get station details error:', error);
      res.status(500).json({
        message: 'Error fetching station details',
        error: error.message
      });
    }
  },

  addPersonnel: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { name, email, phone, role } = req.body;
      
      if (!name || !email || !phone || !role) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const fireStation = await FireStation.findById(req.user._id);
      if (!fireStation) {
        return res.status(404).json({ message: 'Fire station not found' });
      }

      fireStation.personnel.push({ name, email, phone, role });
      await fireStation.save();

      // Send welcome email
      try {
        await sendEmergencyEmail(
          email,
          'Welcome to Fire Control System',
          `You have been added as ${role} at ${fireStation.stationName}.`
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      res.status(201).json({
        message: 'Personnel added successfully',
        personnel: fireStation.personnel[fireStation.personnel.length - 1]
      });
    } catch (error) {
      console.error('Add personnel error:', error);
      res.status(500).json({
        message: 'Error adding personnel',
        error: error.message
      });
    }
  },

  updateResponse: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
  
      const { status } = req.body;
      const { responseId } = req.params;
  
      const fireStation = await FireStation.findById(req.user._id);
      if (!fireStation) {
        return res.status(404).json({ message: 'Fire station not found' });
      }
  
      const response = fireStation.activeResponses.id(responseId);
      if (!response) {
        return res.status(404).json({ message: 'Response not found' });
      }
  
      response.status = status;
      await fireStation.save();
  
      const society = await Society.findById(response.societyId);
      if (society) {
        if (status === 'responding') {
          // When fire station starts responding
          society.fireStatus.respondingStation = fireStation._id;
        } else if (status === 'completed') {
          // When fire is under control
          society.fireStatus.isActive = false;
        }
        await society.save();
  
        // Send notification emails
        const emailType = {
          'responding': 'Fire services are on their way',
          'completed': 'Fire emergency has been resolved'
        };
  
        try {
          await sendEmergencyEmail(
            society.secretaryEmail,
            `🚒 Fire Emergency Update: ${emailType[status]}`,
            `Status update for the fire emergency at ${society.name}. 
             Current status: ${status}.`
          );
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
        }
      }
  
      res.json({ message: 'Response updated successfully', response });
    } catch (error) {
      console.error('Update response error:', error);
      res.status(500).json({
        message: 'Error updating response',
        error: error.message
      });
    }
  },

  // In your existing fireStationController

getStationStats: async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const fireStation = await FireStation.findById(req.user._id);
    if (!fireStation) {
      return res.status(404).json({ message: 'Fire station not found' });
    }

    // Calculate total emergencies
    const totalEmergencies = fireStation.activeResponses.length;

    // Calculate resolved emergencies
    const resolvedEmergencies = fireStation.activeResponses.filter(
      response => response.status === 'completed'
    ).length;

    // Calculate average response time (mock calculation for now)
    // In a real scenario, you'd calculate this based on actual timestamps
    const averageResponseTime = totalEmergencies > 0 
      ? Math.floor(Math.random() * 15) + 5  // Random time between 5-20 minutes
      : 0;

    res.json({
      totalEmergencies,
      resolvedEmergencies,
      averageResponseTime,
      personnelCount: fireStation.personnel.length
    });
  } catch (error) {
    console.error('Get station stats error:', error);
    res.status(500).json({
      message: 'Error fetching station stats',
      error: error.message
    });
  }
},
  getActiveEmergencies: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const fireStation = await FireStation.findById(req.user._id)
        .populate({
          path: 'activeResponses.societyId',
          select: 'name address coordinates residents'
        });

      if (!fireStation) {
        return res.status(404).json({ message: 'Fire station not found' });
      }

      const activeEmergencies = fireStation.activeResponses
        .filter(response => response.status === 'responding')
        .map(response => ({
          id: response._id,
          society: response.societyId,
          timestamp: response.timestamp
        }));

      res.json(activeEmergencies);
    } catch (error) {
      console.error('Get active emergencies error:', error);
      res.status(500).json({
        message: 'Error fetching active emergencies',
        error: error.message
      });
    }
  }
};

module.exports = fireStationController;