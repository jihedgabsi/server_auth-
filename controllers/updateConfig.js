const UpdateConfig = require('../models/updateConfig'); // Importe le modèle Mongoose

/**
 * Contrôleur pour récupérer la configuration de mise à jour d'une application.
 * @param {object} req - L'objet de la requête Express. Contient les paramètres de l'URL.
 * @param {object} res - L'objet de la réponse Express. Utilisé pour renvoyer des données au client.
 */
const getUpdateConfig = async (req, res) => {
  try {
    // Récupère le paramètre 'appName' de l'URL de la requête (ex: /api/updates/mon-app)
    const { appName } = req.params;

    if (!appName) {
      return res.status(400).json({ message: "Le paramètre 'appName' est manquant." });
    }

    // Utilise le modèle pour trouver un document où le champ 'appName' correspond.
    const config = await UpdateConfig.findOne({ appName: appName });

    // Si aucune configuration n'est trouvée, renvoyer une erreur 404 (Not Found).
    if (!config) {
      return res.status(404).json({ message: `Aucune configuration trouvée pour l'application : ${appName}` });
    }

    // Si la configuration est trouvée, la renvoyer avec un statut 200 (OK).
    res.status(200).json(config);

  } catch (error) {
    // En cas d'erreur inattendue (ex: problème de connexion à la base de données),
    // renvoyer une erreur 500 (Internal Server Error).
    console.error("Erreur lors de la récupération de la configuration :", error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
};

// Exporte la fonction du contrôleur pour qu'elle puisse être utilisée dans le routeur.
module.exports = {
  getUpdateConfig,
};
