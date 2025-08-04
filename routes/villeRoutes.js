const express = require('express');
const router = express.Router();
const villeController = require('../controllers/villeController');
const {verifyTokenAny} = require("../middleware/authAny");


router.post('/add',verifyTokenAny, villeController.addVille);
router.delete('/:id',verifyTokenAny, villeController.deleteVille);
router.get('/',verifyTokenAny, villeController.getVilles);
module.exports = router;
