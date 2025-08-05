const mongoose = require('mongoose');

const historiquePaiementSchema = new mongoose.Schema({
  // Référence au chauffeur qui a été payé
  id_driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  
  // Le montant qui a été payé (c'est-à-dire le solde du chauffeur AVANT la mise à jour)
  montantPaye: {
    type: Number,
    required: true,
  },

  // La date à laquelle le paiement a été enregistré
  datePaiement: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true }); // Ajoute automatiquement createdAt et updatedAt

module.exports = mongoose.model('HistoriquePaiement', historiquePaiementSchema);
