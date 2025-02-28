// backend/routes/societyRoutes.js
const express = require('express');
const router = express.Router();
const societyController = require('../controllers/societyController');
const auth = require('../middleware/auth');
const Society = require('../models/Society');

router.post('/register', societyController.register);
router.post('/login', societyController.login);
router.get('/details', auth(Society), societyController.getSocietyDetails);
router.post('/residents', auth(Society), societyController.addResident);
router.delete('/residents/:id', auth(Society), societyController.removeResident);
router.post('/trigger-fire', auth(Society), societyController.triggerFire);
router.put('/update-coordinates', auth(Society), societyController.updateCoordinates);
router.get('/fire-status', auth(Society), societyController.getFireStatus);

module.exports = router;