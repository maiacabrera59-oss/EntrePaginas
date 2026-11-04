const router = require('express').Router();
const controller = require('../controllers/categoriasController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', asyncHandler(controller.listarCategorias));

module.exports = router;
