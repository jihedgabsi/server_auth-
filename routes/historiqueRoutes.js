const express = require('express');
const router = express.Router();

// ✅ Importation du modèle HistoriquePaiement
const HistoriquePaiement = require('../models/HistoriquePaiement'); 
// On importe aussi le middleware de vérification du token
const { verifyTokenAny } = require('../middleware/authAny'); // Adaptez le chemin si besoin

/**
 * @route   GET /api/historique/driver/:driverId
 * @desc    Récupérer l'historique de tous les paiements pour un chauffeur spécifique
 * @access  Private
 */
router.get('/driver/:driverId', verifyTokenAny, async (req, res) => {
  try {
    const { driverId } = req.params;

    // On cherche tous les documents dans HistoriquePaiement qui correspondent à l'ID du chauffeur
    const historiques = await HistoriquePaiement.find({ id_driver: driverId })
      .sort({ datePaiement: -1 }); // On trie par date pour avoir les plus récents en premier

    if (!historiques || historiques.length === 0) {
      return res.status(404).json({ 
        message: "Aucun historique de paiement trouvé pour ce chauffeur.",
        data: [] 
      });
    }

    // Si on trouve des historiques, on les renvoie
    res.status(200).json({
      success: true,
      count: historiques.length,
      data: historiques
    });

  } catch (error) {
    res.status(500).json({
      message: "Erreur du serveur lors de la récupération de l'historique.",
      error: error.message
    });
  }
});

module.exports = router;
