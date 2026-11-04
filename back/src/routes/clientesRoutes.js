const router = require('express').Router();
const controller = require('../controllers/clientesController');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/clientes', asyncHandler(controller.listarClientes));
module.exports = router;
