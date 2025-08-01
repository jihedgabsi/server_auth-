// ===== routes/Driver.js =====
const express = require("express");
const Driver = require("../models/Driver");
const {verifyTokenAny} = require("../middleware/authAny");

const router = express.Router();

// Get current Driver's profile
router.get("/profile", verifyTokenAny, (req, res) => {
  res.status(200).json(req.driver);
});

// Update Driver profile
router.put("/profile", verifyTokenAny, async (req, res) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.driverId,
      { $set: req.body },
      { new: true, select: "-password" }
    );

    res.status(200).json(updatedDriver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get Driver by ID
router.get("/:id",verifyTokenAny, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if ID is provided
    if (!id) {
      return res.status(400).json({ 
        message: "Driver ID is required" 
      });
    }

    // Find driver by ID and exclude password
    const driver = await Driver.findById(id);
    
    if (!driver) {
      return res.status(404).json({ 
        message: "Driver not found" 
      });
    }

    res.status(200).json(driver);
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid driver ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Update Driver solde
router.put("/:id/solde",  verifyTokenAny,async (req, res) => {
  try {
    const { id } = req.params;
    const { solde } = req.body;

    if (typeof solde !== "number") {
      return res.status(400).json({
        message: "Le solde doit être un nombre."
      });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { $set: { solde } },
      { new: true, select: "-password" }
    );

    if (!updatedDriver) {
      return res.status(404).json({
        message: "Chauffeur non trouvé."
      });
    }

    res.status(200).json(updatedDriver);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du solde.",
      error: error.message
    });
  }
});


// Get all Drivers (admin only)
router.get("/all", verifyTokenAny, async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password");
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Update Driver solde
router.put("/:id/fcm-token", verifyTokenAny, async (req, res) => {
 try {
    const { id } = req.params;
    const { fcmToken } = req.body || {};

    if (!fcmToken) {
      return res.status(400).json({ message: "Le champ fcmToken est requis." });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { $set: { fcmToken } },
      { new: true }                    // renvoie le driver mis à jour
    );

    if (!updatedDriver) {
      return res.status(404).json({ message: "Chauffeur non trouvé." });
    }

    res.status(200).json(updatedDriver);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du FCM token.",
      error: error.message,
    });
  }
});


module.exports = router;
