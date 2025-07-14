// ===== routes/Driver.js =====
const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authDriver");
const Driver = require("../models/Driver");
const router = express.Router();

// Get current Driver's profile
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json(req.driver);
});

// Update Driver profile
router.put("/profile", verifyToken, async (req, res) => {
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
router.get("/:id", async (req, res) => {
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
router.put("/:id/solde",  async (req, res) => {
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
router.get("/all", [verifyToken, isAdmin], async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password");
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.patch('/:id/fcm-token', async (req, res) => {
  // 1. Récupérer les données de la requête
  const { id } = req.params; // L'ID du chauffeur depuis l'URL
  const { fcmToken } = req.body; // Le nouveau jeton depuis le corps de la requête

  // 2. Valider que le fcmToken est bien présent
  if (!fcmToken) {
    return res.status(400).json({ message: 'Le champ fcmToken est requis.' });
  }

  try {
    // 3. Trouver le chauffeur par son ID et mettre à jour son fcmToken
    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { fcmToken: fcmToken },
      { 
        new: true, // Pour que la méthode retourne le document mis à jour
        runValidators: true // Pour s'assurer que les nouvelles données respectent le schéma
      }
    );

    // 4. Si aucun chauffeur n'est trouvé, renvoyer une erreur 404
    if (!updatedDriver) {
      return res.status(404).json({ message: 'Chauffeur non trouvé.' });
    }

    // 5. Renvoyer une réponse de succès avec les données mises à jour
    res.status(200).json({
      message: 'Token FCM mis à jour avec succès.',
      driver: updatedDriver
    });

  } catch (error) {
    // 6. Gérer les erreurs potentielles (ex: ID invalide, erreur de base de données)
    console.error("Erreur lors de la mise à jour du token FCM :", error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

module.exports = router;
