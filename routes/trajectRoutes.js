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
        message: 'Missing required parameters. Please provide from, to, date, and type.'
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // --- NOUVEAU BLOC DE VÉRIFICATION ---
    // S'assure que la date de recherche n'est pas dans le passé.
    const today = new Date();
    today.setHours(0, 0, 0, 0); // On met à minuit pour comparer uniquement les jours.

    if (dateObj < today) {
      return res.status(400).json({
        message: 'La date de recherche ne peut pas être dans le passé. Veuillez choisir une date future.'
      });
    }
    // --- FIN DU NOUVEAU BLOC ---

    const dateRangeDays = 15;
    const startDate = new Date(dateObj);
    const endDate = new Date(dateObj);

    // On calcule la plage de -15/+15 jours autour de la date demandée
    startDate.setDate(startDate.getDate() - dateRangeDays);
    endDate.setDate(endDate.getDate() + dateRangeDays);

    // On s'assure que la date de début de la recherche n'est jamais avant aujourd'hui.
    const finalStartDate = new Date(Math.max(startDate.getTime(), today.getTime()));

    // Construit la requête
    const query = {
      pointRamasage: { $in: [from] },
      pointLivraison: { $in: [to] },
      modetransport: type,
      dateTraject: {
        $gte: finalStartDate, // La recherche commence AU PLUS TÔT à aujourd'hui
        $lte: endDate
      }
    };

    const trajets = await Traject.find(query).sort({ dateTraject: 1 });

    res.status(200).json(trajets);
  } catch (error) {
    console.error('Search error:', error);
    // ... gestion des erreurs
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
