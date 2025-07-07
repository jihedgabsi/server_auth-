const express = require("express");
const Commission = require("../models/Commission");
const { verifyToken, isAdmin } = require("../middleware/authDriver");

const router = express.Router();

// Get current commission
router.get("/", async (req, res) => {
  try {
    // On suppose qu'il n'y a qu'un seul document Commission
    const commission = await Commission.findOne();
    if (!commission) {
      return res.status(404).json({ message: "Commission non définie." });
    }
    res.status(200).json(commission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update commission (admin only)
router.put("/", [verifyToken, isAdmin], async (req, res) => {
  try {
    const { valeur } = req.body;
    if (typeof valeur !== "number") {
      return res.status(400).json({ message: "La valeur doit être un nombre." });
    }

    let commission = await Commission.findOne();
    if (!commission) {
      // s'il n'existe pas, on le crée
      commission = new Commission({ valeur });
    } else {
      commission.valeur = valeur;
      commission.updatedAt = new Date();
    }
    await commission.save();

    res.status(200).json(commission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
