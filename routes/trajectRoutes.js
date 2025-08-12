const express = require('express');
const router = express.Router();
const Traject = require('../models/Traject');
const {verifyTokenAny} = require("../middleware/authAny");


// GET all trajets
router.get('/',verifyTokenAny, async (req, res, next) => {
  try {
    const trajets = await Traject.find();
    res.status(200).json(trajets);
  } catch (error) {
    next(error);
  }
});
// GET trajets in descending order by createdAt
router.get('/recent',verifyTokenAny, async (req, res, next) => {
  try {
    const { idChauffeur } = req.query;
    
    // Validate that idChauffeur is provided
    if (!idChauffeur) {
      return res.status(400).json({ 
        error: 'idChauffeur is required' 
      });
    }

    // Get today's date at start of day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query trajets for the specific chauffeur from today onwards, sorted by date
    const trajets = await Traject.find({
      idChauffeur: idChauffeur,
      dateTraject: { $gte: today } // Only trajets from today onwards
    }).sort({ dateTraject: 1 }); // Sort by date ascending (earliest first)

    res.status(200).json(trajets);
  } catch (error) {
    next(error);
  }
});



// GET trajets in descending order by createdAt
router.get('/trajectchauff',verifyTokenAny, async (req, res, next) => {
  try {
    const { idChauffeur } = req.query;
    
    // Validate that idChauffeur is provided
    if (!idChauffeur) {
      return res.status(400).json({ 
        error: 'idChauffeur is required' 
      });
    }


    // Query trajets for the specific chauffeur from today onwards, sorted by date
    const trajets = await Traject.find({
      idChauffeur: idChauffeur,
    }).sort({ dateTraject: 1 }); // Sort by date ascending (earliest first)

    res.status(200).json(trajets);
  } catch (error) {
    next(error);
  }
});

router.get('/search', verifyTokenAny, async (req, res, next) => {
  try {
    const { from, to, date, type } = req.query;

    if (!from || !to || !date || !type) {
      return res.status(400).json({
        message: 'Paramètres manquants. Veuillez fournir from, to, date, et type.'
      });
    }

    // --- CORRECTION MANUELLE DU FUSEAU HORAIRE ---

    // 1. On force l'interprétation de la date en UTC en ajoutant 'T00:00:00.000Z'.
    // new Date('2025-09-01') -> crée une date en UTC+1 (heure du serveur)
    // new Date('2025-09-01T00:00:00.000Z') -> crée une date en UTC (heure de la base de données)
    const dateObj = new Date(date + 'T00:00:00.000Z');

    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide.' });
    }

    // 2. On obtient "aujourd'hui à minuit" en UTC de manière fiable.
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    if (dateObj < today) {
      return res.status(400).json({
        message: 'La date de recherche ne peut pas être dans le passé.'
      });
    }

    // 3. On calcule la plage de +/- 15 jours en utilisant les millisecondes pour éviter les erreurs de fuseau horaire.
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const dateRangeInMs = 15 * dayInMilliseconds;

    const startDate = new Date(dateObj.getTime() - dateRangeInMs);
    const endDate = new Date(dateObj.getTime() + dateRangeInMs);

    const finalStartDate = new Date(Math.max(startDate.getTime(), today.getTime()));
    
    // --- FIN DE LA CORRECTION ---

    const query = {
      pointRamasage: { $in: [from] },
      pointLivraison: { $in: [to] },
      modetransport: type,
      dateTraject: {
        $gte: finalStartDate,
        $lte: endDate
      }
    };
    
    console.log("Requête MongoDB envoyée :", JSON.stringify(query, null, 2));

    const trajets = await Traject.find(query).sort({ dateTraject: 1 });
    res.status(200).json(trajets);

  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    next(error);
  }
});
// GET trajet by ID
router.get('/:id', verifyTokenAny,async (req, res, next) => {
  try {
    const trajet = await Traject.findById(req.params.id);
    if (!trajet) {
      return res.status(404).json({ message: 'Trajet not found' });
    }
    res.status(200).json(trajet);
  } catch (error) {
    next(error);
  }
});

// CREATE new trajet
router.post('/', verifyTokenAny,async (req, res, next) => {
  try {
    const newTrajet = new Traject(req.body);
    const savedTrajet = await newTrajet.save();
    res.status(201).json(savedTrajet);
  } catch (error) {
    next(error);
  }
});

// UPDATE trajet
router.put('/:id',verifyTokenAny, async (req, res, next) => {
  try {
    const updatedTrajet = await Traject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedTrajet) {
      return res.status(404).json({ message: 'Trajet not found' });
    }
    
    res.status(200).json(updatedTrajet);
  } catch (error) {
    next(error);
  }
});

// DELETE trajet
router.delete('/:id',verifyTokenAny, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format (if using MongoDB)
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid trajet ID format',
        error: 'ID must be a valid MongoDB ObjectId'
      });
    }
    
    console.log(`Attempting to delete trajet with ID: ${id}`);
    
    const deletedTrajet = await Traject.findByIdAndDelete(id);
    
    if (!deletedTrajet) {
      console.log(`Trajet with ID ${id} not found`);
      return res.status(404).json({ 
        message: 'Trajet not found',
        id: id
      });
    }
    
    console.log(`Successfully deleted trajet with ID: ${id}`);
    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting trajet:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid trajet ID',
        error: error.message
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        error: error.message
      });
    }
    
    // Generic server error
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});
module.exports = router;
