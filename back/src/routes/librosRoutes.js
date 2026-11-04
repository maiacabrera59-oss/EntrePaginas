const router = require('express').Router();
const controller = require('../controllers/librosController');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/libros', asyncHandler(controller.listarLibros));
router.get('/buscar/libros', asyncHandler(controller.buscarLibros));
module.exports = router;
