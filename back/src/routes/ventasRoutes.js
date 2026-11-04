
const router = require('express').Router();
const controller = require('../controllers/ventasController');
const asyncHandler = require('../middlewares/asyncHandler');

const {
    validarRegistroVenta,
    validarCambioEstado,
    validarBusquedaVentas
} = require('../middlewares/errores');

router.get(
    '/',
    asyncHandler(validarBusquedaVentas),
    asyncHandler(controller.obtenerVentas)
);

router.post(
    '/',
    asyncHandler(validarRegistroVenta),
    asyncHandler(controller.registrarVenta)
);

router.patch(
    '/:id/estado',
    asyncHandler(validarCambioEstado),
    asyncHandler(controller.cambiarEstadoVenta)
);

module.exports = router;
