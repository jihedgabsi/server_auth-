const express = require('express');
const {
  createDemandeTransport,
  getAllDemandeTransports,
  getDemandeTransportById,
  updateDemandeTransport,
  deleteDemandeTransport,
  getDemandesByDriveretidtraject,

  acceptProposal,
  rejectProposal,
  proposePriceUser,
  getDemandesByUser,
  getDemandesByDriver,
  getDemandesByStatus,
  updateStatutLivraison,
  addOrUpdateReview,
} = require('../controllers/demandeTransportController');
const {verifyTokenAny} = require("../middleware/authAny");


const router = express.Router();

// Route to create a new DemandeTransport and get all DemandeTransports
router
  .route('/')
  .post(verifyTokenAny,createDemandeTransport)
  .get(verifyTokenAny,getAllDemandeTransports);

// Route to get, update, and delete a specific DemandeTransport by ID
router
  .route('/:id')
  .get(verifyTokenAny,getDemandeTransportById)
  .put(verifyTokenAny,updateDemandeTransport)
  .delete(verifyTokenAny,deleteDemandeTransport);
  
router.put('/:id/accept', verifyTokenAny,acceptProposal);
router.put('/:id/reject',verifyTokenAny, rejectProposal);
router.put('/:id/propose-price', proposePriceUser);

// Filter routes
router.get('/user/:userId', verifyTokenAny,getDemandesByUser);
router.get('/driver/:driverId', verifyTokenAny,getDemandesByDriver);
router.get('/driver/:driverId/traject/:trajectId', verifyTokenAny,getDemandesByDriveretidtraject);
router.get('/status/:status', verifyTokenAny,getDemandesByStatus);

///
router.put('/:id/status',verifyTokenAny,updateStatutLivraison);
router.patch('/:id/avis', addOrUpdateReview);

module.exports = router;
