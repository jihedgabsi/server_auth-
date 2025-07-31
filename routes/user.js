// ===== routes/user.js =====
const express = require("express");
const User = require("../models/User");
const {verifyTokenAny} = require("../middleware/authAny");

const router = express.Router();

// Get current user's profile
router.get("/profile", verifyTokenAny, (req, res) => {
  res.status(200).json(req.user);
});

// Update user profile
router.put("/profile", verifyTokenAny, async (req, res) => {
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

router.get("/:id",verifyTokenAny, async (req, res) => {
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
router.get("/all", verifyTokenAny, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
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

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { fcmToken } },
      { new: true }                    // renvoie le driver mis à jour
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User non trouvé." });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du FCM token.",
      error: error.message,
    });
  }
});




module.exports = router;
