const router = require('express').Router();
const controller = require('../controllers/ventasController');
const asyncHandler = require('../middlewares/asyncHandler');
router.post('/ventas', asyncHandler(controller.registrarVenta));
router.patch('/:id/estado', asyncHandler(controller.cambiarEstadoVenta));
module.exports = router;
