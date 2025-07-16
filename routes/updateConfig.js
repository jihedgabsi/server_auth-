const express = require('express');
const { getUpdateConfig } = require('../controllers/updateConfig'); // Importe la logique du contrôleur

// Crée une nouvelle instance de routeur Express.
const router = express.Router();

/**
 * @route   GET /:appName
 * @desc    Définit une route qui écoute les requêtes GET.
 * Le ':appName' est un paramètre dynamique qui sera capturé.
 * Lorsque cette route est atteinte, la fonction 'getUpdateConfig' du contrôleur est exécutée.
 * @access  Public
 */
router.get('/:appName', getUpdateConfig);

// Exporte le routeur pour qu'il puisse être utilisé dans le fichier principal du serveur.
module.exports = router;
