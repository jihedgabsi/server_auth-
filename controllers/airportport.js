const Location = require('../models/airportport'); // Importation du modèle

// Fonction pour récupérer les emplacements par mode de transport
exports.getLocations = async (req, res) => {
  try {
    // Récupération du 'transportMode' depuis les paramètres de l'URL (query parameter)
    const { transportMode } = req.query;

    if (!transportMode) {
      return res.status(400).json({ message: "Le paramètre 'transportMode' est manquant." });
    }

    // Recherche de tous les documents correspondant au transportMode
    // .select('name -_id') ne retourne que le champ 'name' et exclut le champ '_id'
    const locations = await Location.find({ transportMode: transportMode }).select('name -_id');

    // Extraction des noms dans un tableau simple
    const locationNames = locations.map(loc => loc.name);

    res.status(200).json(locationNames);
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur lors de la récupération des données.", error: error.message });
  }
};
