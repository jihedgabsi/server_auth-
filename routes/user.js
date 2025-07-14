// ===== routes/user.js =====
const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authUser");
const User = require("../models/User");
const router = express.Router();

// Get current user's profile
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json(req.user);
});

// Update user profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: req.body },
      { new: true, select: "-password" }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if ID is provided
    if (!id) {
      return res.status(400).json({ 
        message: "userId ID is required" 
      });
    }

    // Find userId by ID and exclude password
    const userId = await User.findById(id);
    
    if (!userId) {
      return res.status(404).json({ 
        message: "userId not found" 
      });
    }

    res.status(200).json(userId);
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid userId ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});
// Get all users (admin only)
router.get("/all", [verifyToken, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/fcm-token", [verifyToken, isAdmin], async (req, res) => {
  // 1. Récupérer l'ID depuis les paramètres de l'URL et le token depuis le corps de la requête
  const { id } = req.params;
  const { fcmToken } = req.body;

  // 2. Valider que le fcmToken est bien fourni
  if (!fcmToken) {
    return res.status(400).json({ message: "Le champ fcmToken est requis." });
  }

  try {
    // 3. Trouver l'utilisateur par son ID et mettre à jour son fcmToken
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { fcmToken: fcmToken },
      {
        new: true, // Retourne le document mis à jour
        select: "-password", // Exclut le mot de passe de la réponse
      }
    );

    // 4. Si aucun utilisateur n'est trouvé avec cet ID, renvoyer une erreur 404
    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // 5. Renvoyer une réponse de succès ✅
    res.status(200).json({
      message: "Token FCM mis à jour avec succès par l'administrateur.",
      user: updatedUser,
    });
  } catch (error) {
    // 6. Gérer les erreurs (ex: ID invalide, erreur de base de données)
    console.error("Erreur lors de la mise à jour du token FCM:", error);
    // Gérer le cas où l'ID n'est pas un ObjectId valide
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Format de l'ID utilisateur invalide." });
    }
    res.status(500).json({ message: "Erreur du serveur." });
  }
});

module.exports = router;
