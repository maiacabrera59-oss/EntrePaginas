const router = require('express').Router();
const controller = require('../controllers/librosController');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/', asyncHandler(controller.listarLibros));
router.get('/buscar', asyncHandler(controller.buscarLibros));
module.exports = router;
