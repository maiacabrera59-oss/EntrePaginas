const router = require('express').Router();
const controller = require('../controllers/gestionController');
const asyncHandler = require('../middlewares/asyncHandler');
const { validarBusquedaVentas } = require('../middlewares/errores');

router.get('/', asyncHandler(controller.listarVentas));

router.get(
    '/ventas/buscar',
    asyncHandler(validarBusquedaVentas),
    asyncHandler(controller.buscarVentas)
);

router.get('/estadisticas', asyncHandler(controller.estadisticasVentas));

module.exports = router;
