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
    // 1. Déstructuration des paramètres de la requête
    const { from, to, date, type } = req.query;

    // 2. Vérification des paramètres obligatoires
    if (!from || !to || !date || !type) {
      return res.status(400).json({
        message: 'Paramètres manquants. Veuillez fournir from, to, date, et type.'
      });
    }

    // 3. Validation et création de l'objet Date à partir du paramètre
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide.' });
    }

    // 4. Vérification que la date de recherche n'est pas dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Met l'heure à minuit pour une comparaison juste

    // On normalise aussi la date de l'utilisateur pour éviter les pbs de fuseaux horaires
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return res.status(400).json({
        message: 'La date de recherche ne peut pas être dans le passé. Veuillez choisir une date future.'
      });
    }

    // 5. Calcul de la plage de recherche de +/- 15 jours
    const dateRangeDays = 15;
    const startDate = new Date(dateObj); // Base pour la date de début
    const endDate = new Date(dateObj);   // Base pour la date de fin

    startDate.setDate(startDate.getDate() - dateRangeDays);
    endDate.setDate(endDate.getDate() + dateRangeDays);

    // 6. S'assurer que la recherche ne commence JAMAIS avant aujourd'hui
    // On prend la date la plus récente entre (la date calculée) et (aujourd'hui).
    const finalStartDate = new Date(Math.max(startDate.getTime(), today.getTime()));

    // 7. Construction de la requête MongoDB
    const query = {
      pointRamasage: { $in: [from] },
      pointLivraison: { $in: [to] },
      modetransport: type,
      dateTraject: {
        $gte: finalStartDate, // Supérieur ou égal à (la date de début finale)
        $lte: endDate         // Inférieur ou égal à (la date de fin)
      }
    };

    // 8. Exécution de la requête et envoi de la réponse
    const trajets = await Traject.find(query).sort({ dateTraject: 1 });
    res.status(200).json(trajets);

  } catch (error) {
    // 9. Gestion des erreurs générales
    console.error('Erreur lors de la recherche:', error);
    
    // Vous pouvez ajouter des gestions d'erreurs plus spécifiques ici si besoin
    if (error.name === 'CastError') {
       return res.status(400).json({ message: 'Un des paramètres fournis est invalide.' });
    }

    // Passe à un middleware de gestion d'erreur global (si vous en avez un)
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
