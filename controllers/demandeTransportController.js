const DemandeTransport = require("../models/DemandeTransport");
const Baggage = require("../models/Baggage"); // To validate baggage IDs
const Driver = require('../models/Driver'); // Adaptez le chemin si besoin
const Commission = require('../models/Commission');
// @desc    Create a new DemandeTransport
// @route   POST /api/demandes-transport
// @access  Private (to be decided based on auth implementation)



exports.addOrUpdateReview = async (req, res, next) => {
  try {
    // 1. Récupérer l'ID de la demande depuis les paramètres de l'URL
    const { id } = req.params;

    // 2. Récupérer les étoiles et le commentaire depuis le corps de la requête
    const { nbstars, comentaire } = req.body;

    // Validation simple : au moins les étoiles doivent être fournies
    if (nbstars === undefined) {
      return res.status(400).json({
        success: false,
        message: "Le nombre d'étoiles (nbstars) est requis.",
      });
    }

    // 3. Trouver la demande par son ID et la mettre à jour
    const updatedDemande = await DemandeTransport.findByIdAndUpdate(
      id,
      {
        nbstars: nbstars,
        comentaire: comentaire,
      },
      {
        new: true, // Pour retourner le document mis à jour
        runValidators: true, // Pour exécuter les validateurs du schéma si vous en avez
      }
    );

    // 4. Si la demande n'est pas trouvée, renvoyer une erreur 404
    if (!updatedDemande) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande de transport trouvée avec l'ID : ${id}`,
      });
    }

    // 5. Renvoyer une réponse de succès avec les données mises à jour
    res.status(200).json({
      success: true,
      message: "Avis ajouté/modifié avec succès.",
      data: updatedDemande,
    });

  } catch (error) {
    next(error);
  }
};






exports.createDemandeTransport = async (req, res, next) => {
  try {
    const {
      poisColieTotal,
      pointRamasage,
      pointLivrison,
      id_driver,
      prixProposer,
      statutsDemande,
      portDepart,
      portDarriver,
      id_traject,
      id_user,
      proposerDriver,
      proposerUser,
      id_bagages,
      updateStatutLivraison,
      modetransport,
    } = req.body;

    // Validate baggage IDs
    if (id_bagages && id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({ _id: { $in: id_bagages } });
      if (baggageDocs.length !== id_bagages.length) {
        return res
          .status(400)
          .json({
            success: false,
            message: "One or more baggage IDs are invalid.",
          });
      }
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one baggage ID is required.",
        });
    }

    const demandeTransport = await DemandeTransport.create({
      poisColieTotal,
      pointRamasage,
      pointLivrison,
      id_driver,
      prixProposer,
      statutsDemande,
      portDepart,
      portDarriver,
      id_traject,
      id_user,
      proposerDriver,
      proposerUser,
      id_bagages,
      updateStatutLivraison,
      modetransport,
    });

    res.status(201).json({
      success: true,
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all DemandeTransport documents
// @route   GET /api/demandes-transport
// @access  Public (or Private depending on requirements)
exports.getAllDemandeTransports = async (req, res, next) => {
  try {
    const demandesTransport = await DemandeTransport.find()
      .populate("id_bagages")
      .sort({ updatedAt: -1 }); // -1 for descending order (most recent first)

    res.status(200).json({
      success: true,
      count: demandesTransport.length,
      data: demandesTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single DemandeTransport by ID
// @route   GET /api/demandes-transport/:id
// @access  Public (or Private)
exports.getDemandeTransportById = async (req, res, next) => {
  try {
    const demandeTransport = await DemandeTransport.findById(
      req.params.id
    ).populate("id_bagages");
    if (!demandeTransport) {
      return res
        .status(404)
        .json({
          success: false,
          message: `DemandeTransport not found with id of ${req.params.id}`,
        });
    }
    res.status(200).json({
      success: true,
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a DemandeTransport
// @route   PUT /api/demandes-transport/:id
// @access  Private
exports.updateDemandeTransport = async (req, res, next) => {
  try {
    // 1. Récupérer la demande AVANT la mise à jour pour connaître son état actuel
    let demandeAvantUpdate = await DemandeTransport.findById(req.params.id);

    if (!demandeAvantUpdate) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport introuvable avec l'ID ${req.params.id}`,
      });
    }

    // --- DÉBUT DE LA NOUVELLE LOGIQUE ---

    // 2. Vérifier si le statut est mis à jour à 'accepted'
    // On vérifie aussi que l'ancien statut n'était pas déjà 'accepted' pour éviter d'ajouter le solde plusieurs fois.
    if (req.body.statutsDemande === 'accepted' && demandeAvantUpdate.statutsDemande !== 'accepted') {
      
      // 3. Valider que le chauffeur et le prix existent sur la demande
      if (!demandeAvantUpdate.id_driver || typeof demandeAvantUpdate.prixProposer !== 'number') {
        return res.status(400).json({
          success: false,
          message: "Impossible d'accepter : Un chauffeur doit être assigné et un prix doit être défini.",
        });
      }
    const commissionDoc = await Commission.findOne().sort({ updatedAt: -1 });
    const commissionPercentage = commissionDoc ? commissionDoc.valeur : 10;
    const montantCommission = demandeAvantUpdate.prixProposer * (commissionPercentage / 100);

    req.body.Percentageactuel = commissionPercentage.toString();
      // 4. Mettre à jour le solde du chauffeur
      // L'opérateur $inc est parfait pour ajouter une valeur de manière atomique
     await Driver.findByIdAndUpdate(
     demandeAvantUpdate.id_driver,
     { $inc: { solde: -montantCommission } }
    );
    }
    // --- FIN DE LA NOUVELLE LOGIQUE ---


    // Votre validation pour les bagages reste inchangée
    if (req.body.id_bagages && req.body.id_bagages.length > 0) {
      const baggageDocs = await Baggage.find({
        _id: { $in: req.body.id_bagages },
      });
      if (baggageDocs.length !== req.body.id_bagages.length) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Un ou plusieurs ID de bagages sont invalides.",
          });
      }
    } else if (req.body.id_bagages && req.body.id_bagages.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Au moins un ID de bagage est requis.",
        });
    }
    
    // 5. Effectuer la mise à jour de la demande de transport
    const demandeTransportMiseAJour = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      data: demandeTransportMiseAJour,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a DemandeTransport
// @route   DELETE /api/demandes-transport/:id
// @access  Private
exports.deleteDemandeTransport = async (req, res, next) => {
  try {
    const demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res
        .status(404)
        .json({
          success: false,
          message: `DemandeTransport not found with id of ${req.params.id}`,
        });
    }

    await demandeTransport.deleteOne(); // Corrected from .remove() which is deprecated

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Accept a driver's proposal
// @route   PUT /api/demandes-transport/:id/accept
// @access  Private
exports.acceptProposal = async (req, res, next) => {
  try {
    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Check if there's a proposal to accept
    if (
      demandeTransport.statutsDemande === "pending" &&
      !demandeTransport.proposerDriver
    ) {
      return res.status(400).json({
        success: false,
        message: "No driver proposal to accept",
      });
    }

    // Update to accepted status
    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      {
        statutsDemande: "accepted",
        proposerDriver: true,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Proposal accepted successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a driver's proposal
// @route   PUT /api/demandes-transport/:id/reject
// @access  Private
exports.rejectProposal = async (req, res, next) => {
  try {
    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Update to rejected status
    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      {
        statutsDemande: "rejected",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Proposal rejected successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a counter proposal or initial price proposal
// @route   PUT /api/demandes-transport/:id/propose-price
// @access  Private
exports.proposePriceUser = async (req, res, next) => {
  try {
    const { prixProposer } = req.body;

    // Validate price
    if (
      !prixProposer ||
      typeof prixProposer !== "number" ||
      prixProposer <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid price proposal is required",
      });
    }

    let demandeTransport = await DemandeTransport.findById(req.params.id);

    if (!demandeTransport) {
      return res.status(404).json({
        success: false,
        message: `DemandeTransport not found with id of ${req.params.id}`,
      });
    }

    // Check if the proposed price is different from current price
    if (demandeTransport.prixProposer === prixProposer) {
      return res.status(400).json({
        success: false,
        message: "Proposed price must be different from current price",
      });
    }

    // Update with new price and status
    const updateData = {
      prixProposer: prixProposer,
      statutsDemande: "in_progress",
      proposerUser: true,
      updatedAt: new Date(),
    };

    // If it's a counter-proposal, also update proposerDriver to false
    if (demandeTransport.proposerDriver) {
      updateData.proposerDriver = false;
    }

    demandeTransport = await DemandeTransport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("id_bagages");

    res.status(200).json({
      success: true,
      message: "Price proposal sent successfully",
      data: demandeTransport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by user ID with proposal status
// @route   GET /api/demandes-transport/user/:userId
// @access  Private
exports.getDemandesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const demandes = await DemandeTransport.find({ id_user: userId })
      .populate("id_bagages")
      .populate("id_driver", "nom prenom telephone") // Populate driver info if needed
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDemandesByUserStream = async (req, res, next) => {
  const { userId } = req.params;

  // 1. Configurer les en-têtes pour les Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Envoie les en-têtes immédiatement

  // Fonction pour envoyer la liste à jour à l'utilisateur
  const sendUpdatedData = async () => {
    try {
      console.log(`Fetching updated data for user: ${userId}`);
      const demandes = await DemandeTransport.find({ id_user: userId })
        .populate("id_bagages")
        .populate("id_driver", "nom prenom telephone")
        .sort({ createdAt: -1 });

      // Formatte les données pour SSE et envoie
      res.write(`data: ${JSON.stringify(demandes)}\n\n`);
    } catch (error) {
      console.error("Error sending data to client:", error);
    }
  };

  // 2. Envoyer la liste complète une première fois
  sendUpdatedData();

  // 3. Écouter les changements sur la collection DemandeTransport
  const changeStream = DemandeTransport.watch();

  changeStream.on("change", (change) => {
    // On vérifie si le changement concerne l'utilisateur connecté
    // Pour un 'insert' ou 'update', on peut vérifier le document complet
    if (
      change.operationType === "insert" ||
      change.operationType === "update"
    ) {
      if (change.fullDocument.id_user.toString() === userId) {
        console.log("Relevant change detected, sending update.");
        sendUpdatedData(); // Renvoyer la liste complète et à jour
      }
    } else if (change.operationType === "delete") {
      // Pour une suppression, c'est plus complexe.
      // Une solution simple est de renvoyer la liste à jour à tous les clients connectés.
      // Pour optimiser, il faudrait connaître l'id_user du document supprimé.
      console.log("A document was deleted, sending update.");
      sendUpdatedData();
    }
  });

  // 4. Gérer la déconnexion du client
  req.on("close", () => {
    console.log(`Client disconnected for user: ${userId}, closing stream.`);
    changeStream.close();
    res.end();
  });
};

// @desc    Get demandes by driver ID
// @route   GET /api/demandes-transport/driver/:driverId
// @access  Private
exports.getDemandesByDriver = async (req, res, next) => {
  try {
    const { driverId } = req.params;

    const demandes = await DemandeTransport.find({ id_driver: driverId })
      .populate("id_bagages")
      .populate("id_user", "nom prenom telephone") // Populate user info if needed
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by driver ID et idtraject
// @route   GET /api/demandes-transport/driver/:driverId/traject/:trajectId
// @access  Private
exports.getDemandesByDriveretidtraject = async (req, res, next) => {
  try {
    const { driverId,trajectId } = req.params;

    const demandes = await DemandeTransport.find({ id_driver: driverId ,id_traject :trajectId ,statutsDemande :"accepted" })
      .populate("id_bagages")
      .populate("id_user", "nom prenom telephone") // Populate user info if needed
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demandes by status
// @route   GET /api/demandes-transport/status/:status
// @access  Private
exports.getDemandesByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    // Validate status
    const validStatuses = [
      "pending",
      "in_progress",
      "accepted",
      "rejected",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    const demandes = await DemandeTransport.find({ statutsDemande: status })
      .populate("id_bagages")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    next(error);
  }
};
// PUT - Modifier le statut de livraison d'une demande
exports.updateStatutLivraison = async (req, res) => {
  try {
    const { id } = req.params;
    const { statuts } = req.body;

    // Validation du statut
    const statutsValides = [
     'Payé', 'collecté', 'En dépot', 'En livrison', 'Livré'
    ];
    if (!statutsValides.includes(statuts)) {
      return res.status(400).json({
        success: false,
        message: "Statut de livraison invalide",
        statutsValides,
      });
    }

    const demande = await DemandeTransport.findById(id);
    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande de transport non trouvée",
      });
    }

    // Logique de progression des statuts (optionnel)
    const ordreStatuts = [
    'Payé', 'collecté', 'En dépot', 'En livrison', 'Livré'
    ];
    const indexActuel = ordreStatuts.indexOf(demande.statuts);
    const indexNouveau = ordreStatuts.indexOf(statuts);

    // Empêcher le retour en arrière (optionnel - peut être retiré si non souhaité)
    if (indexNouveau < indexActuel) {
      return res.status(400).json({
        success: false,
        message: "Impossible de revenir à un statut antérieur",
        statutActuel: demande.statuts,
        statutDemande: statuts,
      });
    }

    const demandeMiseAJour = await DemandeTransport.findByIdAndUpdate(
      id,
      {
        statuts,
        $push: {
          historiqueStatuts: {
            statut: statuts,
            date: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("id_driver", "nom prenom")
      .populate("id_user", "nom prenom");

    res.json({
      success: true,
      message: "Statut de livraison mis à jour avec succès",
      data: demandeMiseAJour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du statut",
      error: error.message,
    });
  }
};
