const mongoose = require('mongoose');

// Définition du schéma pour les emplacements
const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true // Supprime les espaces inutiles au début et à la fin
  },
  transportMode: {
    type: String,
    required: true,
    enum: ['Bateau', 'Avion'] // Limite les valeurs possibles pour ce champ
  }
});

// Création du modèle à partir du schéma
const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
