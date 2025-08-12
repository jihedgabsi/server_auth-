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
    console.log("\n--- [1] Début de la Requête de Recherche ---");
    const { from, to, date, type } = req.query;
    console.log("Paramètres reçus du client:", { from, to, date, type });

    // Vérification des paramètres
    if (!from || !to || !date || !type) {
      console.log("!!! ERREUR: Paramètres manquants.");
      return res.status(400).json({
        message: 'Paramètres manquants. Veuillez fournir from, to, date, et type.'
      });
    }

    // --- Logique de Date (ne change pas) ---
    const dateObj = new Date(date + 'T00:00:00.000Z');
    if (isNaN(dateObj.getTime())) {
      console.log("!!! ERREUR: Format de date invalide.");
      return res.status(400).json({ message: 'Format de date invalide.' });
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (dateObj < today) {
       console.log("!!! ERREUR: La date de recherche est dans le passé.");
      return res.status(400).json({
        message: 'La date de recherche ne peut pas être dans le passé.'
      });
    }
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const dateRangeInMs = 15 * dayInMilliseconds;
    const startDate = new Date(dateObj.getTime() - dateRangeInMs);
    const endDate = new Date(dateObj.getTime() + dateRangeInMs);
    const finalStartDate = new Date(Math.max(startDate.getTime(), today.getTime()));
    // --- Fin de la Logique de Date ---

    // Construction de la requête
    const query = {
      pointRamasage: { $in: [from] },
      pointLivraison: { $in: [to] },
      modetransport: type,
      dateTraject: {
        $gte: finalStartDate,
        $lte: endDate
      }
    };
    
    console.log("\n--- [2] Requête Finale Envoyée à MongoDB ---");
    console.log(JSON.stringify(query, null, 2));

    const trajets = await Traject.find(query).sort({ dateTraject: 1 });
    
    console.log("\n--- [3] Résultat de la Recherche ---");
    console.log(`Nombre de trajets trouvés: ${trajets.length}`);
    if (trajets.length > 0) {
      console.log("Premier trajet trouvé:", trajets[0]);
    }
    
    res.status(200).json(trajets);

  } catch (error) {
    console.error('!!! [4] Erreur Inattendue Capturée !!!', error);
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
