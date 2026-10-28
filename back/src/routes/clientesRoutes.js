const router = require('express').Router();
const controller = require('../controllers/clientesController');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/', asyncHandler(controller.listarClientes));
module.exports = router;
