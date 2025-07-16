const mongoose = require('mongoose');

// Le nom de votre collection dans MongoDB
const COLLECTION_NAME = 'app_updates';

/**
 * Définition du schéma Mongoose pour la configuration de mise à jour.
 * Ce schéma valide la structure des documents avant de les enregistrer dans MongoDB.
 */
const updateConfigSchema = new mongoose.Schema({
  appName: {
    type: String,
    required: [true, "Le champ 'appName' est obligatoire."],
    unique: true, // Assure que chaque nom d'application est unique
  },
  minimumVersion: {
    type: String,
    required: [true, "Le champ 'minimumVersion' est obligatoire."],
  },
  minimumbuildNumber: {
    type: String,
    required: [true, "Le champ 'minimumbuildNumber' est obligatoire."],
  },
  iosminimumVersion: {
    type: String,
    required: [true, "Le champ 'iosminimumVersion' est obligatoire."],
  },
  iosminimumbuildNumber: {
    type: String,
    required: [true, "Le champ 'iosminimumbuildNumber' est obligatoire."],
  },
  playStoreUrl: {
    type: String,
    required: [true, "Le champ 'playStoreUrl' est obligatoire."],
  },
  appStoreUrl: {
    type: String,
    required: [true, "Le champ 'appStoreUrl' est obligatoire."],
  },
}, {
  // Options du schéma
  collection: COLLECTION_NAME, // Spécifie explicitement le nom de la collection
  timestamps: true, // Ajoute automatiquement les champs createdAt et updatedAt
});

// Crée et exporte le modèle Mongoose basé sur le schéma.
// Mongoose utilisera ce modèle pour interagir avec la collection 'app_updates'.
const UpdateConfig = mongoose.model('UpdateConfig', updateConfigSchema);

module.exports = UpdateConfig;
