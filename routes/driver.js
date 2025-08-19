// ===== routes/Driver.js =====
const express = require("express");
const Driver = require("../models/Driver");
const {verifyTokenAny} = require("../middleware/authAny");
const HistoriquePaiement = require('../models/HistoriquePaiement');
const Commission = require('../models/Commission');
const DemandeTransport = require("../models/DemandeTransport");
const mongoose = require("mongoose"); // 🔹 Manquait
const router = express.Router();


router.get("/:id/rating", verifyTokenAny, async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Vérifier si le chauffeur existe
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Chauffeur introuvable",
      });
    }

    // 2️⃣ Pipeline d'agrégation sur DemandeTransport
    const pipeline = [
      {
        $match: {
          id_driver: new mongoose.Types.ObjectId(id),
          nbstars: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$id_driver",
          averageRating: { $avg: "$nbstars" },
          totalRatings: { $sum: 1 },
        },
      },
    ];

    const result = await DemandeTransport.aggregate(pipeline);

    // 3️⃣ Renvoyer la réponse
    if (result.length > 0) {
      res.status(200).json({
        success: true,
        driverId: result[0]._id,
        averageRating: parseFloat(result[0].averageRating.toFixed(1)),
        totalRatings: result[0].totalRatings,
      });
    } else {
      res.status(200).json({
        success: true,
        driverId: id,
        averageRating: 0,
        totalRatings: 0,
        message: "Aucun avis trouvé pour ce chauffeur.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération de la note.",
      error: error.message,
    });
  }
});




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
router.put("/:id/solde", verifyTokenAny, async (req, res) => {
  try {
    const { id } = req.params;
    const { solde } = req.body;


    if (typeof solde !== "number") {
      return res.status(400).json({
        message: "Le solde doit être un nombre."
      });
    }

    // La mise à jour du solde du chauffeur se fait ensuite, comme avant
   const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      [ // On utilise un pipeline d'agrégation ici
        { 
          $set: { 
            solde: { 
              $max: [ 0, { $subtract: ["$solde", soldetotale] } ] 
            }
          }
        }
      ],
      { new: true, select: "-password" } // 'new: true' retourne le document mis à jour
    );

    if (!updatedDriver) {
      // Cette vérification est un peu redondante mais reste une bonne sécurité
      return res.status(404).json({
        message: "Chauffeur non trouvé lors de la mise à jour."
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

router.get("/:id/solde-details", verifyTokenAny, async (req, res) => {
  try {
    const { id } = req.params;

    // Étape 1: Trouver le chauffeur dans la base de données.
    // On sélectionne uniquement le champ 'solde' pour optimiser la requête.
    const driver = await Driver.findById(id).select("solde");
    if (!driver) {
      return res.status(404).json({ message: "Chauffeur non trouvé." });
    }
    const soldeBrut = driver.solde;

    // Étape 4: Renvoyer une réponse JSON avec tous les détails.
    res.status(200).json({
      soldeBrut: soldeBrut.toFixed(2), // Le solde total généré par le chauffeur
    });

  } catch (error) {
    // En cas d'erreur, on log l'erreur et on renvoie une réponse 500.
    console.error("Erreur lors de la récupération du solde détaillé :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la récupération du solde.",
      error: error.message,
    });
  }
});



// Update Driver solde
router.put("/:id/soldepayement", verifyTokenAny, async (req, res) => {
  try {
    const { id } = req.params;
    const { rechargeAmount } = req.body;

    // --- Début des validations ---

    // Validation pour amountInCents
    if (rechargeAmount == null || typeof rechargeAmount !== "number" ) {
      return res.status(400).json({
        message: "Le champ 'rechargeAmount' est invalide. Il doit être un nombre positif ou nul."
      });
    }
    // --- Fin des validations ---

    await HistoriquePaiement.create({
      id_driver: id,
      montantPaye: rechargeAmount, // On enregistre le montant payé
    });

    // La mise à jour du solde du chauffeur se fait ensuite, comme avant
    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { $inc: { solde: rechargeAmount } }, // On déduit le soldetotale
      { new: true, select: "-password" }
    );

    if (!updatedDriver) {
      // Cette vérification est utile si l'ID est valide mais ne correspond à aucun document
      return res.status(404).json({
        message: "Chauffeur non trouvé lors de la mise à jour."
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
