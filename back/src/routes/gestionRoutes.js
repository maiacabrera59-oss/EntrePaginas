const router = require('express').Router();
const controller = require('../controllers/gestionController');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/ventas', asyncHandler(controller.listarVentas));
router.get('/ventas/buscar', asyncHandler(controller.buscarVentas));
router.get('/estadisticas', asyncHandler(controller.estadisticasVentas));
module.exports = router;
