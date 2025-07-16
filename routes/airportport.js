// location.routes.js

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/airportport');

// ... (vos définitions de routes comme router.get(...))
router.get('/locations', locationController.getLocations);


// ✅ VÉRIFIEZ CETTE LIGNE
module.exports = router; // Vous devez exporter la variable 'router'
