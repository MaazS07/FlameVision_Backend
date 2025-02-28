// backend/routes/fireStationRoutes.js
const express = require('express');
const router = express.Router();
const fireStationController = require('../controllers/fireStationController');
const auth = require('../middleware/auth');
const FireStation = require('../models/FireStation');

router.post('/register', fireStationController.register);
router.post('/login', fireStationController.login);
router.get('/details', auth(FireStation), fireStationController.getStationDetails);
router.post('/personnel', auth(FireStation), fireStationController.addPersonnel);
router.put('/response/:responseId', auth(FireStation), fireStationController.updateResponse);
router.get('/active-emergencies', auth(FireStation), fireStationController.getActiveEmergencies);
router.get('/stats', auth(FireStation), fireStationController.getStationStats);


module.exports = router;