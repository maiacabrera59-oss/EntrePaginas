const router = require('express').Router();
const controller = require('../controllers/librosController');
const asyncHandler = require('../middlewares/asyncHandler');
const { validarBusquedaLibros } = require('../middlewares/errores');

router.get('/', asyncHandler(controller.listarLibros));

router.get(
    '/buscar',
    asyncHandler(validarBusquedaLibros),
    asyncHandler(controller.buscarLibros)
);

module.exports = router;
