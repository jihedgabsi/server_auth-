// location.routes.js

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/airportport');
const {verifyTokenAny} = require("../middleware/authAny");

// ... (vos définitions de routes comme router.get(...))
router.get('/locations',verifyTokenAny, locationController.getLocations);


// ✅ VÉRIFIEZ CETTE LIGNE
module.exports = router; // Vous devez exporter la variable 'router'
